import { ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc";

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0";

async function getBypassCookie(axios: any): Promise<string> {
  try {
    for (let i = 0; i < 5; i++) {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
        headers: {
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${MAIN_URL}/`,
          Cookie: "ott=dp; hd=on;",
        },
      });
      const dataStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      if (dataStr && dataStr.includes('"r":"n"')) {
        const sc = res.headers["set-cookie"];
        if (sc) {
          const raw = Array.isArray(sc) ? sc.join(";") : sc;
          const match = raw.match(/t_hash_t=[^;]+/);
          if (match) return match[0];
        }
      }
    }
  } catch {}
  return "";
}

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<{ title: string; link: string; image?: string }[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  const [seriesId, seasonId, title] = url.split("|");
  const episodes: any[] = [];
  let page = 1;

  const tHash = await getBypassCookie(axios);

  while (true) {
    const api =
      `${MAIN_URL}/mobile/hs/episodes.php?s=${seasonId}` +
      `&series=${seriesId}&t=${unixTime}&page=${page}`;

    try {
      const res = await axios.get(api, {
        headers: {
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${MAIN_URL}/home`,
          Cookie: `${tHash}; ott=dp; hd=on;`,
        },
      });

      const data = res.data;

      if (!Array.isArray(data?.episodes)) break;

      data.episodes.forEach((ep: any) => {
        if (!ep?.id) return;
        episodes.push({
          title: `E${ep.ep?.replace(/[^\d]/g, "") || ""} - ${ep.t || "Episode"}`,
          link: `${ep.id}|${title}`,
          image: `https://imgcdn.kim/hsepimg/150/${ep.id}.jpg`,
        });
      });

      // Kotlin logic checks `nextPageShow == 0` for termination
      if (data.nextPageShow === 0) break;
      page++;
    } catch (e) {
      console.error("Disney episodes error:", e);
      break;
    }
  }

  return episodes;
}