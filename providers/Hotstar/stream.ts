import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net22.cc";
const STREAM_URL = "https://net52.cc";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const USER_TOKEN = "233123f803cf02184bf6c67e149cdd50";

/**
 * 🔐 Step 1: Get Bypass Cookie (t_hash_t)
 * Matches Kotlin: do { ... } while (!verifyCheck.contains("\"r\":\"n\""))
 */
async function getBypassCookie(axios: any): Promise<string> {
  try {
    // Retry loop for reliability
    for (let i = 0; i < 5; i++) {
      const res = await axios.post(
        `${MAIN_URL}/tv/p.php`,
        null,
        {
          headers: {
            "User-Agent": UA,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": `${MAIN_URL}/`,
            // ott=hs for Hotstar
            "Cookie": `ott=hs; hd=on; user_token=${USER_TOKEN};`,
          },
        }
      );

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
  } catch (e) {
    console.error("Hotstar Bypass Error:", e);
  }

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
   * 1️⃣ BYPASS
   */
  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  // Kotlin: cookies = mapOf("t_hash_t" to cookie_value, "ott" to "hs", "hd" to "on")
  const cookieHeader = `${tHash}; ott=hs; hd=on`;

  /**
   * 2️⃣ FETCH PLAYLIST
   * Kotlin: app.get("$newUrl/mobile/hs/playlist.php...", referer = "$mainUrl/", ...)
   * Note the specific path /mobile/hs/
   */
  const playlistUrl = `${STREAM_URL}/mobile/hs/playlist.php?id=${id}&t=${encodeURIComponent(
    title
  )}&tm=${unixTime}`;

  try {
    const playlistRes = await axios.get(playlistUrl, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${MAIN_URL}/`, // Kotlin explicitly uses mainUrl as referer here
        "Cookie": cookieHeader,
      },
    });

    const streams: Stream[] = [];
    const playlist = playlistRes.data;

    /**
     * 3️⃣ PARSE STREAMS
     */
    if (Array.isArray(playlist)) {
      playlist.forEach((item: any) => {
        item.sources?.forEach((src: any) => {
          if (!src.file || !src.file.includes(".m3u8")) return;

          // Handle absolute vs relative URLs
          // Kotlin: "$newUrl/${it.file}"
          const finalUrl = src.file.startsWith("http")
            ? src.file
            : `${STREAM_URL}${src.file}`;

          streams.push({
            server: `Hotstar ${src.label || "Auto"}`,
            link: finalUrl,
            type: "m3u8",
            headers: {
              "User-Agent": UA,
              "Accept": "*/*",
              "Connection": "keep-alive",
              // Kotlin: ExtractorLink referer = "$newUrl/"
              "Referer": `${STREAM_URL}/`,
              "Origin": `${STREAM_URL}`,
              "Cookie": "hd=on",
            },
          });
        });
      });
    }

    return streams;

  } catch (e) {
    console.error("Hotstar Stream Error:", e);
    return [];
  }
}
