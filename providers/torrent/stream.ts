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
  
  // 1. Construct prioritized queries (PlayTorrio style)
  const querySet = new Set<string>();
  if (keyword) {
    querySet.add(keyword);
  } else if (season && episode) {
    const s = season.toString().padStart(2, '0');
    const e = episode.toString().padStart(2, '0');
    if (showTitle) querySet.add(`${showTitle} S${s}E${e}`);
    if (imdbId) querySet.add(`${imdbId} S${s}E${e}`);
  } else {
    if (imdbId) querySet.add(imdbId); // Many trackers support IMDB ID search
    if (title && year) querySet.add(`${title} ${year}`);
    if (title) querySet.add(title);
  }
  const queries = Array.from(querySet);

  // Helpers for Scrapers
  const runScraper = async (name: string, fn: (q: string) => Promise<Stream[]>) => {
    for (const q of queries) {
      try {
        const results = await fn(q);
        if (results.length > 0) {
          streams.push(...results);
          // If we have enough results for a movie, don't waste time on less specific queries
          if (type === 'movie' && streams.length > 20) break;
        }
      } catch (e) {
        console.error(`Scraper ${name} failed for query ${q}:`, e);
      }
    }
  };

  const tasks = [
    // 1. TorrentGalaxy (Premium Public Source)
    runScraper("TGx", async (q) => {
      const url = `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(q)}&sort=seeders&order=desc`;
      const res = await providerContext.axios.get(url, { signal, timeout: 6000 });
      const $ = providerContext.cheerio.load(res.data);
      const results: Stream[] = [];
      $(".tgxtable tr.tgxtablerow").each((_, el) => {
        const t = $(el).find("a.tgxtitle");
        const magnet = $(el).find('a[href^="magnet:"]').attr("href");
        if (magnet) {
          const n = t.text().trim();
          const s = $(el).find("td").eq(4).text().trim();
          const sd = $(el).find("td").eq(10).find("b").first().text().trim();
          const qlt = detectQuality(n);
          results.push({
            name: n,
            server: `TGx | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
            link: magnet,
            type: "torrent",
            quality: qlt as any,
            isDebrid: true
          });
        }
      });
      return results;
    }),

    // 2. YTS (The gold standard for high-quality movie prints)
    runScraper("YTS", async (q) => {
      if (type !== 'movie' || !imdbId) return [];
      const url = `https://yts.mx/api/v2/list_movies.json?query_term=${imdbId}`;
      const res = await providerContext.axios.get(url, { signal, timeout: 5000 });
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

    // 3. BitSearch (Fast and comprehensive)
    runScraper("BitSearch", async (q) => {
      const url = `https://bitsearch.to/search?q=${encodeURIComponent(q)}&sort=seeders`;
      const res = await providerContext.axios.get(url, { signal, timeout: 5000 });
      const $ = providerContext.cheerio.load(res.data);
      const results: Stream[] = [];
      $(".search-result").each((_, el) => {
        const t = $(el).find("h3 a");
        const magnet = $(el).find('a[href^="magnet:"]').attr("href");
        if (magnet) {
          const n = t.text().trim();
          const s = $(el).find(".stats div").eq(2).text().trim();
          const sd = $(el).find(".stats div").eq(3).text().trim();
          const qlt = detectQuality(n);
          results.push({
            name: n,
            server: `BitSearch | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
            link: magnet,
            type: "torrent",
            quality: qlt as any,
            isDebrid: true
          });
        }
      });
      return results;
    }),

    // 4. 1337x (The most popular tracker)
    runScraper("1337x", async (q) => {
      // 1337x often prefers space-separated keywords for search
      const searchQ = q.includes('tt') ? q : q.replace(/[^a-zA-Z0-9 ]/g, ' '); 
      const url = `https://1337x.to/search/${encodeURIComponent(searchQ)}/1/`;
      const res = await providerContext.axios.get(url, { signal, timeout: 8000 });
      const $ = providerContext.cheerio.load(res.data);
      const results: Stream[] = [];
      
      const rows = $("table.table-list tbody tr");
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const el = rows[i];
        const titleEl = $(el).find("td.name a").eq(1);
        const detailLink = titleEl.attr("href");
        if (detailLink) {
           try {
             const detailRes = await providerContext.axios.get(`https://1337x.to${detailLink}`, { signal, timeout: 5000 });
             const $$ = providerContext.cheerio.load(detailRes.data);
             const magnet = $$('a[href^="magnet:"]').attr("href");
             if (magnet) {
                const n = titleEl.text().trim();
                const s = $(el).find("td.size").clone().children().remove().end().text().trim();
                const sd = $(el).find("td.seeds").text().trim();
                const qlt = detectQuality(n);
                results.push({
                  name: n,
                  server: `1337x | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
                  link: magnet,
                  type: "torrent",
                  quality: qlt as any,
                  isDebrid: true
                });
             }
           } catch (e) { /* skip */ }
        }
      }
      return results;
    }),

    // 5. LimeTorrents (Great fallback)
    runScraper("Lime", async (q) => {
        const url = `https://www.limetorrents.info/search/all/${encodeURIComponent(q)}/seeds/1/`;
        const res = await providerContext.axios.get(url, { signal, timeout: 6000 });
        const $ = providerContext.cheerio.load(res.data);
        const results: Stream[] = [];
        $(".table2 tr").each((i, el) => {
            if (i === 0) return; // Header
            const t = $(el).find(".tt-name a").eq(1);
            // Lime doesn't have magnet on search page, requires detail fetch or we can construct magnet if we had hash
            // But they do have a "magnet" icon link sometimes
            const magnet = $(el).find('a[href^="magnet:"]').attr("href");
            if (magnet) {
                const n = t.text().trim();
                const s = $(el).find("td.tdnormal").eq(1).text().trim(); 
                const sd = $(el).find("td.tdseed").text().trim();
                const qlt = detectQuality(n);
                results.push({
                    name: n,
                    server: `Lime | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S`,
                    link: magnet,
                    type: "torrent",
                    quality: qlt as any,
                    isDebrid: true
                });
            }
        });
        return results;
    })
  ];

  await Promise.allSettled(tasks); // Parallel search for all sources

  // Filter unique magnets by Hash
  const seen = new Set();
  const finalStreams = streams.filter(s => {
    const hash = s.link.split("btih:")[1]?.split("&")[0]?.toLowerCase();
    if (!hash || seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  // Final Sort: Most Seeders first
  return finalStreams.sort((a, b) => {
      const getSeeders = (s: string) => {
        const parts = s.split("|");
        const last = parts[parts.length - 1];
        return parseInt(last.replace(/[^0-9]/g, "")) || 0;
      };
      return getSeeders(b.server) - getSeeders(a.server);
  });
};
