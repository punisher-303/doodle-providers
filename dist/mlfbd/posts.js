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
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page, providerContext, signal, }) {
        try {
            const { axios, cheerio } = providerContext;
            const baseUrl = "https://mlfbd.best";
            let url = filter ? `${baseUrl}/${filter}` : `${baseUrl}`;
            if (page > 1) {
                if (url.includes("?")) {
                    url += `&page=${page}`;
                }
                else {
                    url += `/page/${page}/`;
                }
            }
            // Handle initial catalog filters which might be missing the trailing slash or index.php if not careful, 
            // but the catalog.ts has 'index.php/genre/...' which is correct.
            //console.log("fetching", url);
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            };
            const res = yield axios.get(url, { headers, signal });
            const $ = cheerio.load(res.data);
            const catalog = [];
            $("article.item").each((index, element) => {
                const title = $(element).find(".data h3").text().trim();
                const link = $(element).find(".poster a").attr("href");
                const image = $(element).find(".poster img").attr("src");
                if (title && link) {
                    catalog.push({
                        title,
                        link,
                        image: image || "",
                    });
                }
            });
            return catalog;
        }
        catch (err) {
            console.error("Mlfbd getPosts error:", err);
            return [];
        }
    });
}
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, providerContext, signal, }) {
        try {
            const { axios, cheerio } = providerContext;
            const baseUrl = "https://mlfbd.best";
            // Search format: https://mlfbd.best/?s=query
            const url = `${baseUrl}/?s=${encodeURIComponent(searchQuery)}`;
            // Pagination might be different for search, usually /page/2?s=... or ?s=...&page=2
            // Let's assume standard WordPress: /page/2/?s=query or ?s=query&paged=2
            // The browser analysis didn't cover search, but ?s=... is standard. 
            // I'll stick to a simple query for now.
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            };
            const res = yield axios.get(url, { headers, signal });
            const $ = cheerio.load(res.data);
            const catalog = [];
            // Search results often use the same 'article.item' or similar structure 'article.post'
            // I'll check for 'article.item' first, or fallback to 'article'.
            const searchSelector = "article.item, article.result-item, article.post";
            $(searchSelector).each((index, element) => {
                const title = $(element).find(".data h3, .title h2, h2.title").text().trim();
                const link = $(element).find("a").attr("href");
                const image = $(element).find("img").attr("src");
                if (title && link && !catalog.some((p) => p.link === link)) {
                    catalog.push({
                        title,
                        link,
                        image: image || "",
                    });
                }
            });
            return catalog;
        }
        catch (err) {
            console.error("Mlfbd getSearchPosts error:", err);
            return [];
        }
    });
}
