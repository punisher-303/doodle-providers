import { Info, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Cache-Control": "no-store",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  return axios
    .get(link, { headers })
    .then((res: any) => {
      const $ = cheerio.load(res.data);

      // ==========================================
      // 1. Title Extraction (Matching Kotlin Logic)
      // ==========================================
      // Kotlin: h1.entry-title -> substringAfter("Watch Online ")
      // Fallback: meta[property=og:title] -> substringAfter("Watch Online ") -> substringBefore(" Movie...")
      let title = $("h1.entry-title").text().trim();
      
      if (!title) {
          title = $("meta[property='og:title']").attr("content") || "";
          if (title.includes("Movie in Hindi")) {
              title = title.split(" Movie in Hindi")[0];
          }
      }

      // Clean "Watch Online" prefix if present
      title = title.replace(/^Watch Online /i, "").trim();

      // ==========================================
      // 2. Synopsis (Matching Kotlin Logic)
      // ==========================================
      // Kotlin: div.entry-content p OR meta[name=twitter:description]
      const synopsis =
        $("div.entry-content p").first().text().trim() ||
        $("meta[name='twitter:description']").attr("content") ||
        "";

      // ==========================================
      // 3. Image (Matching Kotlin Logic)
      // ==========================================
      const image = $("div.post-thumbnail figure img").attr("src") || "";

      // ==========================================
      // 4. Detect Type (Movie vs Series)
      // ==========================================
      // Kotlin: checks if "ul.seasons-lst li" is empty.
      const seasonList = $("ul.seasons-lst li");
      const isMovie = seasonList.length === 0;

      const result: Info = {
        title,
        synopsis,
        image,
        imdbId: "", // Required by interface
        type: isMovie ? "movie" : "series",
        linkList: [],
      };

      // ==========================================
      // 5. Populate Link List (Crucial for Play Button)
      // ==========================================
      if (isMovie) {
        // FIX: For movies, we MUST add an entry so the App sees it as a source.
        // This corresponds to 'mediaType = 1' in your Kotlin logic.
        result.linkList.push({
          title: "Full Movie",
          quality: "HD",
          episodesLink: link, 
        });
      } else {
        // For Series, we add a generic entry representing the season page.
        // The 'getEpisodes' function will later parse the 'ul.seasons-lst li'.
        result.linkList.push({
          title: "Season 1",
          quality: "Default",
          episodesLink: link,
        });
      }

      return result;
    })
    .catch((err: any) => {
      console.error("Animedekho meta error:", err);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie",
        linkList: [],
      } as Info;
    });
};