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
// --- Headers ---
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b;
        const { axios, cheerio } = providerContext;
        const url = link;
        const emptyResult = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };
        try {
            const response = yield axios.get(url, { headers });
            const $ = cheerio.load(response.data);
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
            // --- Title extraction ---
            let title = $("title").first().text().trim() ||
                $("h1").first().text().trim() ||
                $(".Robiul b").first().text().trim();
            // Remove unwanted words
            title = title
                .replace(/Download|Full Movie|Free Watch|Bollywood|Movie/gi, "")
                .replace(/\b(1080p|720p|480p|4k|NF|HDRip|WEB-DL|X264|AAC|ESubs|Dual Audio|Hindi|Eng|English|[0-9.]+gb)\b/gi, "")
                .replace(/\s{2,}/g, " ")
                .trim();
            // Keep only main name + year if present
            const cleanMatch = title.match(/^.*?\(\d{4}\)/);
            result.title = cleanMatch ? cleanMatch[0].trim() : title;
            // --- Image extraction ---
            let image = $(".movielist img").attr("src") ||
                $("img[src*='m.media-amazon']").attr("src") ||
                $("img").first().attr("src") ||
                "";
            if (image.startsWith("//"))
                image = "https:" + image;
            result.image = image;
            // --- Synopsis ---
            const storyText = $(".Let b:contains('Story')").parent().text().trim();
            result.synopsis = storyText.replace("Story :", "").trim();
            // --- IMDb ID (if available) ---
            const imdbMatch = (_b = $("a[href*='imdb.com/title/']")
                .attr("href")) === null || _b === void 0 ? void 0 : _b.match(/tt\d+/);
            result.imdbId = imdbMatch ? imdbMatch[0] : "";
            // --- Link Extraction ---
            const links = [];
            const linkButtons = $("a[href]").filter((_, el) => {
                const text = $(el).text().toLowerCase();
                // Only allow Google Drive or 1080p links
                return text.includes("google drive") || text.includes("1080p");
            });
            linkButtons.each((_, el) => {
                const btn = $(el);
                const href = btn.attr("href") || "";
                if (!href || href.trim() === "")
                    return;
                const linkText = btn.text().trim() || "Download Link";
                links.push({
                    title: linkText,
                    quality: linkText.includes("1080") ? "1080p" : "",
                    episodesLink: href,
                    directLinks: [
                        {
                            title: linkText,
                            link: href,
                            type: "movie",
                        },
                    ],
                });
            });
            result.linkList = links;
            return result;
        }
        catch (err) {
            console.error("getMeta error:", err);
            return emptyResult;
        }
    });
};
exports.getMeta = getMeta;
