import { ProviderContext, Stream } from "../types";

const API_BASE = "http://myavens18052002.xyz/nzapis";
const HEADERS = {
  api: "553y845hfhdlfhjkl438943943839443943fdhdkfjfj9834lnfd98",
  caller: "vion-official-app",
  Host: "myavens18052002.xyz",
  "User-Agent": "okhttp/3.14.9",
};

// Helper to format URL and convert MKV to MP4
const formatVideoUrl = (url: string) => {
  if (!url) return "";
  
  // 1. Handle relative URLs (Archive.org logic)
  let finalUrl = url.startsWith("http") ? url : `https://archive.org/download/${url}`;

  // 2. Convert .mkv to .mp4 (Archive.org usually auto-generates MP4s)
  if (finalUrl.match(/\.mkv$/i)) {
    finalUrl = finalUrl.replace(/\.mkv$/i, ".mp4");
  }

  return finalUrl;
};

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const streams: Stream[] = [];

  const [type, idStr] = link.split(":");
  const id = parseInt(idStr);

  try {
    let item: any = null;

    if (type === "episode") {
      const res = await axios.get(`${API_BASE}/nzgetepisodes_v2.php?since=`, { headers: HEADERS });
      // Use loose equality (==) to handle string/number mismatch
      item = (res.data.episodes as any[]).find((e) => e.id == idStr);
    } else if (type === "movie") {
      const res = await axios.get(`${API_BASE}/nzgetmovies.php`, { headers: HEADERS });
      // Use loose equality (==) to handle string/number mismatch
      item = (res.data as any[]).find((m) => m.id == idStr);
    }

    if (!item) return [];

    // Map qualities to Stream objects
    // The Kotlin code maps basic -> 240, sd -> 480, hd -> 720, fhd -> 1080

    if (item.basic) {
      streams.push({
        server: "Xon Basic (240p)",
        link: formatVideoUrl(item.basic),
        type: "mp4",
       
      });
    }

    if (item.sd) {
      streams.push({
        server: "Xon SD (480p)",
        link: formatVideoUrl(item.sd),
        type: "mp4",
        
      });
    }

    if (item.hd) {
      streams.push({
        server: "Xon HD (720p)",
        link: formatVideoUrl(item.hd),
        type: "mp4",
       
      });
    }

    if (item.fhd) {
      streams.push({
        server: "Xon FHD (1080p)",
        link: formatVideoUrl(item.fhd),
        type: "mp4",
        
      });
    }

    // External Link (if 'link' property exists in JSON)
    if (item.link) {
        // This is typically an embed URL
        streams.push({
            server: "External Embed",
            link: item.link,
            type: "m3u8" 
        });
    }

  } catch (err) {
    console.error("Xon getStream error:", err);
  }

  return streams;
}