import { Catalog, ProviderType } from "../types";
import { getStream } from "./stream";
import { getPosts, getSearchPosts } from "./posts";
import { getMetadata } from "./meta";

const catalog: Catalog[] = [
  { title: "Trending Movies", filter: "movie/trending" },
  { title: "Popular Movies", filter: "movie/popular" },
  { title: "Trending TV Shows", filter: "tv/trending" },
  { title: "Popular TV Shows", filter: "tv/popular" },
  { title: "Latest Anime", filter: "anime/latest" },
];

const genres: Catalog[] = [
  { title: "Action", filter: "genre/action" },
  { title: "Adventure", filter: "genre/adventure" },
  { title: "Animation", filter: "genre/animation" },
  { title: "Comedy", filter: "genre/comedy" },
];

const ScreenScapeProvider: ProviderType = {
  catalog,
  genres,
  GetStream: getStream,
  GetHomePosts: getPosts,
  GetMetaData: getMetadata,
  GetSearchPosts: getSearchPosts,
};

export default ScreenScapeProvider;
