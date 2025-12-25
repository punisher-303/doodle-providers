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
        const { axios, cheerio, extractors, commonHeaders: headers } = providerContext;
        const { hubcloudExtracter } = extractors;
        try {
            const res = yield axios.get(link, { headers, signal });
            const $ = cheerio.load(res.data);
            const streamLinks = [];
            // --- 1. Episodes
            $('a:contains("Episode"), a:contains("EPiSODE")').each((_, el) => {
                const epLink = $(el).attr("href");
                const epTitle = $(el).text().trim();
                if (!epLink)
                    return;
                streamLinks.push({
                    title: epTitle,
                    link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
                    type: "episode",
                });
            });
            // --- 2. Movies / Quality links
            $('a')
                .filter((_, el) => /480|720|1080|2160|4K|mp4|m3u8/i.test($(el).text()))
                .each((_, el) => {
                var _a;
                const qLink = $(el).attr("href");
                if (!qLink)
                    return;
                const quality = ((_a = $(el).text().match(/\b(480p|720p|1080p|2160p|4K|mp4|m3u8)\b/i)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                streamLinks.push({
                    title: $(el).text().trim() || "Movie",
                    link: qLink.startsWith("http") ? qLink : new URL(qLink, link).href,
                    type: "movie",
                    quality,
                });
            });
            // --- 3. JS / HubCloud / encrypted streaming
            const scriptData = $("script")
                .map((i, el) => $(el).html())
                .get()
                .join(" ");
            const encryptedMatches = scriptData.match(/s\('o','(.+?)',180\)/);
            if (encryptedMatches === null || encryptedMatches === void 0 ? void 0 : encryptedMatches[1]) {
                const decoded = decodeString(encryptedMatches[1]);
                const hubLink = (decoded === null || decoded === void 0 ? void 0 : decoded.o) ? atob(decoded.o) : null;
                if (hubLink) {
                    const resolvedLinks = yield hubcloudExtracter(hubLink, signal);
                    streamLinks.push(...resolvedLinks.map((l) => (Object.assign(Object.assign({}, l), { type: "movie" }))));
                }
            }
            return streamLinks;
        }
        catch (err) {
            console.error("❌ RareAnimes stream fetch error:", err);
            return [];
        }
    });
}
// --- Helpers ---
function decodeString(encryptedString) {
    try {
        let decoded = atob(encryptedString);
        decoded = atob(decoded);
        decoded = rot13(decoded);
        decoded = atob(decoded);
        return JSON.parse(decoded);
    }
    catch (err) {
        console.error("Error decoding string:", err);
        return null;
    }
}
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, (char) => {
        const charCode = char.charCodeAt(0);
        const isUpper = char >= "A" && char <= "Z";
        const base = isUpper ? 65 : 97;
        return String.fromCharCode(((charCode - base + 13) % 26) + base);
    });
}
