import { EpisodeLink, ProviderContext } from "../types";

// episodes.ts - Updated parsing for Episode Buttons
export const getEpisodes = async function ({ url, providerContext }: { url: string; providerContext: ProviderContext; }): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const res = await axios.get(url, { headers });
    const $ = cheerio.load(res.data);
    const episodes: EpisodeLink[] = [];

    // Specifically look for "Episode X" text in links or headers
    $("a[href*='bollydrive'], a[href*='gdflix']").each((_, element) => {
      const el = $(element);
      const text = el.text().trim();
      const href = el.attr("href");

      if (href && /Episode\s*\d+/i.test(text)) {
        episodes.push({
          title: text,
          link: href
        });
      }
    });

    // Fallback for single links
    if (episodes.length === 0) {
      const singleLink = $("a[href*='bollydrive']").first().attr("href");
      
    }

    return episodes;
  } catch (err) {
    return [];
  }
};