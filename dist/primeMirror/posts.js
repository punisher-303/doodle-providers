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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
};
// --- Fetch normal posts ---
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter, page, query: "", signal, providerContext });
    });
}
// --- Fetch search posts ---
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
    });
}
// --- Core fetch function ---
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://filmycab.media";
            let url;
            // --- Updated search URL
            if (query && query.trim()) {
                url = `${baseUrl}/site-search.html?to-search=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
            }
            else if (filter) {
                url = filter.startsWith("/")
                    ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
                    : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
            }
            else {
                url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
            }
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers: defaultHeaders, signal });
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, url).href;
            const seen = new Set();
            const catalog = [];
            // --- Detect search page
            const isSearchPage = $("form.search").length > 0;
            $(".thumb.rsz, article.post").each((_, el) => {
                var _a, _b;
                const card = $(el);
                let link = card.find("a[href]").attr("href") || "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                // --- Title extraction
                let title = "";
                if (isSearchPage) {
                    title =
                        ((_a = card.find("img").attr("alt")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                            card.find("figcaption").text().trim() ||
                            "";
                }
                if (!title) {
                    title =
                        card.find("p").first().text().trim() ||
                            card.find("h2.entry-title a").text().trim() ||
                            ((_b = card.find("img").attr("alt")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                            "";
                }
                if (!title)
                    return;
                // --- Image extraction
                const img = card.find("img").attr("src") ||
                    card.find("img").attr("data-src") ||
                    card.find("img").attr("data-original") ||
                    "";
                const image = img ? resolveUrl(img) : "";
                // --- Optional fields
                const quality = card.find(".quality").text().trim();
                const lang = card.find(".lang").text().trim();
                seen.add(link);
                catalog.push({
                    title,
                    link,
                    image,
                    // @ts-ignore -> extra fields
                    quality,
                    lang,
                });
            });
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("Filmycab fetchPosts error:", err instanceof Error ? err.message : err);
            return [];
        }
    });
}
