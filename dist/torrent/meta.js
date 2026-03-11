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
const getMeta = (_a) => __awaiter(void 0, [_a], void 0, function* ({ link, provider, providerContext }) {
    var _b, _c, _d;
    const payload = JSON.parse(link);
    const tmdbId = payload.tmdbId;
    const type = payload.type === "series" ? "tv" : "movie";
    const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";
    const detailsUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,images`;
    try {
        const res = yield providerContext.axios.get(detailsUrl);
        const data = res.data;
        const imdbId = ((_b = data.external_ids) === null || _b === void 0 ? void 0 : _b.imdb_id) || "";
        return {
            title: data.title || data.name,
            image: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            background: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
            synopsis: data.overview,
            imdbId: imdbId,
            type: payload.type,
            rating: (_c = data.vote_average) === null || _c === void 0 ? void 0 : _c.toFixed(1),
            tags: ((_d = data.genres) === null || _d === void 0 ? void 0 : _d.map((g) => g.name)) || [],
            linkList: payload.type === "series"
                ? Array.from({ length: data.number_of_seasons }, (_, i) => ({
                    title: `Season ${i + 1}`,
                    episodesLink: JSON.stringify({ tmdbId, season: i + 1, imdbId }),
                }))
                : [
                    {
                        title: "Movie",
                        directLinks: [{ title: "Search Torrents", link: JSON.stringify({ imdbId, type: "movie", title: data.title }) }]
                    }
                ],
        };
    }
    catch (err) {
        console.error(err);
        throw err;
    }
});
exports.getMeta = getMeta;
