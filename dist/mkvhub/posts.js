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
            const baseUrl = "https://www.mkvhub.shop";
            let url;
            // Search URL
            if (query && query.trim() && query.trim().toLowerCase() !== "what are you looking for?") {
                const params = new URLSearchParams();
                params.append("s", query.trim());
                if (page > 1)
                    params.append("paged", page.toString());
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
            // ✅ Fetch posts: UPDATED SELECTOR
            // Targeting: div.thumb inside section.home-wrapper.thumbnail-wrapper
            $("section.home-wrapper.thumbnail-wrapper div.thumb").each((_, el) => {
                const card = $(el);
                // Link: The link is available on the <a> tag inside <figcaption> and the second <a> after <figcaption>
                // The snippet shows a link: <a href="..."><p>TITLE</p></a>
                let link = card.find("figcaption a").attr("href") || "";
                if (!link)
                    return;
                link = resolveUrl(link);
                if (seen.has(link))
                    return;
                // Title: The title is in the <p> tag inside the <figcaption> <a> tag.
                // Removed the .replace(/^Download\s*/i, "") part as it's not present in the new structure
                let title = card.find("figcaption a p")
                    .text()
                    .trim();
                if (!title)
                    return;
                // Image: The image is in the <img> tag inside <figure>
                let img = card.find("figure img").attr("src") || "";
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
