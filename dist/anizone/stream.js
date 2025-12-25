"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = void 0;
const getStream = function ({ link: url, providerContext, }) {
    const { axios, cheerio, commonHeaders } = providerContext;
    return axios
        .get(url, { headers: commonHeaders })
        .then((res) => {
        const $ = cheerio.load(res.data || "");
        const streams = [];
        const m3u8 = $("media-player").attr("src");
        if (!m3u8)
            return [];
        const subtitles = [];
        $("track[kind='subtitles']").each((_, el) => {
            let src = $(el).attr("src");
            if (!src)
                return;
            if (src.startsWith("/")) {
                src = new URL(src, url).href;
            }
            subtitles.push({
                title: $(el).attr("label") || "Subtitle",
                language: $(el).attr("srclang") || "en",
                type: "text/vtt",
                uri: src,
            });
        });
        streams.push({
            server: "AniZone",
            link: m3u8,
            type: "m3u8",
        });
        return streams;
    })
        .catch((err) => {
        console.error("AniZone stream error:", err);
        return [];
    });
};
exports.getStream = getStream;
