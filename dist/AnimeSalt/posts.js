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
        return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
    });
}
// ------------------------------------------------------
// CORE FUNCTION (FIXED)
// ------------------------------------------------------
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://animesalt.cc";
            let url;
            // --- Build URL ---
            // 💡 FIX 1: Use the correct search parameter 's' and handle pagination
            if (query && query.trim()) {
                url = `${baseUrl}/?s=${encodeURIComponent(query)}${
                // Pagination on search results seems to be handled by a 'page' query parameter if 's' is present,
                // but the HTML doesn't show standard pagination. We'll use the URL structure that works for
                // the standard WP search form if the page number is needed.
                // For Animesalt, the search page itself usually contains all results, but if pagination is used, 
                // it often uses 'paged'. Since the initial request only provides 'page=1' to the query, 
                // we'll stick to the base search for simplicity unless a specific pattern is provided.
                // Let's assume the site uses /page/{page} structure for search results as a fallback,
                // or /?s=query&paged=page. Using the filter structure as a safer fallback.
                page > 1 ? `&paged=${page}` : ""}`;
            }
            else if (filter) {
                url = filter.startsWith("/")
                    ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
                    : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
            }
            else {
                url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
            }
            // --- End Build URL ---
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers: defaultHeaders, signal });
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, baseUrl).href;
            const seen = new Set();
            const catalog = [];
            // --------------------------------------------------------------------------
            // ⭐ SELECTOR for posts on catalog/search pages
            // --------------------------------------------------------------------------
            const POST_SELECTORS = [
                "li.post", // main selector for catalog
                ".swiper-slide li", // swiper slides on the homepage
                ".latest-movies-series-swiper-slide li",
                "ul.post-lst li", // New: Selector for the search results list
            ].join(",");
            $(POST_SELECTORS).each((_, el) => {
                var _a;
                const li = $(el);
                // get link
                let link = li.find("a[href]").first().attr("href") || "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                // get title 
                let rawTitle = li.find("h2.entry-title").first().text().trim() ||
                    ((_a = li.find("img").attr("alt")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    "";
                if (!rawTitle)
                    return;
                // 💡 FIX 2: Remove the "Image " prefix from the title text
                let title = rawTitle.replace(/^Image\s+/, '').trim();
                // Fallback check in case the image alt attribute was used and still has the prefix
                if (title.startsWith("Image ")) {
                    title = title.substring(6).trim();
                }
                // get image URL
                let img = li.find("img").attr("data-src") ||
                    li.find("img").attr("src") ||
                    "";
                const image = img ? resolveUrl(img) : "";
                seen.add(link);
                catalog.push({
                    title,
                    link,
                    image,
                });
            });
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("Animesalt fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
