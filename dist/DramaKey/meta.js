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
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c, _d;
        const { axios, cheerio } = providerContext;
        const url = link;
        const baseUrl = url.split("/").slice(0, 3).join("/");
        const emptyResult = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "series",
            linkList: [],
        };
        try {
            const response = yield axios.get(url, {
                headers: Object.assign(Object.assign({}, headers), { Referer: baseUrl }),
            });
            const $ = cheerio.load(response.data);
            // The main container on the Kdrama page is '.content.right'
            const infoContainer = $(".content.right").first();
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "series",
                linkList: [],
            };
            // --- Type determination ---
            // The page structure (itemtype TVSeries and episode links) confirms this is a series.
            result.type = "series";
            // --- Title ---
            // The main title is inside h1 under the '.data' div
            result.title = infoContainer.find(".data h1").text().trim() || "Unknown Title";
            // --- IMDb ID ---
            // Logic to find an IMDb ID (tt followed by digits).
            // Note: The provided HTML snippet does not contain a valid ttXXXXXXX ID.
            const imdbMatch = ((_b = infoContainer.html()) === null || _b === void 0 ? void 0 : _b.match(/tt\d+/)) ||
                ((_c = $("a[href*='imdb.com/title/']").attr("href")) === null || _c === void 0 ? void 0 : _c.match(/tt\d+/));
            result.imdbId = imdbMatch ? imdbMatch[0] : "";
            // --- Image ---
            // Image is inside the .poster div
            let image = ((_d = infoContainer.find(".poster img[src]").first().attr("src")) === null || _d === void 0 ? void 0 : _d.split("?")[0]) || // Clean up URL parameters
                "";
            if (image.startsWith("//"))
                image = "https:" + image;
            result.image = image;
            // --- Synopsis ---
            // Synopsis is inside the #info sbox, within the .wp-content div.
            const synopsisContent = $("#info .wp-content").first();
            let rawSynopsis = "";
            // Concatenate the text from all initial <p> tags until the Native Title block
            synopsisContent.find('> p').each((i, el) => {
                const pText = $(el).text().trim();
                // Stop if we hit the paragraph before the Native Title/AKAs
                if (pText.includes("Native Title:")) {
                    return false; // Exit the loop
                }
                if (pText.length > 0) {
                    rawSynopsis += pText + "\n\n";
                }
            });
            result.synopsis = rawSynopsis.trim();
            // --- LinkList extraction (Updated for GDFlix/HubCloud structure) ---
            const links = [];
            // 1. Extract Batch Links (GDFlix links)
            // These are inside specific blocks with class 'ub-button-container' and href starting with gdflix.dev
            const gdflixButtons = infoContainer.find("a[href*='gdflix.dev/pack']");
            gdflixButtons.each((index, element) => {
                var _a;
                const el = $(element);
                // Title is inside the span child of the anchor
                const fullTitle = el.find(".ub-button-block-btn").text().trim();
                const gdflixLink = el.attr("href");
                if (gdflixLink && fullTitle) {
                    const qualityMatch = ((_a = fullTitle.match(/\d+p\b/)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                    // This is a batch/pack link, typically listed once per quality/format
                    links.push({
                        title: fullTitle,
                        quality: qualityMatch,
                        episodesLink: gdflixLink, // The GDFlix link to the whole pack
                        directLinks: [
                            {
                                title: "GDFlix Pack Link",
                                link: gdflixLink,
                                type: "series",
                            }
                        ],
                    });
                }
            });
            // 2. Extract Episode-wise Links (HubCloud links)
            // These are inside the collapsible accordions (.wp-block-ub-content-toggle-accordion)
            const toggleBlocks = infoContainer.find(".wp-block-ub-content-toggle-accordion");
            toggleBlocks.each((index, element) => {
                var _a;
                const el = $(element);
                // Get the title of the collapsible section 
                const accordionTitle = el.find(".wp-block-ub-content-toggle-accordion-title").text().trim();
                const qualityMatch = ((_a = accordionTitle.match(/\d+p\b/)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                const directLinks = [];
                let firstEpisodeLink;
                // Find all episode links within the content panel
                el.find('div[role="region"] a[href*="hubcloud.fyi"]').each((i, linkEl) => {
                    const aEl = $(linkEl);
                    const link = aEl.attr("href");
                    const title = aEl.text().trim();
                    if (link && title) {
                        if (!firstEpisodeLink)
                            firstEpisodeLink = link;
                        directLinks.push({
                            title: title,
                            link: link,
                            type: "episode", // Episode specific links
                        });
                    }
                });
                if (directLinks.length > 0 && firstEpisodeLink) {
                    links.push({
                        title: accordionTitle,
                        quality: qualityMatch,
                        episodesLink: firstEpisodeLink, // Use the first episode link as the representative link
                        directLinks: directLinks,
                    });
                }
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
