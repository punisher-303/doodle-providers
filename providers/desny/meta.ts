import { Info, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc"; // Updated

const UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0";

const BASE_HEADERS = {
  "User-Agent": UA,
  "X-Requested-With": "XMLHttpRequest",
};

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

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);

  // 🚨 MISSING IN ORIGINAL: Bypass cookie is required for Post requests too
  const tHash = await getBypassCookie(axios);

  try {
    const res = await axios.get(
      `${MAIN_URL}/mobile/hs/post.php?id=${link}&t=${unixTime}`,
      {
        headers: {
          ...BASE_HEADERS,
          Referer: `${MAIN_URL}/home`,
          Cookie: `${tHash}; ott=dp; hd=on;`,
        },
      }
    );

    const data = res.data;

    const hasEpisodes =
      Array.isArray(data?.episodes) &&
      data.episodes.length > 0 &&
      data.episodes[0] !== null;

    const info: Info = {
      title: data.title || "",
      synopsis: data.desc || "",
      image: `https://imgcdn.kim/hs/v/${link}.jpg`,
      imdbId: "",
      type: hasEpisodes ? "series" : "movie",
      linkList: [],
    };

    if (!hasEpisodes) {
      info.linkList.push({
        title: "▶ Play Movie",
        quality: "HD",
        episodesLink: "",
        directLinks: [{ title: "Default Server", link: `${link}|${data.title}` }],
      });
      return info;
    }

    (data.season || []).forEach((s: any, i: number) => {
      info.linkList.push({
        title: `Season ${i + 1}`,
        quality: "Default",
        episodesLink: `${link}|${s.id}|${data.title}|series`,
        directLinks: [],
      });
    });

    return info;
  } catch (e) {
    console.error("Disney meta error:", e);
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