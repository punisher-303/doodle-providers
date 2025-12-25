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
// --- Fetch episodes from VGMLINKS page
function fetchEpisodesFromSelectedLink(url, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const { axios, cheerio } = providerContext;
        const res = yield axios.get(url, { headers });
        const $ = cheerio.load(res.data);
        const episodes = [];
        $("h4").each((_, h4El) => {
            const epTitle = $(h4El).text().trim();
            if (!epTitle)
                return;
            const directLinks = [];
            $(h4El)
                .nextUntil("h4, hr")
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
        return episodes;
    });
}
// --- Main getMeta function
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
        const { axios, cheerio } = providerContext;
        if (!link.startsWith("http"))
            link = new URL(link, "https://vgmlinks.click").href;
        try {
            const res = yield axios.get(link, { headers });
            const $ = cheerio.load(res.data);
            const title = $("h1.entry-title").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                "Unknown";
            let image = $(".poster img").attr("src") ||
                $("meta[property='og:image']").attr("content") ||
                $("meta[name='twitter:image']").attr("content") ||
                "";
            if (image && !image.startsWith("http"))
                image = new URL(image, link).href;
            let synopsis = "";
            $(".entry-content p").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt.length > 40 && !txt.toLowerCase().includes("download")) {
                    synopsis = txt;
                    return false;
                }
            });
            const imdbLink = $("a[href*='imdb.com']").attr("href") || "";
            const imdbId = imdbLink
                ? "tt" + (((_c = imdbLink.split("/tt")[1]) === null || _c === void 0 ? void 0 : _c.split("/")[0]) || "")
                : "";
            const tags = [];
            $(".entry-content p strong").each((_, el) => {
                const txt = $(el).text().trim();
                if (txt.match(/drama|biography|action|thriller|romance|adventure|animation/i))
                    tags.push(txt);
            });
            const extra = {};
            $("p").each((_, el) => {
                var _a, _b, _c, _d, _e, _f;
                const html = $(el).html() || "";
                if (html.includes("Series Name"))
                    extra.name = (_a = $(el).text().split(":")[1]) === null || _a === void 0 ? void 0 : _a.trim();
                if (html.includes("Language"))
                    extra.language = (_b = $(el).text().split(":")[1]) === null || _b === void 0 ? void 0 : _b.trim();
                if (html.includes("Released Year"))
                    extra.year = (_c = $(el).text().split(":")[1]) === null || _c === void 0 ? void 0 : _c.trim();
                if (html.includes("Quality"))
                    extra.quality = (_d = $(el).text().split(":")[1]) === null || _d === void 0 ? void 0 : _d.trim();
                if (html.includes("Episode Size"))
                    extra.size = (_e = $(el).text().split(":")[1]) === null || _e === void 0 ? void 0 : _e.trim();
                if (html.includes("Format"))
                    extra.format = (_f = $(el).text().split(":")[1]) === null || _f === void 0 ? void 0 : _f.trim();
            });
            let links = [];
            let episodeList = [];
            // --- Fetch links including h3/button text
            $("h3").each((_, h3El) => {
                const seasonText = $(h3El).text().trim();
                $(h3El)
                    .nextUntil("h3, hr")
                    .find("a[href]")
                    .each((_, aEl) => {
                    let href = ($(aEl).attr("href") || "").trim();
                    if (!href)
                        return;
                    if (!href.startsWith("http"))
                        href = new URL(href, link).href;
                    const btnText = $(aEl).text().trim() || "Link";
                    // --- Hide unwanted texts
                    if (btnText.toLowerCase().includes("imdb rating") ||
                        btnText.toLowerCase().includes("winding up"))
                        return;
                    links.push({
                        title: `${seasonText} - ${btnText}`,
                        directLinks: [
                            {
                                link: href,
                                title: btnText,
                                quality: "AUTO",
                                type: "movie",
                            },
                        ],
                        episodesLink: href,
                    });
                });
            });
            // --- Reorder links: put V-Cloud & Source 2 first
            links = [
                ...links.filter((l) => l.title.toLowerCase().includes("v-cloud") ||
                    l.title.toLowerCase().includes("source 2")),
                ...links.filter((l) => !l.title.toLowerCase().includes("v-cloud") &&
                    !l.title.toLowerCase().includes("source 2")),
            ];
            return {
                title,
                synopsis,
                image,
                imdbId,
                type: "series",
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
