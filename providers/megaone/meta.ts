
import { Info, ProviderContext } from "../types";

export const getMeta = async ({
    link,
    provider,
    providerContext,
}: {
    link: string;
    provider: string;
    providerContext: ProviderContext;
}): Promise<Info> => {
    try {
        const { providerManager } = providerContext;

        // Parse the wrapped link
        let payload;
        try {
            payload = JSON.parse(link);
        } catch (e) {
            console.error("MegaOne: Invalid link format", link);
            throw new Error("Invalid link");
        }

        const { p: targetProvider, l: targetLink } = payload;

        console.log(`MegaOne: Delegating meta to ${targetProvider}`);

        const info = await providerManager.getMetaData({
            link: targetLink,
            provider: targetProvider
        });

        // We must wrap the episode/movie links in the info object too!
        // info.linkList contains the playable items

        if (info.linkList) {
            info.linkList = info.linkList.map((item: any) => ({
                ...item,
                // directLinks usually have 'link' property
                directLinks: item.directLinks?.map((dl: any) => ({
                    ...dl,
                    link: JSON.stringify({ p: targetProvider, l: dl.link })
                })),
                // Episodes might store link elsewhere? 
                // The type definition says: 
                // export interface Link { title: string; quality?: string; episodesLink?: string; directLinks?: ... }
                // If episodesLink exists, getEpisodes is called.
                episodesLink: item.episodesLink
                    ? JSON.stringify({ p: targetProvider, l: item.episodesLink })
                    : undefined
            }));
        }

        return info;

    } catch (err) {
        console.error("MegaOne Meta Error", err);
        throw err;
    }
};
