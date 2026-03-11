import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0";

/**
 * Executes a POST request to get the `t_hash_t` bypass cookie.
 * Matches the Kotlin logic: loops until response contains {"r":"n"}.
 */
async function getBypassCookie(axios: any): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
        headers: {
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          "Referer": `${MAIN_URL}/home`,
        },
      });

      const dataStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data);

      if (dataStr.includes('"r":"n"')) {
        const sc = res.headers["set-cookie"];
        if (sc) {
          const raw = Array.isArray(sc) ? sc.join(";") : sc;
          const match = raw.match(/t_hash_t=([^;]+)/);
          if (match) return match[1];
        }
      }
    } catch (e) {
      // Ignore errors during retry loop
    }
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
  const hash = await getBypassCookie(axios);

  const query = filter === "home" ? "h" : filter;
  const url = `${MAIN_URL}/mobile/hs/search.php?s=${encodeURIComponent(query)}&t=${unixTime}`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${MAIN_URL}/home`,
        "Cookie": `t_hash_t=${hash}; ott=hs; hd=on`,
      },
    });

    const results = res.data?.searchResult || [];

    return results.map((item: any) => ({
      title: item.t,
      image: `https://imgcdn.kim/hs/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("Hotstar getPosts error:", e);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);
  const hash = await getBypassCookie(axios);

  const url = `${MAIN_URL}/mobile/hs/search.php?s=${encodeURIComponent(searchQuery)}&t=${unixTime}`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${MAIN_URL}/home`,
        "Cookie": `t_hash_t=${hash}; ott=hs; hd=on`,
      },
    });

    const results = res.data?.searchResult || [];

    return results.map((item: any) => ({
      title: item.t,
      image: `https://imgcdn.kim/hs/v/${item.id}.jpg`,
      link: item.id,
    }));
  } catch (e) {
    console.error("Hotstar getSearchPosts error:", e);
    return [];
  }
}