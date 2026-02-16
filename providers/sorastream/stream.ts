import { Stream, ProviderContext } from "../types";

// =========================================================================================
//  SORASTREAM + RIVE + WEBSTREAMER AGGREGATOR (NO ASYNC/AWAIT VERSION)
// =========================================================================================

export const getStream = function ({
  link: id,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const streams: Stream[] = [];

  // 1. Parse Payload
  let payload: any;
  try {
    payload = JSON.parse(id);
  } catch (e) {
    payload = { tmdbId: id };
  }

  const tmdbId = String(payload.tmdbId ?? payload.id ?? payload.tmdId ?? "");
  const imdbId = String(payload.imdbId ?? "");
  const season = String(payload.season ?? "");
  const episode = String(payload.episode ?? "");
  const effectiveType = payload.type ?? type ?? "movie";

  const mediaData = { tmdbId, imdbId, season, episode, type: effectiveType };

  // 2. Define All Sources
  // We attach a .catch() to every promise so Promise.all doesn't fail if one source fails.
  const sourcePromises = [
    getWebstreamerStream(imdbId, episode, season, effectiveType, streams, providerContext),
    getRiveStream(tmdbId, episode, season, effectiveType, streams, providerContext),
    getVidSrcCC(mediaData, streams, providerContext),
    getSmashyStream(mediaData, streams, providerContext),
    getTwoEmbed(mediaData, streams, providerContext),
    getGoku(mediaData, streams, providerContext),
    getMinochinos(mediaData, streams, providerContext),
    getSuperStream(mediaData, streams, providerContext)
  ].map(function (p) {
    return p.catch(function (e) {
      // Ignore individual provider errors
      return null;
    });
  });

  // 3. Execute
  return Promise.all(sourcePromises).then(function () {
    // 4. Post-Processing: Remove duplicates
    const uniqueStreams = streams.filter(function (v, i, a) {
      return a.findIndex(function (t) { return t.link === v.link; }) === i;
    });

    return uniqueStreams;
  });
};

// =========================================================================================
//  SOURCE 1: WEBSTREAMER
// =========================================================================================

export function getWebstreamerStream(
  imdbId: string,
  episode: string,
  season: string,
  type: string,
  Streams: Stream[],
  providerContext: ProviderContext
): Promise<void> {
  if (!imdbId || imdbId === "undefined") return Promise.resolve();

  const url = "https://webstreamr.hayd.uk/" + JSON.stringify({
    "multi": "on", "al": "on", "de": "on", "es": "on", "fr": "on",
    "hi": "on", "it": "on", "mx": "on", "mediaFlowProxyUrl": "", "mediaFlowProxyPassword": ""
  }) + "/stream/" + type + "/" + imdbId + (type === "series" ? ":" + season + ":" + episode : "") + ".json";

  return providerContext.axios
    .get(encodeURI(url), {
      timeout: 15000,
      headers: providerContext.commonHeaders,
    })
    .then(function (res: any) {
      if (res.data && res.data.streams) {
        res.data.streams.forEach(function (source: any) {
          const url = source?.url;
          const name = source?.name || "WebStreamer";
          const qualityMatch = name?.match(/(\d{3,4})p/);
          const quality = qualityMatch ? qualityMatch[1] : undefined;
          Streams.push({
            server: name,
            link: url,
            type: type === "movie" ? "movie" : "series",
            quality: quality,
          });
        });
      }
    });
}

// =========================================================================================
//  SOURCE 2: RIVE
// =========================================================================================

export function getRiveStream(
  tmdId: string,
  episode: string,
  season: string,
  type: string,
  Streams: Stream[],
  providerContext: ProviderContext
): Promise<any> {
  if (!tmdId || tmdId === "undefined") {
    return Promise.resolve();
  }
  const secret = generateSecretKey(tmdId);
  const servers = [
    "flowcast", "asiacloud", "humpy", "primevids", "shadow",
    "hindicast", "animez", "aqua", "yggdrasil", "putafilme", "ophim",
  ];

  // Helper to handle getBaseUrl safely without async
  const getBasePromise = new Promise(function (resolve) {
    try {
      // @ts-ignore
      resolve(providerContext.getBaseUrl("rive"));
    } catch (e) {
      resolve("https://rive-stream-api.vercel.app");
    }
  });

  return getBasePromise.then(function (baseUrl: any) {
    // Fallback if the previous promise resolved to undefined
    if (!baseUrl) baseUrl = "https://rive-stream-api.vercel.app";

    const cors = process.env.CORS_PRXY ? process.env.CORS_PRXY + "?url=" : "";
    const route =
      type === "series"
        ? "/api/backendfetch?requestID=tvVideoProvider&id=" + tmdId + "&season=" + season + "&episode=" + episode + "&secretKey=" + secret + "&service="
        : "/api/backendfetch?requestID=movieVideoProvider&id=" + tmdId + "&secretKey=" + secret + "&service=";
    const url = cors
      ? cors + encodeURIComponent(baseUrl + route)
      : baseUrl + route;

    const promises = servers.map(function (server) {
      return providerContext.axios
        .get(url + server, { timeout: 8000 })
        .then(function (res: any) {
          if (res.data && res.data.data && res.data.data.sources) {
            res.data.data.sources.forEach(function (source: any) {
              Streams.push({
                server: "Rive-" + source?.source + "-" + source?.quality,
                link: source?.url,
                type: source?.format === "hls" ? "m3u8" : "mp4",
                quality: source?.quality,
                headers: {
                  referer: baseUrl,
                },
              });
            });
          }
        })
        .catch(function () { });
    });

    return Promise.all(promises);
  });
}

// =========================================================================================
//  SOURCE 3: VIDSRC.CC
// =========================================================================================

function getVidSrcCC(data: any, streams: Stream[], ctx: ProviderContext): Promise<void> {
  const BASE_URL = "https://vidsrc.cc";
  const tmdbId = data.tmdbId;
  const imdbId = data.imdbId;
  const season = data.season;
  const episode = data.episode;
  const type = data.type;

  let url = "";
  if (type === "movie") {
    url = BASE_URL + "/v2/embed/movie/" + (imdbId || tmdbId);
  } else {
    url = BASE_URL + "/v2/embed/tv/" + (imdbId || tmdbId) + "/" + season + "/" + episode;
  }

  return ctx.axios.get(url, { timeout: 10000 }).then(function (res: any) {
    const html = res.data;
    const m3u8Regex = /file:\s*['"](https?:\/\/[^'"]+\.m3u8)['"]/;
    const match = html.match(m3u8Regex);

    if (match && match[1]) {
      streams.push({
        server: "VidSrc.cc (Direct)",
        link: match[1],
        type: "m3u8",
       
        headers: { Referer: BASE_URL, "User-Agent": "Mozilla/5.0" },
      });
    }

    const sourcesRegex = /sources:\s*(\[\{.*?\}\])/s;
    const sourceMatch = html.match(sourcesRegex);
    if (sourceMatch && sourceMatch[1]) {
      try {
        const fileMatches = sourceMatch[1].matchAll(/file:\s*["']([^"']+)["']/g);
        for (const m of fileMatches) {
          if (m[1].includes(".m3u8")) {
            streams.push({
              server: "VidSrc.cc (Proxy)",
              link: m[1],
              type: "m3u8",
              
            });
          }
        }
      } catch (e) { }
    }
  });
}

// =========================================================================================
//  SOURCE 4: SMASHYSTREAM
// =========================================================================================

function getSmashyStream(data: any, streams: Stream[], ctx: ProviderContext): Promise<void> {
  const BASE_URL = "https://embed.smashystream.com";
  const tmdbId = data.tmdbId;
  const season = data.season;
  const episode = data.episode;

  const url = BASE_URL + "/playere.php?tmdb=" + tmdbId + "&season=" + (season || "") + "&episode=" + (episode || "");

  return ctx.axios.get(url, { headers: { "Referer": BASE_URL } }).then(function (res: any) {
    const $ = ctx.cheerio.load(res.data);
    const extractPromises: Promise<any>[] = [];

    $(".dropdown-menu .dropdown-item").each(function (_: any, el: any) {
      const link = $(el).attr("data-url");
      const name = $(el).text().trim();

      if (link && link !== "#") {
        extractPromises.push(extractUniversal(link, "Smashy-" + name, ctx, streams));
      }
    });

    return Promise.all(extractPromises.map(function (p) { return p.catch(function () { }); }));
  }).then(function () { return; });
}

// =========================================================================================
//  SOURCE 5: TWOEMBED
// =========================================================================================

function getTwoEmbed(data: any, streams: Stream[], ctx: ProviderContext): Promise<void> {
  const BASE_URL = "https://www.2embed.cc";
  const tmdbId = data.tmdbId;
  const imdbId = data.imdbId;
  const season = data.season;
  const episode = data.episode;
  const type = data.type;

  let url = "";
  if (type === 'movie') {
    url = BASE_URL + "/embed/" + (imdbId || tmdbId);
  } else {
    url = BASE_URL + "/embed/" + (imdbId || tmdbId) + "/" + season + "/" + episode;
  }

  return ctx.axios.get(url).then(function (res: any) {
    const $ = ctx.cheerio.load(res.data);
    const promises: Promise<any>[] = [];

    $(".server-btn, .btn-server").each(function (_: any, el: any) {
      const embedUrl = $(el).attr("data-src") || $(el).attr("data-link");
      const name = $(el).text().trim() || "2Embed";

      if (embedUrl) {
        promises.push(extractUniversal(embedUrl, name, ctx, streams));
      }
    });

    const defaultIframe = $("iframe").attr("src");
    if (defaultIframe) {
      promises.push(extractUniversal(defaultIframe, "2Embed-Default", ctx, streams));
    }

    return Promise.all(promises.map(function (p) { return p.catch(function () { }); }));
  }).then(function () { return; });
}

// =========================================================================================
//  PLACEHOLDER SOURCES
// =========================================================================================

function getGoku(data: any, streams: Stream[], ctx: ProviderContext): Promise<void> {
  return Promise.resolve();
}

function getMinochinos(data: any, streams: Stream[], ctx: ProviderContext): Promise<void> {
  return Promise.resolve();
}

function getSuperStream(data: any, streams: Stream[], ctx: ProviderContext): Promise<void> {
  return Promise.resolve();
}

// =========================================================================================
//  UNIVERSAL EXTRACTOR UTILS
// =========================================================================================

function extractUniversal(
  url: string,
  serverName: string,
  ctx: ProviderContext,
  streams: Stream[]
): Promise<void> {
  if (!url) return Promise.resolve();
  if (url.startsWith("//")) url = "https:" + url;

  // 1. Check direct file
  if (url.match(/\.m3u8($|\?)/)) {
    streams.push({
      server: serverName,
      link: url,
      type: "m3u8",
     
    });
    return Promise.resolve();
  }
  if (url.match(/\.mp4($|\?)/)) {
    streams.push({
      server: serverName,
      link: url,
      type: "mp4",
      
    });
    return Promise.resolve();
  }

  // 2. Identify Host & Scrape via Promise Chaining
  if (url.includes("streamwish") || url.includes("embedwish") || url.includes("filelions")) {
    return extractWishLions(url, serverName, ctx, streams);
  } else if (url.includes("voe.sx")) {
    return extractVoe(url, serverName, ctx, streams);
  } else if (url.includes("rabbitstream") || url.includes("dokicloud")) {
    return Promise.resolve();
  } else {
    // 3. Iframe Recursion
    return ctx.axios.get(url, { headers: { "Referer": url } })
      .then(function (res: any) {
        const $ = ctx.cheerio.load(res.data);
        const src = $("iframe").attr("src");
        if (src && !src.includes(url)) {
          return extractUniversal(src, serverName + " (Embed)", ctx, streams);
        }
      })
      .catch(function () { });
  }
}

function extractWishLions(url: string, name: string, ctx: ProviderContext, streams: Stream[]): Promise<void> {
  return ctx.axios.get(url).then(function (res: any) {
    const match = res.data.match(/file\s*:\s*["']([^"']+\.m3u8)["']/);
    if (match && match[1]) {
      streams.push({
        server: name,
        link: match[1],
        type: "m3u8",
        
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": url
        }
      });
    }
  }).catch(function () { });
}

