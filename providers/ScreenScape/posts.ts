import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://screenscape.me/",
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
    const baseUrlRaw = await getBaseUrl("screenscape");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");
    let url = baseUrl;

    if (query && query.trim()) {
      url = `${baseUrl}/search?q=${encodeURIComponent(query.trim())}`;
    } else if (filter) {
      url = `${baseUrl}/${filter.startsWith("/") ? filter.slice(1) : filter}`;
    } else {
      url = baseUrl;
    }

    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data);
    const posts: Post[] = [];
    const seen = new Set<string>();

    const resolveUrl = (href: string) =>
      href?.startsWith("http") ? href : new URL(href, baseUrl).href;

    // Updated selectors from browser audit: a.block.group
    $("a.block.group").each((_, el) => {
      const item = $(el);
      let link = item.attr("href") || "";
      if (!link) return;
      link = resolveUrl(link);
      if (seen.has(link)) return;

      const title = item.find("h3").text().trim() || item.find("img").attr("alt")?.trim() || "";
      if (!title) return;

      let img = item.find("img").attr("src") || "";
      const image = img ? resolveUrl(img) : "";

      seen.add(link);
      posts.push({ title, link, image });
    });

    return posts;
  } catch (err) {
    console.error("ScreenScape fetchPosts error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
