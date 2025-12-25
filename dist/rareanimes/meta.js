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
const headers = {
    Referer: "https://google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c, _d;
        try {
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(link, { headers });
            const $ = cheerio.load(res.data);
            // --- Container
            const container = $("article, .entry-content").first();
            // --- Title
            let rawTitle = container.find("h1").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                $("title").text().trim();
            const title = rawTitle
                .replace(/RareAnimes/gi, "")
                .replace(/\[.*?\]/g, "")
                .replace(/\(.+?\)/g, "")
                .replace(/\s{2,}/g, " ")
                .trim();
            // --- Type
            const type = /season|episode|ep\s*\d+/i.test(title)
                ? "series"
                : "movie";
            // --- Synopsis
            const synopsis = container
                .find("p")
                .map((_, el) => $(el).text().trim())
                .get()
                .join(" ") ||
                $("meta[name='description']").attr("content") ||
                $("meta[property='og:description']").attr("content") ||
                "";
            // --- Image
            const image = container.find("img").first().attr("src") ||
                container.find("img").first().attr("data-src") ||
                $("meta[property='og:image']").attr("content") ||
                $("img").first().attr("src") ||
                "";
            // --- IMDb Id
            const imdbId = ((_d = (_c = $('a[href*="imdb.com/title/tt"]').attr("href")) === null || _c === void 0 ? void 0 : _c.match(/tt\d+/)) === null || _d === void 0 ? void 0 : _d[0]) || "";
            // --- Links
            const links = [];
            const episodeLinks = [];
            const seenLinks = new Set();
            // --- Episodes (improved selectors)
            $('a:contains("Episode"), a:contains("EP"), .eplister a, .episodelist a, ul li a').each((_, el) => {
                const epTitle = $(el).text().trim();
                const epLink = $(el).attr("href");
                if (!epLink)
                    return;
                const finalLink = epLink.startsWith("http")
                    ? epLink
                    : new URL(epLink, link).href;
                if (seenLinks.has(finalLink))
                    return;
                seenLinks.add(finalLink);
                // Extract episode number
                const numberMatch = epTitle.match(/(\d+)/);
                const fullTitle = numberMatch
                    ? `Episode ${numberMatch[0]} - ${title}`
                    : epTitle || `Episode - ${title}`;
                episodeLinks.push({
                    title: fullTitle,
                    link: finalLink,
                    type: "episode",
                });
            });
            // --- Movie / Quality Links
            container.find("a").each((_, el) => {
                var _a;
                const qText = $(el).text().trim();
                const qLink = $(el).attr("href");
                if (!qLink)
                    return;
                const finalLink = qLink.startsWith("http")
                    ? qLink
                    : new URL(qLink, link).href;
                if (seenLinks.has(finalLink))
                    return;
                if (/480|720|1080|2160|4K|mp4|m3u8/i.test(qText)) {
                    seenLinks.add(finalLink);
                    episodeLinks.push({
                        title: qText || "Movie",
                        link: finalLink,
                        type: "movie",
                        quality: ((_a = qText.match(/\b(480p|720p|1080p|2160p|4K)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "",
                    });
                }
            });
            // --- Embedded JS links (mp4/m3u8 inside <script>)
            const scriptData = $("script")
                .map((_, el) => $(el).html())
                .get()
                .join(" ");
            const jsMatches = [
                ...scriptData.matchAll(/https?:\/\/[^\s'"]+\.(mp4|m3u8)/gi),
            ];
            jsMatches.forEach((m) => {
                if (!seenLinks.has(m[0])) {
                    seenLinks.add(m[0]);
                    episodeLinks.push({
                        title: "Stream Link",
                        link: m[0],
                        type: "movie",
                    });
                }
            });
            // --- Push into final structure
            if (episodeLinks.length > 0) {
                links.push({
                    title,
                    directLinks: episodeLinks,
                });
            }
            return {
                title,
                synopsis,
                image,
                imdbId,
                type,
                linkList: links,
            };
        }
        catch (err) {
            console.error("❌ RareAnimes meta fetch error:", err);
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
