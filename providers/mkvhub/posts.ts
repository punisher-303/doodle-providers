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
    const baseUrlRaw = await getBaseUrl("mkvhub");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");
    let url: string;

    // Search URL
    if (query && query.trim() && query.trim().toLowerCase() !== "what are you looking for?") {
      const params = new URLSearchParams();
      params.append("s", query.trim());
      if (page > 1) params.append("paged", page.toString());
      url = `${baseUrl}/?${params.toString()}`;
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

    // ✅ Fetch posts: UPDATED SELECTORS
    $("figure, .thumb, .post, article").each((_, el) => {
      const card = $(el);

      const linkEl = card.find("figcaption a, a").first();
      let link = linkEl.attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link) || link === baseUrl || link === baseUrl + "/") return;

      let title =
        card.find("figcaption a p").first().text().trim() ||
        card.find(".post-title a, h2 a, a").first().text().trim() ||
        card.find("img").attr("alt")?.trim() ||
        "";
      if (!title) return;
      
      let img =
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-src") ||
        "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ 
        title: title.replace(/^Download\s*/i, "").trim(), 
        link, 
        image 
      });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}