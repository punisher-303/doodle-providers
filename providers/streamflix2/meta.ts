import { Info, Link, ProviderContext } from "../types";

const DATA_URL = "https://api.streamflix.app/data.json";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500/";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  const [type, key] = link.split(":");
  
  try {
    const res = await axios.get(DATA_URL);
    // Loose equality (==) in case key is number/string mismatch
    const item = res.data.data.find((i: any) => i.moviekey == key);
    
    if (!item) throw new Error("Item not found");
    
    const info: Info = {
        title: item.moviename,
        image: item.movieposter ? `${IMAGE_BASE}${item.movieposter}` : "",
        synopsis: item.moviedesc || "",
        imdbId: "", 
        rating: item.movierating ? item.movierating.toString() : "",
        tags: item.movieinfo ? item.movieinfo.split("/") : [],
        type: type === "tv" ? "series" : "movie",
        linkList: []
    };

    if (type === "movie") {
        info.linkList.push({
            title: "Movie",
            episodesLink: "",
            directLinks: [{
                title: "Watch",
                // Pass the movielink relative path
                link: `movie:${item.movielink}`
            }]
        });
    } else {
        // Parse season count from string like "5 Seasons" or "2 Seasons"
        let seasonCount = 1;
        if (item.movieduration) {
            const match = item.movieduration.match(/(\d+)\s+Season/);
            if (match) seasonCount = parseInt(match[1]);
        }
        
        // Generate links for each season
        for (let i = 1; i <= seasonCount; i++) {
            info.linkList.push({
                title: `Season ${i}`,
                // Pass key and season number to episodes.ts
                episodesLink: `season:${key}:${i}`,
                directLinks: []
            });
        }
    }
    
    return info;
  } catch (e) {
    console.error("StreamFlix meta error:", e);
    return {
        title: "",
        image: "",
        synopsis: "",
        imdbId: "",
        type: "movie",
        linkList: []
    };
  }
}