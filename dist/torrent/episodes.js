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
const getEpisodes = (_a) => __awaiter(void 0, [_a], void 0, function* ({ url, providerContext }) {
    const payload = JSON.parse(url);
    const { tmdbId, season, imdbId } = payload;
    const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";
    const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;
    try {
        const res = yield providerContext.axios.get(seasonUrl);
        return res.data.episodes.map((ep) => ({
            title: `Episode ${ep.episode_number}: ${ep.name}`,
            link: JSON.stringify({
                imdbId,
                season,
                episode: ep.episode_number,
                type: "series",
                title: ep.name
            }),
        }));
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getEpisodes = getEpisodes;
