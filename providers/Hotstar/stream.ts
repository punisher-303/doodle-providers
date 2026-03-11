import { Stream, ProviderContext } from "../types";

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
    } catch (e) {}
  }
  return "";
}

export async function getStream({
  link, // Fixed: Changed 'url' to 'link'
  providerContext,
}: {
  link: string; // Fixed: Changed 'url' to 'link'
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  
  // Fixed: Fallback to empty string for title if missing
  const [id, title = ""] = link.split("|"); 
  
  const unixTime = Math.floor(Date.now() / 1000);

  const hash = await getBypassCookie(axios);
  const playlistUrl = `${MAIN_URL}/mobile/hs/playlist.php?id=${id}&t=${encodeURIComponent(title)}&tm=${unixTime}`;

  try {
    const res = await axios.get(playlistUrl, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${MAIN_URL}/home`,
        "Cookie": `t_hash_t=${hash}; ott=hs; hd=on`,
      },
    });

    const streams: Stream[] = [];
    const playlist = res.data;

    if (Array.isArray(playlist)) {
      playlist.forEach((item: any) => {
        // Parse Video Sources
        item.sources?.forEach((src: any) => {
          if (!src.file) return;

          const finalUrl = src.file.startsWith("http") 
            ? src.file 
            : `${MAIN_URL}/${src.file}`;

          streams.push({
            server: `Hotstar ${src.label || "Auto"}`,
            link: finalUrl,
            type: "m3u8",
            headers: {
              "User-Agent": UA,
              "Referer": `${MAIN_URL}/home`,
              "Cookie": "hd=on",
            },
          });
        });
      });
    }

    return streams;
  } catch (e) {
    console.error("Hotstar getStream error:", e);
    return [];
  }
}