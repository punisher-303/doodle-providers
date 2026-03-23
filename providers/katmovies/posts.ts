import { Post, ProviderContext } from "../types";

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
  const { getBaseUrl, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("kat");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({ url, signal, cheerio });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("kat");
  const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
  return posts({ url, signal, cheerio });
};

async function posts({
  url,
  signal,
  cheerio,
}: {
  url: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
}): Promise<Post[]> {
  try {
    const res = await fetch(url, { signal });
    const data = await res.text();
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".post, article, .recent-posts > div").each((_i, element) => {
      const el = $(element);
      const linkEl = el.find("a[title], h2 a, a").first();
      const title = linkEl.attr("title") || el.find("img").attr("alt");
      const link = linkEl.attr("href");
      const image = el.find("img").attr("src") || el.find("img").attr("data-src");

      if (title && link && image) {
        catalog.push({
          title: title.replace(/^Download\s*[:-]?/i, "").trim(),
          link: link,
          image: image,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("katmovies error ", err);
    return [];
  }
}
