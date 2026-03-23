import { Post, ProviderContext } from "../types";

export async function getPosts({
  page = 1,
  filter,
  providerContext,
}: {
  page?: number;
  filter?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, axios, cheerio } = providerContext;

  const baseUrlRaw = await getBaseUrl("tamilblaster");
  const baseUrl = baseUrlRaw.replace(/\/$/, "");
  const url = `${baseUrl}${page > 1 ? `/page/${page}` : ""}`;
  
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const posts: Post[] = [];

  // Updated based on forum structure
  $("div.ipsType_break").each((_, el) => {
    const card = $(el);
    const anchor = card.find("a");

    let link = anchor.attr("href") || "";
    if (!link) return;
    link = link.startsWith("http") ? link : new URL(link, baseUrl).href;

    const title = anchor.text().trim();
    if (!title) return;

    // Image is usually in the parent or nearby in the board view
    const image = card.closest("article").find("img").attr("src") || "";

    posts.push({
      title,
      link,
      image,
    });
  });

  return posts;
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { getBaseUrl, axios, cheerio } = providerContext;

  const baseUrlRaw = await getBaseUrl("tamilblaster");
  const baseUrl = baseUrlRaw.replace(/\/$/, "");
  const url = `${baseUrl}/search/?q=${encodeURIComponent(searchQuery)}`;
  
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const posts: Post[] = [];

  $("div.ipsType_break").each((_, el) => {
    const card = $(el);
    const anchor = card.find("a");

    let link = anchor.attr("href") || "";
    if (!link) return;
    link = link.startsWith("http") ? link : new URL(link, baseUrl).href;

    const title = anchor.text().trim();
    if (!title) return;

    const image = card.closest("article").find("img").attr("src") || "";

    posts.push({
      title,
      link,
      image,
    });
  });

  return posts;
}
