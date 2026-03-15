import { ProviderContext, Stream } from "../types";

// The headers and type imports are kept as you provided them
const headers = {
    Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    Cookie:
        "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export async function getStream({
    link,
    type,
    signal,
    providerContext,
}: {
    link: string;
    type: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
}) {
    const { axios, cheerio, extractors } = providerContext;
    const { hubcloudExtracter } = extractors;
    
    // --- START OF CORRECTION ---

    try {
        console.log("Original link:", link);

        // 1. Convert the link format:
        // From: https://new5.oxxfile.info/s/LHQco95h0r/
        // To:   https://new5.oxxfile.info/api/s/LHQco95h0r/hubcloud

        const url = new URL(link);
        const segments = url.pathname.split('/').filter(s => s.length > 0);
        
        // Check if the URL path is in the expected format '/s/ID/'
        if (segments.length >= 2 && segments[0] === 's') {
            // Reconstruct the new API path
            url.pathname = `/api/${segments.join('/')}/hubcloud`;
            
            // Assign the new, converted link
            link = url.toString();
        } else {
            // Log a warning if the link isn't in the expected format
            console.warn("Link format is unexpected for API conversion:", link);
        }

        console.log("Converted link for API access:", link);
        
        // --- The filepress/vlink logic is REMOVED/IGNORED for simplicity,
        // --- as your final goal is to call hubcloudExtracter with the *converted* link.
        // --- If you need the filepress/vlink logic, it should be adjusted to run
        // --- on the result of the hubcloudExtracter, not before it.
        
        // 2. Extract the stream links using the hubcloudExtracter
        // The hubcloudExtracter is expected to handle the API link (link)
        // and return the final stream link (e.g., https://hubcloud.foo/drive/...)
        return await hubcloudExtracter(link, signal);

    } catch (error: any) {
        console.log("getStream error: ", error);
        if (error.message.includes("Aborted")) {
            // Handle abortion, often by returning an empty array
        } else {
            // Handle other errors
        }
        return [];
    }
}