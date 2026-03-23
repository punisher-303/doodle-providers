import { Post, ProviderContext } from "../types";

// const BASE_URL = "https://moviespapa.sale"; // Moved to dynamic getBaseUrl

export async function getPosts({
  page = 1,
  filter,
  providerContext,
}: {
  page?: number;
  filter?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios, cheerio, getBaseUrl } = providerContext;
  const baseUrl = (await getBaseUrl("moviespapa")) || "https://moviespapa.money/";
  const url = page === 1 ? baseUrl : `${baseUrl}/page/${page}/`;

  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const posts: Post[] = [];

    // ✅ Fetch posts (Using new figure structure)
    $("figure").each((_, el) => {
      const card = $(el);

      // Link
      let link = card.find("a").attr("href");
      if (!link) return;

      // Title: remove "Download"
      let title = card.find("p").text().replace(/^Download\s*/i, "").trim();
      
      // Image
      let image = card.find("img").attr("src") || card.find("img").attr("data-src") || "";

      posts.push({
        title,
        link,
        image,
      });
    });

    return posts;
  } catch (e) {
    console.error("MoviesPapa getPosts error", e);
    return [];
  }
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
  const { axios, cheerio, getBaseUrl } = providerContext;
  const baseUrl = (await getBaseUrl("moviespapa")) || "https://moviespapa.money/";
  const url = `${baseUrl}/page/${page}/?s=${encodeURIComponent(searchQuery)}`;

  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const posts: Post[] = [];

    // Reusing the same selector logic as main page
    $("figure").each((_, el) => {
      const card = $(el);

      let link = card.find("a").attr("href");
      if (!link) return;

      let title = card.find("p").text().replace(/^Download\s*/i, "").trim();
      let image = card.find("img").attr("src") || card.find("img").attr("data-src") || "";

      posts.push({
        title,
        link,
        image,
      });
    });

    return posts;
  } catch (e) {
    console.error("MoviesPapa getSearchPosts error", e);
    return [];
  }
}