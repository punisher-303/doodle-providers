import { Post, ProviderContext } from "../types";

const API_BASE = "http://myavens18052002.xyz/nzapis";
const HEADERS = {
  api: "553y845hfhdlfhjkl438943943839443943fdhdkfjfj9834lnfd98",
  "Cache-Control": "no-cache",
  caller: "vion-official-app",
  Connection: "Keep-Alive",
  Host: "myavens18052002.xyz",
  "User-Agent": "okhttp/3.14.9",
};

const formatPosterUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://archive.org/download/${url}`;
};

export async function getPosts({
  page = 1,
  filter,
  providerContext,
}: {
  page?: number;
  filter?: string;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const posts: Post[] = [];
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit;

  try {
    if (filter === "trending_shows") {
      const res = await axios.get(`${API_BASE}/nzgetshows.php`, { headers: HEADERS });
      const data = res.data as any[];
      // Slice for pagination simulation
      data.slice(start, end).forEach((show) => {
        posts.push({
          title: show.name,
          link: `show:${show.id}`,
          image: formatPosterUrl(show.cover || show.thumb),
        });
      });
    } else if (filter === "latest_episodes") {
      const res = await axios.get(`${API_BASE}/nzgetepisodes_v2.php?since=`, { headers: HEADERS });
      const episodes = res.data.episodes as any[];
      
      episodes.slice(start, end).forEach((ep) => {
        posts.push({
          title: `${ep.name} (Ep ${ep.no})`,
          link: `episode:${ep.id}`, // Direct link to episode logic
          image: formatPosterUrl(ep.thumb),
        });
      });
    } else if (filter === "movies") {
      const res = await axios.get(`${API_BASE}/nzgetmovies.php`, { headers: HEADERS });
      const data = res.data as any[];
      
      data.slice(start, end).forEach((movie) => {
        posts.push({
          title: movie.name,
          link: `movie:${movie.id}`,
          image: formatPosterUrl(movie.cover || movie.thumb),
        });
      });
    }
  } catch (err) {
    console.error("Xon getPosts error:", err);
  }

  return posts;
}

export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const posts: Post[] = [];
  const query = searchQuery.toLowerCase();

  try {
    // 1. Search Shows
    const showsRes = await axios.get(`${API_BASE}/nzgetshows.php`, { headers: HEADERS });
    (showsRes.data as any[]).forEach((show) => {
      if (show.name.toLowerCase().includes(query)) {
        posts.push({
          title: show.name,
          link: `show:${show.id}`,
          image: formatPosterUrl(show.cover || show.thumb),
        });
      }
    });

    // 2. Search Movies
    const moviesRes = await axios.get(`${API_BASE}/nzgetmovies.php`, { headers: HEADERS });
    (moviesRes.data as any[]).forEach((movie) => {
      if (
        movie.name.toLowerCase().includes(query) || 
        (movie.tags && movie.tags.toLowerCase().includes(query))
      ) {
        posts.push({
          title: movie.name,
          link: `movie:${movie.id}`,
          image: formatPosterUrl(movie.cover || movie.thumb),
        });
      }
    });

  } catch (err) {
    console.error("Xon search error:", err);
  }

  return posts;
}