"use strict";
// Fully updated meta.ts based on provided HTML structure
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
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    Cookie: "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        const { axios, cheerio } = providerContext;
        const empty = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "series",
            linkList: [],
        };
        try {
            const response = yield axios.get(link, { headers });
            const $ = cheerio.load(response.data);
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "series", // Default to series
                linkList: [],
            };
            // --- Common Extraction (Works for both Series and Movie Pages) ---
            // TITLE: Target the h1 inside the clean title div
            // --- Common Extraction (Works for both Series and Movie Pages) ---
            // TITLE: Target the h1 inside the clean title div (Original, specific)
            const rawTitle = $("div[style*='text-align: center; margin: 20px 0;'] h1")
                .text()
                .trim();
            // Ensure the final title is assigned, falling back if all attempts fail
            result.title = rawTitle;
            // ------------------------------------------------------------------
            // POSTER IMAGE: Target the img (Selector remains the same for backward compatibility if image tag exists elsewhere)
            let image = $("div[style*='text-align: center;margin-bottom: 2rem;'] img").attr("data-src") || "";
            if (image.startsWith("//"))
                image = "https:" + image;
            result.image = image;
            // SYNOPSIS: Target the p inside the 'Overview' div
            result.synopsis = $("#overview-text p").text().trim();
            // ------------------------------------------------------------------
            // --- MOVIE FEATURE (Detects single video player structure) ---
            // ------------------------------------------------------------------
            const primaryIframe = $("#aa-options #options-0 iframe");
            if (primaryIframe.length > 0) {
                // This is a movie page or a single-episode page structure.
                result.type = "movie";
                const directLinks = [];
                const langServerMap = new Map();
                let defaultLang = 'Primary Stream'; // Fallback for the default server
                // 1. Extract the default/primary player link (options-0)
                const defaultSrc = primaryIframe.attr("src") || primaryIframe.attr("data-src");
                if (defaultSrc) {
                    // Attempt to find a language tag for the default stream
                    const defaultLangElement = $("div[style*='color: #ec4899;'] a:contains('English')");
                    if (defaultLangElement.length > 0) {
                        defaultLang = 'English';
                    }
                    langServerMap.set(defaultLang, defaultSrc);
                }
                // 2. Extract links from the alternate video player (options-1) if present
                const altIframe = $("#aa-options #options-1 iframe");
                if (altIframe.length > 0) {
                    const altDataSrc = altIframe.attr("data-src");
                    if (altDataSrc) {
                        try {
                            // Decode Base64 encoded JSON string
                            const jsonPart = altDataSrc.split(',').length > 1 ? altDataSrc.split(',')[1] : altDataSrc;
                            const jsonString = Buffer.from(jsonPart, 'base64').toString('utf8');
                            const languageLinks = JSON.parse(jsonString);
                            if (Array.isArray(languageLinks)) {
                                for (const item of languageLinks) {
                                    if (item.language && item.link) {
                                        langServerMap.set(item.language, item.link);
                                    }
                                }
                            }
                        }
                        catch (e) {
                            console.error("Error parsing multi-language links:", e);
                        }
                    }
                }
                // Convert the map into the final linkList array
                for (const [language, link] of langServerMap.entries()) {
                    if (link) {
                        directLinks.push({
                            // 💡 FIX: Set a generic "Play" title for the default stream if not explicitly language-labeled, 
                            // and use the language tag for others.
                            title: language === 'Primary Stream' ? `${result.title} - Play` : `${result.title} (${language})`,
                            quality: language,
                            episodesLink: link,
                            directLinks: [],
                        });
                    }
                }
                result.linkList = directLinks;
            }
            else {
                // ------------------------------------------------------------------
                // --- SERIES FEATURE (Handles multiple episode buttons) ---
                // ------------------------------------------------------------------
                // Target all play buttons EXCEPT the one with the class .btn-first
                const episodeButtons = $(".smart-buttons-container .smart-play-btn:not(.btn-first)");
                if (episodeButtons.length > 0) {
                    result.type = "series";
                    episodeButtons.each((i, el) => {
                        const button = $(el);
                        const episodesLink = button.attr("href");
                        const actionText = button.find(".action-text").text().trim(); // e.g., "Latest Dub"
                        const episodeText = button.find(".episode-text").text().trim(); // e.g., "S1E30"
                        if (episodesLink) {
                            // Initialize variables for title construction
                            let seasonTitlePart = "";
                            let qualityTag = "Unknown";
                            if (episodeText) {
                                const seasonMatch = episodeText.match(/S(\d+)/i);
                                const episodeMatch = episodeText.match(/E(\d+)/i);
                                const seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                                const episodeNum = episodeMatch ? parseInt(episodeMatch[1]) : null;
                                qualityTag = `S${seasonNum}`;
                                if (episodeNum !== null) {
                                    seasonTitlePart = `S${seasonNum} E${episodeNum}`;
                                }
                                else {
                                    seasonTitlePart = `S${seasonNum}`;
                                }
                            }
                            // Construct the final title using Action Text and Episode/Season text
                            const finalTitle = `${result.title || "Series"} - ${actionText} (${seasonTitlePart})`;
                            result.linkList.push({
                                title: finalTitle,
                                quality: qualityTag,
                                episodesLink: episodesLink,
                                directLinks: [], // This is a link to the episode page, not a direct stream link
                            });
                        }
                    });
                }
            }
            return result;
        }
        catch (err) {
            console.log("Meta error:", err);
            return empty;
        }
    });
};
exports.getMeta = getMeta;
