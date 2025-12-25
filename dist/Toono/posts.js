"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
const defaultHeaders = {
    Referer: "https://toonstream.one",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
};
// ------------------------------------------------------
// NORMAL CATALOG
// ------------------------------------------------------
function getPosts({ filter, page = 1, signal, providerContext, }) {
    return fetchPosts({
        filter,
        page,
        query: "",
        signal,
        providerContext,
    });
}
// ------------------------------------------------------
// SEARCH
// ------------------------------------------------------
function getSearchPosts({ searchQuery, page = 1, signal, providerContext, }) {
    return fetchPosts({
        query: searchQuery,
        page,
        signal,
        providerContext,
    });
}
// ------------------------------------------------------
// CORE FETCH
// ------------------------------------------------------
function fetchPosts({ filter, query, page = 1, signal, providerContext, }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = "https://toonstream.one";
    let url = baseUrl;
    // --------------------------------------------------
    // URL BUILD
    // --------------------------------------------------
    if (query && query.trim()) {
        // Search uses /home/?s=searchQuery
        const searchStr = encodeURIComponent(query.trim());
        url = `${baseUrl}/home/?s=${searchStr}`;
        // pagination on search pages
        if (page > 1) {
            url += `&paged=${page}`;
        }
    }
    else if (filter) {
        const clean = filter.startsWith("/")
            ? filter.replace(/\/$/, "")
            : `/${filter}`;
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
        const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, baseUrl).href;
        // --------------------------------------------------
        // 🔥 MAIN POST SELECTOR (SEARCH + NORMAL)
        // --------------------------------------------------
        $("ul.post-lst > li").each((_, el) => {
            var _a;
            const li = $(el);
            // ---------------------------
            // LINK
            // ---------------------------
            let link = li.find("a.lnk-blk").attr("href") || "";
            if (!link)
                return;
            link = resolveUrl(link);
            if (seen.has(link))
                return;
            // ---------------------------
            // TITLE
            // ---------------------------
            let title = li.find("h2.entry-title").text().trim() ||
                ((_a = li.find("img").attr("alt")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                "";
            if (!title)
                return;
            title = title.replace(/^Image\s+/i, "").trim();
            // ---------------------------
            // IMAGE
            // ---------------------------
            let img = li.find("img").attr("data-src") ||
                li.find("img").attr("src") ||
                "";
            if (img.startsWith("//"))
                img = "https:" + img;
            const image = img ? resolveUrl(img) : "";
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
        console.error("ToonStream search/posts error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
}
