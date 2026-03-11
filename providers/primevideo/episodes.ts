import { ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/home`,
};

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
    } catch {}
    attempt++;
  }
  return "";
}

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}) {
  const { axios } = providerContext;
  const [seriesId, seasonId] = url.split("|");
  const unixTime = Math.floor(Date.now() / 1000);

  const bypass = await getBypassCookie(axios);
  if (!bypass) return [];

  const headers = {
    ...BASE_HEADERS,
    Cookie: `t_hash_t=${bypass}; ott=pv; hd=on`,
  };

  const episodes: any[] = [];
  let page = 1;

  while (true) {
    const api =
      `${MAIN_URL}/pv/episodes.php?s=${seasonId}` +
      `&series=${seriesId}&t=${unixTime}&page=${page}`;

    try {
      const res = await axios.get(api, { headers });
      const data = res.data;

      (data.episodes ?? []).forEach((ep: any) => {
        episodes.push({
          title: `E${ep.ep.replace("E", "")} - ${ep.t}`,
          link: `${ep.id}|${ep.t}`, 
          image: `https://img.nfmirrorcdn.top/pvepimg/${ep.id}.jpg`,
        });
      });

      if (data.nextPageShow === 0) break;
      page++;
    } catch (e) {
      break;
    }
  }

  return episodes;
}