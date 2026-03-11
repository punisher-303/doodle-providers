import { Info, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0";

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

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);
  const hash = await getBypassCookie(axios);

  const url = `${MAIN_URL}/mobile/hs/post.php?id=${link}&t=${unixTime}`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${MAIN_URL}/home`,
        "Cookie": `t_hash_t=${hash}; ott=hs; hd=on`,
      },
    });

    const data = res.data;
    const isSeries =
      Array.isArray(data?.episodes) &&
      data.episodes.length > 0 &&
      data.episodes[0] !== null;

    const info: Info = {
      title: data.title || "",
      synopsis: data.desc || "",
      image: `https://imgcdn.kim/hs/v/${link}.jpg`,
      imdbId: "",
      type: isSeries ? "series" : "movie",
      linkList: [],
    };

    if (!isSeries) {
      info.linkList.push({
        title: "▶ Play Movie",
        quality: "HD",
        episodesLink: "",
        directLinks: [{ title: "Server 1", link: `${link}|${data.title}` }],
      });
      return info;
    }

    const seasons = Array.isArray(data.season) ? data.season : [];
    seasons.forEach((s: any, index: number) => {
      const seasonId = s?.id ?? `${index + 1}`;
      const seasonNumber = index + 1;

      info.linkList.push({
        title: `Season ${seasonNumber}`,
        quality: "Default",
        episodesLink: `${link}|${seasonId}|${data.title}`,
        directLinks: [],
      });
    });

    return info;
  } catch (e) {
    console.error("Hotstar getMeta error:", e);
    throw e;
  }
}