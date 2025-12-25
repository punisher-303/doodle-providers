"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = void 0;
// universal base64 decode
function decodeBase64(input) {
    try {
        if (typeof atob === "function") {
            return decodeURIComponent(Array.prototype.map
                .call(atob(input), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join(""));
        }
    }
    catch (_a) { }
    // fallback (older JS engines)
    try {
        return Buffer.from(input, "base64").toString("utf-8");
    }
    catch (_b) {
        return "";
    }
}
const getStream = function ({ link, providerContext, }) {
    const { axios, cheerio, commonHeaders } = providerContext;
    return axios
        .get(link, { headers: commonHeaders })
        .then((res) => {
        const $ = cheerio.load(res.data || "");
        const streams = [];
        $("select.mirror option").each((_, el) => {
            const encoded = $(el).attr("value") || "";
            if (!encoded)
                return;
            const decoded = decodeBase64(encoded);
            if (!decoded)
                return;
            // 🔥 ONLY RUMBLE
            if (!decoded.includes("rumble.com/embed/"))
                return;
            // extract ID
            const match = decoded.match(/rumble\.com\/embed\/v([a-zA-Z0-9]+)/);
            if (!match)
                return;
            const rumbleId = match[1];
            // convert to m3u8
            const m3u8 = `https://rumble.com/hls-vod/${rumbleId}/playlist.m3u8`;
            streams.push({
                server: "Rumble",
                link: m3u8,
                type: "m3u8",
                subtitles: [],
            });
        });
        return streams;
    })
        .catch((err) => {
        console.log("animekhor stream error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
};
exports.getStream = getStream;
