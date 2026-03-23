import { Post, ProviderContext } from "../types";

/**
 * HELPER: Parses the HTML grid found on moviesdrives.my
 * Works for Latest Releases, Categories (Anime), and Archives.
 */
function parseHtmlPosts(
  url: string,
  signal: AbortSignal,
  providerContext: ProviderContext
): Promise<Post[]> {
  const { axios, cheerio } = providerContext;

  return axios
    .get(url, { signal })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");
      const catalog: Post[] = [];

      // Target the anchor tags wrapping the poster-cards
      $(".movies-grid a, #moviesGridMain a").each((_i, el) => {
        const anchor = $(el);
        
        // Extract Title
        let title = anchor.find(".poster-title").text().trim();
        
        // Extract Quality (FHD, 4K, HD)
        const quality = anchor.find(".poster-quality").text().trim();
        
        // Extract Link
        const link = anchor.attr("href") || "";
        
        // Extract Image (handling lazy-loading attributes)
        const imgEl = anchor.find(".poster-image img");
        const image = imgEl.attr("src") || 
                      imgEl.attr("data-src") || 
                      imgEl.attr("data-lazy-src") || 
                      "";

        if (title && link) {
          // Clean title: Remove "Download" and add Quality tag if available
          title = title.replace(/^Download\s*/i, "").trim();
          const displayTitle = quality ? `[${quality}] ${title}` : title;

          catalog.push({
            title: displayTitle,
            link: link,
            image: image,
          });
        }
      });

      return catalog;
    })
    .catch((err: any) => {
      console.error("Parser Error:", err.message);
      return [];
    });
}

/* =========================
   NORMAL LISTING & CATEGORIES
   (e.g., /category/anime/)
========================= */
export const getPosts = function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  return providerContext.getBaseUrl("drive").then((baseUrlRaw) => {
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    // Construct URL: baseUrl + filter + page
    // Example: https://new1.moviesdrives.my/category/anime/page/1/
    const cleanFilter = filter.startsWith("/") ? filter : `/${filter}`;
    const filterWithSlash = cleanFilter.endsWith("/") ? cleanFilter : `${cleanFilter}/`;
    
    const url = `${baseUrl}${filterWithSlash}page/${page}/`;
    
    return parseHtmlPosts(url, signal, providerContext);
  });
};

/* =========================
   SEARCH (JSON API)
========================= */
export const getSearchPosts = function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  return providerContext.getBaseUrl("drive").then((baseUrlRaw) => {
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    const url = `${baseUrl}/searchapi.php?q=${encodeURIComponent(
      searchQuery
    )}&page=${page}`;

    return providerContext.axios
      .get(url, { signal })
      .then((res: any) => {
        const json = res.data;
        const posts: Post[] = [];

        if (!json || !json.hits) return posts;

        for (const item of json.hits) {
          const doc = item.document;
          if (!doc || !doc.post_title || !doc.permalink) continue;

          posts.push({
            title: doc.post_title.replace(/^Download\s*/i, "").trim(),
            link: doc.permalink.startsWith("http")
              ? doc.permalink
              : baseUrl + (doc.permalink.startsWith("/") ? doc.permalink : `/${doc.permalink}`),
            image: doc.post_thumbnail || "",
          });
        }

        return posts;
      })
      .catch((err: any) => {
        console.error("Search API Error:", err.message);
        return [];
      });
  });
};