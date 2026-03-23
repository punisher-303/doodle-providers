import { Post, ProviderContext } from "../types";

export const getPosts = async function ({
  filter,
  page,
  // providerValue,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("w4u");
  const url = `${baseUrl + filter}/page/${page}/`;
  return posts({ url, signal, axios, cheerio });
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  // providerValue,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("w4u");
  const url = `${baseUrl}/page/${page}/?s=${searchQuery}`;
  return posts({ url, signal, axios, cheerio });
};

async function posts({
  url,
  signal,
  axios,
  cheerio,
}: {
  url: string;
  signal: AbortSignal;
  axios: ProviderContext["axios"];
  cheerio: ProviderContext["cheerio"];
}): Promise<Post[]> {
  try {
    const res = await axios.get(url, { signal });
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".post, .recent-posts > div, article").each((_i, element) => {
      const el = $(element);
      const titleRaw = el.find("h2.entry-title a, .post-thumb a").attr("title") || el.find("h2").text();
      const link = el.find("h2.entry-title a, .post-thumb a, a").first().attr("href");
      const image =
        el.find("img.Thumbnail, img").first().attr("data-src") ||
        el.find("img").first().attr("src");

      if (titleRaw && link && image) {
        catalog.push({
          title: titleRaw.replace(/^Download\s*/i, "").trim(),
          link: link,
          image: image,
        });
      }
    });
    return catalog;
  } catch (err) {
    return [];
  }
}
