import { Post, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/home`,
};

// Robust bypass logic matching Kotlin's do-while loop
async function getBypassCookie(axios: any): Promise<string> {
  let attempt = 0;
  while (attempt < 10) {
    try {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
        headers: BASE_HEADERS,
      });

      const dataStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      
      if (dataStr.includes('"r":"n"')) {
        const cookies = res.headers["set-cookie"];
        if (cookies) {
          const all = Array.isArray(cookies) ? cookies.join(";") : cookies;
          const match = all.match(/t_hash_t=([^;]+)/);
          if (match) return match[1];
        }
      }
    } catch (e) {
      // Ignore and retry
    }
    attempt++;
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
  if (filter === "movies") query = "movie";
  else if (filter === "tv") query = "season";
  else if (filter === "top10") query = "top";

  const bypass = await getBypassCookie(axios);

  const headers = {
    ...BASE_HEADERS,
    Cookie: `t_hash_t=${bypass}; ott=pv; hd=on`,
  };

  const url = `${MAIN_URL}/pv/search.php?s=${encodeURIComponent(query)}&t=${unixTime}`;

  try {
    const res = await axios.get(url, { headers });
    const results = res.data?.searchResult ?? [];

    return results.map((item: any) => ({
      title: item.t,
      image: `https://wsrv.nl/?url=https://imgcdn.kim/pv/v/${item.id}.jpg&w=500`,
      link: item.id,
    }));
  } catch {
    return [];
  }
}