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
exports.getSearchPosts = exports.getPosts = void 0;
const PROVIDER_NAME = "torrent";
const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";
const getPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ filter, page, providerContext, }) {
    let url = "";
    switch (filter) {
        case "trending":
            url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${page}`;
            break;
        case "popular_movies":
            url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
            break;
        case "popular_tv":
            url = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`;
            break;
        case "top_rated_movies":
            url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`;
            break;
        case "upcoming":
            url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&page=${page}`;
            break;
        default:
            url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${page}`;
    }
    try {
        const res = yield providerContext.axios.get(url);
        return res.data.results
            .filter((item) => item.poster_path)
            .map((item) => ({
            title: item.title || item.name,
            image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
            link: JSON.stringify({
                tmdbId: item.id,
                type: item.media_type === "tv" || filter.includes("tv") ? "series" : "movie",
                title: item.title || item.name,
            }),
            provider: PROVIDER_NAME,
        }));
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getPosts = getPosts;
const getSearchPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ searchQuery, page, providerContext, signal }) {
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=5242517248386a3458476839356d2572&query=${encodeURIComponent(searchQuery)}&page=${page}`;
    try {
        const res = yield providerContext.axios.get(searchUrl, { signal });
        return res.data.results
            .filter((item) => item.media_type === "movie" || item.media_type === "tv")
            .map((item) => ({
            title: item.title || item.name,
            image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
            link: JSON.stringify({
                tmdbId: item.id,
                type: item.media_type === "tv" ? "series" : "movie",
                title: item.title || item.name,
            }),
            provider: PROVIDER_NAME,
        }));
    }
    catch (err) {
        console.error(err);
        return [];
    }
});
exports.getSearchPosts = getSearchPosts;
