import { Stream, ProviderContext } from "../types";

// Helper to detect audio tags like PlayTorrioV2
function detectAudioTags(name: string): string[] {
  const n = name.toUpperCase();
  const found: string[] = [];

  if (n.includes("ATMOS")) found.push("Atmos");
  if (n.includes("TRUEHD")) found.push("TrueHD");
  if (n.includes("DTS:X") || n.includes("DTSX")) found.push("DTS:X");
  if (!found.includes("DTS:X") && (n.includes("DTS-HD") || n.includes("DTSHD")))
    found.push("DTS-HD");
  if (
    !found.includes("DTS:X") &&
    !found.includes("DTS-HD") &&
    n.includes("DTS")
  )
    found.push("DTS");
  if (
    n.includes("DD+") ||
    n.includes("EAC3") ||
    n.includes("E-AC-3") ||
    n.includes("DDPLUS") ||
    n.includes("DDP")
  )
    found.push("DD+");
  if (
    !found.includes("DD+") &&
    (n.includes(" DD ") ||
      n.includes("AC3") ||
      n.includes("DOLBY DIGITAL") ||
      n.includes(".DD.") ||
      n.includes("_DD_"))
  )
    found.push("DD");
  if (n.includes("AAC")) found.push("AAC");
  if (n.includes("7.1")) found.push("7.1");
  if (!found.includes("7.1") && n.includes("5.1")) found.push("5.1");
  if (n.includes(" 2.0") || n.includes(".2.0")) found.push("2.0");

  return found;
}

// Helper to detect quality
function detectQuality(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("2160") || n.includes("4K") || n.includes("UHD")) return "2160";
  if (n.includes("1080")) return "1080";
  if (n.includes("720")) return "720";
  if (n.includes("480")) return "480";
  return "";
}

export const getStream = async ({ link, type, signal, providerContext }: { link: string, type: string, signal: AbortSignal, providerContext: ProviderContext }): Promise<Stream[]> => {
  // 1. Handle if link is already a magnet (happens when called from Player for Torrent provider results)
  if (typeof link === 'string' && link.startsWith('magnet:')) {
    return [{
      name: "Torrent Stream",
      server: "Torrent",
      link: link,
      type: "torrent",
      quality: "1080" as any,
      isDebrid: true,
    }];
  }

  let payload: any;
  try {
    payload = JSON.parse(link);
  } catch (e) {
    console.error("Failed to parse link as JSON:", link);
    return [];
  }

  const { imdbId, season, episode, title, showTitle, year } = payload;

  if (!imdbId && !title && !showTitle) return [];

  // Construct search queries (Primary: IMDB, Fallback: Title)
  const queries: string[] = [];
  
  if (season && episode) {
    const s = season.toString().padStart(2, '0');
    const e = episode.toString().padStart(2, '0');
    queries.push(`${imdbId} S${s}E${e}`);
    if (showTitle) queries.push(`${showTitle} S${s}E${e}`);
  } else {
    if (imdbId) queries.push(imdbId);
    if (title) queries.push(`${title}${year ? ' ' + year : ''}`);
  }

  const streams: Stream[] = [];
  
  for (const query of queries) {
      if (!query) continue;
      const url = `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(query)}&sort=seeders&order=desc`;
      
      try {
        const tgRes = await providerContext.axios.get(url, { signal });
        const $ = providerContext.cheerio.load(tgRes.data);
        
        $(".tgxtable tr.tgxtablerow").each((_, el) => {
          const titleEl = $(el).find("a.tgxtitle");
          const name = titleEl.text().trim();
          const magnet = $(el).find('a[href^="magnet:"]').attr("href");
          const size = $(el).find("td").eq(4).text().trim();
          const seeders = $(el).find("td").eq(10).find("b").first().text().trim();

          if (magnet && !streams.some(s => s.link === magnet)) {
            const audioTags = detectAudioTags(name);
            const quality = detectQuality(name);
            
            const serverInfo = [
              "TGx",
              quality ? (quality === "2160" ? "4K" : quality + "p") : "HD",
              audioTags.join(", "),
              size,
              seeders + "S"
            ].filter(s => s).join(" | ");

            streams.push({
              name: name,
              server: serverInfo,
              link: magnet,
              type: "torrent",
              quality: quality as any,
              isDebrid: true,
            });
          }
        });
        
        // If we found enough streams, stop searching other queries
        if (streams.length >= 5) break;
      } catch (err) {
        console.error(`Search failed for query: ${query}`, err);
      }
  }

  try {
    return streams;
  } catch (err) {
    console.error("Torrent provider error:", err);
    return [];
  }
};
