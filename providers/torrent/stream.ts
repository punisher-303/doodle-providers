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
  // 1. Handle if link is already a magnet or direct HTTP link
  if (typeof link === 'string') {
    if (link.startsWith('magnet:')) {
      return [{
        name: "Torrent Stream",
        server: "Torrent",
        link: link,
        type: "torrent",
        quality: "1080" as any,
        isDebrid: true,
      }];
    }
    if (link.startsWith('http')) {
       return [{
        name: "Resolved Stream",
        server: "Direct",
        link: link,
        type: "mp4",
        quality: "1080" as any,
        isResolved: true,
      }];
    }
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

  // Helper to sanitize search strings for torrent trackers
  const cleanStr = (s: string) => s ? s.replace(/[&]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  
  const cleanTitle = cleanStr(title);
  const cleanShowTitle = cleanStr(showTitle);

  const streams: Stream[] = [];
  
  // 1. Construct prioritized queries for trackers
  const querySet = new Set<string>();
  if (keyword) {
    querySet.add(keyword);
  } else if (season && episode) {
    const s = season.toString().padStart(2, '0');
    const e = episode.toString().padStart(2, '0');
    if (cleanShowTitle) querySet.add(`${cleanShowTitle} S${s}E${e}`);
    if (imdbId) querySet.add(`${imdbId} S${s}E${e}`);
  } else {
    // For Movies: Prioritize Title search as fallback trackers prefer text over IMDB IDs
    if (cleanTitle && year) querySet.add(`${cleanTitle} ${year}`);
    if (imdbId) querySet.add(imdbId);
    if (cleanTitle) querySet.add(cleanTitle);
  }
  const queries = Array.from(querySet);

  // Helper for parallel execution of all queries across all scrapers
  const runScraper = async (name: string, fn: (q: string) => Promise<Stream[]>) => {
    let scraperCount = 0;
    const scraperTasks = queries.map(async (q) => {
        try {
            const results = await fn(q);
            scraperCount += results.length;
            streams.push(...results);
        } catch (e: any) {
            console.error(`[Provider] ${name} failed for "${q}":`, e.message);
        }
    });
    await Promise.allSettled(scraperTasks);
    console.log(`[Provider] ${name}: Found ${scraperCount} results`);
  };

  const tasks = [
    // 0. Torrentio (The Gold Standard - Aggregated Search)
    (async () => {
      try {
        let torrentioUrl = "";
        if (type === 'movie' && imdbId) {
          torrentioUrl = `https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,sugoi/stream/movie/${imdbId}.json`;
        } else if (type === 'series' && imdbId && season && episode) {
          torrentioUrl = `https://torrentio.strem.fun/providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,sugoi/stream/series/${imdbId}:${season}:${episode}.json`;
        }

        if (torrentioUrl) {
          const res = await providerContext.axios.get(torrentioUrl, { 
            signal, 
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } 
          });
          if (res.data?.streams) {
            const results = res.data.streams.map((s: any) => {
                const nameMatch = s.title.split("\n");
                const torrentName = nameMatch[0] || s.name;
                const details = nameMatch.slice(1).join(" | ");
                const qlt = detectQuality(torrentName) || detectQuality(s.title);
                
                return {
                    name: torrentName,
                    server: `Torrio | ${qlt || 'HD'} | ${detectAudioTags(s.title).join(", ")} | ${details}`,
                    link: s.infoHash ? `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(torrentName)}` : s.url,
                    type: "torrent",
                    quality: qlt as any,
                    isDebrid: true
                };
            });
            streams.push(...results);
            console.log(`[Provider] Torrentio: Found ${results.length} results`);
          } else {
            console.log(`[Provider] Torrentio: 0 results (Blocked or Not Available)`);
          }
        }
      } catch (e: any) { console.error("[Provider] Torrentio failed:", e.message); }
    })(),

    // 5. Knaben (PlayTorrio's Primary Source)
    runScraper("Knaben", async (q) => {
        // Knaben format: https://knaben.org/search/<query>/0/1/seeders
        const url = `https://knaben.org/search/${encodeURIComponent(q)}/0/1/seeders`;
        const res = await providerContext.axios.get(url, { 
            signal, 
            timeout: 8000, 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } 
        });
        const $ = providerContext.cheerio.load(res.data);
        const results: Stream[] = [];
        
        // Results are in <tr> rows inside a <table>
        $("table tr").each((_, el) => {
            const magnetLink = $(el).find('a[href^="magnet:"]');
            const magnet = magnetLink.attr("href");
            
            if (magnet) {
                // Must get full title from 'title' attribute if available
                const n = magnetLink.attr("title") || magnetLink.text().trim();
                const s = $(el).find("td").eq(2).text().trim(); // Size
                const sd = $(el).find("td").eq(4).text().trim(); // Seeders
                const source = $(el).find("td").eq(6).find("a").text().trim() || "Knaben";
                const qlt = detectQuality(n);
                
                results.push({
                    name: n,
                    server: `Knaben | ${qlt || 'HD'} | ${detectAudioTags(n).join(", ")} | ${s} | ${sd}S | ${source}`,
                    link: magnet,
                    type: "torrent",
                    quality: qlt as any,
                    isDebrid: true
                });
            }
        });
        return results;
    }),

    // 1. TorrentGalaxy (Fallback Scraper)
    runScraper("TGx", async (q) => {
      const url = `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(q)}&sort=seeders&order=desc`;
      const res = await providerContext.axios.get(url, { 
        signal, 
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
      });
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

    // 2. YTS (Fallback Scraper - Movies)
    (async () => {
      if (type !== 'movie' || !imdbId) return;
      try {
          const url = `https://yts.mx/api/v2/list_movies.json?query_term=${imdbId}`;
          const res = await providerContext.axios.get(url, { signal, timeout: 5000 });
          if (res.data?.data?.movies?.[0]) {
            const results = res.data.data.movies[0].torrents.map((t: any) => ({
              name: `${res.data.data.movies[0].title_long} [${t.quality}] [YTS]`,
              server: `YTS | ${t.quality} | ${t.type} | ${t.size} | ${t.seeds}S`,
              link: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(res.data.data.movies[0].title_long)}&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://zer0day.ch:1337/announce`,
              type: "torrent",
              quality: t.quality === "720p" ? "720" : t.quality === "1080p" ? "1080" : t.quality === "2160p" ? "2160" : "480",
              isDebrid: true
            }));
            streams.push(...results);
            console.log(`[Provider] YTS: Found ${results.length} results`);
          } else {
            console.log(`[Provider] YTS: 0 results`);
          }
      } catch (e: any) { console.error("[Provider] YTS failed:", e.message); }
    })(),

    // 3. BitSearch (Fallback Scraper)
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

    // 4. 1337x (Fallback Scraper - Top Results only)
    runScraper("1337x", async (q) => {
        // Use a more relaxed search for 1337x
        const searchQ = q.includes('tt') ? q : q.replace(/[^a-zA-Z0-9 ]/g, ' ').substring(0, 50);
        const url = `https://1337x.to/search/${encodeURIComponent(searchQ)}/1/`;
        const res = await providerContext.axios.get(url, { 
            signal, 
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
        });
        const $ = providerContext.cheerio.load(res.data);
        const results: Stream[] = [];
        
        const rows = $("table.table-list tbody tr").slice(0, 5); // Limit to top 5 for speed
        for (const el of rows) {
            const titleEl = $(el).find("td.name a").eq(1);
            const detailLink = titleEl.attr("href");
            if (detailLink) {
                try {
                    const detailRes = await providerContext.axios.get(`https://1337x.to${detailLink}`, { 
                        signal, 
                        timeout: 5000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
                    });
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
  ];

  await Promise.allSettled(tasks);

  // Filter unique magnets by Hash
  const seen = new Set();
  const finalStreams = streams.filter(s => {
    const hashMatch = s.link.match(/btih:([a-fA-F0-9]+)/);
    const hash = hashMatch ? hashMatch[1].toLowerCase() : s.link.toLowerCase();
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  // Final Sort: Torrio results first, then Seeders
  return finalStreams.sort((a, b) => {
      if (a.server.includes("Torrio") && !b.server.includes("Torrio")) return -1;
      if (b.server.includes("Torrio") && !a.server.includes("Torrio")) return 1;
      
      const getSeeders = (s: string) => {
        const match = s.match(/(\d+)S/);
        if (match) return parseInt(match[1]);
        const emojiMatch = s.match(/👤 (\d+)/);
        return emojiMatch ? parseInt(emojiMatch[1]) : 0;
      };
      return getSeeders(b.server) - getSeeders(a.server);
  });
};
