import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://dramakey.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

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
  return fetchPosts({ filter, page, signal, providerContext });
}

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
  return fetchPosts({ query: searchQuery, page, signal, providerContext });
}

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
    const baseUrlRaw = await getBaseUrl("dramakey");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");
    let url = baseUrl;

    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query.trim())}`;
      if (page > 1) url += `&paged=${page}`;
    } else if (filter) {
      url = `${baseUrl}/${filter.startsWith("/") ? filter.slice(1) : filter}`;
      if (page > 1) url += `/page/${page}`;
    } else {
      url = page > 1 ? `${baseUrl}/page/${page}` : baseUrl;
    }

    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];
    const seen = new Set<string>();

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    // Updated selectors from browser audit: div.eael-grid-post
    $("div.eael-grid-post").each((_, el) => {
      const item = $(el);
      const anchor = item.find("a.eael-grid-post-link");
      let link = anchor.attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      const title = item.find("h2.eael-entry-title a").text().trim() || anchor.attr("title")?.trim() || "";
      if (!title) return;

      let img = item.find("div.eael-entry-thumbnail img").attr("src") || "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      posts.push({ title, link, image });
    });

    return posts;
  } catch (err) {
    console.error("DramaKey fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}