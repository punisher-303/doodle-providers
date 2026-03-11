import { ProviderContext, EpisodeLink } from "../types";

export const getEpisodes = async ({ url, providerContext }: { url: string, providerContext: ProviderContext }): Promise<EpisodeLink[]> => {
  const payload = JSON.parse(url);
  const { tmdbId, season, imdbId } = payload;

  const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=5242517248386a3458476839356d2572`;

  try {
    const res = await providerContext.axios.get(seasonUrl);
    return res.data.episodes.map((ep: any) => ({
      title: `Episode ${ep.episode_number}: ${ep.name}`,
      link: JSON.stringify({ 
        imdbId, 
        season, 
        episode: ep.episode_number, 
        type: "series", 
        title: ep.name 
      }),
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};
