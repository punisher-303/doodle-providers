"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
const defaultHeaders = {
    Referer: "https://anizone.to",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};
// ------------------------------------------------------
// EXPORTS (Required by the provider system)
// ------------------------------------------------------
function getPosts({ page = 1, signal, providerContext, }) {
    return fetchPosts({ page, signal, providerContext });
}
function getSearchPosts({ searchQuery, page = 1, signal, providerContext, }) {
    return fetchPosts({ query: searchQuery, page, signal, providerContext });
}
// ------------------------------------------------------
// CORE PARSING LOGIC
// ------------------------------------------------------
function fetchPosts({ query, page = 1, signal, providerContext, }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = "https://anizone.to";
    let url = baseUrl;
    if (query && query.trim()) {
        url = `${baseUrl}/anime?search=${encodeURIComponent(query.trim())}${page > 1 ? `&page=${page}` : ""}`;
    }
    else if (page > 1) {
        url = `${baseUrl}?page=${page}`;
    }
    return axios
        .get(url, { headers: defaultHeaders, signal })
        .then((res) => {
        const $ = cheerio.load(res.data || "");
        const posts = [];
        const seen = new Set();
        const resolveUrl = (href) => href.startsWith("http") ? href : new URL(href, baseUrl).href;
        // Targets elements using the Livewire key 'wire:key="a-..."'
        // This covers both Grid divs and List items found in the HTML.
        $('[wire\\:key^="a-"]').each((_, el) => {
            var _a, _b;
            const item = $(el);
            // 1. Find the main link
            const anchor = item.find('a[wire\\:navigate]').first();
            const link = anchor.attr("href");
            if (!link)
                return;
            // 2. Extract Title
            // Priority: title attribute -> text inside line-clamp -> anchor text
            let title = anchor.attr("title") ||
                item.find("div.line-clamp-2 a").text() ||
                anchor.text();
            title = (_b = (_a = title === null || title === void 0 ? void 0 : title.replace(/&quot;/g, '"') // Clean HTML entities
            ) === null || _a === void 0 ? void 0 : _a.replace(/^"|"$/g, '') // Remove wrapping quotes
            ) === null || _b === void 0 ? void 0 : _b.trim();
            // 3. Extract Image
            const img = item.find("img").attr("src");
            if (link && title && img) {
                const fullLink = resolveUrl(link);
                if (!seen.has(fullLink)) {
                    posts.push({
                        title,
                        link: fullLink,
                        image: resolveUrl(img),
                    });
                    seen.add(fullLink);
                }
            }
        });
        return posts;
    })
        .catch((err) => {
        console.error("AniZone fetch error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
}
