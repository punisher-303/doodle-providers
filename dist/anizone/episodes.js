"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = ({ url, providerContext, }) => {
    const { axios, cheerio, commonHeaders } = providerContext;
    return axios
        .get(url, { headers: commonHeaders })
        .then((res) => {
        const $ = cheerio.load(res.data || "");
        const episodes = [];
        // =====================================================
        // ✅ NEW EPISODE BUTTON SELECTOR
        // =====================================================
        $("a[wire\\:navigate]").each((_, el) => {
            const a = $(el);
            const href = a.attr("href");
            if (!href || !href.includes("/anime/"))
                return;
            const epNum = a.find("div.min-w-10").text().trim();
            const epTitle = a.find("div.grow").text().trim();
            if (!epNum)
                return;
            const title = epTitle
                ? `Episode ${epNum} - ${epTitle}`
                : `Episode ${epNum}`;
            const link = href.startsWith("http")
                ? href
                : new URL(href, url).href;
            episodes.push({ title, link });
        });
        return episodes;
    })
        .catch((err) => {
        console.error("AniZone episodes error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
};
exports.getEpisodes = getEpisodes;
