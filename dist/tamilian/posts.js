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
            query: searchQuery,
            page,
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
            const baseUrl = "https://tamilian.io";
            const wrapWithProxy = (url) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
            let url;
            // ---------------------------
            // Build URL
            // ---------------------------
            if (query && query.trim()) {
                url = `${baseUrl}/search/${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
            }
            else if (filter) {
                url = filter.startsWith("/")
                    ? `${baseUrl}${filter}${page > 1 ? `/page/${page}` : ""}`
                    : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
            }
            else {
                url = `${baseUrl}/home${page > 1 ? `/page/${page}` : ""}`;
            }
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(wrapWithProxy(url), {
                headers: defaultHeaders,
                signal,
            });
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => href.startsWith("http") ? href : new URL(href, baseUrl).href;
            const seen = new Set();
            const catalog = [];
            // --------------------------------------------------
            // Parse posts (NO cheerio.Element typing needed)
            // --------------------------------------------------
            $(".ml-item").each((_, el) => {
                var _a, _b;
                const item = $(el);
                const anchor = item.find("a.ml-mask").first();
                if (!anchor.length)
                    return;
                // 🎬 Movie page link
                let pageLink = anchor.attr("href") || "";
                if (!pageLink)
                    return;
                pageLink = resolveUrl(pageLink);
                if (seen.has(pageLink))
                    return;
                // 🧠 AJAX path
                const ajaxPath = anchor.attr("data-url") || "";
                // 👉 Combine both into ONE link
                const finalLink = ajaxPath
                    ? `${pageLink}?ajax=${encodeURIComponent(ajaxPath)}`
                    : pageLink;
                // 🎬 Title
                const title = ((_a = anchor.attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    ((_b = item.find("img").attr("alt")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                    "";
                if (!title)
                    return;
                // 🖼️ Image
                const img = item.find("img").attr("data-original") ||
                    item.find("img").attr("src") ||
                    "";
                const image = img ? resolveUrl(img) : "";
                seen.add(pageLink);
                catalog.push({
                    title,
                    link: finalLink, // ✅ page + ajax together
                    image,
                });
            });
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("Tamilian fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
