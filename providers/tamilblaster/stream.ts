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
  const { axios, cheerio } = providerContext;

  try {
    // 1. Load the topic page
    const res = await axios.get(link, { headers: COMMON_HEADERS, signal });
    const $ = cheerio.load(res.data);

    // 2. Find the iframe in ipsEmbeddedVideo or similar
    let iframeUrl = "";
    $(".ipsEmbeddedVideo iframe, iframe[src*='tryzendm'], iframe[src*='minochinos'], iframe[src*='hglink']").each((_, el) => {
      iframeUrl = $(el).attr("src") || "";
      if (iframeUrl) return false; // break
    });

    if (!iframeUrl) {
      console.log("❌ No iframe found in TamilBlaster topic");
      return [];
    }

    // Normalize iframe URL if needed (e.g. minochinos, tryzendm)
    if (iframeUrl.includes("hg") || iframeUrl.includes("hglink")) {
      const parts = iframeUrl.split("/e/");
      if (parts.length > 1) {
        const cleanId = parts[1].split("?")[0];
        iframeUrl = `${STREAM_HG}/e/${cleanId}`;
      }
    }

    // 3. Load iframe page to find m3u8
    const iframeRes = await axios.get(iframeUrl, {
      signal,
      headers: { ...COMMON_HEADERS, Referer: link },
    });

    const html = iframeRes.data as string;
    let m3u8: string | null = null;

    const jwPlayerMatch = html.match(/(?:file|source)\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
    if (jwPlayerMatch) m3u8 = jwPlayerMatch[1];

    if (!m3u8) {
      const directMatch = html.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
      if (directMatch) m3u8 = directMatch[1];
    }

    if (!m3u8) return [];

    const origin = new URL(iframeUrl).origin;

    return [
      {
        server: "TamilBlaster (Watch Online)",
        link: m3u8,
        type: "hls",
        headers: {
          "Referer": iframeUrl,
          "Origin": origin,
          "User-Agent": COMMON_HEADERS["User-Agent"],
        },
      },
    ];
  } catch (err) {
    console.error("TamilBlaster getStream error:", err);
    return [];
  }
}