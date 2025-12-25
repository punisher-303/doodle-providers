"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
const defaultHeaders = {
    Referer: "https://123animes.ru",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
};
// ------------------------------------------------------
// NORMAL CATALOG
// ------------------------------------------------------
function getPosts({ filter, page = 1, signal, providerContext, }) {
    return fetchPosts({ filter, page, signal, providerContext });
}
// ------------------------------------------------------
// SEARCH
// ------------------------------------------------------
function getSearchPosts({ searchQuery, page = 1, signal, providerContext, }) {
    return fetchPosts({ query: searchQuery, page, signal, providerContext });
}
// ------------------------------------------------------
// CORE FETCH
// ------------------------------------------------------
function fetchPosts({ filter, query, page = 1, signal, providerContext, }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = "https://123animes.ru";
    let url = baseUrl;
    // --------------------------------------------------
    // URL BUILD
    // --------------------------------------------------
    if (query && query.trim()) {
        const q = encodeURIComponent(query.trim());
        url = `${baseUrl}/search?keyword=${q}`;
        if (page > 1)
            url += `&page=${page}`;
    }
    else if (filter) {
        const clean = filter.startsWith("/") ? filter : `/${filter}`;
        url = `${baseUrl}${clean}${page > 1 ? `/page/${page}` : ""}`;
    }
    else {
        url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }
    return axios
        .get(url, { headers: defaultHeaders, signal })
        .then((res) => {
        const $ = cheerio.load(res.data || "");
        const posts = [];
        const seen = new Set();
        const resolveUrl = (href) => href
            ? href.startsWith("http")
                ? href
                : new URL(href, baseUrl).href
            : "";
        // --------------------------------------------------
        // ✅ UNIVERSAL PARSER (HOTNEW + FILM-LIST)
        // --------------------------------------------------
        $(".widget.hotnew .content .item, .film-list .item").each((_, el) => {
            var _a;
            const item = $(el);
            // LINK
            let link = item.find("a.poster").attr("href") ||
                item.find("a.name").attr("href");
            if (!link)
                return;
            link = resolveUrl(link);
            if (seen.has(link))
                return;
            // TITLE
            const title = item.find("a.name").text().trim() ||
                ((_a = item.find("img").attr("alt")) === null || _a === void 0 ? void 0 : _a.trim());
            if (!title)
                return;
            // IMAGE
            let img = item.find("img").attr("data-src") ||
                item.find("img").attr("src") ||
                "";
            if (img.startsWith("//"))
                img = "https:" + img;
            const image = resolveUrl(img);
            seen.add(link);
            posts.push({
                title,
                link,
                image,
            });
        });
        return posts.slice(0, 100);
    })
        .catch((err) => {
        console.error("Posts fetch error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
}
