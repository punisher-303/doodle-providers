import { Post, ProviderContext } from "../types";

const BASE_URL = "https://animedekho.app";

const headers = {
  Referer: BASE_URL,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
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
  return fetchPosts({
    query: searchQuery,
    page,
    signal,
    providerContext,
  });
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
    let url = BASE_URL;

    // Matches Kotlin: "$mainUrl/?s=$query"
    if (query) {
      url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    } else if (filter) {
      // Logic from Kotlin getMainPage: link = "$mainUrl${request.data}"
      // Appending page number if > 1
      url = filter.startsWith("/")
        ? `${BASE_URL}${filter}`
        : `${BASE_URL}/${filter}`;
      
      if (page > 1) {
        url = `${url}/page/${page}/`;
      }
    }

    const { axios, cheerio } = providerContext;
    const res = await axios.get(url, { headers, signal });
    const $ = cheerio.load(res.data || "");

    const posts: Post[] = [];
    
    // Selectors based on Kotlin:
    // Search: "ul[data-results] li article"
    // Home: "article"
    
    let selector = "article";
    if (query) {
      selector = "ul[data-results] li article";
    }

    $(selector).each((_, el) => {
      const article = $(el);

      // Kotlin: selectFirst("a.lnk-blk")?.attr("href")
      const link = article.find("a.lnk-blk").attr("href");
      if (!link) return;

      // Kotlin: selectFirst("header h2")?.text()
      const title = article.find("header h2").text().trim();
      if (!title) return;

      // Kotlin: selectFirst("div figure img")
      // Check src, if contains "data:image", use "data-lazy-src"
      const imgTag = article.find("div figure img");
      let image = imgTag.attr("src") || "";
      
      if (image.includes("data:image")) {
        image = imgTag.attr("data-lazy-src") || image;
      }

      posts.push({
        title,
        link,
        image,
      });
    });

    return posts;
  } catch (err) {
    console.error(
      "Animedekho posts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}