import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc"; // Unified Domain

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const baseHeaders = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/tv/home`,
  Cookie: "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;",
};

/**
 * 🔐 Netflix bypass → t_hash_t
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    for (let i = 0; i < 5; i++) {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
        headers: baseHeaders,
      });

      const dataStr = JSON.stringify(res.data);
      if (dataStr && dataStr.includes('"r":"n"')) {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const raw = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
          const match = raw.match(/t_hash_t=[^;]+/);
          if (match) return match[0];
        }
      }
    }
  } catch (e) {
    console.error("Netflix bypass error:", e);
  }
  return "";
}

export async function getPosts({
  filter,
  page = 1,
  providerContext,
}: {
  filter: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  let query = "";

  switch (filter) {
    case "top10":
      query = "top 10";
      break;
    case "movies":
      query = "movie";
      break;
    case "tv":
      query = "season";
      break;
    case "home":
    default:
      query = "";
      break;
  }

  // 1️⃣ Get bypass cookie
  const tHash = await getBypassCookie(axios);
  const searchHeaders = {
    ...baseHeaders,
    Cookie: `${baseHeaders.Cookie} ${tHash}`,
  };

  const url = `${MAIN_URL}/search.php?s=${encodeURIComponent(query)}&t=${unixTime}`;

  try {
    const res = await axios.get(url, { headers: searchHeaders });
    const results = res.data?.searchResult || [];

    return results.map((item: any) => ({
      title: item.t || "Movie / Show",
      image: `https://imgcdn.kim/poster/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("NetflixMirror home/search error:", e);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  // 1️⃣ Get bypass cookie
  const tHash = await getBypassCookie(axios);
  const searchHeaders = {
    ...baseHeaders,
    Cookie: `${baseHeaders.Cookie} ${tHash}`,
  };

  const url = `${MAIN_URL}/search.php?s=${encodeURIComponent(searchQuery)}&t=${unixTime}`;

  try {
    const res = await axios.get(url, { headers: searchHeaders });
    const data = res.data;
    const results = data.searchResult || [];

    return results.map((item: any) => ({
      title: item.t || "",
      image: `https://imgcdn.kim/poster/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("NetflixMirror search error:", e);
    return [];
  }
}