import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
 const { getBaseUrl, axios, cheerio } = providerContext;
    const baseUrl = await getBaseUrl("fibwatch");

  // If this is a series season link
  if (url.startsWith("season:")) {
    const parts = url.split(":");
    const seasonNum = parts[1];
    const videoId = parts[3];

    const epRes = await axios.get(`${baseUrl}/ajax/episodes.php?video_id=${videoId}`); //
    const episodes: EpisodeLink[] = [];

    if (epRes.data?.episodes) {
      epRes.data.episodes.forEach((ep: any) => {
        const sMatch = ep.title.match(/s(\d{1,2})/i); //
        if (sMatch && parseInt(sMatch[1]) === parseInt(seasonNum)) {
          episodes.push({
            title: ep.title || "Episode",
            link: ep.url.startsWith("http") ? ep.url : `${baseUrl}${ep.url}`,
          });
        }
      });
    }
    return episodes;
  }

  // If it's a movie server link, return it as a single playable episode
  return [{
    title: "Watch",
    link: url,
  }];
};