
import { Post, ProviderContext } from "../types";

export const getPosts = async ({
    filter,
    page,
    providerValue,
    signal,
    providerContext,
}: {
    filter: string;
    page: number;
    providerValue: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
}): Promise<Post[]> => {
    try {
        const { extensionManager, providerManager } = providerContext;
        if (!extensionManager || !providerManager) {
            console.error("MegaOne: extensionManager or providerManager not found in context");
            return [];
        }

        // Get all installed providers except MegaOne and disabled ones
        const providers = (extensionManager.getInstalledProviders() || [])
            .filter((p: any) =>
                p.value !== "megaone" &&
                !p.disabled &&
                p.installed
            );

        // If searching/filtering specific provider types, you could add logic here

        // Select top 3 robust providers to avoid spamming 50 requests
        // Or just all of them if the user lists them.
        // For now, let's try the first 5 to be safe.
        const activeProviders = providers.slice(0, 5);

        console.log(`MegaOne: Aggregating from ${activeProviders.length} providers`);

        const promises = activeProviders.map(async (p: any) => {
            try {
                const posts = await providerManager.getPosts({
                    filter,
                    page,
                    providerValue: p.value,
                    signal,
                    providerContext
                });
                // Wrap the links
                return posts.map((post: Post) => ({
                    ...post,
                    link: JSON.stringify({ p: p.value, l: post.link })
                }));
            } catch (err) {
                console.log(`MegaOne: Error fetching from ${p.value}`, err);
                return [];
            }
        });

        const results = await Promise.all(promises);

        // Flatten and merge
        // Simple flatten for now
        const allPosts = results.flat();

        // Shuffle or sort?
        // Let's just return them. 
        // Ideally deduplicate by title if needed, but for "Mega" valid content, maybe showing duplicates is okay?
        // User asked for "only working content".
        // We can't verify working status here without checking streams.

        return allPosts;

    } catch (err) {
        console.error("MegaOne Error", err);
        return [];
    }
};

export const getSearchPosts = async ({
    searchQuery,
    page,
    providerValue,
    signal,
    providerContext,
}: {
    searchQuery: string;
    page: number;
    providerValue: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
}): Promise<Post[]> => {
    try {
        const { extensionManager, providerManager } = providerContext;
        if (!extensionManager || !providerManager) return [];

        const providers = (extensionManager.getInstalledProviders() || [])
            .filter((p: any) => p.value !== "megaone" && !p.disabled);

        // Search ALL providers
        const promises = providers.map(async (p: any) => {
            try {
                const posts = await providerManager.getSearchPosts({
                    searchQuery,
                    page,
                    providerValue: p.value,
                    signal,
                    providerContext
                });
                return posts.map((post: Post) => ({
                    ...post,
                    link: JSON.stringify({ p: p.value, l: post.link })
                }));
            } catch (err) {
                return [];
            }
        });

        const results = await Promise.all(promises);
        return results.flat();
    } catch (err) {
        console.error("MegaOne Search Error", err);
        return [];
    }
};
