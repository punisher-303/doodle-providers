import { Stream, ProviderContext } from "../types";

export async function getStream({
  link,
  type,
  providerContext,
}: {
  link: string;
  type: string;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  try {
    // Check if the link is a detail page or already a watch link
    // Example link: https://screenscape.me/movie/597
    // We need to construct the embed URL: https://screenscape.me/embed?tmdb=597&type=movie
    
    const match = link.match(/\/(movie|tv)\/(\d+)/);
    if (!match) return [];

    const contentType = match[1]; // "movie" or "tv"
    const tmdbId = match[2];

    // For TV series, we need season and episode.
    // In Doodle API, episodes are usually passed in the 'link' or 'type' context.
    // If 'type' is 'episode', the link might contain season/episode info.
    
    let season = "";
    let episode = "";

    if (contentType === "tv") {
      // Try to extract from URL if it's an episode link
      // Example: https://screenscape.me/watch/tv/1396?s=1&e=1
      const sMatch = link.match(/[?&]s=(\d+)/);
      const eMatch = link.match(/[?&]e=(\d+)/);
      if (sMatch && eMatch) {
        season = sMatch[1];
        episode = eMatch[1];
      }
    }

    const embedUrl = `https://screenscape.me/embed?tmdb=${tmdbId}&type=${contentType}${
      season && episode ? `&s=${season}&e=${episode}` : ""
    }`;

    return [
      {
        server: "ScreenScape (Embed)",
        link: embedUrl,
        type: "embed", // Special type for iframe embeds
        quality: "1080",
      },
    ];
  } catch (err) {
    console.error("ScreenScape getStream error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
