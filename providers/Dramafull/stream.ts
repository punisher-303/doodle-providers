import { ProviderContext, Stream } from "../types";

const headers = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://dramafull.cc/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
  const { getBaseUrl, axios, cheerio } = providerContext;

  try {
    const baseUrlRaw = await getBaseUrl("dramafull");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");

    // 1. Extract ID from URL
    const idMatch = link.match(/-(\d+)/);
    const dramaId = idMatch ? idMatch[1] : null;
    if (!dramaId) return [];

    // 2. Get Episode List
    const listRes = await axios.get(`${baseUrl}/ajax/episode/list/${dramaId}`, { headers, signal });
    if (!listRes.data?.html) return [];
    
    const $list = cheerio.load(listRes.data.html);
    const firstEp = $list("a.ep-item").first();
    const episodeId = firstEp.attr("data-id");
    if (!episodeId) return [];

    // 3. Get Server List
    const serversRes = await axios.get(`${baseUrl}/ajax/episode/servers?episodeId=${episodeId}`, { headers, signal });
    if (!serversRes.data?.html) return [];

    const $servers = cheerio.load(serversRes.data.html);
    const streams: Stream[] = [];

    const serverItems = $servers(".server-item").slice(0, 2);
    
    for (const el of serverItems.toArray()) {
      const item = $servers(el);
      const sourceId = item.attr("data-id");
      const serverName = item.text().trim();

      if (!sourceId) continue;

      try {
        const sourceRes = await axios.get(`${baseUrl}/ajax/episode/sources?id=${sourceId}`, { headers, signal });
        if (sourceRes.data?.link) {
          streams.push({
            server: `Dramafull - ${serverName}`,
            link: sourceRes.data.link,
            type: "embed",
            quality: "1080",
          });
        }
      } catch (e) {
        console.error("Dramafull source resolution error:", e);
      }
    }

    return streams;
  } catch (err: any) {
    console.error("Dramafull getStream error:", err.message);
    return [];
  }
}
