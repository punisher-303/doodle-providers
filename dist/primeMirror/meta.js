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
const hdbHeaders = {
    Referer: "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b;
        try {
            const { axios, cheerio } = providerContext;
            if (!link.startsWith("http")) {
                link = new URL(link, "https://filmycab.media").href;
            }
            const res = yield axios.get(link, { headers: hdbHeaders });
            const $ = cheerio.load(res.data);
            // --- Title
            const title = $("h1.entry-title").first().text().trim() ||
                ((_b = $("meta[property='og:title']")
                    .attr("content")) === null || _b === void 0 ? void 0 : _b.replace(" - Filmycab", "").trim()) ||
                $("title").text().trim() ||
                "Unknown";
            // --- Image with fallback
            let image = $(".poster img").attr("src") ||
                $("meta[property='og:image']").attr("content") ||
                $("meta[name='twitter:image']").attr("content") ||
                "";
            if (!image || !image.startsWith("http")) {
                image = new URL(image || "/placeholder.png", link).href; // fallback image
            }
            // --- Synopsis
            let synopsis = "";
            $(".wp-content p, .entry-content p, .description, .synopsis").each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 40 && !text.toLowerCase().includes("download")) {
                    synopsis = text;
                    return false;
                }
            });
            if (!synopsis) {
                synopsis =
                    $("meta[property='og:description']").attr("content") ||
                        $("meta[name='description']").attr("content") ||
                        "";
            }
            // --- Genre, Cast
            const tags = $(".sgeneros a, .genres a, .genre a")
                .map((_, el) => $(el).text().trim())
                .get() || [];
            const cast = $(".cast .person a, .casting a, .actors a")
                .map((_, el) => $(el).text().trim())
                .get() || [];
            // --- Rating & IMDB
            let rating = $(".imdb span[itemprop='ratingValue']").text().trim() ||
                $(".ratingValue").text().trim() ||
                $("meta[itemprop='ratingValue']").attr("content") ||
                "";
            if (rating && !rating.includes("/"))
                rating = rating + "/10";
            const imdbLink = $(".imdb a[href*='imdb.com'], a[href*='imdb.com']").attr("href") || "";
            const imdbId = imdbLink && imdbLink.includes("/tt")
                ? "tt" + imdbLink.split("/tt")[1].split("/")[0]
                : "";
            // --- Download links
            const links = [];
            const singleLink = $(".dlbtn a[href]").attr("href");
            if (singleLink) {
                try {
                    const subRes = yield axios.get(singleLink, { headers: hdbHeaders });
                    const _$ = cheerio.load(subRes.data);
                    _$(".dlink.dl a[href]").each((_, a) => {
                        const href = (_$(a).attr("href") || "").trim();
                        const text = _$(a).find(".dll").text().trim() || _$(a).text().trim();
                        if (!href || !text)
                            return;
                        const qualityMatch = text.match(/\b(240p|360p|480p|720p|1080p|2160p|4k)\b/i);
                        const quality = qualityMatch ? qualityMatch[0] : "AUTO";
                        links.push({
                            title: text,
                            directLinks: [
                                {
                                    link: href,
                                    title: text,
                                    quality,
                                    type: "movie",
                                },
                            ],
                        });
                    });
                }
                catch (err) {
                    console.error("Error fetching sublink:", err);
                }
            }
            return {
                title,
                synopsis,
                image,
                imdbId,
                type: "movie",
                tags,
                cast,
                rating,
                linkList: links,
            };
        }
        catch (err) {
            console.error("Filmycab getMeta error:", err);
            return {
                title: "",
                synopsis: "",
                image: "https://via.placeholder.com/300x450", // fallback
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
