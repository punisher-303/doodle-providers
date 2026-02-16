import { Info, Link, ProviderContext } from "../types";

const API_BASE = "http://myavens18052002.xyz/nzapis";
const HEADERS = {
  api: "553y845hfhdlfhjkl438943943839443943fdhdkfjfj9834lnfd98",
  "Cache-Control": "no-cache",
  caller: "vion-official-app",
  Connection: "Keep-Alive",
  Host: "myavens18052002.xyz",
  "User-Agent": "okhttp/3.14.9",
};

const formatPosterUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://archive.org/download/${url}`;
};

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios } = providerContext;
  
  const [type, idStr] = link.split(":");
  const id = parseInt(idStr); 

  try {
    // Helper to get language name
    const languagesRes = await axios.get(`${API_BASE}/nzgetlanguages.php`, { headers: HEADERS });
    const languages = languagesRes.data as any[];
    const getLangName = (langId: number | string) => {
      const lang = languages.find(l => l.id == langId);
      return lang ? lang.name : "Unknown";
    };

    if (type === "show") {
      const res = await axios.get(`${API_BASE}/nzgetshows.php`, { headers: HEADERS });
      const show = (res.data as any[]).find((s) => s.id == idStr);

      if (!show) throw new Error("Show not found");

      const languageName = getLangName(show.language);
      const synopsis = `${show.des || ""}\n\nLanguage: ${languageName}`;

      // 1. Fetch Seasons
      const seasonsRes = await axios.get(`${API_BASE}/nzgetseasons.php`, { headers: HEADERS });
      
      // 2. Filter seasons for this show and Sort them
      const seasons = (seasonsRes.data as any[])
        .filter((s) => s.show_id == idStr)
        .sort((a, b) => a.no - b.no);

      // 3. Map seasons to LinkList items
      const seasonLinks: Link[] = seasons.map((season) => ({
        title: season.name || `Season ${season.no}`,
        // Pass "season:SEASON_ID" to episodes.ts
        episodesLink: `season:${season.id}`, 
        directLinks: [],
      }));

      return {
        title: `${show.name} (${languageName})`,
        imdbId: "",
        synopsis: synopsis.trim(),
        image: formatPosterUrl(show.cover || show.thumb),
        type: "series",
        tags: [],
        linkList: seasonLinks, // ✅ List of Seasons
      };
    } 
    
    if (type === "movie") {
      const res = await axios.get(`${API_BASE}/nzgetmovies.php`, { headers: HEADERS });
      const movie = (res.data as any[]).find((m) => m.id == idStr);

      if (!movie) throw new Error("Movie not found");

      const languageName = getLangName(movie.language);
      const synopsis = `${movie.des || ""}\n\nLanguage: ${languageName}`;
      const tags = movie.tags ? movie.tags.split(",").map((t: string) => t.trim()) : [];

      return {
        title: `${movie.name} (${languageName})`,
        imdbId: "",
        synopsis: synopsis.trim(),
        image: formatPosterUrl(movie.cover || movie.thumb),
        type: "movie",
        tags: tags,
        linkList: [
          {
            title: movie.name,
            episodesLink: "", 
            directLinks: [
              {
                title: "Movie",
                link: `movie:${movie.id}`, 
              },
            ],
          },
        ],
      };
    }
  } catch (err) {
    console.error("Xon getMeta error:", err);
  }

  return { 
    title: "", 
    imdbId: "", 
    synopsis: "", 
    image: "", 
    type: "movie", 
    tags: [],
    linkList: [] 
  };
}