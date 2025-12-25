"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPosts = getPosts;
exports.getSearchPosts = getSearchPosts;
const defaultHeaders = {
    Referer: "https://animekhor.org",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};
function getPosts({ filter, page = 1, signal, providerContext, }) {
    return fetchPosts({ filter, page, query: "", signal, providerContext });
}
function getSearchPosts({ searchQuery, page = 1, signal, providerContext, }) {
    return fetchPosts({ query: searchQuery, page, signal, providerContext });
}
function fetchPosts({ filter, query, page = 1, signal, providerContext, }) {
    const { axios, cheerio } = providerContext;
    const baseUrl = "https://animekhor.org";
    let url = baseUrl;
    if (query && query.trim()) {
        url = `${baseUrl}/?s=${encodeURIComponent(query.trim())}`;
        if (page > 1)
            url += `&paged=${page}`;
    }
    else if (filter) {
        url = `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
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
        $("article.bs").each((_, el) => {
            const article = $(el);
            const linkEl = article.find("a[href]").first();
            let link = linkEl.attr("href") || "";
            if (!link)
                return;
            link = resolveUrl(link);
            if (seen.has(link))
                return;
            const title = article.find("h2").first().text().trim() ||
                article.find(".tt").contents().first().text().trim();
            if (!title)
                return;
            let img = article.find("img.ts-post-image").attr("src") ||
                article.find("img").attr("src") ||
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
        console.error("animekhor posts error:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return [];
    });
}
