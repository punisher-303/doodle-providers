import { Post, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

interface GetPostsArgs {
  filter?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}

interface GetSearchArgs {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}

interface FetchArgs {
  filter?: string;
  query?: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}

// ---------------- POSTS ----------------
export async function getPosts({
  filter,
  page = 1,
  signal,
  providerContext,
}: GetPostsArgs): Promise<Post[]> {
  return fetchPosts({ filter, page, providerContext, signal });
}

// ---------------- SEARCH ----------------
export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: GetSearchArgs): Promise<Post[]> {
  return fetchPosts({
    query: searchQuery,
    page,
    providerContext,
    signal,
  });
}

// ---------------- CORE SCRAPER ----------------
async function fetchPosts({
  filter = "",
  query = "",
  page = 1,
  signal,
  providerContext,
}: FetchArgs): Promise<Post[]> {
  try {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("1cinevood");
    let url = "";

    if (query) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter}${page > 1 ? `/page/${page}` : ""}`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers: defaultHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const posts: Post[] = [];
    const seen = new Set<string>();

    // 🔥 EXACT selector for your HTML
    $("article.latestPost").each((_, el) => {
      const card = $(el);

      const link =
        card.find("h2 a").attr("href") ||
        card.find("a").first().attr("href") ||
        "";

      if (!link || seen.has(link)) return;

      const title =
        card.find("h2 a").text().trim() ||
        card.find("a").first().attr("title")?.trim() ||
        "";

      if (!title) return;

      const img =
        card.find("img").attr("src") ||
        card.find("img").attr("data-src") ||
        "";

      posts.push({
        title: title.replace(/\s+/g, " ").trim(),
        link,
        image: img,
      });

      seen.add(link);
    });

    return posts.slice(0, 100);
  } catch (err: any) {
    console.error("fetchPosts error:", err?.message || err);
    return [];
  }
}
