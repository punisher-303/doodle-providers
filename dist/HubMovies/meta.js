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
exports.getMeta = exports.getFinalLink = void 0;
// Headers
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
    Cookie: "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
/**
 * Scrapes the secondary link page (e.g., https://movielinkhub.fun/links/...)
 * to find the final "Continue" link which leads to the actual download shortener.
 * @param link The link extracted from the main movie page (e.g., https://movielinkhub.fun/links/...).
 * @param providerContext The context object providing axios and cheerio.
 * @returns The resolved link found in the page's HTML (e.g., https://linkedmoviehub.top/?p=...).
 */
const getFinalLink = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        const { axios, cheerio } = providerContext;
        const requestHeaders = Object.assign(Object.assign({}, headers), { 
            // Add Referer for the intermediate page request for better success rate
            Referer: link });
        try {
            // We expect the first page (movielinkhub.fun/links/...) to have the redirect button.
            const response = yield axios.get(link, {
                headers: requestHeaders,
                // Allow redirects (default behavior) in case the URL redirects before loading the button page
            });
            const $ = cheerio.load(response.data);
            // Target the specific link based on the HTML snippet provided: <a id="link" ...>
            const finalLinkElement = $("#link").first();
            let finalLink = finalLinkElement.attr("href");
            if (finalLink) {
                console.log(`Scraped final link from page ${link} to: ${finalLink}`);
                // Ensure the link is absolute if it was relative
                if (finalLink.startsWith("//")) {
                    finalLink = "https:" + finalLink;
                }
                return finalLink; // e.g., https://linkedmoviehub.top/?p=19307
            }
            // Fallback if the element or link is not found
            console.warn(`Could not find the final link (#link) on page: ${link}`);
            return link;
        }
        catch (error) {
            console.error(`Error scraping intermediate link ${link}:`, error.message);
            return link; // Return original link on error
        }
    });
};
exports.getFinalLink = getFinalLink;
/**
 * Extracts metadata and initial download links from the movie page.
 * This function now calls getFinalLink to resolve the first step of the download chain.
 */
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
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
            const infoContainer = $(".content.right").first();
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
            result.type = "movie";
            result.title = infoContainer.find("h1").text().trim() || "Unknown Title";
            result.imdbId = "";
            const poster = infoContainer.find(".sheader .poster img").first();
            let image = poster.attr("src") || poster.attr("data-src") || "";
            if (image.startsWith("//"))
                image = "https:" + image;
            result.image = image;
            const synopsisText = infoContainer
                .find("#info .wp-content p")
                .first()
                .text()
                .trim();
            result.synopsis = synopsisText || "";
            // --- LinkList extraction ---
            const links = [];
            const downloadRows = infoContainer.find("#download .links_table table tbody tr");
            for (let i = 0; i < downloadRows.length; i += 2) {
                const infoRow = $(downloadRows.get(i));
                const buttonRow = $(downloadRows.get(i + 1));
                if (infoRow.length === 0 || buttonRow.length === 0)
                    continue;
                const qualityMatch = infoRow.find(".qua").text().trim();
                const sizeMatch = infoRow.find(".siz").text().trim();
                const languageMatch = infoRow.find(".lan").text().trim();
                const fullTitle = `${languageMatch} ${qualityMatch} ${sizeMatch}`;
                const quality = qualityMatch.replace(/[\[\]]/g, "").trim();
                const downloadButton = buttonRow.find("a").first();
                const initialLink = downloadButton.attr("href"); // e.g., https://movielinkhub.fun/links/...
                if (initialLink && quality) {
                    // *** CRITICAL CHANGE: Use getFinalLink to scrape the link from the intermediate page ***
                    const resolvedLink = yield (0, exports.getFinalLink)({ link: initialLink, providerContext });
                    const directLinks = [
                        {
                            title: downloadButton.text().trim() || "Download",
                            link: resolvedLink, // This will be the linkedmoviehub.top/?p=... link
                            type: "movie",
                        },
                    ];
                    links.push({
                        title: fullTitle,
                        quality: quality,
                        episodesLink: resolvedLink,
                        directLinks,
                    });
                }
            }
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
