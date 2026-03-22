import { EpisodeLink, ProviderContext } from "../types";
import { MovieBoxClient } from "./client";

export async function getEpisodeLinks({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  // url format: movieboxapi://${item.detailPath}?id=${item.subjectId}
  // We need to fetch the detail page and extract seasons
  // For simplicity, we can reuse logic to get seasons from metadata
  // But GetEpisodeLinks is usually called with the link from metadata directLinks
  
  // Actually, in many providers, the metadata returns a list of episodes directly.
  // Let's implement it to be safe.
  
  return []; // Placeholder for now, as I'll implement seasons in metadata
}
