const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, 'manifest.json');
const PROVIDERS_DIR = path.join(__dirname, 'providers');
const MAP_PATH = path.join(__dirname, 'modflix.json');

let urlMap = {};
if (fs.existsSync(MAP_PATH)) {
    try {
        urlMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
        // Normalize keys to lowercase for easier matching if needed?
        // But getBaseUrl uses exact string. Kepp as is.
        console.log(`Loaded modflix.json with ${Object.keys(urlMap).length} keys.`);
    } catch (e) {
        console.error("Failed to parse modflix.json", e);
    }
}

function getBaseUrlFromSource(providerValue) {
    const providerDir = path.join(PROVIDERS_DIR, providerValue);

    // Check if provider directory exists
    if (!fs.existsSync(providerDir)) {
        return null;
    }

    // Files to check in priority order
    const filesToCheck = ['posts.ts', 'catalog.ts', 'stream.ts', 'index.ts', 'meta.ts'];

    for (const file of filesToCheck) {
        const filePath = path.join(providerDir, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');

            // 1. Check for const baseUrl = "..."
            // Matches: const baseUrl = "https://..."
            // Matches: const baseUrl = 'https://...'
            const matchConst = content.match(/(?:const|let|var)\s+baseUrl\s*=\s*["'](http[^"']+)["']/);
            if (matchConst && matchConst[1]) {
                return matchConst[1];
            }

            // 2. Check for getBaseUrl("KEY")
            const matchGet = content.match(/getBaseUrl\(\s*["']([^"']+)["']\s*\)/);
            if (matchGet && matchGet[1]) {
                const key = matchGet[1];
                if (urlMap[key]) {
                    if (urlMap[key].url) {
                        return urlMap[key].url;
                    }
                } else {
                    // console.warn(`[${providerValue}] Key '${key}' not found in modflix.json`);
                }
            }
        }
    }
    return null;
}

function updateManifest() {
    try {
        const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
        const manifest = JSON.parse(manifestContent);
        let updatedCount = 0;
        let notFoundCount = 0;
        let processedCount = 0;

        for (const provider of manifest) {
            const providerValue = provider.value;
            if (!providerValue) continue;

            // Only attempt to find URL if it's missing OR if we want to enforce consistency.
            // User said "make all providers sourceurl like others", which implies adding it where missing.
            // But if it's already there, we might want to verify/update it.

            const url = getBaseUrlFromSource(providerValue);

            if (url) {
                if (provider.sourceUrl !== url) {
                    console.log(`Updating ${provider.display_name} (${providerValue}):\n  Old: ${provider.sourceUrl || 'MISSING'}\n  New: ${url}`);
                    provider.sourceUrl = url;
                    updatedCount++;
                } else {
                    // console.log(`Verified ${provider.display_name}`);
                }
            } else {
                console.warn(`Could not find baseUrl for ${provider.display_name} (${providerValue})`);
                notFoundCount++;
            }
            processedCount++;
        }

        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
        console.log(`\nUpdate complete.`);
        console.log(`Processed: ${processedCount}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Not found: ${notFoundCount}`);

    } catch (error) {
        console.error("Error updating manifest:", error);
    }
}

updateManifest();
