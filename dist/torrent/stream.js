"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = void 0;
// Helper to detect audio tags like PlayTorrioV2
function detectAudioTags(name) {
    const n = name.toUpperCase();
    const found = [];
    if (n.includes("ATMOS"))
        found.push("Atmos");
    if (n.includes("TRUEHD"))
        found.push("TrueHD");
    if (n.includes("DTS:X") || n.includes("DTSX"))
        found.push("DTS:X");
    if (!found.includes("DTS:X") && (n.includes("DTS-HD") || n.includes("DTSHD")))
        found.push("DTS-HD");
    if (!found.includes("DTS:X") &&
        !found.includes("DTS-HD") &&
        n.includes("DTS"))
        found.push("DTS");
    if (n.includes("DD+") ||
        n.includes("EAC3") ||
        n.includes("E-AC-3") ||
        n.includes("DDPLUS") ||
        n.includes("DDP"))
        found.push("DD+");
    if (!found.includes("DD+") &&
        (n.includes(" DD ") ||
            n.includes("AC3") ||
            n.includes("DOLBY DIGITAL") ||
            n.includes(".DD.") ||
            n.includes("_DD_")))
        found.push("DD");
    if (n.includes("AAC"))
        found.push("AAC");
    if (n.includes("7.1"))
        found.push("7.1");
    if (!found.includes("7.1") && n.includes("5.1"))
        found.push("5.1");
    if (n.includes(" 2.0") || n.includes(".2.0"))
        found.push("2.0");
    return found;
}
// Helper to detect quality
function detectQuality(name) {
    const n = name.toUpperCase();
    if (n.includes("2160") || n.includes("4K") || n.includes("UHD"))
        return "2160";
    if (n.includes("1080"))
        return "1080";
    if (n.includes("720"))
        return "720";
    if (n.includes("480"))
        return "480";
    return "";
}
const getStream = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link, type, signal, providerContext }) {
    const payload = JSON.parse(link);
    const { imdbId, season, episode } = payload;
    if (!imdbId)
        return [];
    const query = season && episode
        ? `${imdbId} s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`
        : imdbId;
    const sources = [
        { name: "TorrentGalaxy", url: `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(query)}&sort=seeders&order=desc` },
    ];
    try {
        const tgRes = yield providerContext.axios.get(sources[0].url, { signal });
        const $ = providerContext.cheerio.load(tgRes.data);
        const streams = [];
        $(".tgxtable tr.tgxtablerow").each((_, el) => {
            const titleEl = $(el).find("a.tgxtitle");
            const name = titleEl.text().trim();
            const magnet = $(el).find('a[href^="magnet:"]').attr("href");
            const size = $(el).find("td").eq(4).text().trim();
            const seeders = $(el).find("td").eq(10).find("b").first().text().trim();
            if (magnet) {
                const audioTags = detectAudioTags(name);
                const quality = detectQuality(name);
                const serverInfo = [
                    "TGx",
                    quality ? (quality === "2160" ? "4K" : quality + "p") : "HD",
                    audioTags.join(", "),
                    size,
                    seeders + "S"
                ].filter(s => s).join(" | ");
                streams.push({
                    server: serverInfo,
                    link: magnet,
                    type: "torrent",
                    quality: quality,
                    isDebrid: true, // Mark as debrid-ready
                });
            }
        });
        return streams;
    }
    catch (err) {
        console.error("Torrent provider error:", err);
        return [];
    }
});
exports.getStream = getStream;
