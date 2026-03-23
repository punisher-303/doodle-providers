import { Post, ProviderContext } from "../types";

const multiHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://google.com"
};

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
  const { getBaseUrl, cheerio, axios, commonHeaders } = providerContext;
  const baseUrl = (await getBaseUrl("multi")).replace(/\/+$/, "");
  const url = `${baseUrl}${filter}/page/${page}/`;
  return posts({ url, signal, cheerio, axios, headers: multiHeaders });
};

export const getSearchPosts = async function ({
  searchQuery,

  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, cheerio, axios, commonHeaders } = providerContext;
  const baseUrl = (await getBaseUrl("multi")).replace(/\/+$/, "");
  const url = `${baseUrl}/?s=${searchQuery}`;
  console.log("multiGetPosts url", url);
  return posts({ url, signal, cheerio, axios, headers: multiHeaders });
};

async function posts({
  url,
  signal,
  cheerio,
  axios,
  headers,
}: {
  url: string;
  signal: AbortSignal;
  cheerio: ProviderContext["cheerio"];
  axios: ProviderContext["axios"];
  headers: any;
}): Promise<Post[]> {
  try {
    const res = await axios.get(url, { headers: headers, signal });
    const data = res.data;
    const $ = cheerio.load(data);
    const catalog: Post[] = [];
    $(".items.full,.result-item")
      .children()
      .map((i, element) => {
        console.log("multiGetPosts element", element);
        const title = $(element).find(".poster,.image").find("img").attr("alt");
        const link = $(element).find(".poster,.image").find("a").attr("href");
        const image =
          $(element).find(".poster,.image").find("img").attr("data-src") ||
          $(element).find(".poster,.image").find("img").attr("src");
        if (title && link && image) {
          catalog.push({
            title: title,
            link: link,
            image: image,
          });
        }
      });
    return catalog;
  } catch (err) {
    console.error("multiGetPosts error ", err);
    return [];
  }
}
