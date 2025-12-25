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
const kmmHeaders = {
    Referer: "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
        try {
            const { axios, cheerio } = providerContext;
            if (!link.startsWith("http")) {
                const baseUrl = yield providerContext.getBaseUrl("kmmovies");
                link = `${baseUrl}${link.startsWith("/") ? "" : "/"}${link}`;
            }
            const res = yield axios.get(link, { headers: kmmHeaders });
            const $ = cheerio.load(res.data);
            // --- Title
            const title = $("h1, h2, .animated-text").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                $("title").text().trim() ||
                "Unknown";
            // --- Poster Image
            let image = $("div.wp-slider-container img").first().attr("src") ||
                $("meta[property='og:image']").attr("content") ||
                $("meta[name='twitter:image']").attr("content") ||
                "";
            if (!image || !image.startsWith("http")) {
                image = new URL(image || "/placeholder.png", link).href;
            }
            // --- Synopsis
            let synopsis = "";
            $("p").each((_, el) => {
                const text = $(el).text().trim();
                if (text &&
                    text.length > 40 &&
                    !text.toLowerCase().includes("download") &&
                    !text.toLowerCase().includes("quality")) {
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
            // --- Tags / Genre
            const tags = [];
            if (res.data.toLowerCase().includes("action"))
                tags.push("Action");
            if (res.data.toLowerCase().includes("drama"))
                tags.push("Drama");
            if (res.data.toLowerCase().includes("romance"))
                tags.push("Romance");
            if (res.data.toLowerCase().includes("thriller"))
                tags.push("Thriller");
            // --- Cast
            const cast = [];
            $("p").each((_, el) => {
                const text = $(el).text().trim();
                if (/starring|cast/i.test(text)) {
                    text.split(",").forEach((name) => cast.push(name.trim()));
                }
            });
            // --- Rating
            let rating = ((_c = $("p")
                .text()
                .match(/IMDb Rating[:\s]*([0-9.]+)/i)) === null || _c === void 0 ? void 0 : _c[1]) || "";
            if (rating && !rating.includes("/"))
                rating = rating + "/10";
            // --- IMDb ID
            const imdbLink = $("p a[href*='imdb.com']").attr("href") || "";
            const imdbId = imdbLink && imdbLink.includes("/tt")
                ? "tt" + imdbLink.split("/tt")[1].split("/")[0]
                : "";
            // --- Download Links
            const linkList = [];
            const isSeries = $(".download-options-grid").length > 0; // Series tab structure
            if (isSeries) {
                // --- Series: loop through each download-card
                $(".download-card").each((_, card) => {
                    const card$ = $(card);
                    const quality = card$.find(".download-quality-text").text().trim();
                    const size = card$.find(".download-size-info").text().trim() || "";
                    const href = card$.find("a.tabs-download-button").attr("href") || "";
                    if (href) {
                        const titleText = `Download ${quality} ${size}`.trim();
                        linkList.push({
                            title: titleText,
                            episodesLink: href,
                            quality: quality || "AUTO",
                            directLinks: [
                                {
                                    link: href,
                                    title: titleText,
                                    type: "series",
                                },
                            ],
                        });
                    }
                });
            }
            else {
                // --- Movie: same as before
                $("a.modern-download-button").each((_, a) => {
                    const parent = $(a).closest(".modern-option-card");
                    const quality = parent.find(".modern-badge").text().trim() || "AUTO";
                    const href = $(a).attr("href") || "";
                    const titleText = `Download ${quality}`;
                    if (href) {
                        linkList.push({
                            title: titleText,
                            episodesLink: href,
                            quality,
                            directLinks: [
                                {
                                    link: href,
                                    title: titleText,
                                    type: "movie",
                                },
                            ],
                        });
                    }
                });
            }
            return {
                title,
                synopsis,
                image,
                imdbId,
                type: isSeries ? "series" : "movie",
                tags,
                cast,
                rating,
                linkList,
            };
        }
        catch (err) {
            console.error("KMMOVIES getMeta error:", err);
            return {
                title: "",
                synopsis: "",
                image: "https://via.placeholder.com/300x450",
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
