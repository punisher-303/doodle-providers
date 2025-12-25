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
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    DNT: "1",
    Origin: "https://nexdrive.one",
    Referer: "https://nexdrive.one/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not=A?Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    Cookie: "_ga=GA1.1.1001107919.1762037833; _ga_7YXLT91MT2=GS2.1.s1762037832$o1$g1$t1762037851$j41$l0$h0; prefetchAd_8508552=true",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
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
            // Use the container class from the ZeeFliz HTML
            const infoContainer = $(".entry-content, .post-inner").first();
            const result = {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
            // --- Type determination (Based on content, the HTML is for a Series) ---
            // The previous HTML had "Series Name: Bigg Boss" and "Season: Season 19"
            // We'll use a text check on the whole container to confirm series type.
            if (/Season \d+|Series Info:/i.test(infoContainer.text())) {
                result.type = "series";
            }
            else {
                result.type = "movie";
            }
            // --- Title (Adapted for ZeeFliz H1/H2 structure) ---
            const rawTitle = $("h1").text().trim() || $("h2").text().trim();
            // The main title on the ZeeFliz page was in a centered <h3>
            const downloadH3Title = $("h3:contains('Download'):contains('Bigg Boss')").text();
            let finalTitle = downloadH3Title || rawTitle;
            // Clean up title (remove 'Download', site name, quality tags)
            finalTitle = finalTitle.replace(/Download|~ ZeeFliz.com/g, "").trim();
            result.title = finalTitle.split(/\[| \d+p| x\d+/)[0].trim() || "Unknown Title";
            // --- IMDb ID ---
            const imdbMatch = ((_b = infoContainer.html()) === null || _b === void 0 ? void 0 : _b.match(/tt\d+/)) ||
                ((_c = $("a[href*='imdb.com/title/']").attr("href")) === null || _c === void 0 ? void 0 : _c.match(/tt\d+/));
            result.imdbId = imdbMatch ? imdbMatch[0] : ""; // Will correctly find 'tt1281973'
            // --- Image ---
            let image = infoContainer.find("img[src]").first().attr("src") ||
                "";
            if (image.startsWith("//"))
                image = "https:" + image;
            // Handle the specific data-src attribute for the screenshot in the ZeeFliz HTML
            if (!image) {
                image = infoContainer.find("img[data-src]").first().attr("data-src") || "";
            }
            if (image.includes("no-thumbnail") || image.includes("placeholder"))
                image = "";
            result.image = image;
            // --- Synopsis ---
            // Target the 'Series-SYNOPSIS/PLOT:' heading and its next paragraph
            const synopsisHeading = infoContainer.find("h3:contains('SYNOPSIS'), h3:contains('PLOT')").first();
            result.synopsis = synopsisHeading.next("p").text().trim() || "";
            // --- LinkList extraction (Updated for the simple H3/A structure) ---
            const links = [];
            // Target all anchor tags that are directly inside a center-aligned H3.
            // We look for <h3> containing an <a> where the text matches the pattern "XXXp [YYY]"
            $("h3 a").each((index, element) => {
                var _a;
                const el = $(element);
                const fullText = el.text().trim(); // e.g., '1080p [2.64GB]'
                const link = el.attr('href');
                // Ensure the text contains both quality (XXXp) and size ([YYY])
                if (link && fullText.match(/\d+p\b/) && fullText.match(/\[(.*?)\]/)) {
                    const qualityMatch = ((_a = fullText.match(/\d+p\b/)) === null || _a === void 0 ? void 0 : _a[0]) || ""; // e.g., '1080p'
                    const sizeMatch = fullText.match(/\[(.*?)\]/);
                    const size = sizeMatch ? sizeMatch[1] : ''; // e.g., '2.64GB'
                    const linkTitle = `${qualityMatch} (${size})`;
                    links.push({
                        title: linkTitle,
                        quality: qualityMatch,
                        episodesLink: link, // The link itself is the episodes link (for a single file/batch)
                        directLinks: [
                            {
                                title: linkTitle,
                                link: link,
                            }
                        ],
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
