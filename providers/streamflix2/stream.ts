import { Stream, ProviderContext } from "../types";

const CONFIG_URL = "https://api.streamflix.app/config/config-streamflixapp.json";

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const { axios } = providerContext;
  const [type, ...rest] = link.split(":");
  const urlPart = rest.join(":"); // Rejoin in case URL contains colons
  
  try {
    const configRes = await axios.get(CONFIG_URL);
    const config = configRes.data;
    
    const streams: Stream[] = [];
    
    if (type === "movie") {
        // Try premium sources
        config.premium.forEach((base: string) => {
            streams.push({
                server: "StreamFlix Premium",
                link: base + urlPart,
                type: "mp4"
            });
        });
        // Try standard sources
        config.movies.forEach((base: string) => {
             streams.push({
                server: "StreamFlix Movies",
                link: base + urlPart,
                type: "mp4"
            });
        });
    } else if (type === "episode") {
         // Logic based on loadLinks in Kotlin
         if (urlPart.startsWith("tv/")) {
             // Try premium sources
             config.premium.forEach((base: string) => {
                streams.push({
                    server: "StreamFlix Premium",
                    link: base + urlPart,
                    type: "mp4"
                });
            });
            // Try tv sources
            config.tv.forEach((base: string) => {
                streams.push({
                    server: "StreamFlix TV",
                    link: base + urlPart,
                    type: "mp4"
                });
            });
         } else if (urlPart.startsWith("http")) {
             // Fallback for direct links
              streams.push({
                server: "Direct",
                link: urlPart,
                type: "mp4"
            });
         }
    }
    
    return streams;
  } catch (e) {
    console.error("StreamFlix stream error:", e);
    return [];
  }
}