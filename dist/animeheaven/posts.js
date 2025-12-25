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
const defaultHeaders = {
    Referer: "https://www.google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
};
// ------------------------------------------------------
// Normal Catalog Posts
// ------------------------------------------------------
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter, page, query: "", signal, providerContext });
    });
}
// ------------------------------------------------------
// Search Posts
// ------------------------------------------------------
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({
            filter: "",
            page,
            query: searchQuery,
            signal,
            providerContext,
        });
    });
}
// ------------------------------------------------------
// CORE FUNCTION
// ------------------------------------------------------
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://animeheaven.me";
            let url;
            // -------------------------------
            // URL RESOLUTION
            // -------------------------------
            if (query && query.trim()) {
                url = `${baseUrl}/search.php?s=${encodeURIComponent(query)}`;
            }
            else if (filter) {
                url = filter.startsWith("/")
                    ? `${baseUrl}${filter.replace(/\/$/, "")}`
                    : `${baseUrl}/${filter}`;
            }
            else {
                url = baseUrl;
            }
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers: defaultHeaders, signal });
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => href.startsWith("http") ? href : new URL(href, baseUrl).href;
            const seen = new Set();
            const catalog = [];
            // --------------------------------------------------
            // 🔍 SEARCH PAGE PARSING (FIXED)
            // --------------------------------------------------
            if (query && query.trim()) {
                $("div.similarimg").each((_, el) => {
                    const box = $(el);
                    const linkEl = box.find("a").first();
                    const href = linkEl.attr("href") || "";
                    if (!href)
                        return;
                    const link = resolveUrl(href);
                    if (seen.has(link))
                        return;
                    const title = box.find(".similarname a").text().trim();
                    if (!title)
                        return;
                    const img = box.find("img.coverimg").attr("src") || "";
                    const image = img ? resolveUrl(img) : "";
                    seen.add(link);
                    catalog.push({
                        title,
                        link,
                        image,
                    });
                });
                return page === 1 ? catalog.slice(0, 20) : catalog.slice(0, 100);
            }
            // --------------------------------------------------
            // 🏠 NORMAL / FILTER PAGES (UNCHANGED)
            // --------------------------------------------------
            $("div.chart.bc1").each((_, el) => {
                const chart = $(el);
                const linkEl = chart.find(".chartimg a").first();
                const href = linkEl.attr("href") || "";
                if (!href)
                    return;
                const link = resolveUrl(href);
                if (seen.has(link))
                    return;
                const title = chart.find(".charttitle a").text().trim();
                if (!title)
                    return;
                const img = linkEl.find("img.coverimg").attr("src") || "";
                const image = img ? resolveUrl(img) : "";
                seen.add(link);
                catalog.push({
                    title,
                    link,
                    image,
                });
            });
            return page === 1 ? catalog.slice(0, 20) : catalog.slice(0, 100);
        }
        catch (err) {
            console.error("AnimeHeaven fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
