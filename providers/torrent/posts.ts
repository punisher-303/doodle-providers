import { Post, ProviderContext } from "../types";

const PROVIDER_NAME = "torrent";

const TMDB_API_KEY = "9d2bff12ed955c7f1f74b83187f188ae";

export const getPosts = async ({
  filter,
  page,
  providerContext,
}: {
  filter: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> => {
  let url = "";

  switch (filter) {
    case "trending":
      url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${page}`;
      break;
    case "popular_movies":
      url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
      break;
    case "popular_tv":
      url = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`;
      break;
    case "top_rated_movies":
      url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`;
      break;
    case "upcoming":
      url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&page=${page}`;
      break;
    default:
      url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${page}`;
  }

  try {
    const res = await providerContext.axios.get(url);
    return res.data.results
      .filter((item: any) => item.poster_path)
      .map((item: any) => ({
        title: item.title || item.name,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        link: JSON.stringify({
          tmdbId: item.id,
          type: item.media_type === "tv" || filter.includes("tv") ? "series" : "movie",
          title: item.title || item.name,
        }),
        provider: PROVIDER_NAME,
      }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getSearchPosts = async ({ searchQuery, page, providerContext, signal }: { searchQuery: string, page: number, providerContext: ProviderContext, signal: AbortSignal }): Promise<Post[]> => {
  const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
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
