"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = function ({ url, providerContext, }) {
    const { axios, cheerio, commonHeaders } = providerContext;
    return axios
        .get(url, { headers: commonHeaders })
        .then((res) => {
        const $ = cheerio.load(res.data || "");
        const episodes = [];
        $(".eplister ul li").each((_, el) => {
            const item = $(el);
            const a = item.find("a").first();
            let link = a.attr("href") || "";
            if (!link)
                return;
            if (link.startsWith("//"))
                link = "https:" + link;
            const epNum = item.find(".epl-num").text().trim();
            const epTitle = item.find(".epl-title").text().trim();
            const title = epTitle ||
                (epNum ? "Episode " + epNum : "");
            episodes.push({
                title,
                link,
            });
        });
        return episodes;
    })
        .catch((err) => {
        console.log("animekhor episodes error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
};
exports.getEpisodes = getEpisodes;
