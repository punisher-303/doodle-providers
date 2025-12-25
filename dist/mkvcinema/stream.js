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
            const streams = [];
            // --- Helper function (Promise-returning, no "async" keyword inside async fn)
            function scrapeGDFlix(gdflixLink) {
                return axios
                    .get(gdflixLink, {
                    headers: {
                        Referer: link,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    },
                })
                    .then((gdRes) => {
                    const $gd = cheerio.load(gdRes.data);
                    const gdStreams = [];
                    $gd("a[href]").each((_, el) => {
                        const $el = $gd(el);
                        const hrefAttr = $el.attr("href") || "";
                        const text = ($el.text() || "").trim();
                        if (!hrefAttr)
                            return;
                        if (hrefAttr.toLowerCase().includes("pixeldrain")) {
                            const parentText = $el.parent().text() || "";
                            const sizeMatch = parentText.match(/\[(.*?)\]/);
                            const size = sizeMatch ? ` [${sizeMatch[1]}]` : "";
                            gdStreams.push({
                                server: (text || "PixelDrain") + size,
                                link: hrefAttr,
                                type: "file",
                            });
                        }
                    });
                    return gdStreams;
                });
            }
            // --- Case 1: Direct GDFlix file link
            if (link.includes("gdflix.dev/file/")) {
                return yield scrapeGDFlix(link);
            }
            // --- Case 2: Aggregator page (mainlinks.today, etc.)
            const res = yield axios.get(link, {
                headers: {
                    Referer: "https://google.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                },
            });
            const $ = cheerio.load(res.data);
            let gdflixLink = "";
            $("a[href]").each((_, el) => {
                const href = $(el).attr("href") || "";
                if (href.includes("gdflix")) {
                    gdflixLink = href;
                }
            });
            if (gdflixLink) {
                const gdStreams = yield scrapeGDFlix(gdflixLink);
                streams.push(...gdStreams);
            }
            return streams;
        }
        catch (err) {
            console.error("getStream error:", err);
            return [];
        }
    });
};
exports.getStream = getStream;
