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

// Proxy bypass


// ---------------- GET POSTS ----------------
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
  return fetchPosts({ filter, page, providerContext, signal });
}

// ---------------- SEARCH POSTS ----------------
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
  return fetchPosts({ query: searchQuery, page, providerContext, signal });
}

// ---------------- CORE ----------------
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
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("khatri");
    let url = baseUrl;

    if (query) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      url = `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else if (page > 1) {
      url = `${baseUrl}/page/${page}`;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, {
      headers: defaultHeaders,
      signal,
    });

    const $ = cheerio.load(res.data || "");
    const posts: Post[] = [];
    const seen = new Set<string>();

    // 🔥 Herald Theme Exact Selector
    $("article.herald-lay-i").each((_, el) => {
      const card = $(el);

      const link = card.find(".entry-title a").attr("href")?.trim();
      if (!link || seen.has(link)) return;

      const title = card.find(".entry-title a").text().trim();
      if (!title) return;

      const image =
        card.find(".herald-post-thumbnail img").attr("src")?.trim() || "";

      seen.add(link);
      posts.push({
        title,
        link,
        image,
      });
    });

    return posts.slice(0, 100);
  } catch (err) {
    console.error(
      "Khatrimaza fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
