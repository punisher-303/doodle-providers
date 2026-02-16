import { EpisodeLink, ProviderContext } from "../types";

const API_KEY = "397ab42557b66900076c80feac6020d0";
const TMDB_API = "https://api.themoviedb.org/3";

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const axios = providerContext.axios;

  let data: {
    id: number;
    imdbId?: string;
    title?: string;
    year?: string;
    type: string;
  };

  try {
    data = JSON.parse(url);
  } catch {
    throw new Error("Invalid episode payload");
  }

  const episodes: EpisodeLink[] = [];

  // Fetch show info
  const showRes = await axios.get(
    `${TMDB_API}/tv/${data.id}?api_key=${API_KEY}`
  );
  const seasons = showRes.data.seasons || [];

  await Promise.all(
    seasons.map(async (season: any) => {
      if (season.season_number === 0) return;

      try {
        const seasonRes = await axios.get(
          `${TMDB_API}/tv/${data.id}/season/${season.season_number}?api_key=${API_KEY}`
        );

        for (const ep of seasonRes.data.episodes || []) {
          episodes.push({
            title: `S${ep.season_number}E${ep.episode_number} - ${ep.name}`,
            link: JSON.stringify({
              id: data.id,
              imdbId: data.imdbId,
              title: data.title,
              year: data.year,
              type: "tv",
              season: ep.season_number,
              episode: ep.episode_number,
            }),
          });
        }
      } catch (e) {
        console.error(`Season ${season.season_number} failed`, e);
      }
    })
  );

  // Sort properly
  return episodes.sort((a, b) => {
    const A = JSON.parse(a.link);
    const B = JSON.parse(b.link);
    return A.season === B.season
      ? A.episode - B.episode
      : A.season - B.season;
  });
}
