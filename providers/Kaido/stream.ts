import { Stream, ProviderContext } from "../types";

export const getStream = async function ({
  link,
  providerContext,
  signal,
}: {
  link: string;
  providerContext: ProviderContext;
  signal?: AbortSignal;
}): Promise<Stream[]> {
  const { getBaseUrl, axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const baseUrlRaw = await getBaseUrl("kaido");
    const baseUrl = baseUrlRaw.replace(/\/$/, "");

    // 1. Extract ID from URL (e.g., /movie-name-123)
    const idMatch = link.match(/-(\d+)/);
    const animeId = idMatch ? idMatch[1] : null;
    if (!animeId) return [];

    // 2. Get Episode List
    const listRes = await axios.get(`${baseUrl}/ajax/episode/list/${animeId}`, { headers, signal });
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

    // For simplicity, we'll try to resolve the first two servers
    const serverItems = $servers(".server-item").slice(0, 2);
    
    for (const el of serverItems.toArray()) {
      const item = $servers(el);
      const sourceId = item.attr("data-id");
      const serverName = item.text().trim();
      const type = item.attr("data-type") || "sub";

      if (!sourceId) continue;

      try {
        const sourceRes = await axios.get(`${baseUrl}/ajax/episode/sources?id=${sourceId}`, { headers, signal });
        if (sourceRes.data?.link) {
          streams.push({
            server: `Kaido - ${serverName} (${type})`,
            link: sourceRes.data.link,
            type: "embed",
            quality: "1080",
          });
        }
      } catch (e) {
        console.error("Kaido source resolution error:", e);
      }
    }

    return streams;
  } catch (err) {
    console.error("Kaido getStream error:", err instanceof Error ? err.message : String(err));
    return [];
  }
};
