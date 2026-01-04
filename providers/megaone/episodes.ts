
import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async ({
    url,
    providerContext,
}: {
    url: string;
    providerContext: ProviderContext;
}): Promise<EpisodeLink[]> => {
    try {
        const { providerManager } = providerContext;

        let payload;
        try {
            payload = JSON.parse(url);
        } catch (e) {
            return [];
        }

        const { p: targetProvider, l: targetLink } = payload;

        const episodes = await providerManager.getEpisodes({
            url: targetLink,
            providerValue: targetProvider
        });

        // Wrap episode links
        return episodes.map((ep: EpisodeLink) => ({
            ...ep,
            link: JSON.stringify({ p: targetProvider, l: ep.link })
        }));

    } catch (err) {
        console.error("MegaOne Episodes Error", err);
        return [];
    }
};
