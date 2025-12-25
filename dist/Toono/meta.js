"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeta = void 0;
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-store",
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
        const $ = cheerio.load(res.data);
        // ---------------- TITLE ----------------
        const title = $("header.entry-header h1.entry-title")
            .first()
            .text()
            .trim();
        // ---------------- IMAGE ----------------
        let image = $(".post-thumbnail img").first().attr("src") ||
            $("img").first().attr("src") ||
            "";
        if (image.startsWith("//"))
            image = "https:" + image;
        // ---------------- SYNOPSIS ----------------
        const synopsis = $(".description p").first().text().trim();
        const info = {
            title,
            synopsis,
            image,
            imdbId: "",
            type: "series",
            linkList: [],
        };
        // ---------------- SEASONS ----------------
        $(".choose-season ul.sub-menu li a").each((_, el) => {
            const text = $(el).text().trim();
            const match = text.match(/\d+/);
            const seasonNum = match ? match[0] : null;
            if (seasonNum) {
                info.linkList.push({
                    title: "Season " + seasonNum,
                    quality: "Season " + seasonNum,
                    episodesLink: link,
                    directLinks: [],
                });
            }
        });
        // ---------------- FALLBACK (Single Season) ----------------
        if (info.linkList.length === 0 &&
            $("section.episodes").length > 0) {
            info.linkList.push({
                title: "Season 1",
                quality: "Season 1",
                episodesLink: link,
                directLinks: [],
            });
        }
        return info;
    })
        .catch((err) => {
        console.log("meta error:", err);
        return empty;
    });
};
exports.getMeta = getMeta;
