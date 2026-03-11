import { Post, ProviderContext } from "../types";

const PROVIDER_NAME = "Torrent";

export const getPosts = async ({ filter, page, providerContext }: { filter: string, page: number, providerContext: ProviderContext }): Promise<Post[]> => {
  // For now, return empty as search is the main entry point
  return [];
};

export const getSearchPosts = async ({ searchQuery, page, providerContext, signal }: { searchQuery: string, page: number, providerContext: ProviderContext, signal: AbortSignal }): Promise<Post[]> => {
  const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=5242517248386a3458476839356d2572&query=${encodeURIComponent(
    searchQuery
  )}&page=${page}`;

  try {
    const res = await providerContext.axios.get(searchUrl, { signal });
    return res.data.results
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .map((item: any) => ({
        title: item.title || item.name,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        link: JSON.stringify({
          tmdbId: item.id,
          type: item.media_type === "tv" ? "series" : "movie",
          title: item.title || item.name,
        }),
        provider: PROVIDER_NAME,
      }));
  } catch (err) {
    console.error(err);
    return [];
  }
};
