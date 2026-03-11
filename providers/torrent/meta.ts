import { ProviderContext, Info } from "../types";

export const getMeta = async ({ link, provider, providerContext }: { link: string, provider: string, providerContext: ProviderContext }): Promise<Info> => {
  const payload = JSON.parse(link);
  const tmdbId = payload.tmdbId;
  const type = payload.type === "series" ? "tv" : "movie";

  const detailsUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=5242517248386a3458476839356d2572&append_to_response=external_ids`;
  
  try {
    const res = await providerContext.axios.get(detailsUrl);
    const data = res.data;
    const imdbId = data.external_ids?.imdb_id || "";

    return {
      title: data.title || data.name,
      image: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
      synopsis: data.overview,
      imdbId: imdbId,
      type: payload.type as any,
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
