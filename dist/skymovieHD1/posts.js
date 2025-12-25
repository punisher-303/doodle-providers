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
// --- Your OMDb API Key ---
const OMDB_API_KEY = "90b37ad0"; // Replace with your real OMDb key
// --- Helper: Extract clean movie name ---
function extractMovieName(title) {
    const match = title.match(/^(.*?)\s*\(/);
    return match ? match[1].trim() : title.split("Hindi")[0].trim();
}
// --- Fetch poster from OMDb ---
function fetchPoster(movieName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&apikey=${OMDB_API_KEY}`);
            const data = yield res.json();
            if (data && data.Poster && data.Poster !== "N/A") {
                return data.Poster;
            }
        }
        catch (e) {
            console.error("Poster fetch error:", e);
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
// --- Search posts (Fixed version) ---
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({ query: searchQuery, page, signal, providerContext });
    });
}
// --- Core function ---
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://skymovieshd.mba";
            let url;
            if (query && query.trim()) {
                // 🔹 Fixed Search URL
                url = `${baseUrl}/search.php?search=${encodeURIComponent(query)}&cat=All`;
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
            // 🔹 Try primary movie link selectors
            $("a[href*='?id='], a[href*='.html']").each((_, el) => {
                const anchor = $(el);
                let link = anchor.attr("href") || "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                const rawTitle = anchor.text().trim().replace(/\s{2,}/g, " ");
                if (!rawTitle)
                    return;
                seen.add(link);
                catalog.push({ title: rawTitle, link, image: "" });
            });
            // 🔹 Fetch OMDb poster for each movie name
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
