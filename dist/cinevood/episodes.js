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
exports.getEpisodeLinks = getEpisodeLinks;
exports.getEpisodes = getEpisodes;
function getEpisodeLinks(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        try {
            const res = yield providerContext.axios.get(url);
            const $ = providerContext.cheerio.load(res.data || "");
            const episodes = [];
            $("h4.fittexted_for_content_h4").each((_, h4El) => {
                const epTitle = $(h4El).text().trim();
                if (!epTitle)
                    return;
                // Next until next <h4> or <hr> ke andar saare <a> links
                $(h4El)
                    .nextUntil("h4, hr")
                    .find("a[href]") // sirf <a> tags
                    .each((_, linkEl) => {
                    let href = ($(linkEl).attr("href") || "").trim();
                    if (!href)
                        return;
                    if (!href.startsWith("http"))
                        href = new URL(href, url).href;
                    const btnText = $(linkEl).text().trim() || "Watch Episode";
                    // --- Sirf SkyDrop links include karo
                    const lowerHref = href.toLowerCase();
                    if (lowerHref.includes("skydro") || lowerHref.includes("flexplayer.buzz")) {
                        episodes.push({
                            title: `${epTitle} - ${btnText}`,
                            link: href,
                        });
                    }
                });
            });
            // --- Sort by episode number extracted from title
            episodes.sort((a, b) => {
                var _a, _b;
                const numA = parseInt(((_a = a.title.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || "0");
                const numB = parseInt(((_b = b.title.match(/\d+/)) === null || _b === void 0 ? void 0 : _b[0]) || "0");
                return numA - numB;
            });
            return episodes;
        }
        catch (err) {
            console.error("getEpisodeLinks error:", err);
            return [];
        }
    });
}
// --- System wrapper
function getEpisodes(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        return yield getEpisodeLinks({ url, providerContext });
    });
}
