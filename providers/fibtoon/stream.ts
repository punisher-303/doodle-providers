import { ProviderContext, Stream } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  Referer: "https://fibwatch.biz/",
};

// ---------------- Helper ----------------
async function resolveServerLink(
  url: string,
  axios: any,
  cheerio: any,
  signal: AbortSignal
): Promise<string | null> {
  // Direct / HubCloud shortcut
  if (/\.(mkv|mp4|m3u8)$/i.test(url) || /hubcloud/i.test(url)) {
    return url;
  }

  try {
    const res = await axios.get(url, { headers, signal });
    const $ = cheerio.load(res.data || "");

    // 🔴 Red Download Button
    const onclick = $("a.hidden-button.buttonDownloadnew").attr("onclick");
    if (onclick) {
      const match = onclick.match(/url=(.*?)',/);
      if (match?.[1]) return match[1].trim();
    }

    // 🎥 Direct video source fallback
    const direct =
      $("video source").attr("src") || $("video").attr("src");
    if (direct) return direct;
  } catch {
    return null;
  }

  return null;
}

// ---------------- Main Stream ----------------
export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios, cheerio, extractors, getBaseUrl } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const baseUrl = await getBaseUrl("fibtoon");
    const streams: Stream[] = [];

    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data || "");

    const serverLinks: { quality: string; url: string }[] = [];

    // ---------------- Detect Episode Page ----------------
    const videoId = $("input#video-id").attr("value");
    const isEpisodePage = Boolean(videoId);

    if (isEpisodePage && videoId) {
      // 🔁 AJAX Resolution Switcher
      try {
        const ajaxUrl = `${baseUrl}/ajax/resolution_switcher.php?video_id=${videoId}`;
        const ajaxRes = await axios.get(ajaxUrl, {
          headers: {
            ...headers,
            "X-Requested-With": "XMLHttpRequest",
          },
          signal,
        });

        const ajaxData = ajaxRes.data || {};
        const rawLinks = [
          ...(ajaxData.current || []),
          ...(ajaxData.popup || []),
        ];

        for (const item of rawLinks) {
          if (!item?.url) continue;
          const fullUrl = item.url.startsWith("http")
            ? item.url
            : `${baseUrl}${item.url}`;

          serverLinks.push({
            quality: item.res || "HD",
            url: fullUrl,
          });
        }
      } catch {
        // ignore ajax failure
      }

      // 🔴 Red button fallback
      if (serverLinks.length === 0) {
        const onclick = $("a.hidden-button.buttonDownloadnew").attr("onclick");
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
    } else {
      // 🎬 Movie link passed directly from meta
      serverLinks.push({
        quality: "Default",
        url: link,
      });
    }

    // ---------------- Resolve Streams ----------------
    for (const server of serverLinks) {
      const finalUrl = await resolveServerLink(
        server.url,
        axios,
        cheerio,
        signal
      );

      if (!finalUrl) continue;

      // ☁️ HubCloud
      if (/hubcloud/i.test(finalUrl)) {
        try {
          const hubStreams = await hubcloudExtracter(finalUrl, signal);
          streams.push(...hubStreams);
        } catch {
          // ignore hubcloud errors
        }
        continue;
      }

      // 🎥 Direct stream
      streams.push({
        server: `FibWatch ${server.quality}`,
        link: finalUrl,
        type: finalUrl.includes(".m3u8") ? "hls" : "mp4",
      });
    }

    return streams;
  } catch (error: any) {
    if (error?.name === "AbortError") return [];
    console.error("FibWatch getStream error:", error?.message || error);
    return [];
  }
}
