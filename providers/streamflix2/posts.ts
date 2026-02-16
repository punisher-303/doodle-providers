import { Post, ProviderContext } from "../types";

const DATA_URL = "https://api.streamflix.app/data.json";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500/";

export async function getPosts({
  filter,
  providerContext,
}: {
  filter?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  
  try {
    const res = await axios.get(DATA_URL);
    const data = res.data.data;
    
    let items = data;
    
    // Note: JSON keys are lowercase (moviename, isTV, movieposter, moviekey)
    if (filter === "movies") {
        items = data.filter((i: any) => !i.isTV && i.moviename);
    } else if (filter === "tv") {
        items = data.filter((i: any) => i.isTV && i.moviename);
    }
    
    return items.slice(0, 50).map((item: any) => ({
      title: item.moviename,
      image: item.movieposter ? `${IMAGE_BASE}${item.movieposter}` : "",
      // Link format: type:movieKey
      link: `${item.isTV ? "tv" : "movie"}:${item.moviekey}`,
    }));
  } catch (e) {
    console.error("StreamFlix getPosts error:", e);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  
  try {
    const res = await axios.get(DATA_URL);
    const data = res.data.data;
    const query = searchQuery.toLowerCase();
    
    const filtered = data.filter((item: any) => 
        (item.moviename && item.moviename.toLowerCase().includes(query)) ||
        (item.movieinfo && item.movieinfo.toLowerCase().includes(query))
    );
    
    return filtered.map((item: any) => ({
      title: item.moviename,
      image: item.movieposter ? `${IMAGE_BASE}${item.movieposter}` : "",
      link: `${item.isTV ? "tv" : "movie"}:${item.moviekey}`,
    }));
  } catch (e) {
    console.error("StreamFlix search error:", e);
    return [];
  }
}