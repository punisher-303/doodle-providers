import { ProviderContext, Info } from "../types";

export const getMeta = async ({ link, provider, providerContext }: { link: string, provider: string, providerContext: ProviderContext }): Promise<Info> => {
  const payload = JSON.parse(link);
  const tmdbId = payload.tmdbId;
  const type = payload.type === "series" ? "tv" : "movie";

  const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";
  const detailsUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,images`;
  
  try {
    const res = await providerContext.axios.get(detailsUrl);
    const data = res.data;
    const imdbId = data.external_ids?.imdb_id || "";

    return {
      title: data.title || data.name,
      image: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      background: `https://image.tmdb.org/t/p/original${data.backdrop_path}`,
      synopsis: data.overview,
      imdbId: imdbId,
      type: payload.type as any,
      rating: data.vote_average?.toFixed(1),
      tags: data.genres?.map((g: any) => g.name) || [],
      linkList: payload.type === "series" 
        ? Array.from({ length: data.number_of_seasons }, (_, i) => ({
            title: `Season ${i + 1}`,
            episodesLink: JSON.stringify({ tmdbId, season: i + 1, imdbId }),
          }))
        : [
            {
              title: "Movie",
              directLinks: [{ title: "Search Torrents", link: JSON.stringify({ imdbId, type: "movie", title: data.title }) }]
            }
          ],
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
};
