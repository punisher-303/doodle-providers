import { Stream, ProviderContext } from "../types";

const MAIN_URL = "https://net22.cc"; // Updated
const STREAM_URL = "https://net52.cc"; // Updated

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

async function getBypassCookie(axios: any): Promise<string> {
  try {
    // Retry loop for safety
    for (let i = 0; i < 5; i++) {
        const res = await axios.post(
        `${MAIN_URL}/tv/p.php`,
        null,
        {
            headers: {
            "User-Agent": UA,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": `${MAIN_URL}/`,
            "Cookie": "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;",
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
  } catch {}

  return "";
}

/**
 * 🔐 NEW: Matches Kotlin getVideoToken logic
 * 1. POST play.php to get 'h'
 * 2. GET play.php (on stream url) to get 'data-h'
 */
async function getVideoToken(
    axios: any, 
    id: string, 
    cookieHeader: string
): Promise<string> {
    try {
        // Step 1: Get 'h' param
        // Kotlin: val h = JSONObject(json).getString("h")
        const postRes = await axios.post(
            `${MAIN_URL}/play.php`,
            `id=${id}`, // FormBody
            {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": `${MAIN_URL}/`,
                    "Cookie": cookieHeader,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );
        
        const hParam = postRes.data?.h;
        if (!hParam) return "";

        // Step 2: Get 'data-h' token from HTML body
        // Kotlin: document.select("body").attr("data-h")
        const headers2 = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
            "Connection": "keep-alive",
            "Host": "net52.cc",
            "Referer": `${MAIN_URL}/`,
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
        };

        const htmlRes = await axios.get(
            `${STREAM_URL}/play.php?id=${id}&${hParam}`,
            { headers: headers2 }
        );

        // Extract data-h using regex
        const match = htmlRes.data.match(/data-h="([^"]+)"/);
        return match ? match[1] : "";

    } catch (e) {
        console.error("Video Token Error:", e);
        return "";
    }
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
   * STEP 1 → bypass token (cookie)
   */
  const tHash = await getBypassCookie(axios);
  if (!tHash) return [];

  const baseCookies = "ott=nf; hd=on; user_token=233123f803cf02184bf6c67e149cdd50;";
  const cookieHeader = `${baseCookies} ${tHash}`;

  /**
   * STEP 2 → Get Video Token (NEW)
   */
  const videoToken = await getVideoToken(axios, id, cookieHeader);
  // Kotlin passes this token as 'h' parameter in playlist.php

  /**
   * STEP 3 → playlist.php
   * Added &h=${videoToken}
   */
  const playlistUrl = `${STREAM_URL}/playlist.php?id=${id}&t=${encodeURIComponent(title)}&tm=${unixTime}&h=${videoToken}`;

  const playlistRes = await axios.get(
    playlistUrl,
    {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${STREAM_URL}/`,
        "Cookie": cookieHeader,
      },
    }
  );

  const streams: Stream[] = [];
  const playlist = playlistRes.data;

  /**
   * STEP 4 → build FINAL m3u8
   */
  if (Array.isArray(playlist)) {
    for (const item of playlist) {
      for (const src of item.sources || []) {
        if (!src.file || !src.file.includes(".m3u8")) continue;

        const finalUrl = STREAM_URL + src.file.replace("/tv/", "/");

        streams.push({
          server: `NetflixMirror ${src.label || "Auto"}`,
          link: finalUrl,
          type: "m3u8",
          headers: {
            "User-Agent": UA,
            "Accept": "*/*",
            "Cookie": "hd=on",
            "Referer": `${STREAM_URL}/`,
            "Origin": `${STREAM_URL}`,
          },
        });
      }
    }
  }

  return streams;
}
