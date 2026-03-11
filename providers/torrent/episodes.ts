import { ProviderContext, EpisodeLink } from "../types";

export const getEpisodes = async ({ url, providerContext }: { url: string, providerContext: ProviderContext }): Promise<EpisodeLink[]> => {
  const payload = JSON.parse(url);
  const { tmdbId, season, imdbId } = payload;

  const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";
  const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;

  try {
    const res = await providerContext.axios.get(seasonUrl);
    return res.data.episodes.map((ep: any) => ({
      title: `Episode ${ep.episode_number}: ${ep.name}`,
      link: JSON.stringify({ 
        imdbId, 
        season, 
        episode: ep.episode_number, 
        type: "series", 
        title: ep.name,
        showTitle: payload.title,
        year: payload.year
      }),
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};
