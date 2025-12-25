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
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    DNT: "1",
    Origin: "https://nexdrive.one",
    Referer: "https://nexdrive.one/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not=A?Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    Cookie: "_ga=GA1.1.1001107919.1762037833; _ga_7YXLT91MT2=GS2.1.s1762037832$o1$g1$t1762037851$j41$l0$h0; prefetchAd_8508552=true",
};
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        var _b, _c, _d, _e;
        const { axios, cheerio, extractors } = providerContext;
        const { hubcloudExtracter } = extractors;
        try {
            const streamLinks = [];
            console.log("dotlink", link);
            // Fetch the initial page content
            const dotlinkRes = yield axios(`${link}`, { headers, signal });
            const dotlinkText = dotlinkRes.data;
            const $ = cheerio.load(dotlinkText);
            if (type === "movie") {
                // --- 1. V-Cloud Link Extraction (New Block) ---
                try {
                    // Selector to target the specific button style for V-Cloud
                    const vCloudSelector = 'a[style*="background: linear-gradient(135deg,#ed0b0b,#f2d152);"]';
                    const vCloudLink = $(vCloudSelector).attr("href");
                    if (vCloudLink) {
                        // Prepend base URL if it's a relative path like '/reder.php?v=1'
                        const baseUrl = new URL(link).origin;
                        const fullVCloudLink = vCloudLink.startsWith('/') ? baseUrl + vCloudLink : vCloudLink;
                        console.log('V-Cloud Link Found:', fullVCloudLink);
                        // Since this link is likely a redirect to the final stream, 
                        // you would need another extractor/call here. 
                        // For now, we will log it. If it's the final playable link, add it to streamLinks.
                        // Assuming it's a link to extract stream from, it should replace 'link' if it's the main path.
                        // If it's just one of many options, continue to the original logic.
                        // If V-Cloud is the *primary* source you want to target, you can update 'link':
                        // link = fullVCloudLink; 
                    }
                }
                catch (error) {
                    console.log("V-Cloud link extraction error: ");
                    // console.error(error);
                }
                // --- 2. Vlink (Original logic) ---
                // vlink
                const vlink = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || [];
                // console.log('vLink', vlink[1]);
                if (vlink[1]) {
                    // This updates the 'link' variable, which is used later for hubcloudExtracter
                    link = vlink[1];
                }
                // --- 3. Filepress link (Original logic) ---
                try {
                    const filepressLink = $('.btn.btn-sm.btn-outline[style="background:linear-gradient(135deg,rgb(252,185,0) 0%,rgb(0,0,0)); color: #fdf8f2;"]')
                        .parent()
                        .attr("href");
                    // console.log('filepressLink', filepressLink);
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
                        signal
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
                            signal
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
            // Use the potentially updated 'link' for hubcloudExtracter
            const hubcloudStreams = yield hubcloudExtracter(link, signal);
            // Combine all streams
            return [...streamLinks, ...hubcloudStreams];
        }
        catch (error) {
            console.log("getStream error: ", error);
            if (error.message.includes("Aborted")) {
                // Handle Aborted signal gracefully
            }
            return [];
        }
    });
}
