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
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        const { axios, cheerio } = providerContext;
        try {
            const streamLinks = [];
            // 🔹 Step 1: Load main page
            const dotlinkRes = yield axios(`${link}`, { headers, signal });
            const dotlinkText = dotlinkRes.data;
            // 🔹 Step 2: Extract button download_video() info
            const buttonMatches = dotlinkText.matchAll(/download_video\('([^']+)','([^']+)','([^']+)'\)/g);
            for (const match of buttonMatches) {
                const [, id, mode, hash] = match;
                const dlUrl = `https://cdn.bewab.co/dl?op=download_orig&id=${id}&mode=${mode}&hash=${hash}`;
                // 🔹 Step 3: Visit dl page and extract only final direct link
                try {
                    const dlRes = yield axios(dlUrl, { headers, signal });
                    const dlText = dlRes.data;
                    const $$ = cheerio.load(dlText);
                    // Regex scrape
                    const directMatches = dlText.matchAll(/<a\s+href="([^"]+\.(?:mkv|mp4))"/gi);
                    for (const m of directMatches) {
                        const href = m[1];
                        if (href) {
                            streamLinks.push({
                                server: "direct",
                                link: href,
                                type: href.endsWith(".mp4") ? "mp4" : "mkv",
                            });
                        }
                    }
                    // Cheerio fallback
                    $$("a").each((_, el) => {
                        var _a;
                        const href = (_a = $$(el).attr("href")) !== null && _a !== void 0 ? _a : null;
                        if (href && (href.includes(".mkv") || href.includes(".mp4"))) {
                            streamLinks.push({
                                server: "direct",
                                link: href,
                                type: href.endsWith(".mp4") ? "mp4" : "mkv",
                            });
                        }
                    });
                }
                catch (err) {
                    console.log("❌ error loading dl page:", err.message);
                }
            }
            return streamLinks;
        }
        catch (error) {
            console.log("getStream error: ", error.message);
            return [];
        }
    });
}
