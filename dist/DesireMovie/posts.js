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
// Base desktop headers for general browsing
const defaultHeaders = {
    Referer: "https://www.google.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    DNT: "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
};
// Specific headers/cookies needed for search requests, derived from your provided trace.
// Note: Cookie values should ideally be managed and updated externally, but for a fixed script, we use a snapshot.
const searchHeaders = {
    // Mobile User-Agent from the successful trace
    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
    // Cookie from the successful trace
    "Cookie": "_ga=GA1.1.1984067624.1761565546; xla=s4t; _ga_JY310N86S8=GS2.1.s1761830318$o5$g1$t1761830365$j13$l0$h0; prefetchAd_8832032=true",
    // Use the specific Accept-Language/Encoding for better compatibility
    "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,ar;q=0.5,pt;q=0.4",
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "Sec-Fetch-Site": "same-origin", // Search requests are same-origin
    "Referer": "https://desiremovies.party/", // Specific referer for search
};
// --- Normal catalog posts (uses the general fetch) ---
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter, page, query: "", signal, providerContext });
    });
}
// --- Search posts (uses the general fetch with a query) ---
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
    });
}
// Helper function for artificial delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// --- Core function ---
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://desiremovies.party";
            const trimmedQuery = query === null || query === void 0 ? void 0 : query.trim();
            const isSearch = !!trimmedQuery;
            let url;
            // --- Build URL for search query or category filter
            if (isSearch) {
                // URL structure: /page/X/?s=query (Using path-based pagination for robustness)
                const pathPrefix = page > 1 ? `/page/${page}` : "";
                url = `${baseUrl}${pathPrefix}/?s=${encodeURIComponent(trimmedQuery)}`;
            }
            else {
                // CATEGORY/HOMEPAGE URL: /filter/page/X or /page/X
                let path = filter || "";
                path = path.replace(/^\/+/, '').replace(/\/+$/, ''); // Normalize path
                url = `${baseUrl}/${path}`;
                if (page > 1) {
                    url = `${url}/page/${page}`;
                }
            }
            // --- Determine Headers ---
            const requestHeaders = isSearch
                ? Object.assign(Object.assign({}, defaultHeaders), searchHeaders) : defaultHeaders;
            const { axios, cheerio } = providerContext;
            let res;
            const maxRetries = 3;
            // --- Use Retry Logic ---
            for (let i = 0; i < maxRetries; i++) {
                try {
                    res = yield axios.get(url, {
                        headers: requestHeaders, // Use the dynamically determined headers
                        signal,
                        timeout: 15000,
                    });
                    break;
                }
                catch (error) {
                    if (!isSearch || i === maxRetries - 1) {
                        throw error;
                    }
                    console.warn(`Search request failed, retry ${i + 1}/${maxRetries}. Waiting...`);
                    yield sleep(1000 * (i + 1));
                }
            }
            if (!res) {
                throw new Error(`Failed to retrieve data after ${maxRetries} attempts.`);
            }
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, url).href;
            const seen = new Set();
            const catalog = [];
            // --- POST SELECTORS ---
            const POST_SELECTORS = [
                "article",
                ".post",
                ".type-post",
                ".item",
                ".mh-loop-item",
            ].join(",");
            $(POST_SELECTORS).each((_, el) => {
                var _a, _b;
                const card = $(el);
                let link = "";
                let title = "";
                let image = "";
                // 1. PRIMARY LINK/TITLE EXTRACTION
                const primaryAnchor = card.find("h2 a, h3 a, a[rel='bookmark'], .entry-title a").first();
                if (primaryAnchor.length) {
                    link = primaryAnchor.attr("href") || "";
                    title = primaryAnchor.text().trim();
                }
                // 2. Fallback Link (from image wrapper)
                if (!link) {
                    const imgAnchor = card.find("figure a[href], .thumb a[href]").first();
                    link = imgAnchor.attr("href") || "";
                }
                // 3. Fallback Title (from attribute/alt text)
                if (!title) {
                    title = ((_a = card.find("a[title]").first().attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                        ((_b = card.find("img").first().attr("alt")) === null || _b === void 0 ? void 0 : _b.trim()) ||
                        "";
                }
                // 4. IMAGE EXTRACTION
                const imgEl = card.find("img").first();
                const img = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-original") || "";
                image = img ? resolveUrl(img) : "";
                // --- Final Validation and Cleaning ---
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                // Clean up title
                title = title.replace(/\[.*?\]/g, "").replace(/\(.+?\)/g, "").replace(/\{.*?\}/g, "").replace(/\s{2,}/g, " ").trim();
                if (!title)
                    return;
                seen.add(link);
                catalog.push({ title, link, image });
            });
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("desiremovies.party fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
