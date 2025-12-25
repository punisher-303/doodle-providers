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
            // ZinkMovies / ZinkCloud style episode links
            $(".entry-content a.maxbutton-download-now[href]").each((_, el) => {
                let href = ($(el).attr("href") || "").trim();
                const text = ($(el).find(".mb-text").text() || $(el).text()).trim();
                if (!href)
                    return;
                if (!href.startsWith("http"))
                    href = new URL(href, url).href;
                episodes.push({
                    title: text, // EPISODE - 01 (size) ya All Episodes Zip
                    link: href,
                });
            });
            return episodes;
        }
        catch (err) {
            console.error("ZinkMovies getEpisodeLinks error:", err);
            return [];
        }
    });
}
// System wrapper
function getEpisodes(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        return yield getEpisodeLinks({ url, providerContext });
    });
}
