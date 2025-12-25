"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpisodes = void 0;
const getEpisodes = ({ url, providerContext, }) => {
    const episodes = [];
    // slug निकालो
    const slug = url.split("/anime/")[1];
    return fetch(`https://dwnld.justanime.to/api/search?q=${slug}`)
        .then((res) => res.json())
        .then((searchJson) => {
        var _a;
        if (!((_a = searchJson === null || searchJson === void 0 ? void 0 : searchJson.data) === null || _a === void 0 ? void 0 : _a.length))
            return episodes;
        const session = searchJson.data[0].session;
        return fetch(`https://dwnld.justanime.to/api/${session}/releases?page=1`)
            .then((res) => res.json())
            .then((releasesJson) => {
            const totalEpisodes = releasesJson.paginationInfo.total;
            for (let ep = 1; ep <= totalEpisodes; ep++) {
                episodes.push({
                    title: `Episode ${ep}`,
                    link: `${url}/episode/${ep}`,
                });
            }
            return episodes;
        });
    })
        .catch(() => episodes);
};
exports.getEpisodes = getEpisodes;
