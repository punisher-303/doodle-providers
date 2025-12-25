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
        const $ = cheerio.load(res.data);
        const infoSection = $("section.video.sec-mar");
        // ---------- TITLE ----------
        const title = infoSection.find(".trailer-content h2").first().text().trim() ||
            ((_a = infoSection.find(".img-box img").attr("alt")) === null || _a === void 0 ? void 0 : _a.trim()) ||
            "";
        // ---------- IMAGE ----------
        let image = infoSection.find(".trailer-box img.image").attr("src") ||
            infoSection.find(".img-box img").attr("src") ||
            "";
        if (image.startsWith("//"))
            image = "https:" + image;
        // ---------- SYNOPSIS ----------
        const synopsis = infoSection
            .find(".trailer-content p.overview")
            .text()
            .trim();
        const result = {
            title,
            synopsis,
            image,
            imdbId: "",
            type: "series",
            linkList: [],
        };
        // =====================================================
        // ✅ SERIES (SEASONS)
        // =====================================================
        $(".dropdown-menu .season-link").each((_, el) => {
            const seasonNum = $(el).attr("data-season");
            const postId = $(el).attr("data-post");
            if (seasonNum && postId) {
                result.linkList.push({
                    title: `Season ${seasonNum}`,
                    quality: `Season ${seasonNum}`,
                    episodesLink: `${link}?season=${seasonNum}&post=${postId}`,
                    directLinks: [],
                });
            }
        });
        // seasons मिले → series
        if (result.linkList.length > 0) {
            result.type = "series";
            return result;
        }
        // =====================================================
        // ✅ MOVIE (PLAY → PAGE LINK ONLY)
        // =====================================================
        const hasIframe = $("#responsiveIframe").length > 0 ||
            infoSection.find("iframe").length > 0;
        if (hasIframe) {
            result.type = "movie";
            result.linkList = [
                {
                    title: "Play",
                    quality: "Movie",
                    episodesLink: link, // ✅ iframe हटाकर page link
                    directLinks: [],
                },
            ];
        }
        return result;
    })
        .catch((err) => {
        console.log("Meta error:", err);
        return empty;
    });
};
exports.getMeta = getMeta;
