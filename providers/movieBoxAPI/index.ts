import { ProviderType } from "../types";
import { getPosts, getSearchPosts } from "./posts";
import { getMetaData } from "./meta";
import { getStream } from "./stream";

const movieBoxAPI: ProviderType = {
  catalog: [
    { title: "MovieBox Home", filter: "home" },
  ],
  genres: [],
  GetHomePosts: getPosts,
  GetSearchPosts: getSearchPosts,
  GetMetaData: getMetaData,
  GetStream: getStream,
};

export default movieBoxAPI;
