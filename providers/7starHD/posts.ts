import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

// --- Normal catalog posts ---
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
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
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
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrlRaw = await getBaseUrl("7starhd");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");
    let url: string;

    // --- Build URL for category filter or search query
    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ""}`;
    } else if (filter) {
      const cleanFilter = filter.startsWith("/") ? filter : `/${filter}`;
      url = `${baseUrl}${cleanFilter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    const seen = new Set<string>();
    const catalog: Post[] = [];

    // --- Parse each movie block ---
    $(".home-wrapper .thumb, .post, .item").each((_, el) => {
      const card = $(el);

      const linkEl = card.find("a.thumbtitle, a[href]").first();
      const link = linkEl.attr("href")?.trim();
      if (!link || seen.has(link)) return;

      const title =
        linkEl.text().trim() ||
        card.find(".thumbtitle").text().trim() ||
        card.find("img").attr("alt")?.trim() ||
        "Untitled";

      const imageEl = card.find("figure img, img").first();
      const image =
        imageEl.attr("src")?.trim() ||
        imageEl.attr("data-src")?.trim() ||
        "";

      seen.add(link);
      catalog.push({ 
        title: title.replace(/^Download\s*/i, "").trim(), 
        link: resolveUrl(link), 
        image: image ? resolveUrl(image) : "" 
      });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("7StarHD fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
