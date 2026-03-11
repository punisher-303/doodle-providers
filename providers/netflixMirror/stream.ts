import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net52.cc"; // Unified Domain

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

async function getBypassCookie(axios: any): Promise<string> {
  try {
    for (let i = 0; i < 5; i++) {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`, null, {
        headers: {
          "User-Agent": UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${MAIN_URL}/`,
          Cookie: "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;",
        },
      });

      const dataStr = JSON.stringify(res.data);
      if (dataStr && dataStr.includes('"r":"n"')) {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const str = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
          const match = str.match(/t_hash_t=[^;]+/);
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

  // link format: "ID|Title"
  const [id, title = ""] = link.split("|");

  /**
   * STEP 1 → Get bypass token
   */
  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  const baseCookies = "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;";
  const cookieHeader = `${baseCookies} ${tHash}`;

  /**
   * STEP 2 → Fetch Mobile Playlist directly (Kotlin logic equivalent)
   * Notice we use /mobile/playlist.php and no longer need 'h'
   */
  const playlistUrl = `${MAIN_URL}/mobile/playlist.php?id=${id}&t=${encodeURIComponent(title)}&tm=${unixTime}`;

  const playlistRes = await axios.get(playlistUrl, {
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${MAIN_URL}/`,
      Cookie: cookieHeader,
    },
  });

  const streams: Stream[] = [];
  const playlist = playlistRes.data;

  /**
   * STEP 3 → Build M3U8 list
   */
  if (Array.isArray(playlist)) {
    for (const item of playlist) {
      for (const src of item.sources || []) {
        if (!src.file || !src.file.includes(".m3u8")) continue;

        // Ensure absolute URL
        const finalUrl = src.file.startsWith("http")
          ? src.file
          : MAIN_URL + src.file;

        streams.push({
          server: `NetflixMirror ${src.label || "Auto"}`,
          link: finalUrl,
          type: "m3u8",
          headers: {
            "User-Agent": "Mozilla/5.0 (Android) ExoPlayer", // ExoPlayer usually works best for these streams
            Accept: "*/*",
            Cookie: "hd=on",
            Referer: `${MAIN_URL}/`,
          },
        });
      }
    }
  }

  return streams;
}