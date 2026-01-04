
import { Stream, ProviderContext } from "../types";

export const getStream = async ({
    link,
    type,
    signal,
    providerContext,
}: {
    link: string;
    type: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
}): Promise<Stream[]> => {
    try {
        const { providerManager } = providerContext;

        let payload;
        try {
            payload = JSON.parse(link);
        } catch (e) {
            // Fallback or error
            return [];
        }

        const { p: targetProvider, l: targetLink } = payload;

        console.log(`MegaOne: Delegating stream to ${targetProvider}`);

        const streams = await providerManager.getStream({
            link: targetLink,
            type,
            signal,
            providerValue: targetProvider,
            providerContext
        });

        return streams;
    } catch (err) {
        console.error("MegaOne Stream Error", err);
        return [];
    }
};
