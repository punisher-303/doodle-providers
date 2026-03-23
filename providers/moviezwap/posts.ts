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
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("moviezwap");
  const url = `${baseUrl}${filter}`;
  return posts({ url, signal, providerContext });
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
  const { getBaseUrl } = providerContext;
  const baseUrl = await getBaseUrl("moviezwap");
  const url = `${baseUrl}/search.php?q=${encodeURIComponent(searchQuery)}`;
  return posts({ url, signal, providerContext });
};

async function posts({
  url,
  signal,
  providerContext,
}: {
  url: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio } = providerContext;
  try {
    const res = await axios.get(url, { signal });
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $('a[href^="/movie/"]').each((i, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      const image = "";
      if (title && link) {
        catalog.push({
          title: title,
          link: link.startsWith("http") ? link : new URL(link, url).href,
          image: image,
        });
      }
    });
    return catalog;
  } catch (err) {
    console.error("moviezwapGetPosts error ", err instanceof Error ? err.message : String(err));
    return [];
  }
}
