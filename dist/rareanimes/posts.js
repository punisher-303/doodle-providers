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
function getPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page = 1, signal, providerContext, }) {
        return fetchPosts({ filter, page, query: "", signal, providerContext });
    });
}
function getSearchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page = 1, signal, providerContext, }) {
        return fetchPosts({
            filter: "",
            page,
            query: searchQuery,
            signal,
            providerContext,
        });
    });
}
function fetchPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, query, page = 1, signal, providerContext, }) {
        try {
            const baseUrl = "https://www.rareanimes.co";
            let url;
            // --- Switch-case for filters
            switch (filter) {
                case "Latest":
                    url = `${baseUrl}/home/${page > 1 ? `page/${page}/` : ""}`;
                    break;
                case "Naruto":
                    url = `${baseUrl}/?s=Naruto${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Pokémon":
                    url = `${baseUrl}/?s=Pokémon${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Doraemon":
                    url = `${baseUrl}/?s=Doraemon${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Ben 10":
                    url = `${baseUrl}/?s=Ben+10${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Iron Man":
                    url = `${baseUrl}/?s=Iron+Man${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Dragon Ball Z":
                    url = `${baseUrl}/?s=Dragon+Ball+Z${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Shin Chan":
                    url = `${baseUrl}/?s=Shin+Chan${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Beyblade":
                    url = `${baseUrl}/?s=Beyblade${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Slugterra":
                    url = `${baseUrl}/?s=Slugterra${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Miraculous":
                    url = `${baseUrl}/?s=Miraculous${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Transformers":
                    url = `${baseUrl}/?s=Transformers${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Spider Man":
                    url = `${baseUrl}/?s=Spider+Man${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Yo-kai Watch":
                    url = `${baseUrl}/?s=Yo-kai+Watch${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Powerpuff Girls":
                    url = `${baseUrl}/?s=Powerpuff+Girls${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Tom & Jerry":
                    url = `${baseUrl}/?s=Tom+&+Jerry${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Generator Rex":
                    url = `${baseUrl}/?s=Generator+Rex${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Johnny Test":
                    url = `${baseUrl}/?s=Johnny+Test${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Jackie Chan Adventures":
                    url = `${baseUrl}/?s=Jackie+Chan+Adventures${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Oggy and the Cockroaches":
                    url = `${baseUrl}/?s=Oggy+and+the+Cockroaches${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Teen Titans Go!":
                    url = `${baseUrl}/?s=Teen+Titans+Go!${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "Boruto":
                    url = `${baseUrl}/?s=Boruto${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                case "One Punch Man":
                    url = `${baseUrl}/?s=One+Punch+Man${page > 1 ? `&paged=${page}` : ""}`;
                    break;
                default:
                    if (query && query.trim()) {
                        url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
                    }
                    else {
                        url = `${baseUrl}${page > 1 ? `/page/${page}/` : ""}`;
                    }
                    break;
            }
            const { axios, cheerio } = providerContext;
            const res = yield axios.get(url, { headers: defaultHeaders, signal });
            const $ = cheerio.load(res.data || "");
            const resolveUrl = (href) => (href === null || href === void 0 ? void 0 : href.startsWith("http")) ? href : new URL(href, url).href;
            const normalize = (s) => (s || "").toLowerCase().replace(/[\s\W_]+/g, " ").trim();
            const matchesQuery = (title, q) => {
                if (!q || !q.trim())
                    return true;
                const nt = normalize(title);
                const nq = normalize(q);
                return nq.split(" ").every((tok) => nt.includes(tok));
            };
            const seen = new Set();
            const catalog = [];
            const POST_SELECTORS = [
                "article",
                ".post",
                ".post-item",
                ".entry",
                ".latestPost",
                ".box",
                ".grid-item",
                ".archive-post",
                ".anime-card",
                ".movie-card",
                ".wp-block-post",
                ".entry-content a",
            ].join(",");
            $(POST_SELECTORS).each((_, el) => {
                var _a;
                const card = $(el);
                let a = card.find("h2 a[href]").first().attr("href") || card.find("a[href]").first().attr("href") || "";
                if (!a)
                    return;
                const link = resolveUrl(a);
                if (seen.has(link))
                    return;
                let title = card.find("h2").first().text().trim() ||
                    ((_a = card.find("a[title]").first().attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    card.text().trim();
                title = title.replace(/\[.*?\]/g, "").replace(/\(.+?\)/g, "").replace(/\s{2,}/g, " ").trim();
                if (!matchesQuery(title, query))
                    return;
                const img = card.find("img").first().attr("src") ||
                    card.find("img").first().attr("data-src") ||
                    card.find("img").first().attr("data-original") ||
                    "";
                const image = img ? resolveUrl(img) : "";
                seen.add(link);
                catalog.push({ title, link, image });
            });
            return catalog.slice(0, 100);
            // Extra fallback: anchors with images
            $("a[href]").each((_, el) => {
                var _a;
                const anchor = $(el);
                const href = anchor.attr("href");
                if (!href)
                    return;
                const link = resolveUrl(href);
                if (seen.has(link))
                    return;
                let title = ((_a = anchor.attr("title")) === null || _a === void 0 ? void 0 : _a.trim()) || anchor.text().trim();
                title = title.replace(/\[.*?\]/g, "").replace(/\(.+?\)/g, "").replace(/\s{2,}/g, " ").trim();
                if (!title || !matchesQuery(title, query))
                    return;
                const img = anchor.find("img").attr("src") || anchor.find("img").attr("data-src") || anchor.find("img").attr("data-original") || "";
                const image = img ? resolveUrl(img) : "";
                seen.add(link);
                catalog.push({ title, link, image });
            });
            return catalog;
        }
        catch (err) {
            console.error("RareAnimes fetchPosts error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
}
