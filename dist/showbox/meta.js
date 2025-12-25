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
        var _b, _c;
        try {
            const { axios, cheerio } = providerContext;
            if (!link.startsWith("http")) {
                link = new URL(link, "https://hdbolly4u.ro").href;
            }
            const res = yield axios.get(link, { headers: hdbHeaders });
            const $ = cheerio.load(res.data);
            // --- Title
            const title = $("h1.entry-title").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                $("title").text().trim() ||
                "Unknown";
            // --- Image
            let image = $(".poster img").attr("src") ||
                $("meta[property='og:image']").attr("content") ||
                $("meta[name='twitter:image']").attr("content") ||
                $("p img").first().attr("src") ||
                "";
            if (image && !image.startsWith("http"))
                image = new URL(image, link).href;
            // --- Synopsis
            let synopsis = "";
            $("h4:contains('Movie synopsis'), h4:contains('PLOT'), h3:contains('SYNOPSIS/PLOT')")
                .next("p")
                .each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 20)
                    synopsis = text;
            });
            if (!synopsis) {
                $(".entry-content p").each((_, el) => {
                    const text = $(el).text().trim();
                    if (text &&
                        text.length > 40 &&
                        !text.toLowerCase().includes("download")) {
                        synopsis = text;
                        return false;
                    }
                });
            }
            // --- IMDb
            const imdbLink = $("a[href*='imdb.com']").attr("href") || "";
            const imdbId = imdbLink
                ? ((_c = imdbLink.split("/tt")[1]) === null || _c === void 0 ? void 0 : _c.split("/")[0])
                    ? "tt" + imdbLink.split("/tt")[1].split("/")[0]
                    : ""
                : "";
            // --- Rating
            let rating = $(".imdb span[itemprop='ratingValue']").text().trim() ||
                $(".ratingValue").text().trim() ||
                "";
            if (rating && !rating.includes("/"))
                rating = rating + "/10";
            // --- Extra Info
            const extra = {};
            $("p").each((_, el) => {
                var _a, _b, _c, _d, _e, _f;
                const html = $(el).html() || "";
                if (html.includes("Movie Name") || html.includes("Series Name"))
                    extra.name = (_a = $(el).text().split(":")[1]) === null || _a === void 0 ? void 0 : _a.trim();
                if (html.includes("Language"))
                    extra.language = (_b = $(el).text().split(":")[1]) === null || _b === void 0 ? void 0 : _b.trim();
                if (html.includes("Released Year"))
                    extra.year = (_c = $(el).text().split(":")[1]) === null || _c === void 0 ? void 0 : _c.trim();
                if (html.includes("Quality"))
                    extra.quality = (_d = $(el).text().split(":")[1]) === null || _d === void 0 ? void 0 : _d.trim();
                if (html.includes("Size"))
                    extra.size = (_e = $(el).text().split(":")[1]) === null || _e === void 0 ? void 0 : _e.trim();
                if (html.includes("Format"))
                    extra.format = (_f = $(el).text().split(":")[1]) === null || _f === void 0 ? void 0 : _f.trim();
            });
            // --- Tags
            const tags = [];
            $(".entry-content p strong").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt.match(/drama|biography|action|thriller|romance|reality/i))
                    tags.push(txt);
            });
            // --- Detect if Series (based on a common heading)
            const isSeries = $("h4:contains('Episode:')").length > 0;
            const links = [];
            // Series or Movie logic
            if (isSeries) {
                // ✅ Series Mode: Find episode links
                $("h4:contains('Episode:'), h5:contains('Episode:')").each((_, episodeHeading) => {
                    const episodeTitle = $(episodeHeading).text().trim();
                    const directLinks = [];
                    let currentElement = $(episodeHeading).next();
                    while (currentElement.length > 0 && !currentElement.is("h4, h5")) {
                        currentElement.find("a[href]").each((_, linkEl) => {
                            let href = ($(linkEl).attr("href") || "").trim();
                            const title = ($(linkEl).text() || "").trim();
                            if (href) {
                                if (!href.startsWith("http"))
                                    href = new URL(href, link).href;
                                directLinks.push({
                                    link: href,
                                    title: title,
                                    quality: "AUTO",
                                    type: "episode",
                                });
                            }
                        });
                        currentElement = currentElement.next();
                    }
                    if (directLinks.length > 0) {
                        links.push({
                            title: episodeTitle,
                            directLinks: directLinks,
                            episodesLink: "", // All episodes are on this page, so no external link is needed.
                        });
                    }
                });
            }
            else {
                // ✅ Movie Mode
                $("h5 + p a[href]").each((_, el) => {
                    let href = ($(el).attr("href") || "").trim();
                    const text = $(el).closest("p").prev("h5").text().trim();
                    if (!href)
                        return;
                    if (!href.startsWith("http"))
                        href = new URL(href, link).href;
                    const qMatch = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i);
                    const quality = qMatch ? qMatch[0] : "AUTO";
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
            return {
                title,
                synopsis,
                image,
                imdbId,
                type: isSeries ? "series" : "movie",
                tags,
                cast: [],
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
            };
        }
    });
};
exports.getMeta = getMeta;
