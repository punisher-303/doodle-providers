import { Info, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${MAIN_URL}/tv/home`,
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

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  const bypass = await getBypassCookie(axios);

  const headers = {
    ...BASE_HEADERS,
    Cookie: `t_hash_t=${bypass}; ott=pv; hd=on`,
  };

  const url = `${MAIN_URL}/pv/post.php?id=${link}&t=${unixTime}`;

  try {
    const res = await axios.get(url, { headers });
    const data = res.data;

    const isSeries =
      Array.isArray(data?.episodes) &&
      data.episodes.length > 0 &&
      data.episodes[0] !== null;

    const info: Info = {
      title: data.title,
      synopsis: data.desc,
      image: `https://wsrv.nl/?url=https://imgcdn.kim/pv/v/${link}.jpg&w=500`,
      imdbId: "",
      type: isSeries ? "series" : "movie",
      linkList: [],
    };

    // 🎬 MOVIE
    if (!isSeries) {
      info.linkList.push({
        title: "▶ Play Movie",
        quality: "HD",
        episodesLink: "",
        directLinks: [{ title: "Server 1", link: `${link}|${data.title}` }],
      });
      return info;
    }

    // 📺 SERIES
    (data.season ?? []).forEach((s: any) => {
      const seasonId = s.id;
      const seasonName = s.s ? s.s.replace("S", "") : "";
      
      info.linkList.push({
        title: `Season ${seasonName}`,
        quality: "Default",
        episodesLink: `${link}|${seasonId}`,
        directLinks: [],
      });
    });

    return info;
  } catch {
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
}