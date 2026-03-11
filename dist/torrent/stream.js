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
    // 1. Handle if link is already a magnet or direct HTTP link
    if (typeof link === 'string') {
        if (link.startsWith('magnet:')) {
            return [{
                    name: "Torrent Stream",
                    server: "Torrent",
                    link: link,
                    type: "torrent",
                    quality: "1080",
                    isDebrid: true,
                }];
        }
        if (link.startsWith('http')) {
            return [{
                    name: "Resolved Stream",
                    server: "Direct",
                    link: link,
                    type: "mp4",
                    quality: "1080",
                    isResolved: true,
                }];
        }
    }
    let payload;
    try {
        payload = JSON.parse(link);
    }
    catch (e) {
        console.error("Failed to parse link as JSON:", link);
        return [];
    }
    const { imdbId, season, episode, title, showTitle, year, keyword } = payload;
    if (!imdbId && !title && !showTitle && !keyword)
        return [];
    const streams = [];
    // 1. Construct prioritized queries for trackers
    const querySet = new Set();
    if (keyword) {
        querySet.add(keyword);
    }
    else if (season && episode) {
        const s = season.toString().padStart(2, '0');
        const e = episode.toString().padStart(2, '0');
        if (showTitle)
            querySet.add(`${showTitle} S${s}E${e}`);
        if (imdbId)
            querySet.add(`${imdbId} S${s}E${e}`);
    }
    else {
        // For Movies: Try IMDB ID, then Title + Year, then Title
        if (imdbId)
            querySet.add(imdbId);
        if (title && year)
            querySet.add(`${title} ${year}`);
        if (title)
            querySet.add(title);
    }
    const queries = Array.from(querySet);
    // Helper for parallel execution of all queries across all scrapers
    const runScraper = (name, fn) => __awaiter(void 0, void 0, void 0, function* () {
        // Run all queries in parallel for this scraper
        const scraperTasks = queries.map((q) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const results = yield fn(q);
                streams.push(...results);
            }
            catch (e) {
                console.error(`Scraper ${name} failed for query ${q}:`, e.message);
            }
        }));
        yield Promise.allSettled(scraperTasks);
    });
    const tasks = [
        // 5. Knaben (PlayTorrio's Primary Source)
        runScraper("Knaben", (q) => __awaiter(void 0, void 0, void 0, function* () {
            // Knaben format: https://knaben.org/search/<query>/0/1/seeders
            const url = `https://knaben.org/search/${encodeURIComponent(q)}/0/1/seeders`;
            const res = yield providerContext.axios.get(url, {
                signal,
                timeout: 8000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = providerContext.cheerio.load(res.data);
            const results = [];
            // Results are in <tr> rows inside a <table>
            $("table tr").each((_, el) => {
                const magnetLink = $(el).find('a[href^="magnet:"]');
                const magnet = magnetLink.attr("href");
                if (magnet) {
                    // Must get full title from 'title' attribute if available
                    const n = magnetLink.attr("title") || magnetLink.text().trim();
                    const s = $(el).find("td").eq(2).text().trim(); // Size
                    const sd = $(el).find("td").eq(4).text().trim(); // Seeders
                    const source = $(el).find("td").eq(6).find("a").text().trim() || "Knaben";
                    const qlt = detectQuality(n);
                    results.push({
                        name: n,
                        server: `Knaben | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S | ${source}`,
                        link: magnet,
                        type: "torrent",
                        quality: qlt,
                        isDebrid: true
                    });
                }
            });
            return results;
        }))(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                let torrentioUrl = "";
                if (type === 'movie' && imdbId) {
                    torrentioUrl = `https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,sugoi/stream/movie/${imdbId}.json`;
                }
                else if (type === 'series' && imdbId && season && episode) {
                    torrentioUrl = `https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,sugoi/stream/series/${imdbId}:${season}:${episode}.json`;
                }
                if (torrentioUrl) {
                    const res = yield providerContext.axios.get(torrentioUrl, {
                        signal,
                        timeout: 8000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if ((_a = res.data) === null || _a === void 0 ? void 0 : _a.streams) {
                        const results = res.data.streams.map((s) => {
                            const nameMatch = s.title.split("\n");
                            const torrentName = nameMatch[0] || s.name;
                            const details = nameMatch.slice(1).join(" | ");
                            const qlt = detectQuality(torrentName) || detectQuality(s.title);
                            return {
                                name: torrentName,
                                server: `Torrio | ${qlt || 'HD'} | ${detectAudioTags(s.title).join(", ")} | ${details}`,
                                link: s.infoHash ? `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(torrentName)}` : s.url,
                                type: "torrent",
                                quality: qlt,
                                isDebrid: true
                            };
                        });
                        streams.push(...results);
                    }
                }
            }
            catch (e) {
                console.error("Torrentio failed:", e.message);
            }
        }))(),
        // 1. TorrentGalaxy (Fallback Scraper)
        runScraper("TGx", (q) => __awaiter(void 0, void 0, void 0, function* () {
            const url = `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(q)}&sort=seeders&order=desc`;
            const res = yield providerContext.axios.get(url, { signal, timeout: 6000 });
            const $ = providerContext.cheerio.load(res.data);
            const results = [];
            $(".tgxtable tr.tgxtablerow").each((_, el) => {
                const t = $(el).find("a.tgxtitle");
                const magnet = $(el).find('a[href^="magnet:"]').attr("href");
                if (magnet) {
                    const n = t.text().trim();
                    const s = $(el).find("td").eq(4).text().trim();
                    const sd = $(el).find("td").eq(10).find("b").first().text().trim();
                    const qlt = detectQuality(n);
                    results.push({
                        name: n,
                        server: `TGx | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
                        link: magnet,
                        type: "torrent",
                        quality: qlt,
                        isDebrid: true
                    });
                }
            });
            return results;
        })),
        // 2. YTS (Fallback Scraper - Movies)
        (() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            if (type !== 'movie' || !imdbId)
                return;
            try {
                const url = `https://yts.mx/api/v2/list_movies.json?query_term=${imdbId}`;
                const res = yield providerContext.axios.get(url, { signal, timeout: 5000 });
                if ((_c = (_b = (_a = res.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.movies) === null || _c === void 0 ? void 0 : _c[0]) {
                    const results = res.data.data.movies[0].torrents.map((t) => ({
                        name: `${res.data.data.movies[0].title_long} [${t.quality}] [YTS]`,
                        server: `YTS | ${t.quality} | ${t.type} | ${t.size} | ${t.seeds}S`,
                        link: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(res.data.data.movies[0].title_long)}&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://zer0day.ch:1337/announce`,
                        type: "torrent",
                        quality: t.quality === "720p" ? "720" : t.quality === "1080p" ? "1080" : t.quality === "2160p" ? "2160" : "480",
                        isDebrid: true
                    }));
                    streams.push(...results);
                }
            }
            catch (e) {
                console.error("YTS failed:", e.message);
            }
        }))(),
        // 3. BitSearch (Fallback Scraper)
        runScraper("BitSearch", (q) => __awaiter(void 0, void 0, void 0, function* () {
            const url = `https://bitsearch.to/search?q=${encodeURIComponent(q)}&sort=seeders`;
            const res = yield providerContext.axios.get(url, { signal, timeout: 5000 });
            const $ = providerContext.cheerio.load(res.data);
            const results = [];
            $(".search-result").each((_, el) => {
                const t = $(el).find("h3 a");
                const magnet = $(el).find('a[href^="magnet:"]').attr("href");
                if (magnet) {
                    const n = t.text().trim();
                    const s = $(el).find(".stats div").eq(2).text().trim();
                    const sd = $(el).find(".stats div").eq(3).text().trim();
                    const qlt = detectQuality(n);
                    results.push({
                        name: n,
                        server: `BitSearch | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
                        link: magnet,
                        type: "torrent",
                        quality: qlt,
                        isDebrid: true
                    });
                }
            });
            return results;
        })),
        // 4. 1337x (Fallback Scraper - Top Results only)
        runScraper("1337x", (q) => __awaiter(void 0, void 0, void 0, function* () {
            // Use a more relaxed search for 1337x
            const searchQ = q.includes('tt') ? q : q.replace(/[^a-zA-Z0-9 ]/g, ' ').substring(0, 50);
            const url = `https://1337x.to/search/${encodeURIComponent(searchQ)}/1/`;
            const res = yield providerContext.axios.get(url, { signal, timeout: 8000 });
            const $ = providerContext.cheerio.load(res.data);
            const results = [];
            const rows = $("table.table-list tbody tr").slice(0, 5); // Limit to top 5 for speed
            for (const el of rows) {
                const titleEl = $(el).find("td.name a").eq(1);
                const detailLink = titleEl.attr("href");
                if (detailLink) {
                    try {
                        const detailRes = yield providerContext.axios.get(`https://1337x.to${detailLink}`, { signal, timeout: 5000 });
                        const $$ = providerContext.cheerio.load(detailRes.data);
                        const magnet = $$('a[href^="magnet:"]').attr("href");
                        if (magnet) {
                            const n = titleEl.text().trim();
                            const s = $(el).find("td.size").clone().children().remove().end().text().trim();
                            const sd = $(el).find("td.seeds").text().trim();
                            const qlt = detectQuality(n);
                            results.push({
                                name: n,
                                server: `1337x | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
                                link: magnet,
                                type: "torrent",
                                quality: qlt,
                                isDebrid: true
                            });
                        }
                    }
                    catch (e) { /* skip */ }
                }
            }
            return results;
        })),
    ];
    yield Promise.allSettled(tasks);
    // Filter unique magnets by Hash
    const seen = new Set();
    const finalStreams = streams.filter(s => {
        const hashMatch = s.link.match(/btih:([a-fA-F0-9]+)/);
        const hash = hashMatch ? hashMatch[1].toLowerCase() : s.link.toLowerCase();
        if (seen.has(hash))
            return false;
        seen.add(hash);
        return true;
    });
    // Final Sort: Torrio results first, then Seeders
    return finalStreams.sort((a, b) => {
        if (a.server.includes("Torrio") && !b.server.includes("Torrio"))
            return -1;
        if (b.server.includes("Torrio") && !a.server.includes("Torrio"))
            return 1;
        const getSeeders = (s) => {
            const match = s.match(/(\d+)S/);
            if (match)
                return parseInt(match[1]);
            const emojiMatch = s.match(/👤 (\d+)/);
            return emojiMatch ? parseInt(emojiMatch[1]) : 0;
        };
        return getSeeders(b.server) - getSeeders(a.server);
    });
});
exports.getStream = getStream;
