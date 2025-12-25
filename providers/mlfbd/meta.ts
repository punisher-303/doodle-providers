
import { ProviderContext, Info } from "../types";

export async function getInfo({
    link,
    provider,
    providerContext,
}: {
    link: string;
    provider: string;
    providerContext: ProviderContext;
}): Promise<Info> {
    try {
        const { axios, cheerio } = providerContext;
        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };

        const res = await axios.get(link, { headers });
        const $ = cheerio.load(res.data);

        const title = $(".data h1").text().trim();
        // Use .poster img or .wp-content img
        const image = $(".poster img").attr("src") || $(".wp-content img").first().attr("src") || "";

        // Synopsis usually in .wp-content p or .entry-content p
        const synopsis = $(".wp-content p").text().trim() || $(".entry-content p").text().trim() || "";

        // Cast, Tags, Rating - optional but good to have
        const tags: string[] = [];
        $(".genres a").each((_, el) => {
            tags.push($(el).text().trim());
        });

        const linkList: any[] = []; // Using any to avoid complex type construction manually here, but it matches Info.linkList

        return {
            title,
            image,
            synopsis,
            imdbId: "", // Not easily available usually
            type: "movie", // default
            tags,
            cast: [],
            rating: "",
            linkList,
        };
    } catch (err) {
        console.error("Mlfbd getInfo error:", err);
        return {
            title: "",
            image: "",
            synopsis: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };
    }
}
