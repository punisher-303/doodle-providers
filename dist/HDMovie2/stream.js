"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = getStream;
const headers = {
    // Simplified headers for better performance and reduced payload
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
// Function to handle the Gdflix/PixelDrain extraction
function gdflixExtractor(link, axios, cheerio, signal) {
    return __awaiter(this, void 0, void 0, function* () {
        const streamLinks = [];
        try {
            const gdflixRes = yield axios.get(link, { headers, signal });
            const $ = cheerio.load(gdflixRes.data);
            // Look for the specific PixelDrain download button
            const pixelDrainEl = $('a[href*="pixeldrain.dev/api/file/"]');
            const pixelDrainLink = pixelDrainEl.attr('href');
            // Extract button text for the title, cleaning up bracketed text like [20MB/s]
            const title = pixelDrainEl.text().trim().replace(/\s*\[.*\]/i, '').replace(/\s*DL/i, ' Download');
            if (pixelDrainLink) {
                streamLinks.push({
                    server: "PixelDrain",
                    link: pixelDrainLink,
                    type: "mp4",
                });
            }
            else {
                console.log("PixelDrain link not found on Gdflix page.");
            }
        }
        catch (error) {
            console.error("Gdflix extraction error:", error instanceof Error ? error.message : String(error));
        }
        return streamLinks;
    });
}
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        const { axios, cheerio, extractors } = providerContext;
        const { hubcloudExtracter } = extractors;
        try {
            // 1. Check if the link is a Gdflix link and use the new extractor
            if (link.includes("gdflix.dev")) {
                console.log("Using Gdflix/PixelDrain extraction logic for:", link);
                return yield gdflixExtractor(link, axios, cheerio, signal);
            }
            // 2. Otherwise, assume it's a Hubcloud (or generic) link and use the dedicated extractor
            console.log("Using Hubcloud extraction logic for:", link);
            return yield hubcloudExtracter(link, signal);
        }
        catch (error) {
            console.log("getStream error: ", error instanceof Error ? error.message : String(error));
            if (error.message.includes("Aborted")) {
                console.log("Request aborted by user.");
            }
            return [];
        }
    });
}
