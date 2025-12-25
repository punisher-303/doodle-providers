
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { minify } = require("terser");

const PROVIDER = "mlfbd";
const SRC_DIR = path.join("providers", PROVIDER);
const DIST_DIR = path.join("dist", PROVIDER);

async function build() {
    console.log(`🔨 Building only ${PROVIDER}...`);

    // 1. Clean specific dist folder
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR, { recursive: true });

    // 2. Compile specific files
    // distinct input files
    const files = ["catalog.ts", "posts.ts", "stream.ts", "meta.ts"];
    const inputFiles = files.map(f => path.join(SRC_DIR, f)).join(" ");

    // We use a temporary dir for output to handle structure issues
    const TEMP_OUT = path.join("dist", "temp_mlfbd");

    try {
        console.log("   Compiling TypeScript...");
        // Use local tsc or npx tsc
        const tscCmd = `npx tsc ${inputFiles} providers/types.ts --outDir ${TEMP_OUT} --target ES2017 --module commonjs --esModuleInterop --skipLibCheck`;
        execSync(tscCmd, { stdio: "inherit" });
    } catch (e) {
        console.error("❌ Compilation failed", e);
        process.exit(1);
    }

    // 3. Move and Minify
    console.log("   Processing files...");

    // Logic to find where tsc put the files. 
    // It seems to be flat under 'mlfbd' based on list_dir result
    const compiledPath = path.join(TEMP_OUT, PROVIDER);

    if (!fs.existsSync(compiledPath)) {
        console.error(`❌ Could not find compiled files in expected path: ${compiledPath}`);
        // Fallback check
        if (fs.existsSync(path.join(TEMP_OUT, "catalog.js"))) {
            // Flat output
            copyAndMinify(TEMP_OUT, DIST_DIR);
        } else {
            process.exit(1);
        }
    } else {
        await copyAndMinify(compiledPath, DIST_DIR);
    }

    // Cleanup temp
    fs.rmSync(TEMP_OUT, { recursive: true, force: true });

    console.log(`✅ ${PROVIDER} built successfully!`);
}

async function copyAndMinify(srcDir, destDir) {
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        if (!file.endsWith(".js")) continue;

        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);

        const code = fs.readFileSync(srcFile, "utf8");
        try {
            // const result = await minify(code, { mangle: false }); // No mangle to be safe
            // fs.writeFileSync(destFile, result.code || code);
            // console.log(`   Minified ${file}`);
            fs.copyFileSync(srcFile, destFile);
            console.log(`   Copied ${file} (No Minify)`);
        } catch (e) {
            console.warn(`   Failed to minify ${file}, using raw.`, e.message);
            fs.copyFileSync(srcFile, destFile);
        }
    }
}

build();
