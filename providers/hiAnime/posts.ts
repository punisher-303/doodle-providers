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

// --- Core fetch ---
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
    const baseUrlRaw = await getBaseUrl("hianime");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");
    let url: string;

    // ✅ URL Build (Zoro/HiAnime engine)
    if (query && query.trim()) {
      url = `${baseUrl}/search?keyword=${encodeURIComponent(query.trim())}${page > 1 ? `&page=${page}` : ""}`;
    } else if (filter) {
      const clean = filter.startsWith("/") ? filter : `/${filter}`;
      url = `${baseUrl}${clean}${page > 1 ? `?page=${page}` : ""}`;
    } else {
      url = `${baseUrl}/az-list`; // hiAnime uses /az-list for a full catalog if /home is blocked
    }

    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");
    const catalog: Post[] = [];
    const seen = new Set<string>();

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    // ✅ Zoro Engine Selectors: .flw-item
    $(".flw-item").each((_, el) => {
      const item = $(el);
      
      let link = item.find(".film-name a").attr("href") || item.find("a.film-poster-ahref").attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      const title = item.find(".film-name a").text().trim() || item.find("img").attr("alt")?.trim() || "";
      if (!title) return;

      let img = item.find("img").attr("data-src") || item.find("img").attr("src") || "";
      if (img.startsWith("//")) img = "https:" + img;
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      catalog.push({ title, link, image });
    });

    return catalog.slice(0, 100);
  } catch (err) {
    console.error("HiAnime fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
