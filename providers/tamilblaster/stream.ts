import { ProviderContext, Stream } from "../types";

const STREAM_HG = "https://tryzendm.com";

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
};

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;

  try {
    let iframeUrl = link;

    // =================================================================
    // 1️⃣ Logic: Force "hg" links to tryzendm.com
    // =================================================================
    if (iframeUrl.includes("hg") || iframeUrl.includes("hglink")) {
      const parts = iframeUrl.split("/e/");
      if (parts.length > 1) {
        const cleanId = parts[1].split("?")[0];
        iframeUrl = `${STREAM_HG}/e/${cleanId}`;
      }
    }

    // =========================
    // 2️⃣ Load iframe page
    // =========================
    const res = await axios.get(iframeUrl, {
      signal,
      headers: {
        ...COMMON_HEADERS,
        Referer: iframeUrl, 
      },
    });

    const html = res.data as string;
    let m3u8: string | null = null;

    // =======================================================
    // 3️⃣ Extraction Strategy (JWPlayer)
    // =======================================================
    const jwPlayerMatch = html.match(/(?:file|source)\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
    if (jwPlayerMatch) {
      m3u8 = jwPlayerMatch[1];
    }

    if (!m3u8) {
        const directMatch = html.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
        if (directMatch) m3u8 = directMatch[1];
    }

    if (!m3u8) {
      console.log("❌ No m3u8 found");
      return [];
    }

    // ======================================================
    // 4️⃣ Playback Fix (Headers for tnmr.org)
    // ======================================================
    const origin = new URL(iframeUrl).origin; // https://tryzendm.com

    return [
      {
        server: "VidHide / StreamHG",
        link: m3u8,
        type: "hls",
        headers: {
          // 403 FIX: The Referer MUST be the exact page URL where the video is embedded
          "Referer": iframeUrl, 
          
          // 403 FIX: The Origin must be the domain root
          "Origin": origin,
          
          "User-Agent": COMMON_HEADERS["User-Agent"],
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    ];
  } catch (err) {
    console.log("getStream error:", err);
    return [];
  }
}