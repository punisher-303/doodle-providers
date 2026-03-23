import { EpisodeLink, ProviderContext } from "../types";

const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios } = providerContext;

    // Extract TMDB ID and Type from the URL
    // Examples: https://screenscape.me/watch/tv/1396
    // or https://screenscape.me/tv/1396
    const match = url.match(/\/(tv)\/(\d+)/);
    if (!match) return [];

    const tmdbId = match[2];

    // 1. Fetch TV info to get total seasons
    const infoUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const infoRes = await axios.get(infoUrl);
    const seasons = infoRes.data.seasons || [];

    const episodeLinks: EpisodeLink[] = [];

    // 2. Fetch episodes for each season
    // NOTE: For performance, we might want to only fetch season 1 or current season, 
    // but the app usually expects the full list.
    for (const season of seasons) {
      if (season.season_number === 0) continue; // Skip specials

      const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season.season_number}?api_key=${TMDB_API_KEY}`;
      const seasonRes = await axios.get(seasonUrl);
      const episodes = seasonRes.data.episodes || [];

      episodes.forEach((ep: any) => {
        episodeLinks.push({
          title: `S${ep.season_number} E${ep.episode_number}: ${ep.name}`,
          // link: `https://screenscape.me/watch/tv/${tmdbId}?s=${ep.season_number}&e=${ep.episode_number}`,
          // Consistent link format for getStream to parse
          link: `https://screenscape.me/watch/tv/${tmdbId}/season/${ep.season_number}/episode/${ep.episode_number}`,
        });
      });
    }

    return episodeLinks;
  } catch (err) {
    console.error("ScreenScape getEpisodes error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
