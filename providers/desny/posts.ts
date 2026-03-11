import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc"; // Updated domain

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0";

const BASE_HEADERS = {
  "User-Agent": UA,
  "X-Requested-With": "XMLHttpRequest",
};

/**
 * 🔐 Disney Bypass → t_hash_t
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    for (let i = 0; i < 5; i++) {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
        headers: {
          ...BASE_HEADERS,
          Referer: `${MAIN_URL}/`,
          Cookie: "ott=dp; hd=on;",
        },
      });

      const dataStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
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
    console.error("Disney bypass error:", e);
  }
  return "";
}

function mapFilterToQuery(filter: string): string {
  switch (filter) {
    case "movie":
      return "movie";
    case "show":
      return "series";
    case "10":
      return "10";
    case "home":
    default:
      return "";
  }
}

export async function getPosts({
  filter,
  providerContext,
}: {
  filter: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  const tHash = await getBypassCookie(axios);
  const query = mapFilterToQuery(filter);

  try {
    const res = await axios.get(`${MAIN_URL}/mobile/hs/search.php`, {
      params: { s: query, t: unixTime },
      headers: {
        ...BASE_HEADERS,
        Referer: `${MAIN_URL}/home`,
        Cookie: `${tHash}; ott=dp; hd=on;`,
      },
    });

    if (!res.data?.searchResult) return [];

    return res.data.searchResult.map((it: any) => ({
      title: it.t || "Movie / Show",
      link: it.id,
      image: `https://imgcdn.kim/hs/v/${it.id}.jpg`,
    }));
  } catch (e) {
    console.error("Disney posts error:", e);
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

  const tHash = await getBypassCookie(axios);

  try {
    const res = await axios.get(`${MAIN_URL}/mobile/hs/search.php`, {
      params: { s: searchQuery, t: unixTime },
      headers: {
        ...BASE_HEADERS,
        Referer: `${MAIN_URL}/home`,
        Cookie: `${tHash}; ott=dp; hd=on;`,
      },
    });

    if (!res.data?.searchResult) return [];

    return res.data.searchResult.map((it: any) => ({
      title: it.t || "",
      link: it.id,
      image: `https://imgcdn.kim/hs/v/${it.id}.jpg`,
    }));
  } catch (e) {
    console.error("Disney search error:", e);
    return [];
  }
}