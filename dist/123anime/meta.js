"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeta = void 0;
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const getMeta = function ({ link, providerContext, }) {
    const { axios, cheerio } = providerContext;
    const empty = {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "series",
        linkList: [],
    };
    return axios
        .get(link, { headers })
        .then((res) => {
        var _a;
        const $ = cheerio.load(res.data || "");
        // --------------------------------------------------
        // TITLE
        // --------------------------------------------------
        const title = $("h2.title").first().text().trim() ||
            ((_a = $(".thumb img").attr("alt")) === null || _a === void 0 ? void 0 : _a.trim()) ||
            "";
        // --------------------------------------------------
        // IMAGE
        // --------------------------------------------------
        let image = $(".thumb img").attr("src") || "";
        if (image.startsWith("//"))
            image = "https:" + image;
        if (image && image.startsWith("/")) {
            image = new URL(image, link).href;
        }
        // --------------------------------------------------
        // SYNOPSIS
        // --------------------------------------------------
        const synopsis = $(".desc .long").text().trim() ||
            $(".desc .short").text().trim() ||
            "";
        const result = {
            title,
            synopsis,
            image,
            imdbId: "",
            type: "series",
            linkList: [],
        };
        // --------------------------------------------------
        // TYPE (TV / MOVIE)
        // --------------------------------------------------
        const typeText = $("dt:contains('Type')")
            .next("dd")
            .text()
            .toLowerCase();
        if (typeText.includes("movie")) {
            result.type = "movie";
        }
        else {
            result.type = "series";
        }
        // --------------------------------------------------
        // LINK LIST (MAIN + EPISODES)
        // --------------------------------------------------
        const addedLinks = new Set();
        // ✅ MAIN META LINK (same link used in meta.ts)
        result.linkList.push({
            title: "Series Info",
            quality: "HD",
            episodesLink: link,
            directLinks: [],
        });
        addedLinks.add(link);
        // --------------------------------------------------
        // EPISODES
        // --------------------------------------------------
        $(".widget.servers ul.episodes li a").each((_, el) => {
            const epNum = $(el).text().trim();
            let epLink = $(el).attr("href");
            if (!epLink)
                return;
            if (epLink.startsWith("/")) {
                epLink = new URL(epLink, link).href;
            }
            if (addedLinks.has(epLink))
                return;
            addedLinks.add(epLink);
            result.linkList.push({
                title: `Episode ${epNum}`,
                quality: "HD",
                episodesLink: epLink,
                directLinks: [],
            });
        });
        // --------------------------------------------------
        // FALLBACK: MOVIE
        // --------------------------------------------------
        if (result.type === "movie") {
            result.linkList = [
                {
                    title: "Play",
                    quality: "HD",
                    episodesLink: link,
                    directLinks: [],
                },
            ];
        }
        return result;
    })
        .catch((err) => {
        console.error("Meta error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return empty;
    });
};
exports.getMeta = getMeta;
