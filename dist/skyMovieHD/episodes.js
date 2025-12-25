"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = function ({ url, providerContext, }) {
    const { axios, cheerio, commonHeaders: headers } = providerContext;
    console.log("getEpisodeLinks", url);
    return axios
        .get(url, { headers })
        .then((res) => {
        const $ = cheerio.load(res.data);
        const container = $(".entry-content, .entry-inner");
        // Remove unnecessary elements
        $(".unili-content, .code-block-1").remove();
        const episodes = [];
        container.find("h4, h3").each((_, element) => {
            const el = $(element);
            let title = el.text().replace(/[-:]/g, "").trim();
            if (!title)
                return;
            // Saare V-Cloud links fetch
            el.next("p")
                .find("a[href*='vcloud.lol']")
                .each((_, a) => {
                var _a;
                const anchor = $(a);
                const href = (_a = anchor.attr("href")) === null || _a === void 0 ? void 0 : _a.trim();
                if (href) {
                    episodes.push({ title, link: href });
                }
            });
        });
        return episodes;
    })
        .catch((err) => {
        console.log("getEpisodeLinks error:", err);
        return [];
    });
};
exports.getEpisodes = getEpisodes;
