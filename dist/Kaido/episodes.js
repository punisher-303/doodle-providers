"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = function ({ url, providerContext, }) {
    const { axios, cheerio, commonHeaders } = providerContext;
    // ------------------ EXTRACT ANIME ID FROM URL ------------------
    const match = url.match(/-(\d+)$/);
    const animeId = match ? match[1] : null;
    if (!animeId) {
        console.error("Anime ID not found in URL");
        return Promise.resolve([]);
    }
    const ajaxUrl = `https://kaido.to/ajax/episode/list/${animeId}`;
    return axios
        .get(ajaxUrl, { headers: commonHeaders })
        .then((res) => {
        const data = res.data;
        let htmlContent = "";
        // Kaido sometimes wraps HTML in 'html' field
        if (typeof data === "object" && data.html) {
            htmlContent = data.html;
        }
        else if (typeof data === "string") {
            htmlContent = data;
        }
        else {
            return [];
        }
        const $ = cheerio.load(htmlContent);
        const episodes = [];
        // ------------------ EXTRACT EPISODE LINKS ------------------
        $(".ssl-item").each((_, el) => {
            const ep = $(el);
            let title = ep.attr("title") || ep.find(".ep-name").text().trim();
            let link = ep.attr("href") || "";
            if (!link)
                return;
            if (!link.startsWith("http")) {
                link = "https://kaido.to" + link;
            }
            episodes.push({ title, link });
        });
        return episodes;
    })
        .catch((err) => {
        console.error("Kaido episodes AJAX error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
};
exports.getEpisodes = getEpisodes;
