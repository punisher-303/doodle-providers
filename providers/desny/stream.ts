import { Stream, ProviderContext,} from "../types";

const MAIN_URL = "https://net20.cc";
const STREAM_URL = "https://net51.cc"; // Corresponds to 'newUrl' in Kotlin

const UA =
  "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36";

async function bypass(axios: any): Promise<string> {
  // Logic from Kotlin 'bypass' function:
  // Loops POST request to /tv/p.php until response body contains "r":"n"
  // Then extracts the 't_hash_t' cookie.
  let attempt = 0;
  while (attempt < 10) {
    try {
      const res = await axios.post(`${MAIN_URL}/tv/p.php`);
      const data = typeof res.data === "string" ? res.data : JSON.stringify(res.data);

      if (data.includes('"r":"n"')) {
        const setCookie = res.headers["set-cookie"];
        if (Array.isArray(setCookie)) {
          const hashCookie = setCookie.find((c: string) => c.includes("t_hash_t"));
          if (hashCookie) {
            // Extract value between 't_hash_t=' and ';'
            const match = hashCookie.match(/t_hash_t=([^;]+)/);
            return match ? match[1] : "";
          }
        }
      }
    } catch (error) {
      console.error("DisneyPlus Bypass Error:", error);
    }
    attempt++;
  }
  return "";
}

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const unix = Math.floor(Date.now() / 1000);
  const [id, title = ""] = link.split("|");

  // 1. Get the bypass cookie (Critical step missing in original TS)
  const tHashT = await bypass(axios);

  // 2. Fetch Playlist
  // Kotlin uses 'newUrl' (net51.cc) for the playlist request, NOT 'mainUrl'
  const playlistUrl = `${STREAM_URL}/mobile/hs/playlist.php?id=${id}&t=${encodeURIComponent(
    title
  )}&tm=${unix}`;

  const playlistRes = await axios.get(playlistUrl, {
    headers: {
      "User-Agent": UA,
      "Referer": `${MAIN_URL}/home`, // Referer must be mainUrl (net20)
      "X-Requested-With": "XMLHttpRequest", // Defined in Kotlin 'headers' map
      "Cookie": `t_hash_t=${tHashT}; ott=dp; hd=on`,
    },
  });

  const streams: Stream[] = [];
  

  if (Array.isArray(playlistRes.data)) {
    playlistRes.data.forEach((item: any) => {
      // Parse Sources
      item.sources?.forEach((src: any) => {
        streams.push({
          server: `Disney Plus ${src.label || "Auto"}`,
          // Kotlin: "$newUrl/${it.file}"
          link: `${STREAM_URL}/${src.file}`, 
          type: "m3u8",
          headers: {
            "User-Agent": UA,
            // Kotlin: referer = "$newUrl/home" (net51)
            "Referer": `${STREAM_URL}/home`, 
            // Kotlin: Interceptor adds "hd=on" for .m3u8 requests
            "Cookie": "hd=on", 
          },
        });
      });

      // Parse Subtitles
      // Kotlin: item.tracks?.filter { it.kind == "captions" }
      item.tracks?.forEach((track: any) => {
        if (track.kind === "captions") {
          
        }
      });
    });
  }

  // Attach collected subtitles to all streams
  return streams.map((stream) => ({
    ...stream,
  }));
}
