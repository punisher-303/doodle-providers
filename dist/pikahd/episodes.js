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
            // Agar anchor tag me episode links diye hain
            $("a").each((i, el) => {
                var _a;
                const $el = $(el);
                const href = ($el.attr("href") || "").trim();
                const text = $el.text().trim();
                if (href && (text.includes("Episode") || /E\d+/i.test(text) || href.includes("vcloud.lol"))) {
                    let epNum = ((_a = text.match(/E\d+/i)) === null || _a === void 0 ? void 0 : _a[0]) || text;
                    if (/^\d+$/.test(epNum))
                        epNum = `Episode ${epNum}`;
                    episodes.push({
                        title: epNum,
                        link: href,
                    });
                }
            });
            return episodes;
        }
        catch (err) {
            console.error("getEpisodeLinks error:", err);
            return [];
        }
    });
}
// ✅ Ye wrapper export karna zaroori hai
function getEpisodes(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        return yield getEpisodeLinks({ url, providerContext });
    });
}
