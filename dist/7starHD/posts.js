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
            const baseUrl = "https://7starhd.sarl";
            let url;
            // --- Build URL for category filter or search query
            if (query && query.trim()) {
                url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
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
            const seen = new Set();
            const catalog = [];
            // --- Parse each movie thumb block ---
            $(".home-wrapper .thumb").each((_, el) => {
                var _a, _b, _c, _d, _e;
                const card = $(el);
                const link = (_a = card.find("a[href]").first().attr("href")) === null || _a === void 0 ? void 0 : _a.trim();
                if (!link || seen.has(link))
                    return;
                const title = card.find(".thumbtitle").text().trim() ||
                    ((_b = card.find("img").attr("alt")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                    ((_c = card.find("a[title]").attr("title")) === null || _c === void 0 ? void 0 : _c.trim()) ||
                    "Untitled";
                const image = ((_d = card.find("img").attr("src")) === null || _d === void 0 ? void 0 : _d.trim()) ||
                    ((_e = card.find("img").attr("data-src")) === null || _e === void 0 ? void 0 : _e.trim()) ||
                    "";
                seen.add(link);
                catalog.push({ title, link, image });
            });
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("7StarHD fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
