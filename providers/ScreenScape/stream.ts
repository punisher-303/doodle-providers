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

    let season = "";
    let episode = "";

    if (contentType === "tv") {
      // Try to extract from the new URL format: /tv/{tmdbId}/season/{s}/episode/{e}
      const epMatch = link.match(/season\/(\d+)\/episode\/(\d+)/);
      if (epMatch) {
        season = epMatch[1];
        episode = epMatch[2];
      } else {
        // Fallback for query parameters
        const sMatch = link.match(/[?&]s=(\d+)/);
        const eMatch = link.match(/[?&]e=(\d+)/);
        if (sMatch && eMatch) {
          season = sMatch[1];
          episode = eMatch[1];
        }
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
