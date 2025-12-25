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
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
const HOME_API = "https://9aniwatch-b.vercel.app/api/v2/hianime/home";
const SEARCH_API = "https://9aniwatch.to/api/search-filter";
// ------------------------------------------------------
// HOME POSTS
// ------------------------------------------------------
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ providerContext, }) {
        return fetchHomePosts(providerContext);
    });
}
// ------------------------------------------------------
// SEARCH POSTS
// ------------------------------------------------------
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, providerContext, }) {
        var _b, _c;
        const { axios } = providerContext;
        if (!searchQuery)
            return [];
        try {
            const res = yield axios.get(SEARCH_API, {
                params: {
                    q: searchQuery,
                    page: 1,
                },
            });
            const animes = (_b = res === null || res === void 0 ? void 0 : res.data) === null || _b === void 0 ? void 0 : _b.animes;
            if (!Array.isArray(animes))
                return [];
            const posts = [];
            for (const item of animes) {
                const info = (_c = item === null || item === void 0 ? void 0 : item.anime) === null || _c === void 0 ? void 0 : _c.info;
                if (!(info === null || info === void 0 ? void 0 : info.id))
                    continue;
                posts.push({
                    title: info.name,
                    link: `https://9aniwatch.to/anime/${info.id}`,
                    image: info.poster,
                });
            }
            return posts;
        }
        catch (err) {
            console.error("Search API error:", (err === null || err === void 0 ? void 0 : err.message) || err);
            return [];
        }
    });
}
// ------------------------------------------------------
// FETCH HOME DATA
// ------------------------------------------------------
function fetchHomePosts(providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { axios } = providerContext;
        try {
            const res = yield axios.get(HOME_API);
            const data = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.data;
            if (!data)
                return [];
            const posts = [];
            const seen = new Set();
            const pushAnime = (anime) => {
                if (!(anime === null || anime === void 0 ? void 0 : anime.id))
                    return;
                const link = `https://9aniwatch.to/anime/${anime.id}`;
                if (seen.has(link))
                    return;
                seen.add(link);
                posts.push({
                    title: anime.name,
                    link,
                    image: anime.poster,
                });
            };
            // 🆕 Latest Episodes
            if (Array.isArray(data.latestEpisodeAnimes)) {
                data.latestEpisodeAnimes.forEach(pushAnime);
            }
            // ❤️ Most Favorite (Top 10 Today)
            if (Array.isArray((_b = data.top10Animes) === null || _b === void 0 ? void 0 : _b.today)) {
                data.top10Animes.today.forEach(pushAnime);
            }
            return posts.slice(0, 100);
        }
        catch (err) {
            console.error("Home API error:", (err === null || err === void 0 ? void 0 : err.message) || err);
            return [];
        }
    });
}
