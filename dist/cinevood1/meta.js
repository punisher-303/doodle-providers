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
// Headers
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/signed-exchange;v=b3;q=0.7",
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
    // NOTE: Cookies often expire or change, use caution with hardcoding.
    Cookie: "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b;
        const { axios, cheerio } = providerContext;
        const url = link;
        const baseUrl = url.split("/").slice(0, 3).join("/");
        const emptyResult = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };
        try {
            const response = yield axios.get(url, {
                headers: Object.assign(Object.assign({}, headers), { Referer: baseUrl }),
            });
            const $ = cheerio.load(response.data);
            const infoContainer = $(".entry-content, .post-inner").first();
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
            // --- Title ---
            // Prioritize title from the main download heading
            const downloadTitleMatch = infoContainer.find("h6 span").first().text().match(/(.*)\s*\(\d{4}\)/);
            if (downloadTitleMatch) {
                result.title = downloadTitleMatch[1].trim();
            }
            // Fallback to movie title selector if main heading failed
            if (!result.title || result.title === "Unknown Title") {
                const rawTitle = $("#movie_title a").text().trim();
                // Clean up title from IMDb box: "Kantara A Legend: Chapter 1<small></small>" -> "Kantara A Legend: Chapter 1"
                result.title = rawTitle.replace(/<small>.*<\/small>/, "").trim() || "Unknown Title";
            }
            // --- Type determination ---
            // Check if the page title (or URL) suggests a series, otherwise default to movie
            const firstDownloadHeadingText = infoContainer.find("h6").first().text();
            // Improved check: look for Season/Episode patterns (S01, E01, Season 1)
            const isSeries = firstDownloadHeadingText.includes("S01") || firstDownloadHeadingText.includes("E01") || firstDownloadHeadingText.toLowerCase().includes("season");
            result.type = isSeries ? "series" : "movie";
            // --- IMDb ID ---
            const imdbMatch = (_b = $("#movie_title a").attr("href")) === null || _b === void 0 ? void 0 : _b.match(/tt\d+/);
            result.imdbId = imdbMatch ? imdbMatch[0] : "";
            // --- Image ---
            // Search for an image within the info container
            let image = infoContainer.find('img[decoding="async"]').first().attr("src") || "";
            if (image.startsWith("//"))
                image = "https:" + image;
            result.image = image;
            // --- Synopsis ---
            result.synopsis = infoContainer.find("#summary b:contains('Summary:')").parent().text().replace("Summary:", "").trim() || "";
            // --- LinkList extraction (Updated for flexible title and link structure) ---
            const links = [];
            // Select all <h6> tags that contain quality/file size info.
            const qualityBlocks = infoContainer.find("h6");
            qualityBlocks.each((index, element) => {
                var _a, _b;
                const el = $(element);
                const fullTitle = el.text().trim();
                // Extract Quality (e.g., 1080p, 720p, 480p)
                const qualityMatch = ((_a = fullTitle.match(/\d{3,4}p\b/)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                // Extract File Size (content within the last pair of brackets, e.g., 11.78 GB)
                // Look for any bracketed text at the end of the title
                const fileSizeMatch = ((_b = fullTitle.match(/\[([^\]]+)\](?=[^\[]*$)/)) === null || _b === void 0 ? void 0 : _b[1]) || "";
                const directLinks = [];
                // Get all immediate sibling elements until the next <h6> or <hr>.
                const nextSiblings = el.nextUntil("h6, hr");
                // Find all <a> elements that are descendants of the siblings OR are the siblings themselves
                nextSiblings.find("a").add(nextSiblings.filter("a")).each((i, btn) => {
                    var _a;
                    const btnEl = $(btn);
                    const link = btnEl.attr("href");
                    if (link) {
                        directLinks.push({
                            // Use button title (e.g., '🌩️OxxFile') or text
                            title: ((_a = btnEl.attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) || btnEl.text().trim() || "Download Link",
                            link,
                        });
                    }
                });
                if (directLinks.length) {
                    // Extract the season (S01) and Episode (E01) info
                    const seMatch = fullTitle.match(/(S\d{2}E\d{2}|S\d{2}|E\d{2})/);
                    const seasonEpisode = seMatch ? `${seMatch[0]} | ` : '';
                    // --- KEY CHANGE FOR EPISODE BUTTON ---
                    // Since this scraper is likely on a page listing all episodes for one season/quality,
                    // OR it's a direct download page, we need to decide what 'episodesLink' is.
                    // ASSUMPTION: If the type is 'series', the link is for a full season, so it becomes a "download" link.
                    // If the link is actually to a separate episode-listing page, you need a different selector.
                    // Sticking to the original design: 'episodesLink' is the first direct download link.
                    links.push({
                        // Final title for the link entry (e.g., S01 | 1080p | 11.78 GB)
                        title: `${seasonEpisode}${qualityMatch}${fileSizeMatch ? ' | ' + fileSizeMatch : ''}`.trim().replace(/\|$/, '').trim(),
                        quality: qualityMatch,
                        // Keep original structure: episodesLink is the first direct download link
                        episodesLink: directLinks[0].link,
                        directLinks,
                    });
                }
            });
            result.linkList = links;
            return result;
        }
        catch (err) {
            console.log("getMeta error:", err);
            return emptyResult;
        }
    });
};
exports.getMeta = getMeta;
