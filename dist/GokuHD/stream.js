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
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    Cookie: "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
// --- New Helper Function (Defined above, but placed here for completeness) ---
function extractGdflixLink(url, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const { axios, cheerio } = providerContext;
        const initialHeaders = {
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            'Referer': url.split('/').slice(0, 3).join('/'),
        };
        try {
            // Use the default headers if the provided 'link' is the main vgmlinks page
            const res = yield axios.get(url, { headers: initialHeaders });
            const $ = cheerio.load(res.data);
            // GDFlix link को खोजें 
            const gdflixLink = $('a[href*="gdflix.dev"]').attr('href');
            return gdflixLink || null;
        }
        catch (error) {
            // Error handling is necessary for failed requests
            console.error("Error extracting GDFlix link from main page:", error);
            return null;
        }
    });
}
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        var _b, _c, _d, _e;
        const { axios, cheerio, extractors } = providerContext;
        const { hubcloudExtracter } = extractors;
        try {
            const streamLinks = [];
            console.log("dotlink", link);
            let currentLink = link;
            // --- Step 1: If the link is the main vgmlinks page, extract the GDFlix URL ---
            // If the link is the one you provided (vgmlinks.click/genxfm...), we need to scrape it first.
            if (currentLink.includes("vgmlinks.click")) {
                const gdflixUrl = yield extractGdflixLink(currentLink, providerContext);
                if (gdflixUrl) {
                    currentLink = gdflixUrl; // Update the link to the GDFlix URL
                    console.log("Extracted GDFlix URL:", currentLink);
                }
                else {
                    // If GDFlix link isn't found, fall back to the original link for other extractors
                    console.log("GDFlix link not found on main page. Proceeding with original link.");
                }
            }
            // --- Step 2: GDFlix to PixelDrain Logic (आपका नया फीचर) ---
            if (currentLink.includes("gdflix.dev")) {
                console.log("Scraping GDFlix link for PixelDrain...");
                const gdflixRes = yield axios.get(currentLink, { headers, signal });
                const $ = cheerio.load(gdflixRes.data);
                // PixelDrain लिंक को खोजें (आपके HTML स्निपेट के आधार पर)
                const pixeldrainLink = $('a[href*="pixeldrain.dev/api/file/"]:contains("PixelDrain")').attr("href");
                if (pixeldrainLink) {
                    console.log("Found PixelDrain Link:", pixeldrainLink);
                    streamLinks.push({
                        server: "PixelDrain",
                        link: pixeldrainLink,
                        type: "mkv",
                    });
                    // PixelDrain link मिलने पर यहीं return करें
                    return streamLinks;
                }
                else {
                    console.log("PixelDrain link not found on GDFlix page. Proceeding to next logic.");
                }
            }
            // --- 3. Existing Logic for 'movie' type (अपरिवर्तित) ---
            if (type === "movie") {
                // Vlink logic uses the final 'currentLink' from Step 1/2
                const dotlinkRes = yield axios(currentLink, { headers });
                const dotlinkText = dotlinkRes.data;
                // console.log('dotlinkText', dotlinkText);
                const vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
                // console.log('vLink', vlink[1]);
                currentLink = vlink[1];
                // filepress link
                try {
                    const $ = cheerio.load(dotlinkText);
                    const filepressLink = $('.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]')
                        .parent()
                        .attr("href");
                    // ... (rest of filepress logic remains the same) ...
                    const filepressID = filepressLink === null || filepressLink === void 0 ? void 0 : filepressLink.split("/").pop();
                    const filepressBaseUrl = filepressLink === null || filepressLink === void 0 ? void 0 : filepressLink.split("/").slice(0, -2).join("/");
                    // console.log('filepressID', filepressID);
                    // console.log('filepressBaseUrl', filepressBaseUrl);
                    const filepressTokenRes = yield axios.post(filepressBaseUrl + "/api/file/downlaod/", {
                        id: filepressID,
                        method: "indexDownlaod",
                        captchaValue: null,
                    }, {
                        headers: {
                            "Content-Type": "application/json",
                            Referer: filepressBaseUrl,
                        },
                    });
                    // console.log('filepressTokenRes', filepressTokenRes.data);
                    if ((_b = filepressTokenRes.data) === null || _b === void 0 ? void 0 : _b.status) {
                        const filepressToken = (_c = filepressTokenRes.data) === null || _c === void 0 ? void 0 : _c.data;
                        const filepressStreamLink = yield axios.post(filepressBaseUrl + "/api/file/downlaod2/", {
                            id: filepressToken,
                            method: "indexDownlaod",
                            captchaValue: null,
                        }, {
                            headers: {
                                "Content-Type": "application/json",
                                Referer: filepressBaseUrl,
                            },
                        });
                        // console.log('filepressStreamLink', filepressStreamLink.data);
                        streamLinks.push({
                            server: "filepress",
                            link: (_e = (_d = filepressStreamLink.data) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e[0],
                            type: "mkv",
                        });
                    }
                }
                catch (error) {
                    console.log("filepress error: ");
                    // console.error(error);
                }
            }
            // अगर GDFlix और FilePress दोनों से लिंक नहीं मिले, तो hubcloudExtracter चलाएँ।
            return streamLinks.length > 0 ? streamLinks : yield hubcloudExtracter(currentLink, signal);
        }
        catch (error) {
            console.log("getStream error: ", error);
            if (error.message.includes("Aborted")) {
            }
            else {
            }
            return [];
        }
    });
}
