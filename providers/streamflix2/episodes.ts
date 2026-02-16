import { EpisodeLink, ProviderContext } from "../types";

// Firebase RTDB URL derived from WebSocket URL
const FIREBASE_BASE = "https://chilflix-410be-default-rtdb.asia-southeast1.firebasedatabase.app";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500/";

export async function getEpisodes({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios } = providerContext;
  const [_, key, season] = url.split(":");
  
  // Construct REST API endpoint: Data/{movieKey}/seasons/{season}/episodes.json
  const endpoint = `${FIREBASE_BASE}/Data/${key}/seasons/${season}/episodes.json`;
  
  try {
    const res = await axios.get(endpoint);
    const data = res.data;
    
    const episodes: EpisodeLink[] = [];
    
    // Data can be an array (if keys are 0,1,2...) or an object map
    const processEpisode = (ep: any, index: number) => {
        if (!ep) return;
        episodes.push({
            title: `Ep ${index + 1} - ${ep.name}`,
            // Pass the relative link path (e.g. "tv/...")
            link: `episode:${ep.link}`,
           
        });
    };

    if (Array.isArray(data)) {
        data.forEach(processEpisode);
    } else if (typeof data === 'object' && data !== null) {
        // If object, sort by keys usually, or just map values
        Object.values(data).forEach(processEpisode);
    }
    
    return episodes;
  } catch (e) {
    console.error("StreamFlix episodes error:", e);
    return [];
  }
}