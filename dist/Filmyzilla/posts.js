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
// --- Helper: Extract clean movie name ---
function extractMovieName(title) {
    const match = title.match(/^(.*?)\s*\(/);
    return match ? match[1].trim() : title.split("Hindi")[0].trim();
}
// --- Fetch poster from IMDb Suggestion API ---
function fetchPoster(movieName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!movieName)
                return "";
            const firstLetter = movieName.charAt(0).toLowerCase();
            const url = `https://v2.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(movieName)}.json`;
            const res = yield fetch(url);
            const data = yield res.json();
            if (data && data.d && data.d.length > 0) {
                const movie = data.d.find((item) => item.i && item.i.imageUrl);
                if (movie && movie.i && movie.i.imageUrl)
                    return movie.i.imageUrl;
            }
        }
        catch (e) {
            console.error("IMDb poster fetch error:", e);
        }
        return "";
    });
}
// --- Normal catalog posts ---
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter, page, query: "", signal, providerContext });
    });
}
// --- Search posts ---
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({ query: searchQuery, page, signal, providerContext });
    });
}
// --- Core fetch logic ---
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://www.ofilmyzilla.com.ng";
            let url;
            // ✅ FIXED search parameter (q instead of search)
            if (query && query.trim()) {
                url = `${baseUrl}/search.php?q=${encodeURIComponent(query)}`;
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
            // 🔹 Parse movie links (search result or homepage)
            $("a[href*='.html']").each((_, el) => {
                const anchor = $(el);
                let link = anchor.attr("href") || "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                const text = anchor.text().trim();
                if (!text || text.length < 3)
                    return; // Skip short text
                // Ignore irrelevant links like navigation/menu
                if (!/\d{4}/.test(text) && !text.toLowerCase().includes("hindi"))
                    return;
                seen.add(link);
                catalog.push({
                    title: text
                        .replace(/Download|Full Movie|Watch Online|Free/gi, "")
                        .trim(),
                    link,
                    image: "",
                });
            });
            // 🔹 Fetch IMDb posters for each movie asynchronously
            for (const post of catalog) {
                const movieName = extractMovieName(post.title);
                post.image = yield fetchPoster(movieName);
            }
            return catalog.slice(0, 100);
        }
        catch (err) {
            console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
