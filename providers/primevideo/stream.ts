import { Stream, ProviderContext, TextTracks } from "../types";

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
    } catch (error) {
      console.error("PV Bypass Error:", error);
    }
    attempt++;
  }
  return "";
}

export const getStream = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const unix = Math.floor(Date.now() / 1000);
  const [id, title = ""] = link.split("|");

  try {
    // 1. Get Bypass Cookie
    const tHashT = await getBypassCookie(axios);

    // 2. Fetch Playlist
    const playlistUrl = `${MAIN_URL}/pv/playlist.php?id=${id}&t=${encodeURIComponent(
      title
    )}&tm=${unix}`;

    const res = await axios.get(playlistUrl, {
      headers: {
        ...BASE_HEADERS,
        Cookie: `t_hash_t=${tHashT}; ott=pv; hd=on`,
      },
    });

    const streamLinks: Stream[] = [];
    const subtitles: TextTracks[] = [];

    if (Array.isArray(res.data)) {
      res.data.forEach((item: any) => {
        
        // 1. Process Subtitles
        

        // 2. Process Sources (Stream Links)
        item.sources?.forEach((src: any) => {
          // Fix path: /tv/path -> /path
          const cleanFile = src.file.replace("/tv/", "/");
          const finalUrl = `${MAIN_URL}${cleanFile}`;

          streamLinks.push({
            server: `PrimeVideo ${src.label || "Auto"}`,
            link: finalUrl,
            type: "m3u8",
            headers: {
              "User-Agent": USER_AGENT,
              Referer: `${MAIN_URL}/`,
              Cookie: "hd=on",
            },
            
          });
        });
      });
    }

    return streamLinks;
  } catch (err) {
    console.error("PV Stream Error:", err);
    return [];
  }
};