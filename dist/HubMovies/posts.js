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
// ✅ Default headers to mimic a real browser request
const defaultHeaders = {
    Referer: "https://www.google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
};
// --- Normal catalog posts ---
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter, page, query: "", signal, providerContext });
    });
}
// --- Search posts ---
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
    });
}
// --- Core Universal Fetch Function ---
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://movielinkhub.fun";
            const { axios, cheerio } = providerContext;
            let url = baseUrl;
            // 🧩 Build URL (handles search, category, or home)
            if (query && query.trim()) {
                url = `${baseUrl}/?s=${encodeURIComponent(query.trim())}${page > 1 ? `&paged=${page}` : ""}`;
            }
            else if (filter) {
                const path = filter.startsWith("/") ? filter : `/${filter}`;
                url = `${baseUrl}${path.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`;
            }
            else {
                url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
            }
            const res = yield axios.get(url, { headers: defaultHeaders, signal });
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, baseUrl).href;
            const seen = new Set();
            const catalog = [];
            // 🎯 Flexible movie/card selectors to match both search & category results
            const POST_SELECTORS = [
                "article.item.movies",
                ".result-item",
                ".item.movies",
                ".post",
                ".movie-item",
                ".search-item",
                ".search-results article",
                ".movie-card",
            ].join(",");
            $(POST_SELECTORS).each((_, el) => {
                var _a;
                const card = $(el);
                // --- 1️⃣ Extract link
                let link = card.find(".data a[href]").attr("href") ||
                    card.find(".poster a[href]").attr("href") ||
                    card.find("a[href]").first().attr("href") ||
                    "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                // --- 2️⃣ Extract title
                let title = card.find(".data h3 a").text().trim() ||
                    card.find("h2 a").text().trim() ||
                    card.find("h3 a").text().trim() ||
                    ((_a = card.find("a[title]").attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    card.find("a").first().text().trim() ||
                    "";
                // Clean title (remove year, tags, and brackets)
                title = title
                    .replace(/\[.*?\]/g, "")
                    .replace(/\(.+?\)/g, "")
                    .replace(/\s{2,}/g, " ")
                    .trim();
                if (!title)
                    return;
                // --- 3️⃣ Extract image
                const img = card.find("img").attr("src") ||
                    card.find("img").attr("data-src") ||
                    card.find("img").attr("data-original") ||
                    card.find("img").attr("data-lazy-src") ||
                    "";
                const image = img ? resolveUrl(img) : "";
                seen.add(link);
                catalog.push({ title, link, image });
            });
            // --- If no results found, fallback to generic card pattern
            if (catalog.length === 0) {
                $("a[href*='movielinkhub.fun']").each((_, el) => {
                    const href = $(el).attr("href");
                    const text = $(el).text().trim();
                    if (!href || !text)
                        return;
                    const fullUrl = resolveUrl(href);
                    if (seen.has(fullUrl))
                        return;
                    seen.add(fullUrl);
                    catalog.push({ title: text, link: fullUrl, image: "" });
                });
            }
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("MovieLinkHub fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
