import { ProviderContext, Stream } from "../types";
import type { AxiosInstance } from "axios";
import { hubcloudExtractor } from "../extractors/hubcloud";

const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

// ✅ OzoLink bypass
async function bypassOzo(
  id: string,
  axios: AxiosInstance
): Promise<string | null> {
  try {
    const res = await axios.get(`https://web.sidexfee.com/?id=${id}`, { headers });
    const encoded = res.data?.match(/link":"([^"]+)"/)?.[1];
    if (!encoded) return null;

    return Buffer.from(encoded.replace(/\\\//g, "/"), "base64").toString();
  } catch {
    return null;
  }
}

// ✅ MAIN STREAM FUNCTION
export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio } = providerContext;

  const streams: Stream[] = [];

  try {
    // ------------------------------------------
    // 1️⃣ OZOLINK / CHECK LINK
    // ------------------------------------------
    if (link.includes("ozolinks") || link.includes("check.")) {
      const idMatch = link.match(/id=([^&]+)/);
      const id = idMatch?.[1];

      if (!id) return [];

      const finalUrl = await bypassOzo(id, axios);
      if (!finalUrl) return [];

      return await getStream({
        link: finalUrl,
        type,
        signal,
        providerContext,
      });
    }

    // ------------------------------------------
    // 2️⃣ HUBCLOUD
    // ------------------------------------------
    if (link.includes("hubcloud.")) {
      const hubStreams = await hubcloudExtractor(
        link,
        signal,
        axios,
        cheerio,
        headers
      );

      if (hubStreams?.length) {
        return hubStreams;
      }
    }

    // ------------------------------------------
    // 3️⃣ DIRECT FILE
    // ------------------------------------------
    if (
      link.includes("hubdrive.") ||
      link.endsWith(".mp4") ||
      link.endsWith(".mkv")
    ) {
      return [
        {
          server: "Direct",
          link,
          type: "file",
        },
      ];
    }

    // ------------------------------------------
    // 4️⃣ GDFlix
    // ------------------------------------------
    if (link.includes("gdflix")) {
      return [
        {
          server: "GDFlix",
          link: link.replace("gdflix.dev", "new12.gdflix.net"),
          type: "file",
        },
      ];
    }

    // ------------------------------------------
    // 5️⃣ FALLBACK
    // ------------------------------------------
    return [
      {
        server: "Unknown",
        link,
        type: "file",
      },
    ];
  } catch (err) {
    console.error("getStream error:", err);
    return [];
  }
}