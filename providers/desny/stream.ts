import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc"; // Fixed: Net51 removed as Kotlin handles streams on the same domain

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

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const unixTime = Math.floor(Date.now() / 1000);
  const [id, title = ""] = link.split("|");

  const tHashT = await getBypassCookie(axios);

  // Kotlin directly fetches playlist.php from mainUrl without a separate streamUrl domain
  const playlistUrl = `${MAIN_URL}/mobile/hs/playlist.php?id=${id}&t=${encodeURIComponent(
    title
  )}&tm=${unixTime}`;

  try {
    const playlistRes = await axios.get(playlistUrl, {
      headers: {
        ...BASE_HEADERS,
        Referer: `${MAIN_URL}/home`,
        Cookie: `${tHashT}; ott=dp; hd=on;`,
      },
    });

    const streams: Stream[] = [];
    const subtitles: { language: string; url: string }[] = [];

    if (Array.isArray(playlistRes.data)) {
      playlistRes.data.forEach((item: any) => {
        // Parse Tracks / Subtitles first so we can attach them
        item.tracks?.forEach((track: any) => {
          if (track.kind === "captions" && track.file) {
            subtitles.push({
              language: track.label || "English",
              // Ensure URL is absolute based on httpsify
              url: track.file.startsWith("http") ? track.file : `${MAIN_URL}${track.file}`,
            });
          }
        });

        // Parse Sources
        item.sources?.forEach((src: any) => {
          if (!src.file) return;
          streams.push({
            server: `Disney Plus ${src.label || "Auto"}`,
            link: src.file.startsWith("http") ? src.file : `${MAIN_URL}/${src.file}`,
            type: "m3u8",
            headers: {
              "User-Agent": "Mozilla/5.0 (Android) ExoPlayer", 
              Accept: "*/*",
              Referer: `${MAIN_URL}/home`,
              Cookie: "hd=on", // Interceptor in Kotlin adds this specifically for m3u8
            },
             // Attach extracted subs
          });
        });
      });
    }

    return streams;
  } catch (e) {
    console.error("Disney Stream Error:", e);
    return [];
  }
}