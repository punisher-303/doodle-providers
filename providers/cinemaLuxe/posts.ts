import { Post, ProviderContext } from "../types";

// --- Base URL ---
const baseUrl = "https://cinemalux.tel";

// --- Default HTTP headers ---
const defaultHeaders = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": baseUrl,
};

// --- Get normal posts (homepage / categories) ---
export async function getPosts({
    filter,
    page = 1,
    signal,
    providerContext,
}: {
    filter?: string;
    page?: number;
    signal?: AbortSignal;
    providerContext: ProviderContext;
}): Promise<Post[]> {
    return fetchPosts({ filter, page, query: "", signal, providerContext });
}

// --- Search posts ---
export async function getSearchPosts({
    searchQuery,
    page = 1,
    signal,
    providerContext,
}: {
    searchQuery: string;
    page?: number;
    signal?: AbortSignal;
    providerContext: ProviderContext;
}): Promise<Post[]> {
    if (!searchQuery || !searchQuery.trim()) return [];

    const cleanedQuery = searchQuery.trim().replace(/\s+/g, "+");

    return fetchPosts({
        filter: "",
        page,
        query: cleanedQuery,
        signal,
        providerContext,
    });
}

// --- Core function ---
async function fetchPosts({
    filter,
    query,
    page = 1,
    signal,
    providerContext,
}: {
    filter?: string;
    query?: string;
    page?: number;
    signal?: AbortSignal;
    providerContext: ProviderContext;
}): Promise<Post[]> {
    try {
        let url: string;

        if (query && query.trim()) {
            url = `${baseUrl}/?s=${query}${page > 1 ? `&page=${page}` : ""}`;
        } else if (filter) {
            url = filter.startsWith("/")
                ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
                : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
        } else {
            url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
        }

        const { axios, cheerio } = providerContext;

        const res = await axios.get(url, { headers: defaultHeaders, signal });

        const $ = cheerio.load(res.data || "");

        const resolveUrl = (href: string) =>
            href?.startsWith("http") ? href : new URL(href, baseUrl).href;

        const seen = new Set<string>();
        const catalog: Post[] = [];

        const POST_SELECTORS = [
            ".item", ".result-item", "article.post", ".movie-item"
        ].join(",");

        $(POST_SELECTORS).each((_, el) => {
            const card = $(el);
            let link = card.find("a").first().attr("href") || "";
            if (!link) return;
            link = resolveUrl(link);
            if (seen.has(link)) return;

            let title =
                card.find(".title").text().trim() ||
                card.find("img").attr("alt")?.trim() ||
                card.find("a").first().attr("title")?.trim() ||
                card.text().trim();

            title = title
                .replace(/\[.*?\]/g, "")
                .replace(/\(.*?\)/g, "")
                .replace(/\bDownload\b/gi, "")
                .replace(/\bWEB[-\s]?DL\b/gi, "")
                .replace(/\bBluRay\b/gi, "")
                .replace(/\bUHD\b/gi, "")
                .replace(/\s{2,}/g, " ")
                .trim();

            if (!title) return;

            const img =
                card.find("img").attr("src") ||
                card.find("img").attr("data-src") ||
                "";
            const image = img ? resolveUrl(img) : "";

            seen.add(link);
            catalog.push({ title, link, image });
        });

        return catalog.slice(0, 100);

    } catch (err) {
        console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
        return [];
    }
}