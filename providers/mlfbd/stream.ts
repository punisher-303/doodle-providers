
import { ProviderContext, Stream } from "../types";

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
}): Promise<Stream[]> {
    try {
        const { axios, cheerio } = providerContext;
        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };

        //console.log("mlfbd getStream", link);
        const res = await axios.get(link, { headers, signal });
        const $ = cheerio.load(res.data);
        const streams: Stream[] = [];

        // Strategy 1: Look for the download table
        // Selector: #download .links_table table tr
        $("#download .links_table table tr").each((_: number, el: any) => {
            // Typically: 
            // <td>...Quality...</td> <td>...Server...</td> <td>...Size...</td> <td><a href="...">Download</a></td>
            // But scraping based on 'a' inside 'tr' is safer.
            const anchor = $(el).find("a");
            if (anchor.length > 0) {
                const url = anchor.attr("href");
                const rowText = $(el).text().toLowerCase();

                let resolution = "720p"; // default
                if (rowText.includes("1080p")) resolution = "1080p";
                else if (rowText.includes("480p")) resolution = "480p";
                else if (rowText.includes("2160p") || rowText.includes("4k")) resolution = "4k";

                if (url) {
                    streams.push({
                        server: "Mlfbd " + resolution, // Label it clearly
                        link: url,
                        type: "mkv", // Most of these are direct mkv/mp4 or wrapped
                    });
                }
            }
        });

        // Strategy 2: Look for 'Watch Online' player options if Downloads are empty
        // But typically downloads are better. 
        // If we want to support the 'Watch Online' iframe:
        // It requires more logic to resolve the iframe source (often ajax).
        // Let's stick to the download links for now as they are explicit in the task (add one provider).

        return streams;
    } catch (err) {
        console.error("Mlfbd getStream error:", err);
        return [];
    }
}
