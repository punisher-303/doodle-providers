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
exports.getMeta = void 0;
const API_BASE = "https://9aniwatch-b.vercel.app/api/v2/hianime/anime";
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c, _d;
        const { axios } = providerContext;
        const empty = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "series",
            linkList: [],
        };
        try {
            // --------------------------------------------------
            // 🔑 EXTRACT ANIME ID FROM LINK
            // https://9aniwatch.to/anime/pokemon-horizons-the-series-18397
            // --------------------------------------------------
            const animeId = (_b = link.split("/anime/")[1]) === null || _b === void 0 ? void 0 : _b.trim();
            if (!animeId)
                return empty;
            // --------------------------------------------------
            // 🔗 API CALL
            // --------------------------------------------------
            const res = yield axios.get(`${API_BASE}/${animeId}`);
            const data = (_c = res === null || res === void 0 ? void 0 : res.data) === null || _c === void 0 ? void 0 : _c.data;
            if (!((_d = data === null || data === void 0 ? void 0 : data.anime) === null || _d === void 0 ? void 0 : _d.info))
                return empty;
            const infoApi = data.anime.info;
            const moreInfo = data.anime.moreInfo;
            const seasons = data.seasons || [];
            // --------------------------------------------------
            // 🧠 META INFO
            // --------------------------------------------------
            const info = {
                title: infoApi.name || "",
                synopsis: infoApi.description || "",
                image: infoApi.poster || "",
                imdbId: "",
                type: "series",
                linkList: [],
            };
            // --------------------------------------------------
            // 📺 SEASONS → linkList
            // episodesLink = season id (IMPORTANT)
            // --------------------------------------------------
            for (const season of seasons) {
                info.linkList.push({
                    title: season.title || season.name,
                    quality: season.isCurrent ? "Current Season" : "Season",
                    episodesLink: season.id, // 👈 SEASON ID APPEARS HERE
                    directLinks: [],
                });
            }
            // --------------------------------------------------
            // 🛟 FALLBACK (NO SEASONS)
            // --------------------------------------------------
            if (info.linkList.length === 0) {
                info.linkList.push({
                    title: "Season 1",
                    quality: "Season 1",
                    episodesLink: animeId,
                    directLinks: [],
                });
            }
            return info;
        }
        catch (err) {
            console.log("meta api error:", (err === null || err === void 0 ? void 0 : err.message) || err);
            return empty;
        }
    });
};
exports.getMeta = getMeta;
