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
        const { getBaseUrl, cheerio } = providerContext;
        const baseUrl = yield getBaseUrl("moviezwap");
        const url = `${baseUrl}${filter}`;
        return posts({ url, signal, cheerio });
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        const { getBaseUrl, cheerio } = providerContext;
        const baseUrl = yield getBaseUrl("moviezwap");
        const url = `${baseUrl}/search.php?q=${encodeURIComponent(searchQuery)}`;
        return posts({ url, signal, cheerio });
    });
};
exports.getSearchPosts = getSearchPosts;
function posts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, signal, cheerio, }) {
        try {
            const res = yield fetch(url, { signal });
            const data = yield res.text();
            const $ = cheerio.load(data);
            const catalog = [];
            $('a[href^="/movie/"]').each((i, el) => {
                const title = $(el).text().trim();
                const link = $(el).attr("href");
                const image = "";
                if (title && link) {
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
            console.error("moviezwapGetPosts error ", err);
            return [];
        }
    });
}
