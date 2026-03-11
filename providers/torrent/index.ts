import {
  Post,
  Stream,
  ProviderContext,
  Info,
  EpisodeLink,
  ProviderType,
} from "../types";

const PROVIDER_NAME = "Torrent";

// Helper to detect audio tags like PlayTorrioV2
function detectAudioTags(name: string): string[] {
  const n = name.toUpperCase();
  const found: string[] = [];
  if (n.includes("ATMOS")) found.push("Atmos");
  if (n.includes("TRUEHD")) found.push("TrueHD");
  if (n.includes("DTS:X") || n.includes("DTSX")) found.push("DTS:X");
  if (!found.includes("DTS:X") && (n.includes("DTS-HD") || n.includes("DTSHD")))
    found.push("DTS-HD");
  if (n.includes("DTS")) {
    if (!found.some((t) => t.startsWith("DTS"))) found.push("DTS");
  }
  if (n.includes("DD+") || n.includes("EAC3") || n.includes("DDP"))
    found.push("DD+");
  if (!found.includes("DD+") && (n.includes("DD") || n.includes("AC3")))
    found.push("DD");
  if (n.includes("7.1")) found.push("7.1");
  if (n.includes("5.1")) found.push("5.1");
  if (n.includes("AAC")) found.push("AAC");
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

export const TorrentProvider: ProviderType = {
  catalog: [
    { title: "Trending Torrents", filter: "trending" },
    { title: "Latest Movies", filter: "movies" },
  ],
  genres: [],
  blurImage: false,

  GetHomePosts: async ({ filter, page, providerContext }) => {
    // For now, return empty or a placeholder list
    // Real implementation would fetch from a trending torrents API
    return [];
  },

  GetSearchPosts: async ({ searchQuery, page, providerContext, signal }) => {
    // We use TMDB search to provide structured results with IMDB ID context
    // The link will be a JSON string containing the TMDB ID and other metadata
    const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=5242517248386a3458476839356d2572&query=${encodeURIComponent(
      searchQuery
    )}&page=${page}`;

    try {
      const res = await providerContext.axios.get(searchUrl, { signal });
      return res.data.results
        .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
        .map((item: any) => ({
          title: item.title || item.name,
          image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
          link: JSON.stringify({
            tmdbId: item.id,
            type: item.media_type === "tv" ? "series" : "movie",
            title: item.title || item.name,
          }),
          provider: PROVIDER_NAME,
        }));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  GetMetaData: async ({ link, provider, providerContext }) => {
    const payload = JSON.parse(link);
    const tmdbId = payload.tmdbId;
    const type = payload.type === "series" ? "tv" : "movie";

    const detailsUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=5242517248386a3458476839356d2572&append_to_response=external_ids`;
    
    try {
      const res = await providerContext.axios.get(detailsUrl);
      const data = res.data;
      const imdbId = data.external_ids?.imdb_id || "";

      return {
        title: data.title || data.name,
        image: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
        synopsis: data.overview,
        imdbId: imdbId,
        type: payload.type,
        linkList: payload.type === "series" 
          ? Array.from({ length: data.number_of_seasons }, (_, i) => ({
              title: `Season ${i + 1}`,
              episodesLink: JSON.stringify({ tmdbId, season: i + 1, imdbId }),
            }))
          : [
              {
                title: "Movie",
                directLinks: [{ title: "Search Torrents", link: JSON.stringify({ imdbId, type: "movie", title: data.title }) }]
              }
            ],
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  GetEpisodeLinks: async ({ url, providerContext }) => {
    const payload = JSON.parse(url);
    const { tmdbId, season, imdbId } = payload;

    const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=5242517248386a3458476839356d2572`;

    try {
      const res = await providerContext.axios.get(seasonUrl);
      return res.data.episodes.map((ep: any) => ({
        title: `Episode ${ep.episode_number}: ${ep.name}`,
        link: JSON.stringify({ 
          imdbId, 
          season, 
          episode: ep.episode_number, 
          type: "series", 
          title: ep.name 
        }),
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  GetStream: async ({ link, type, signal, providerContext }) => {
    const payload = JSON.parse(link);
    const { imdbId, season, episode, title } = payload;

    if (!imdbId) return [];

    // Aggregation Logic: Search from public sources
    // We'll use a combined query for the scraper
    const query = season && episode 
      ? `${imdbId} s${season.toString().padStart(2, '0')}e${episode.toString().padStart(2, '0')}`
      : imdbId;

    const streams: Stream[] = [];

    // Example: Searching via a public aggregator or tracker
    // Since we want to replicate PlayTorrioV2's method, we'll implement a few key scrapers
    // For now, let's implement a robust search that parses name tags

    const sources = [
      { name: "TorrentGalaxy", url: `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(query)}&sort=seeders&order=desc` },
      // Add more sources as needed
    ];

    try {
      // Fetch from TorrentGalaxy as a primary source
      const tgRes = await providerContext.axios.get(sources[0].url, { signal });
      const $ = providerContext.cheerio.load(tgRes.data);

      $(".tgxtable tr.tgxtablerow").each((_, el) => {
        const titleEl = $(el).find("a.tgxtitle");
        const name = titleEl.text().trim();
        const magnet = $(el).find('a[href^="magnet:"]').attr("href");
        const size = $(el).find("td").eq(4).text().trim();
        const seeders = $(el).find("td").eq(10).find("b").first().text().trim();

        if (magnet) {
          const audioTags = detectAudioTags(name);
          const quality = detectQuality(name);
          
          // Construct a rich 'server' string that our UI will parse
          // Format: Source | Quality | Audio | Size | Seeders
          const serverInfo = [
            "TGx",
            quality ? (quality === "2160" ? "4K" : quality + "p") : "HD",
            audioTags.join(", "),
            size,
            seeders + "S"
          ].filter(s => s).join(" | ");

          streams.push({
            server: serverInfo,
            link: magnet,
            type: "torrent",
            quality: quality as any,
          });
        }
      });

      return streams;
    } catch (err) {
      console.error("Torrent provider error:", err);
      return [];
    }
  },
};

export default TorrentProvider;
