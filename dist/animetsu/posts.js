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
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page, signal, providerContext, }) {
        const { axios } = providerContext;
        const baseUrl = "https://backend.animetsu.to";
        // Parse filter to modify page parameter
        const url = baseUrl + filter + "&page=" + page.toString();
        console.log("animetsuGetPosts url", url);
        return posts({ url: url.toString(), signal, axios });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        const { axios } = providerContext;
        const baseUrl = "https://backend.animetsu.to";
        const url = `${baseUrl}/api/anime/search?query=${encodeURIComponent(searchQuery)}&page=${page}&perPage=35&year=any&sort=favourites&season=any&format=any&status=any`;
        return posts({ url, signal, axios });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, signal, axios, }) {
        var _b;
        try {
            const res = yield axios.get(url, {
                signal,
                headers: {
                    Referer: "https://animetsu.to/",
                },
            });
            const data = (_b = res.data) === null || _b === void 0 ? void 0 : _b.results;
            const catalog = [];
            data === null || data === void 0 ? void 0 : data.map((element) => {
                var _a, _b, _c, _d, _e, _f, _g;
                const title = ((_a = element.title) === null || _a === void 0 ? void 0 : _a.english) ||
                    ((_b = element.title) === null || _b === void 0 ? void 0 : _b.romaji) ||
                    ((_c = element.title) === null || _c === void 0 ? void 0 : _c.native);
                const link = (_d = element.id) === null || _d === void 0 ? void 0 : _d.toString();
                const image = ((_e = element.coverImage) === null || _e === void 0 ? void 0 : _e.large) ||
                    ((_f = element.coverImage) === null || _f === void 0 ? void 0 : _f.extraLarge) ||
                    ((_g = element.coverImage) === null || _g === void 0 ? void 0 : _g.medium);
                if (title && link && image) {
                    catalog.push({
                        title: title,
                        link: link,
                        image: image,
                    });
                }
            });
            return catalog;
        }
        catch (err) {
            console.error("animetsu error ", err);
            return [];
        }
    });
}
