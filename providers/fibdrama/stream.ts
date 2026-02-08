import { ProviderContext, Stream } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  Referer: "https://fibwatchdrama.xyz/",
};

// ---------------- Helper ----------------
const resolveServerLink = function (
  url: string,
  axios: any,
  cheerio: any,
  signal: AbortSignal
): Promise<string | null> {
  // Direct file or HubCloud shortcut
  if (/\.(mkv|mp4|m3u8)(\?.*)?$/i.test(url) || /hubcloud/i.test(url)) {
    return Promise.resolve(url);
  }

  return axios
    .get(url, { headers, signal })
    .then((res: any) => {
      const $ = cheerio.load(res.data || "");

      // 🔴 Red Download Button
      const onclick = $("a.hidden-button.buttonDownloadnew").attr("onclick");
      if (onclick) {
        const match = onclick.match(/url=(.*?)',/);
        if (match?.[1]) return match[1].trim();
      }

      // 🎥 Direct video source fallback
      const direct = $("video source").attr("src") || $("video").attr("src");
      if (direct) return direct;

      return null;
    })
    .catch(() => null);
};

// ---------------- Main Stream ----------------
export const getStream = function ({
  link,
  providerContext,
  signal,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Stream[]> {
  const { axios, cheerio, extractors, getBaseUrl } = providerContext;
  const { hubcloudExtracter } = extractors;

  // ---------------- 1. AUTO PLAY DIRECT LINKS ----------------
  // If the link provided is already the .mkv/.mp4 file, return it immediately.
  // This prevents axios from trying to download the movie as an HTML page.
  if (/\.(mkv|mp4|m3u8)(\?.*)?$/i.test(link)) {
    return Promise.resolve([
      {
        server: "FibDrama Direct",
        link: link,
        type: link.includes(".m3u8") ? "hls" : "mp4",
      },
    ]);
  }

  return getBaseUrl("fibdrama").then((baseUrl) => {
    return axios
      .get(link, { headers, signal })
      .then((res) => {
        const $ = cheerio.load(res.data || "");
        const serverLinks: { quality: string; url: string }[] = [];
        const streams: Stream[] = [];

        // ---------------- Detect Episode Page ----------------
        const videoId = $("input#video-id").attr("value");

        let linkPromise = Promise.resolve();

        if (videoId) {
          // 🔁 AJAX Resolution Switcher
          const ajaxUrl = `${baseUrl}/ajax/resolution_switcher.php?video_id=${videoId}`;

          linkPromise = axios
            .get(ajaxUrl, {
              headers: {
                ...headers,
                "X-Requested-With": "XMLHttpRequest",
              },
              signal,
            })
            .then((ajaxRes: any) => {
              const ajaxData = ajaxRes.data || {};
              const rawLinks = [
                ...(ajaxData.current || []),
                ...(ajaxData.popup || []),
              ];

              rawLinks.forEach((item: any) => {
                if (item?.url) {
                  const fullUrl = item.url.startsWith("http")
                    ? item.url
                    : `${baseUrl}${item.url.startsWith("/") ? "" : "/"}${item.url}`;

                  serverLinks.push({
                    quality: item.res || "HD",
                    url: fullUrl,
                  });
                }
              });
            })
            .catch(() => {}) // Ignore AJAX failure
            .then(() => {
              // 🔴 Red button fallback if no links found via AJAX
              if (serverLinks.length === 0) {
                const onclick = $("a.hidden-button.buttonDownloadnew").attr(
                  "onclick"
                );
                if (onclick) {
                  const match = onclick.match(/url=(.*?)',/);
                  if (match?.[1]) {
                    serverLinks.push({
                      quality: "Direct",
                      url: match[1].trim(),
                    });
                  }
                }
              }
            });
        } else {
          // 🎬 Movie/Direct link passed directly
          serverLinks.push({
            quality: "Default",
            url: link,
          });
        }

        return linkPromise.then(() => {
          // ---------------- Resolve Streams ----------------
          const streamPromises = serverLinks.map((server) => {
            return resolveServerLink(server.url, axios, cheerio, signal).then(
              (finalUrl) => {
                if (!finalUrl) return;

                // ☁️ HubCloud
                if (/hubcloud/i.test(finalUrl)) {
                  if (hubcloudExtracter) {
                    // FIX: 'signal' passed correctly as 2nd argument
                    return hubcloudExtracter(finalUrl, signal)
                      .then((hubStreams: any) => {
                        if (Array.isArray(hubStreams)) {
                          streams.push(...hubStreams);
                        }
                      })
                      .catch(() => {});
                  }
                  return;
                }

                // 🎥 Direct stream
                streams.push({
                  server: `FibDrama ${server.quality}`,
                  link: finalUrl,
                  type: finalUrl.includes(".m3u8") ? "hls" : "mp4",
                });
              }
            );
          });

          return Promise.all(streamPromises).then(() => streams);
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return [];
        console.error("FibDrama getStream error:", error);
        return [];
      });
  });
};