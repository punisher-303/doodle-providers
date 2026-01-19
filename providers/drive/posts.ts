import { Post, ProviderContext } from "../types";

/* =========================
   NORMAL LISTING (HTML)
   REQUIRED BY PROVIDER
========================= */
export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("drive");

  const url = `${baseUrl}${filter}page/${page}/`;
  return posts({ url, signal, providerContext });
};

/* =========================
   SEARCH (JSON API)
========================= */
export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  try {
    const { getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("drive");

    const url = `${baseUrl}/searchapi.php?q=${encodeURIComponent(
      searchQuery
    )}&page=${page}`;

    const res = await fetch(url, { signal });
    const json = await res.json();

    const posts: Post[] = [];

    if (!json?.hits) return posts;

    for (const item of json.hits) {
      const doc = item.document;
      if (!doc?.post_title || !doc?.permalink || !doc?.post_thumbnail) continue;

      posts.push({
        title: doc.post_title.trim(),
        link: doc.permalink.startsWith("http")
          ? doc.permalink
          : baseUrl + doc.permalink,
        image: doc.post_thumbnail,
      });
    }

    return posts;
  } catch (err) {
    console.error("drive search error", err);
    return [];
  }
};

/* =========================
   HTML PARSER
========================= */
async function posts({
  url,
  signal,
  providerContext,
}: {
  url: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { cheerio } = providerContext;
    const res = await fetch(url, { signal });
    const html = await res.text();
    const $ = cheerio.load(html);

    const catalog: Post[] = [];

    $(".poster-card").each((_, el) => {
      const title = $(el).find(".poster-title").text();
      const link = $(el).parent().attr("href");
      const image = $(el).find(".poster-image img").attr("src");

      if (title && link && image) {
        catalog.push({
          title: title.replace("Download", "").trim(),
          link,
          image,
        });
      }
    });

    return catalog;
  } catch (err) {
    console.error("drive posts error", err);
    return [];
  }
}
