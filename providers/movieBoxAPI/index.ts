import { ProviderType } from "../types";
import { catalog, genres } from "./catalog";
import { getPosts, getSearchPosts } from "./posts";
import { getMetaData } from "./meta";
import { getStream } from "./stream";

const movieBoxAPI: ProviderType = {
  catalog,
  genres,
  GetHomePosts: getPosts,
  GetSearchPosts: getSearchPosts,
  GetMetaData: getMetaData,
  GetStream: getStream,
};

export default movieBoxAPI;
