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
const API_BASE = "https://9aniwatch-b.vercel.app/api/v2/hianime/anime";
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        var _b;
        const { axios } = providerContext;
        try {
            // --------------------------------------------------
            // 🔑 url = anime id OR season id
            // --------------------------------------------------
            const animeId = url.trim();
            if (!animeId)
                return [];
            // --------------------------------------------------
            // 🔗 API CALL
            // --------------------------------------------------
            const res = yield axios.get(`${API_BASE}/${animeId}/episodes`);
            const data = (_b = res === null || res === void 0 ? void 0 : res.data) === null || _b === void 0 ? void 0 : _b.data;
            if (!Array.isArray(data === null || data === void 0 ? void 0 : data.episodes))
                return [];
            // --------------------------------------------------
            // 🎬 MAP EPISODES
            // Show only Episode Number
            // --------------------------------------------------
            const episodes = data.episodes.map((ep) => ({
                title: `Episode ${ep.number}`,
                link: `https://9aniwatch.to/watch/${ep.episodeId}`,
            }));
            return episodes;
        }
        catch (err) {
            console.log("episodes api error:", (err === null || err === void 0 ? void 0 : err.message) || err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
