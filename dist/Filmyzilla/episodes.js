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
exports.getEpisodes = void 0;
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        try {
            const { axios, cheerio, getBaseUrl, commonHeaders } = providerContext;
            const base = (yield getBaseUrl("HDMovie2")) || "https://hdmovie2.careers";
            const res = yield axios.get(url, { headers: commonHeaders });
            const $ = cheerio.load(res.data || "");
            const episodes = [];
            // Select the main seasons container
            const seasonsContainer = $("#seasons");
            if (seasonsContainer.length === 0) {
                console.log("HDMovie2 getEpisodes: No seasons container found. Falling back to direct link search.");
                // Fallback if the standard structure is not found
                $("a").each((_, el) => {
                    const $el = $(el);
                    const link = $el.attr("href") || "";
                    const title = $el.text().trim();
                    if (link.match(/episode-\d+/i) || title.match(/episode/i)) {
                        if (link.startsWith("/")) {
                            episodes.push({ title, link: base + link });
                        }
                        else if (link.startsWith("http")) {
                            episodes.push({ title, link });
                        }
                    }
                });
                return episodes;
            }
            // Iterate through each season and its episodes
            seasonsContainer.find(".episodios li").each((i, el) => {
                const $el = $(el);
                let link = $el.find("a").attr("href") || "";
                const title = $el.find(".episodiotitle a").text().trim();
                const seasonTitle = $el.closest(".se-q").find(".se-t").text().trim();
                if (!link)
                    return;
                if (link.startsWith("/")) {
                    link = base + link;
                }
                // Create a more descriptive title
                const fullTitle = seasonTitle ? `${seasonTitle} - ${title}` : title;
                episodes.push({ title: fullTitle, link });
            });
            console.log(`[HDMovie2] Found ${episodes.length} episodes.`);
            return episodes;
        }
        catch (err) {
            console.error("HDMovie2 getEpisodes error:", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
