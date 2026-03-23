import { ProviderContext, Stream } from "../types";

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { getBaseUrl, axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const baseUrlRaw = await getBaseUrl("hianime");
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

    const serverItems = $servers(".server-item").slice(0, 2);
    
    for (const el of serverItems.toArray()) {
      const item = $servers(el);
      const sourceId = item.attr("data-id");
      const serverName = item.text().trim();
      const typeLabel = item.attr("data-type") || "sub";

      if (!sourceId) continue;

      try {
        const sourceRes = await axios.get(`${baseUrl}/ajax/episode/sources?id=${sourceId}`, { headers, signal });
        if (sourceRes.data?.link) {
          streams.push({
            server: `HiAnime - ${serverName} (${typeLabel})`,
            link: sourceRes.data.link,
            type: "embed",
            quality: "1080",
          });
        }
      } catch (e) {
        console.error("HiAnime source resolution error:", e);
      }
    }

    return streams;
  } catch (err) {
    console.error("HiAnime getStream error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}