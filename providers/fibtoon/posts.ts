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
    const baseUrl = await getBaseUrl("fibtoon");

    let url: string;

    if (query && query.trim()) {
      url = `${baseUrl}/search?keyword=${encodeURIComponent(query)}${
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

    // 🔥 UPDATED PARSER FOR CURRENT FIBWATCH LAYOUT
    $(".video-latest-list.video-wrapper").each((_, el) => {
      const card = $(el);

      const link =
        card.find(".video-thumb > a").attr("href") ||
        card.find("a").first().attr("href");

      if (!link || seen.has(link)) return;

      const title =
        card.find(".channel_details .hptag").text().trim() ||
        card.find("img").attr("alt")?.trim() ||
        "Untitled";

      const imgTag = card.find("img").first();

      let image =
        imgTag.attr("data-src") ||
        imgTag.attr("data-lazy-src") ||
        imgTag.attr("data-full-url") ||
        "";

      if (!image) {
        const srcset = imgTag.attr("srcset");
        if (srcset) {
          image = srcset.split(",")[0].trim().split(" ")[0];
        }
      }

      if (!image) {
        image = imgTag.attr("src") || "";
      }

      if (image.startsWith("//")) {
        image = `https:${image}`;
      }

      if (!image || image.includes("data:image")) return;

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
      "FibWatch fetchPosts error:",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
