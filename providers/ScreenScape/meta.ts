import { Info, ProviderContext } from "../types";

export async function getMetadata({
  link,
  providerContext,
}: {
  link: string;
  provider: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(link);
    const $ = cheerio.load(res.data);

    const title = $("h1").first().text().trim();
    const synopsis = $(".mt-4.text-gray-300").text().trim();
    const image = $("img.rounded-xl").attr("src") || "";

    // Extract TMDB ID from URL if possible
    // Example: https://screenscape.me/movie/597
    const tmdbId = link.match(/\/(movie|tv)\/(\d+)/)?.[2] || "";
    const type = link.includes("/tv/") ? "tv" : "movie";

    return {
      title,
      synopsis,
      image,
      imdbId: "", // Or extract if available
      type,
      linkList: [
        {
          title: "Watch Now",
          episodesLink: link, // For TV, this would lead to episode list
        },
      ],
    };
  } catch (err) {
    console.error("ScreenScape getMetadata error:", err instanceof Error ? err.message : String(err));
    throw err;
  }
}
