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
exports.getStream = void 0;
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, providerContext, }) {
        try {
            const { axios, cheerio } = providerContext;
            let finalPage = link;
            // Step 1: If it's a "/servers/" page, go to "Go Download Page"
            if (link.includes("/servers/")) {
                const res = yield axios.get(link, {
                    headers: {
                        Referer: "https://google.com",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    },
                });
                const $ = cheerio.load(res.data);
                $("a").each((_, el) => {
                    const text = $(el).text().toLowerCase();
                    if (text.includes("go download") || text.includes("go to download")) {
                        const href = $(el).attr("href");
                        if (href) {
                            finalPage = href.startsWith("http")
                                ? href
                                : `https://www.ofilmyzilla.store${href}`;
                        }
                    }
                });
            }
            // Step 2: Fetch final "/server/" page
            const res2 = yield axios.get(finalPage, {
                headers: {
                    Referer: link,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                },
            });
            const $$ = cheerio.load(res2.data);
            const streams = [];
            $$("a").each((_, el) => {
                const href = $$(el).attr("href");
                const text = $$(el).text().trim();
                if (!href)
                    return;
                // 🎥 HLS / m3u8
                if (href.endsWith(".m3u8")) {
                    streams.push({
                        server: text || "HLS Stream",
                        link: href,
                        type: "hls",
                    });
                }
                // 🎞 VLC Links
                else if (href.startsWith("vlc://")) {
                    streams.push({
                        server: text || "VLC",
                        link: href,
                        type: "vlc",
                    });
                }
                // 📥 Direct download links (9xlinks or others)
                else if (href.includes("9xlinks") ||
                    href.includes("download") ||
                    href.includes("server")) {
                    streams.push({
                        server: text || "Download",
                        link: href,
                        type: "mp4",
                    });
                }
            });
            if (streams.length === 0) {
                console.error("No playable/downloadable links found");
                return [];
            }
            return streams;
        }
        catch (err) {
            console.error("OFilmyZilla getStream error:", err);
            return [];
        }
    });
};
exports.getStream = getStream;
