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

// ---------------- Normal catalog ----------------
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

// ---------------- Search ----------------
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
    filter: "",
    page,
    query: searchQuery,
    signal,
    providerContext,
  });
}

// ---------------- Core ----------------
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
    const baseUrl = await getBaseUrl("dude");

    let url: string;

    if (query && query.trim()) {
      url = `${baseUrl}/?s=${encodeURIComponent(query)}${
        page > 1 ? `&paged=${page}` : ""
      }`;
    } else if (filter) {
      url = filter.startsWith("/")
        ? `${baseUrl}${filter.replace(/\/$/, "")}${
            page > 1 ? `/page/${page}` : ""
          }`
        : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
    } else {
      url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
    }

    const res = await axios.get(url, {
      headers: defaultHeaders,
      signal,
    });

    const $ = cheerio.load(res.data || "");
    const seen = new Set<string>();
    const posts: Post[] = [];

    // ✅ FIXED GRID PARSER
    $(".simple-grid-grid-post").each((_, el) => {
      const card = $(el);

      const link =
        card.find(".simple-grid-grid-post-thumbnail-link").attr("href") ||
        card.find(".simple-grid-grid-post-title a").attr("href");

      if (!link || seen.has(link)) return;

      const title =
        card.find(".simple-grid-grid-post-title a").text().trim() ||
        card.find("img").first().attr("alt")?.trim() ||
        "Untitled";

      // --- Enhanced Image Extraction ---
      const imgTag = card.find("img").first();
      
      // Order of priority: Lazy attributes -> srcset -> src
      let image = 
        imgTag.attr("data-src") || 
        imgTag.attr("data-lazy-src") || 
        imgTag.attr("data-full-url") ||
        "";

      // If still no image, try parsing the srcset (usually contains the highest quality)
      if (!image) {
        const srcset = imgTag.attr("srcset");
        if (srcset) {
          // Get the first URL from the srcset list
          image = srcset.split(",")[0].trim().split(" ")[0];
        }
      }

      // Fallback to standard src
      if (!image) {
        image = imgTag.attr("src") || "";
      }

      // Final check: Background image style fallback
      if (!image || image.includes("data:image")) {
        const style = card.find(".simple-grid-grid-post-thumbnail").attr("style");
        if (style) {
          const match = style.match(/url\((['"]?)(.*?)\1\)/);
          if (match) image = match[2];
        }
      }

      // Ensure URL is absolute (if it starts with //)
      if (image.startsWith("//")) {
        image = `https:${image}`;
      }

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
      "DudeFilms fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}