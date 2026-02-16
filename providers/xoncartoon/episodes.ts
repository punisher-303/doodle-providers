import { EpisodeLink, ProviderContext } from "../types";

const API_BASE = "http://myavens18052002.xyz/nzapis";
const HEADERS = {
  api: "553y845hfhdlfhjkl438943943839443943fdhdkfjfj9834lnfd98",
  caller: "vion-official-app",
  Host: "myavens18052002.xyz",
  "User-Agent": "okhttp/3.14.9",
};

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;
  
  // url is now "season:SEASON_ID"
  const [type, idStr] = url.split(":");
  
  if (type !== "season") return [];

  const episodes: EpisodeLink[] = [];

  try {
    // API fetches all episodes, we filter client-side
    const episodesRes = await axios.get(`${API_BASE}/nzgetepisodes_v2.php?since=`, { headers: HEADERS });
    const allEpisodes = episodesRes.data.episodes as any[];

    // Filter episodes belonging to this Season ID
    const seasonEpisodes = allEpisodes.filter((e) => e.season_id == idStr);

    seasonEpisodes.forEach((ep) => {
      episodes.push({
        title: `E${ep.no} - ${ep.name}`,
        link: `episode:${ep.id}`, // Link to stream.ts
       
      });
    });

    // Sort by Episode Number
    episodes.sort((a, b) => {
      const epA = parseInt(a.title.match(/E(\d+)/)?.[1] || "0");
      const epB = parseInt(b.title.match(/E(\d+)/)?.[1] || "0");
      return epA - epB;
    });

  } catch (err) {
    console.error("Xon getEpisodes error:", err);
  }

  return episodes;
}