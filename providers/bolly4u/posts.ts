import { Post, ProviderContext } from "../types";

const scrapingHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Cookie:
    "_ga=GA1.1.924482842.1765433313; cf_clearance=Y.tdJJL.L0bpWcmgBlHQKzYS6R47mTs4tjY8Lh_igpM-1765440206-1.2.1.1-Eyhc.8DkjagnY6nix9ZvG_bY90Tk0774UoVeDTRx2wwTfYyvlsa9_B6CKRn2JeBiYnzTSOHnnSkbQCPKUGYNAuvpwnQUJdL0_yeNXeoSlaUPFL5_V5WyTtDWL7mNGrxvv2IwAR4dQX2qiB_SN2PyghGcF5BruXCY9kBJtyf3PzTf.TheNwvWOMuho3iM97bHepWd88hUv3PKcncmgZDhKrvXQfhdk.rsN7bR5fXlMz4; prefetchAd_9970961=true; _ga_DF9BTRQL6V=GS2.1.s1765433312$o1$g1$t1765440456$j60$l0$h0; cf_chl_rc_ni=1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Alt-Used": "vegamovies.ks.ua",
};

export async function getPosts({ filter, page = 1, signal, providerContext }: {
  filter?: string; page?: number; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter, page, query: "", signal, providerContext });
}

export async function getSearchPosts({ searchQuery, page = 1, signal, providerContext }: {
  searchQuery: string; page?: number; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  return fetchPosts({ filter: "", page, query: searchQuery, signal, providerContext });
}

async function fetchPosts({ filter, query, page = 1, signal, providerContext }: {
  filter?: string; query?: string; page?: number; signal?: AbortSignal; providerContext: ProviderContext;
}): Promise<Post[]> {
  try {
    const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("bolly4u");
    let url: string;

    if (query?.trim()) {
      url = `${baseUrl}/${page > 1 ? `page/${page}/` : ""}?s=${encodeURIComponent(query)}`;
    } else if (filter) {
      url = `${baseUrl}/${filter.replace(/^\/|\/$/g, "")}/${page > 1 ? `page/${page}/` : ""}`;
    } else {
      url = `${baseUrl}/${page > 1 ? `page/${page}/` : ""}`;
    }

    const res = await axios.get(url, { headers: scrapingHeaders, signal });
    const $ = cheerio.load(res.data || "");

    const catalog: Post[] = [];
    const seen = new Set<string>();

    // Target the specific article element from your HTML snippet
    $("article.post-item").each((_, el) => {
      const card = $(el);
      
      // 1. Get Link - From the title anchor
      let link = card.find(".entry-title a").attr("href") || 
                 card.find(".blog-img").attr("href") || "";
      
      if (!link || link.includes("#")) return;
      if (!link.startsWith("http")) link = new URL(link, baseUrl).href;
      if (seen.has(link)) return;

      // 2. Get Title - From the anchor text
      let title = card.find(".entry-title a").text().trim() || 
                  card.find(".blog-img").attr("title") || "";

      // Cleanup title
      title = title
        .replace(/Download\s+/gi, "")
        .replace(/S\d+E\d+\s+Added!/gi, "")
        .replace(/\{.*?\}/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      // 3. Get Image - Target the img inside blog-pic-wrap
      const imgTag = card.find(".blog-pic img");
      let image = imgTag.attr("src") || 
                  imgTag.attr("data-src") || 
                  imgTag.attr("data-lazy-src") || "";

      if (image && !image.startsWith("http")) image = new URL(image, baseUrl).href;

      if (title && link) {
        seen.add(link);
        catalog.push({ title, link, image });
      }
    });

    return catalog;
  } catch (err) {
    console.error("fetchPosts error:", err);
    return [];
  }
}