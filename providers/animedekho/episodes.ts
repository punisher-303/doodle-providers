import { ProviderContext } from "../types";

interface EpisodeLink {
  title: string;
  link: string;
  image?: string;
}

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio } = providerContext;

  return axios
    .get(url)
    .then((res: any) => {
      const $ = cheerio.load(res.data);
      const episodes: EpisodeLink[] = [];

      // Kotlin Logic:
      // lst = document.select("ul.seasons-lst li")
      // Loop through lst
      
      const listItems = $("ul.seasons-lst li");

      // CASE 1: Series / Episodes List
      if (listItems.length > 0) {
        listItems.each((_, el) => {
          const item = $(el);
          
          // Kotlin: selectFirst("h3.title")?.ownText()
          // Note: ownText() excludes children like <span>S1-E2</span>
          // In Cheerio, we can approximate this or just take full text.
          // Let's use full text for safety, or try to isolate title.
          const titleEl = item.find("h3.title");
          const title = titleEl.contents().filter((i, node) => node.type === 'text').text().trim() || titleEl.text().trim();
          
          // Kotlin: selectFirst("a")?.attr("href")
          const link = item.find("a").attr("href");
          
          // Kotlin: selectFirst("div > div > figure > img")?.attr("src")
          const image = item.find("div > div > figure > img").attr("src");

          if (link) {
            episodes.push({
              title: title || `Episode ${episodes.length + 1}`,
              link,
              image: image || ""
            });
          }
        });
      } else {
        // CASE 2: Movie (Empty list in Kotlin logic means it's a movie)
        // If this script is called, we assume we need to play the page itself.
        // We push a single episode entry for the movie.
        episodes.push({
          title: "Watch Movie",
          link: url,
        });
      }

      return episodes;
    })
    .catch((err: any) => {
      console.log("Animedekho getEpisodes error:", err);
      return [];
    });
};