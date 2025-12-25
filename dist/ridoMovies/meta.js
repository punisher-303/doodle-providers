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
const headers = {
    Referer: "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
        const { axios, cheerio } = providerContext;
        try {
            const res = yield axios.get(link, { headers });
            const $ = cheerio.load(res.data);
            // --- Title
            const title = $(".sheader h1").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                "";
            // --- Poster (fix with data-src fallback)
            let image = $(".sheader .poster img").attr("src") ||
                $(".sheader .poster img").attr("data-src") ||
                $("meta[property='og:image']").attr("content") ||
                "";
            if (image && !image.startsWith("http"))
                image = new URL(image, link).href;
            // --- Tagline
            const tagline = $(".sheader .tagline").text().trim();
            // --- Extra Info
            const date = $(".sheader .date").text().trim();
            const country = $(".sheader .country").text().trim();
            const runtime = $(".sheader .runtime").text().trim();
            const contentRating = $(".sheader .rated").text().trim();
            const rating = $(".starstruck-rating span[itemprop='ratingValue']").text().trim() || "";
            // --- Synopsis (remove unnecessary text, iframe, buttons etc.)
            let synopsis = "";
            $("#info .wp-content p").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt &&
                    txt.length > 30 &&
                    !txt.toLowerCase().includes("watch online") &&
                    !txt.toLowerCase().includes("download") &&
                    !txt.toLowerCase().includes("share") &&
                    !txt.toLowerCase().includes("support")) {
                    synopsis = txt;
                    return false; // first clean paragraph only
                }
            });
            if (!synopsis) {
                synopsis =
                    ((_c = $("meta[name='description']").attr("content")) === null || _c === void 0 ? void 0 : _c.trim()) || "No synopsis available.";
            }
            // --- Genres
            const tags = [];
            $(".sgeneros a").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt)
                    tags.push(txt);
            });
            // --- Download Links (as you requested, unchanged)
            const links = [];
            $(".movie-button-container a").each((_, el) => {
                let href = ($(el).attr("href") || "").trim();
                if (!href)
                    return;
                if (!href.startsWith("http"))
                    href = new URL(href, link).href;
                const btnText = $(el).text().trim();
                links.push({
                    title: btnText,
                    directLinks: [
                        {
                            link: href,
                            title: btnText,
                            quality: btnText.match(/1080p/i)
                                ? "1080p"
                                : btnText.match(/720p/i)
                                    ? "720p"
                                    : "AUTO",
                            type: "movie",
                        },
                    ],
                    episodesLink: href,
                });
            });
            // --- Extra Info Object
            const extra = {
                tagline,
                date,
                country,
                runtime,
                contentRating,
            };
            return {
                title,
                synopsis,
                image,
                imdbId: "", // site me imdb nahi tha
                type: "movie",
                tags,
                cast: [], // agar zarurat ho to aur scrape kar sakte hai
                rating,
                linkList: links,
                extraInfo: extra,
            };
        }
        catch (err) {
            console.error("getMeta error:", err);
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
                extraInfo: {},
            };
        }
    });
};
exports.getMeta = getMeta;
