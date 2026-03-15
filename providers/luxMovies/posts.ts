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
export function getPosts({
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
  const { axios, cheerio, getBaseUrl } = providerContext;

  return getBaseUrl("luxmovies")
    .then((baseUrl: string) => {
      let url: string;

      // Construct normal category/pagination URLs
      if (filter) {
        url = filter.startsWith("/")
          ? `${baseUrl}${filter.replace(/\/$/, "")}${page > 1 ? `/page/${page}` : ""}`
          : `${baseUrl}/${filter}${page > 1 ? `/page/${page}` : ""}`;
      } else {
        url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
      }

      return axios
        .get(url, { headers: defaultHeaders, signal })
        .then((res: any) => {
          const $ = cheerio.load(res.data || "");
          const catalog: Post[] = [];

          const resolveUrl = (href: string) => {
            if (!href) return "";
            if (href.startsWith("http")) return href;
            return `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
          };

          const seen = new Set<string>();

          $("#moviesGridMain a, .movies-grid a").each((_: number, el: any) => {
            const anchor = $(el);
            
            let link = anchor.attr("href") || "";
            if (!link) return;
            link = resolveUrl(link);
            if (seen.has(link)) return;

            let title = anchor.find(".poster-title").text().trim() || anchor.find("img").attr("alt") || "";
            title = title.replace(/^Download\s*/i, "").trim();
            if (!title) return;

            const imgElement = anchor.find(".poster-image img, img").first();
            let img =
              imgElement.attr("data-src") ||
              imgElement.attr("src") ||
              imgElement.attr("data-lazy-src") ||
              "";
            
            seen.add(link);
            catalog.push({ title, link, image: img ? resolveUrl(img) : "" });
          });

          return catalog.slice(0, 100);
        });
    })
    .catch((err: any) => {
      console.error("getPosts error:", err instanceof Error ? err.message : String(err));
      return [];
    });
}

// --- Search posts (With HTML + JSON Fallback) ---
export function getSearchPosts({
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
  const { axios, cheerio, getBaseUrl } = providerContext;

  return getBaseUrl("luxmovies")
    .then((baseUrl: string) => {
      // Step 1: Query the HTML endpoint exactly as specified
      const url = `${baseUrl}/search.html?q=${encodeURIComponent(searchQuery.trim())}&page=${page}`;

      return axios
        .get(url, { headers: defaultHeaders, signal })
        .then((res: any) => {
          const $ = cheerio.load(res.data || "");
          const catalog: Post[] = [];
          const seen = new Set<string>();

          const resolveUrl = (href: string) => {
            if (!href) return "";
            if (href.startsWith("http")) return href;
            return `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
          };

          // Try parsing standard HTML Results
          $("#moviesGridMain a, #results-grid a, .movies-grid a").each((_: number, el: any) => {
            const anchor = $(el);
            let link = anchor.attr("href") || "";
            if (!link) return;
            link = resolveUrl(link);
            if (seen.has(link)) return;

            let title = anchor.find(".poster-title").text().trim() || anchor.find("img").attr("alt") || "";
            title = title.replace(/^Download\s*/i, "").trim();
            if (!title) return;

            const imgElement = anchor.find(".poster-image img, img").first();
            let img =
              imgElement.attr("data-src") ||
              imgElement.attr("src") ||
              imgElement.attr("data-lazy-src") ||
              "";
            
            seen.add(link);
            catalog.push({ title, link, image: img ? resolveUrl(img) : "" });
          });

          // If HTML parsing found results, return them!
          if (catalog.length > 0) {
            return catalog;
          }

          // Step 2: Fallback! If HTML was empty (due to JS rendering), hit the JSON API
          const jsonUrl = `${baseUrl}/search.php?q=${encodeURIComponent(searchQuery.trim())}&page=${page}`;
          
          return axios
            .get(jsonUrl, { headers: defaultHeaders, signal })
            .then((jsonRes: any) => {
              const data = jsonRes.data;
              
              if (data && data.hits) {
                data.hits.forEach((hit: any) => {
                  const doc = hit.document;
                  if (doc) {
                    let title = (doc.post_title || "").replace(/^Download\s*/i, "").trim();
                    let link = doc.permalink || "";
                    link = resolveUrl(link);
                    
                    let image = doc.post_thumbnail || "";
                    if (image) image = resolveUrl(image);
                    
                    if (title && link) {
                      catalog.push({ title, link, image });
                    }
                  }
                });
              }
              
              return catalog;
            })
            .catch(() => []); // Return empty if JSON API also fails
        });
    })
    .catch((err: any) => {
      console.error("getSearchPosts error:", err instanceof Error ? err.message : String(err));
      return [];
    });
}