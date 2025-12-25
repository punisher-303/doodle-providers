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
exports.getMeta = void 0;
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
        try {
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(link, {
                headers: {
                    Referer: "https://google.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                },
            });
            const $ = cheerio.load(res.data);
            // --- Movie Title निकालना
            let title = $(".section-header").first().text().trim() || // main header
                $("title").text().trim() || // fallback
                ((_b = $("meta[name='description']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) || // meta description
                ((_c = $("meta[property='og:title']").attr("content")) === null || _c === void 0 ? void 0 : _c.trim()) || // og:title
                "Unknown";
            // Remove unwanted stuff like .mkv, size info
            title = title
                .replace(/\.(mkv|mp4|avi)$/i, "")
                .replace(/\b(\d{3,4}p|hdrip|webrip|web-dl|bluray)\b/gi, "")
                .replace(/\s{2,}/g, " ")
                .trim();
            // --- Type (series or movie)
            const type = title.toLowerCase().includes("season") ? "series" : "movie";
            // --- Image निकालना
            const image = $("img.absmiddle").attr("src") ||
                $("meta[property='og:image']").attr("content") ||
                "";
            // --- Synopsis निकालना
            let synopsis = "";
            $(".section-header:contains('Movie Information')")
                .next(".list")
                .find("div")
                .each((_, el) => {
                const text = $(el).text().trim();
                if (text.toLowerCase().includes("storyline")) {
                    synopsis = text.replace(/Storyline:/i, "").trim();
                }
            });
            // --- Links collect करना
            const links = [];
            // 1. Download links
            $(".section-header:contains('Download')")
                .next(".list")
                .find("a")
                .each((_, el) => {
                var _a;
                const href = $(el).attr("href");
                const text = $(el).text().trim();
                if (href && text) {
                    links.push({
                        title: text.replace(/Download/i, "").trim(),
                        directLinks: [
                            {
                                link: href,
                                title: text,
                                type,
                                quality: ((_a = text.match(/\b(480p|720p|1080p|2160p|4k|hdrip|webrip|web-dl|bluray)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "",
                            },
                        ],
                    });
                }
            });
            // 2. Server links (/servers/)
            $("a[href*='/servers/']").each((i, el) => {
                var _a;
                const href = $(el).attr("href");
                const text = $(el).text().trim() || `Server ${i + 1}`;
                if (href) {
                    links.push({
                        title: text,
                        directLinks: [
                            {
                                link: href,
                                title: text,
                                type,
                                quality: ((_a = href.match(/\d+p/)) === null || _a === void 0 ? void 0 : _a[0]) || "",
                            },
                        ],
                    });
                }
            });
            return {
                title,
                synopsis,
                image,
                imdbId: "",
                type,
                tags: [],
                cast: [],
                rating: "",
                linkList: links,
            };
        }
        catch (err) {
            console.error("OFilmyZilla getMeta error:", err);
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                tags: [],
                cast: [],
                rating: "",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
