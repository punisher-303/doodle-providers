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
  // 1. Handle if link is already a magnet
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

  const { imdbId, season, episode, title, showTitle, year, keyword } = payload;
  if (!imdbId && !title && !showTitle && !keyword) return [];

  const streams: Stream[] = [];
  const query = keyword || (season && episode 
    ? (showTitle ? `${showTitle} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}` : `${imdbId} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`)
    : `${title || imdbId}${year ? ' ' + year : ''}`);

  // Helpers for Scrapers
  const runScraper = async (name: string, fn: () => Promise<Stream[]>) => {
    try {
      const results = await fn();
      streams.push(...results);
    } catch (e) {
      console.error(`Scraper ${name} failed:`, e);
    }
  };

  const tasks = [
    // 1. TorrentGalaxy
    runScraper("TGx", async () => {
      const tgxUrl = `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(query)}&sort=seeders&order=desc`;
      const res = await providerContext.axios.get(tgxUrl, { signal, timeout: 5000 });
      const $ = providerContext.cheerio.load(res.data);
      const results: Stream[] = [];
      $(".tgxtable tr.tgxtablerow").each((_, el) => {
        const t = $(el).find("a.tgxtitle");
        const magnet = $(el).find('a[href^="magnet:"]').attr("href");
        if (magnet) {
          const n = t.text().trim();
          const s = $(el).find("td").eq(4).text().trim();
          const sd = $(el).find("td").eq(10).find("b").first().text().trim();
          const q = detectQuality(n);
          results.push({
            name: n,
            server: `TGx | ${q || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
            link: magnet,
            type: "torrent",
            quality: q as any,
            isDebrid: true
          });
        }
      });
      return results;
    }),

    // 2. YTS (For Movies)
    runScraper("YTS", async () => {
      if (type !== 'movie' || !imdbId) return [];
      const ytsUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${imdbId}`;
      const res = await providerContext.axios.get(ytsUrl, { signal, timeout: 5000 });
      if (res.data?.data?.movies?.[0]) {
        return res.data.data.movies[0].torrents.map((t: any) => ({
          name: `${res.data.data.movies[0].title_long} [${t.quality}] [YTS]`,
          server: `YTS | ${t.quality} | ${t.type} | ${t.size} | ${t.seeds}S`,
          link: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(res.data.data.movies[0].title_long)}&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://zer0day.ch:1337/announce`,
          type: "torrent",
          quality: t.quality === "720p" ? "720" : t.quality === "1080p" ? "1080" : t.quality === "2160p" ? "2160" : "480",
          isDebrid: true
        }));
      }
      return [];
    }),

    // 3. BitSearch
    runScraper("BitSearch", async () => {
      const bsUrl = `https://bitsearch.to/search?q=${encodeURIComponent(query)}&sort=seeders`;
      const res = await providerContext.axios.get(bsUrl, { signal, timeout: 5000 });
      const $ = providerContext.cheerio.load(res.data);
      const results: Stream[] = [];
      $(".search-result").each((_, el) => {
        const t = $(el).find("h3 a");
        const magnet = $(el).find('a[href^="magnet:"]').attr("href");
        if (magnet) {
          const n = t.text().trim();
          const s = $(el).find(".stats div").eq(2).text().trim(); // Size
          const sd = $(el).find(".stats div").eq(3).text().trim(); // Seeders
          const q = detectQuality(n);
          results.push({
            name: n,
            server: `BitSearch | ${q || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
            link: magnet,
            type: "torrent",
            quality: q as any,
            isDebrid: true
          });
        }
      });
      return results;
    })
  ];

  await Promise.all(tasks);

  // Filter unique magnets
  const seen = new Set();
  const finalStreams = streams.filter(s => {
    const hash = s.link.split("btih:")[1]?.split("&")[0];
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  return finalStreams.sort((a, b) => {
      const getSeeders = (s: string) => parseInt(s.split("|").pop()?.replace("S", "") || "0");
      return getSeeders(b.server) - getSeeders(a.server);
  });
};
