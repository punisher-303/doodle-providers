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
exports.getStream = getStream;
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, signal, providerContext, }) {
        var _b;
        const { axios, cheerio, commonHeaders: headers } = providerContext;
        try {
            // 1️⃣ Fetch episode/movie page
            const res = yield axios.get(link, { headers, signal });
            const $ = cheerio.load(res.data);
            const streamLinks = [];
            const baseDomain = new URL(link).hostname;
            // 2️⃣ Direct quality links
            $("a").each((_, el) => {
                const qText = $(el).text().trim();
                const qLink = $(el).attr("href");
                if (!qLink)
                    return;
                const finalLink = qLink.startsWith("http")
                    ? qLink
                    : new URL(qLink, link).href;
                if (/480|720|1080|2160|4K|mp4|m3u8/i.test(qText) || /\.(mp4|m3u8)$/i.test(finalLink)) {
                    streamLinks.push({
                        title: qText || "Movie",
                        link: finalLink,
                        type: "movie",
                    });
                }
            });
            // 3️⃣ Episodes (same anime only)
            const mainTitle = $("h1").first().text().trim() ||
                ((_b = $("meta[property='og:title']").attr("content")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                "";
            $('a:contains("Episode"), a:contains("EP")').each((_, el) => {
                const epTitle = $(el).text().trim();
                const epLink = $(el).attr("href");
                if (!epLink)
                    return;
                const finalLink = epLink.startsWith("http")
                    ? epLink
                    : new URL(epLink, link).href;
                if (!finalLink.includes(baseDomain))
                    return;
                if (!epTitle.toLowerCase().includes("episode"))
                    return;
                streamLinks.push({
                    title: `${epTitle} - ${mainTitle}`,
                    link: finalLink,
                    type: "episode",
                });
            });
            // 4️⃣ Embedded iframes → follow and extract sources
            const iframeLinks = [];
            $("iframe").each((_, el) => {
                const iframeSrc = $(el).attr("src");
                if (!iframeSrc)
                    return;
                const finalLink = iframeSrc.startsWith("http")
                    ? iframeSrc
                    : new URL(iframeSrc, link).href;
                iframeLinks.push(finalLink);
            });
            for (const iframeUrl of iframeLinks) {
                try {
                    const iframeRes = yield axios.get(iframeUrl, { headers, signal });
                    const _$ = cheerio.load(iframeRes.data);
                    // direct <source src="...">
                    _$("source").each((__, el) => {
                        const src = _$(el).attr("src");
                        if (src && /\.(mp4|m3u8)$/i.test(src)) {
                            streamLinks.push({
                                title: "Iframe Source",
                                link: src.startsWith("http") ? src : new URL(src, iframeUrl).href,
                                type: "movie",
                            });
                        }
                    });
                    // m3u8 in JS vars
                    const scripts = _$("script").map((i, el) => _$(el).html()).get().join(" ");
                    const m3u8Match = scripts.match(/(https?:\/\/[^"']+\.m3u8)/);
                    if (m3u8Match) {
                        streamLinks.push({
                            title: "Iframe m3u8",
                            link: m3u8Match[1],
                            type: "movie",
                        });
                    }
                }
                catch (err) {
                    console.warn("❌ iframe fetch failed", iframeUrl);
                }
            }
            // 5️⃣ Decode JS encrypted links
            const scripts = $("script").map((i, el) => $(el).html()).get().join(" ");
            const encryptedMatches = [...scripts.matchAll(/s\('o','([^']+)',180\)/g)];
            for (const m of encryptedMatches) {
                try {
                    const decoded = decodeEncrypted(m[1]);
                    if (decoded === null || decoded === void 0 ? void 0 : decoded.o) {
                        const finalLink = decoded.o.startsWith("http")
                            ? decoded.o
                            : new URL(decoded.o, link).href;
                        if (/\.(mp4|m3u8)$/i.test(finalLink)) {
                            streamLinks.push({
                                title: "Decrypted Stream",
                                link: finalLink,
                                type: "movie",
                            });
                        }
                    }
                }
                catch (_c) { }
            }
            // 6️⃣ Remove duplicates
            const unique = new Map();
            streamLinks.forEach((s) => {
                if (!unique.has(s.link))
                    unique.set(s.link, s);
            });
            return [...unique.values()];
        }
        catch (err) {
            console.error("❌ RareAnimes stream fetch error:", err);
            return [];
        }
    });
}
// --- Helper: Decode RareAnimes encrypted JS strings
function decodeEncrypted(encryptedString) {
    try {
        let decoded = atob(encryptedString);
        decoded = atob(decoded);
        decoded = rot13(decoded);
        decoded = atob(decoded);
        return JSON.parse(decoded);
    }
    catch (err) {
        console.error("Error decoding stream:", err);
        return null;
    }
}
// --- Helper: ROT13 decoder
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, (char) => {
        const charCode = char.charCodeAt(0);
        const isUpper = char >= "A" && char <= "Z";
        const base = isUpper ? 65 : 97;
        return String.fromCharCode(((charCode - base + 13) % 26) + base);
    });
}
