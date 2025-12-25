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
// Base URL (can be updated if domain changes)
const baseUrl = "https://vegamovies.or.ke";
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
// --- Core function ---
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            let url;
            // Handle search or category filtering
            if (query && query.trim()) {
                const params = new URLSearchParams();
                params.append("s", query);
                if (page > 1)
                    params.append("page", page.toString());
                url = `${baseUrl}/?${params.toString()}`;
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
            const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, baseUrl).href;
            const seen = new Set();
            const catalog = [];
            // Multiple selectors for better coverage
            const POST_SELECTORS = [
                ".pstr_box",
                "article",
                ".result-item",
                ".post-item",
                ".movie-item",
                ".item",
                ".thumbnail",
                ".latest-movies",
            ].join(",");
            $(POST_SELECTORS).each((_, el) => {
                var _a;
                const card = $(el);
                let link = card.find("a[href]").first().attr("href") || "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                // --- Title extraction and cleanup ---
                let title = card.find("h2").first().text().trim() ||
                    card.find("h3").first().text().trim() ||
                    ((_a = card.find("a[title]").first().attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    card.text().trim();
                // Remove unwanted patterns like [1080p], (2025), "Download", etc.
                title = title
                    .replace(/\[.*?\]/g, "")
                    .replace(/\(.*?\)/g, "")
                    .replace(/\bDownload\b/gi, "")
                    .replace(/\bWEB[-\s]?DL\b/gi, "")
                    .replace(/\bBluRay\b/gi, "")
                    .replace(/\bHDRip\b/gi, "")
                    .replace(/\s{2,}/g, " ")
                    .trim();
                if (!title)
                    return;
                // --- Fix image extraction ---
                const img = card.find("img").attr("data-src") ||
                    card.find("img").attr("data-original") ||
                    card.find("img").attr("src") ||
                    "";
                const image = img ? resolveUrl(img) : "";
                seen.add(link);
                catalog.push({ title, link, image });
            });
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
