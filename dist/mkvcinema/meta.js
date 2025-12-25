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
exports.fetchEpisodesFromSelectedLink = fetchEpisodesFromSelectedLink;
const headers = {
    Referer: "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
// --- fetchEpisodesFromSelectedLink (No Change) ---
function fetchEpisodesFromSelectedLink(url, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const { axios, cheerio } = providerContext;
        const res = yield axios.get(url, { headers });
        const $ = cheerio.load(res.data);
        const episodes = [];
        // 1. New Structure Handling (Direct Link Style from buttons)
        $("div a[href].myButton2, div a[href].myButton1, p a[href]").each((_, linkEl) => {
            const anchor = $(linkEl);
            let href = (anchor.attr("href") || "").trim();
            if (!href)
                return;
            if (!href.startsWith("http"))
                href = new URL(href, url).href;
            const btnText = anchor.text().trim() || "Watch Episode";
            const episodeMatch = btnText.match(/\bepisode\s*\d+|e\s*\d+/i);
            const episodeTitle = episodeMatch ? episodeMatch[0] : btnText;
            let existingEpisode = episodes.find(e => e.title === episodeTitle);
            if (!existingEpisode) {
                existingEpisode = {
                    title: episodeTitle,
                    directLinks: [],
                };
                episodes.push(existingEpisode);
            }
            existingEpisode.directLinks.push({
                link: href,
                title: btnText,
                quality: "AUTO",
                type: "episode",
            });
        });
        // 2. Old Structure Handling (Fall-back for pages that group links by <h4>/<h3>)
        if (episodes.length === 0) {
            $("h4, h3").each((_, hEl) => {
                const epTitle = $(hEl).text().trim();
                if (!epTitle)
                    return;
                const directLinks = [];
                $(hEl)
                    .nextUntil("h4, h3, hr")
                    .find("a[href]")
                    .each((_, linkEl) => {
                    let href = ($(linkEl).attr("href") || "").trim();
                    if (!href)
                        return;
                    if (!href.startsWith("http"))
                        href = new URL(href, url).href;
                    const btnText = $(linkEl).text().trim() || "Watch Episode";
                    directLinks.push({
                        link: href,
                        title: btnText,
                        quality: "AUTO",
                        type: "episode",
                    });
                });
                if (directLinks.length > 0) {
                    episodes.push({
                        title: epTitle,
                        directLinks,
                    });
                }
            });
        }
        return episodes;
    });
}
// --- Main getMeta function (UPDATED for Movie Titles) ---
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
        const { axios, cheerio } = providerContext;
        if (!link.startsWith("http"))
            link = new URL(link, "https://example.com").href;
        try {
            const res = yield axios.get(link, { headers });
            const $ = cheerio.load(res.data);
            const content = $(".entry-content, .post-inner").length
                ? $(".entry-content, .post-inner")
                : $("body");
            const title = $("h1.entry-title").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                "Unknown";
            // --- Type Detect ---
            const pageText = content.text();
            const type = (/Season\s*\d+/i.test(pageText) || /Episode\s*\d+/i.test(pageText))
                ? "series"
                : "movie";
            let image = $(".poster img").attr("src") ||
                $("meta[property='og:image']").attr("content") ||
                $("meta[name='twitter:image']").attr("content") ||
                "";
            if (image && !image.startsWith("http"))
                image = new URL(image, link).href;
            let synopsis = "";
            $("h2:contains('Storyline')").next("p").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt.length > 40) {
                    synopsis = txt;
                    return false;
                }
            });
            if (!synopsis) {
                $(".entry-content p").each((_, el) => {
                    const txt = $(el).text().trim();
                    if (txt.length > 40 && !txt.toLowerCase().includes("download")) {
                        synopsis = txt;
                        return false;
                    }
                });
            }
            const imdbLink = $("a[href*='imdb.com']").attr("href") || "";
            const imdbId = imdbLink
                ? "tt" + (((_c = imdbLink.split("/tt")[1]) === null || _c === void 0 ? void 0 : _c.split("/")[0]) || "")
                : "";
            const tags = [];
            $(".entry-content p strong").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt.match(/drama|biography|action|thriller|romance|adventure|animation|crime|horror|mystery/i))
                    tags.push(txt);
            });
            const extra = {};
            $("ul li").each((_, el) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const liText = $(el).text().trim();
                if (liText.includes("Full Name:"))
                    extra.name = (_a = liText.split(":")[1]) === null || _a === void 0 ? void 0 : _a.trim();
                if (liText.includes("Released"))
                    extra.year = (_b = liText.split(":")[1]) === null || _b === void 0 ? void 0 : _b.trim();
                if (liText.includes("Duration"))
                    extra.duration = (_c = liText.split(":")[1]) === null || _c === void 0 ? void 0 : _c.trim();
                if (liText.includes("Language:"))
                    extra.language = (_d = liText.split(":")[1]) === null || _d === void 0 ? void 0 : _d.trim();
                if (liText.includes("Subtitle"))
                    extra.subtitle = (_e = liText.split(":")[1]) === null || _e === void 0 ? void 0 : _e.trim();
                if (liText.includes("Size:"))
                    extra.size = (_f = liText.split(":")[1]) === null || _f === void 0 ? void 0 : _f.trim();
                if (liText.includes("Quality:"))
                    extra.quality = (_g = liText.split(":")[1]) === null || _g === void 0 ? void 0 : _g.trim();
                if (liText.includes("Format:"))
                    extra.format = (_h = liText.split(":")[1]) === null || _h === void 0 ? void 0 : _h.trim();
            });
            const links = [];
            const episodeList = [];
            const isInformationalHeading = (text) => {
                const lowerText = text.toLowerCase();
                return (lowerText.includes("series info") ||
                    lowerText.includes("movie info") ||
                    lowerText.includes("screenshott") ||
                    lowerText.includes("language") ||
                    lowerText.includes("released year") ||
                    lowerText.includes("episode size") ||
                    lowerText.includes("format") ||
                    lowerText.includes("imdb rating") ||
                    lowerText.includes("winding up") ||
                    (lowerText.length < 5 && !/\d/.test(lowerText)));
            };
            // --- Download Links Extraction ---
            if (type === "series") {
                // --- SERIES LOGIC (UNCHANGED, keeping only GDFlix links) ---
                content.find("h4, h3").each((_, hEl) => {
                    var _a;
                    const hText = $(hEl).text().trim();
                    if (isInformationalHeading(hText))
                        return;
                    const qualityMatch = ((_a = hText.match(/\d+p/)) === null || _a === void 0 ? void 0 : _a[0]) || "AUTO";
                    // Filter by GDFlix link
                    const gdflixLinkEl = $(hEl)
                        .nextUntil("h4, h3, hr")
                        .find("a[href]")
                        .filter((_, a) => /gdflix/i.test($(a).text()) || /gdflix/i.test(hText))
                        .first();
                    const href = gdflixLinkEl.attr("href");
                    if (href) {
                        const btnText = gdflixLinkEl.text().trim() || "GDFlix Link";
                        if (btnText.toLowerCase().includes("imdb rating") ||
                            btnText.toLowerCase().includes("winding up"))
                            return;
                        links.push({
                            title: hText,
                            quality: qualityMatch,
                            episodesLink: href,
                        });
                    }
                });
            }
            else {
                // --- MOVIE LOGIC (UPDATED to use full heading text as title) ---
                content.find("h4, h3").each((_, heading) => {
                    var _a;
                    let headingText = $(heading).text().trim();
                    if (isInformationalHeading(headingText))
                        return;
                    // Clean up leading/trailing white space characters from the text (like the '&nbsp;')
                    headingText = headingText.replace(/[\u00A0\s]+/g, ' ').trim();
                    const qualityMatch = ((_a = headingText.match(/\d+p/)) === null || _a === void 0 ? void 0 : _a[0]) || "AUTO";
                    const linkEl = $(heading)
                        .next("p")
                        .find("a[href]")
                        .first();
                    const href = linkEl.attr("href");
                    if (href) {
                        let finalHref = href.trim();
                        if (!finalHref.startsWith("http"))
                            finalHref = new URL(finalHref, link).href;
                        const btnText = linkEl.text().trim() || "Download Link";
                        if (btnText.toLowerCase().includes("imdb rating") ||
                            btnText.toLowerCase().includes("winding up"))
                            return;
                        links.push({
                            // Use the cleaned-up heading text as the primary title
                            title: headingText,
                            quality: qualityMatch,
                            episodesLink: "",
                            directLinks: [
                                {
                                    title: btnText, // The button text (e.g., "480p Download")
                                    link: finalHref,
                                    quality: qualityMatch,
                                    type: "movie"
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
                type: type,
                tags,
                cast: [],
                rating: $(".entry-meta .entry-date").text().trim() || "",
                linkList: links,
                extraInfo: extra,
                episodeList,
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
                extraInfo: {},
                episodeList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