function extractVoe(url: string, name: string, ctx: ProviderContext, streams: Stream[]): Promise<void> {
  return ctx.axios.get(url).then(function (res: any) {
    const hlsMatch = res.data.match(/'hls':\s*'([^']+)'/);
    if (hlsMatch && hlsMatch[1]) {
      streams.push({
        server: name,
        link: hlsMatch[1],
        type: "m3u8",
        
        headers: { "Referer": url }
      });
      return;
    }
    const mp4Match = res.data.match(/'mp4':\s*'([^']+)'/);
    if (mp4Match && mp4Match[1]) {
      streams.push({
        server: name,
        link: mp4Match[1],
        type: "mp4",
       
        headers: { "Referer": url }
      });
    }
  }).catch(function () { });
}

// =========================================================================================
//  SECRET KEY GENERATOR
// =========================================================================================

function generateSecretKey(id: number | string) {
  const c = [
    "4Z7lUo", "gwIVSMD", "PLmz2elE2v", "Z4OFV0", "SZ6RZq6Zc", "zhJEFYxrz8", "FOm7b0",
    "axHS3q4KDq", "o9zuXQ", "4Aebt", "wgjjWwKKx", "rY4VIxqSN", "kfjbnSo", "2DyrFA1M",
    "YUixDM9B", "JQvgEj0", "mcuFx6JIek", "eoTKe26gL", "qaI9EVO1rB", "0xl33btZL", "1fszuAU",
    "a7jnHzst6P", "wQuJkX", "cBNhTJlEOf", "KNcFWhDvgT", "XipDGjST", "PCZJlbHoyt",
    "2AYnMZkqd", "HIpJh", "KH0C3iztrG", "W81hjts92", "rJhAT", "NON7LKoMQ", "NMdY3nsKzI",
    "t4En5v", "Qq5cOQ9H", "Y9nwrp", "VX5FYVfsf", "cE5SJG", "x1vj1", "HegbLe", "zJ3nmt4OA",
    "gt7rxW57dq", "clIE9b", "jyJ9g", "B5jXjMCSx", "cOzZBZTV", "FTXGy", "Dfh1q1",
    "ny9jqZ2POI", "X2NnMn", "MBtoyD", "qz4Ilys7wB", "68lbOMye", "3YUJnmxp", "1fv5Imona",
    "PlfvvXD7mA", "ZarKfHCaPR", "owORnX", "dQP1YU", "dVdkx", "qgiK0E", "cx9wQ", "5F9bGa",
    "7UjkKrp", "Yvhrj", "wYXez5Dg3", "pG4GMU", "MwMAu", "rFRD5wlM",
  ];

  if (id === undefined) return "rive";

  try {
    let t: string, n: number;
    const r = String(id);

    if (isNaN(Number(id))) {
      const sum = r.split("").reduce(function (e, ch) { return e + ch.charCodeAt(0); }, 0);
      t = c[sum % c.length] || btoa(r);
      n = Math.floor((sum % r.length) / 2);
    } else {
      const num = Number(id);
      t = c[num % c.length] || btoa(r);
      n = Math.floor((num % r.length) / 2);
    }

    const i = r.slice(0, n) + t + r.slice(n);

    /* eslint-disable no-bitwise */
    const innerHash = function (e: string) {
      e = String(e);
      let t = 0 >>> 0;
      for (let n = 0; n < e.length; n++) {
        const r = e.charCodeAt(n);
        const i =
          (((t = (r + (t << 6) + (t << 16) - t) >>> 0) << n % 5) |
            (t >>> (32 - (n % 5)))) >>>
          0;
        t = (t ^ (i ^ (((r << n % 7) | (r >>> (8 - (n % 7)))) >>> 0))) >>> 0;
        t = (t + ((t >>> 11) ^ (t << 3))) >>> 0;
      }
      t ^= t >>> 15;
      t = ((t & 65535) * 49842 + ((((t >>> 16) * 49842) & 65535) << 16)) >>> 0;
      t ^= t >>> 13;
      t = ((t & 65535) * 40503 + ((((t >>> 16) * 40503) & 65535) << 16)) >>> 0;
      t ^= t >>> 16;
      return t.toString(16).padStart(8, "0");
    };

    const outerHash = function (e: string) {
      const t = String(e);
      let n = (3735928559 ^ t.length) >>> 0;
      for (let idx = 0; idx < t.length; idx++) {
        let r = t.charCodeAt(idx);
        r ^= ((131 * idx + 89) ^ (r << idx % 5)) & 255;
        n = (((n << 7) | (n >>> 25)) >>> 0) ^ r;
        const i = ((n & 65535) * 60205) >>> 0;
        const o = (((n >>> 16) * 60205) << 16) >>> 0;
        n = (i + o) >>> 0;
        n ^= n >>> 11;
      }
      n ^= n >>> 15;
      n = (((n & 65535) * 49842 + (((n >>> 16) * 49842) << 16)) >>> 0) >>> 0;
      n ^= n >>> 13;
      n = (((n & 65535) * 40503 + (((n >>> 16) * 40503) << 16)) >>> 0) >>> 0;
      n ^= n >>> 16;
      n = (((n & 65535) * 10196 + (((n >>> 16) * 10196) << 16)) >>> 0) >>> 0;
      n ^= n >>> 15;
      return n.toString(16).padStart(8, "0");
    };
    /* eslint-enable no-bitwise */

    const o = outerHash(innerHash(i));
    return btoa(o);
  } catch (e) {
    return "topSecret";
  }
}