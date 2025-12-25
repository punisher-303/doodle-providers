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
            type: "movie",
            linkList: [],
        };
        try {
            const response = yield axios.get(url, {
                headers: Object.assign(Object.assign({}, headers), { Referer: baseUrl }),
            });
            const $ = cheerio.load(response.data);
            // New primary container for movie info and download links
            const infoContainer = $(".sheader, #info");
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
            // --- Type determination ---
            result.type = "movie";
            // --- Title ---
            const rawTitle = infoContainer.find("h1").first().text().trim();
            // Get the clean base title (e.g., "The Man with the Iron Fists")
            const baseTitle = rawTitle.replace(/\s*\(\d{4}\)|\s*Hindi Dubbed/gi, "").trim();
            result.title = baseTitle || "Unknown Title";
            // --- IMDb ID ---
            const imdbIdMatch = (_b = infoContainer.html()) === null || _b === void 0 ? void 0 : _b.match(/tt\d+/i);
            const imdbLinkMatch = (_c = $("a[href*='imdb.com/title/']").attr("href")) === null || _c === void 0 ? void 0 : _c.match(/tt\d+/i);
            result.imdbId = imdbIdMatch ? imdbIdMatch[0] : (imdbLinkMatch ? imdbLinkMatch[0] : "");
            // --- Image ---
            let image = infoContainer.find(".sheader .poster img").attr("src") || "";
            if (!image) {
                image = $(".fakeplayer img.cover").attr("src") || "";
            }
            result.image = image;
            // --- Synopsis ---
            const synopsisContainer = $("#info .wp-content");
            // Cloning the container to safely remove elements for synopsis extraction
            const cloneContainer = synopsisContainer.clone();
            cloneContainer.find('a[target="_blank"], hr, button, ul.wp-tags, .download-links-section').remove(); // Added .download-links-section
            let rawSynopsis = cloneContainer.text().trim();
            const plotMatch = rawSynopsis.match(/In feudal China, a blacksmith who makes weapons for a small village is put in the position where he must defend himself and his fellow villagers\./);
            if (plotMatch) {
                result.synopsis = plotMatch[0];
            }
            else {
                result.synopsis = ((_d = rawSynopsis.split(/Watch online Movies Free Download,/).pop()) === null || _d === void 0 ? void 0 : _d.trim()) || "";
            }
            // --- LinkList extraction (Guaranteed Unique Keys) ---
            const finalLinks = [];
            // SELECTOR CHANGE: Target all relevant containers for links
            // This includes the old .wp-content and the newly introduced .download-links-section
            const linkContainers = $("#info .wp-content, .download-links-section");
            linkContainers.find("a[target='_blank']").each((i, el) => {
                var _a, _b, _c;
                const btnEl = $(el);
                const link = btnEl.attr("href");
                const buttonText = btnEl.find("button.dipesh").text().trim();
                if (link && buttonText) {
                    const qualityMatch = ((_a = buttonText.match(/(\d+p)\b/i)) === null || _a === void 0 ? void 0 : _a[1]) || "HD";
                    // Extract Service Name (e.g., GDFlix) - Remove brackets for clean title
                    const serviceMatch = ((_b = buttonText.match(/\[(.*?)\]/i)) === null || _b === void 0 ? void 0 : _b[1]) || "Direct Download";
                    // Extract File Size (e.g., 2.21 GB)
                    const sizeMatch = ((_c = buttonText.match(/(\d+\.?\d*\s*(?:GB|MB))\b/i)) === null || _c === void 0 ? void 0 : _c[1]) || "";
                    // --- Determine the final title format for the Link object ---
                    // Example: Movie Title (1080P - Gdflix 2.21 GB)
                    const linkTitle = `${result.title} (${qualityMatch} - ${serviceMatch} ${sizeMatch})`;
                    // --- Create a new top-level Link entry for every button ---
                    const linkEntry = {
                        title: linkTitle, // The complete, unique title
                        quality: qualityMatch,
                        episodesLink: link, // The link itself
                        directLinks: [{
                                title: serviceMatch,
                                link: link,
                                type: "movie",
                            }],
                    };
                    finalLinks.push(linkEntry);
                }
            });
            // Assign the list of unique Link objects
            result.linkList = finalLinks;
            return result;
        }
        catch (err) {
            console.log("getMeta error:", err);
            return emptyResult;
        }
    });
};
exports.getMeta = getMeta;
