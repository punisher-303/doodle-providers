
import { Post, ProviderContext } from "../types";

export async function getPosts({
    filter,
    page,
    providerContext,
    signal,
}: {
    filter: string;
    page: number;
    providerContext: ProviderContext;
    signal: AbortSignal;
}): Promise<Post[]> {
    try {
        const { axios, cheerio } = providerContext;
        const baseUrl = "https://mlfbd.best";

        let url = filter ? `${baseUrl}/${filter}` : `${baseUrl}`;
        if (page > 1) {
            if (url.includes("?")) {
                url += `&page=${page}`;
            } else {
                url += `/page/${page}/`;
            }
        }

        // Handle initial catalog filters which might be missing the trailing slash or index.php if not careful, 
        // but the catalog.ts has 'index.php/genre/...' which is correct.

        //console.log("fetching", url);

        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };

        const res = await axios.get(url, { headers, signal });
        const $ = cheerio.load(res.data);

        const catalog: Post[] = [];

        $("article.item").each((index: number, element: any) => {
            const title = $(element).find(".data h3").text().trim();
            // Support both .poster and .image classes
            const link = $(element).find(".poster a, .image a").first().attr("href");
            let image = $(element).find(".poster img, .image img").first().attr("src");

            // Fix for lazy loaded images or placeholders
            if (image && image.includes("data:image")) {
                const dataSrc = $(element).find(".poster img, .image img").first().attr("data-src");
                if (dataSrc) image = dataSrc;
            }

            if (image && !image.startsWith("http") && !image.startsWith("data:")) {
                image = baseUrl + image;
            }

            if (title && link) {
                catalog.push({
                    title,
                    link,
                    image: image || "",
                });
            }
        });

        return catalog;
    } catch (err) {
        console.error("Mlfbd getPosts error:", err);
        return [];
    }
}

export async function getSearchPosts({
    searchQuery,
    page,
    providerContext,
    signal,
}: {
    searchQuery: string;
    page: number;
    providerContext: ProviderContext;
    signal: AbortSignal;
}): Promise<Post[]> {
    try {
        const { axios, cheerio } = providerContext;
        const baseUrl = "https://mlfbd.best";

        // Search format: https://mlfbd.best/?s=query
        const url = `${baseUrl}/?s=${encodeURIComponent(searchQuery)}`;
        // Pagination might be different for search, usually /page/2?s=... or ?s=...&page=2
        // Let's assume standard WordPress: /page/2/?s=query or ?s=query&paged=2
        // The browser analysis didn't cover search, but ?s=... is standard. 
        // I'll stick to a simple query for now.

        const headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };

        const res = await axios.get(url, { headers, signal });
        const $ = cheerio.load(res.data);

        const catalog: Post[] = [];

        // Search results often use the same 'article.item' or similar structure 'article.post'
        // I'll check for 'article.item' first, or fallback to 'article'.
        const searchSelector = ".search-page article, article";

        $(searchSelector).each((index: number, element: any) => {
            let title = $(element).find(".data h3, .title h2, h2.title, h3 a, h2 a, .contenido h3 a").text().trim();
            const link = $(element).find("a").first().attr("href");
            let image = $(element).find("img").attr("src");

            // Fallback for title: checks alt text of image or title attribute of link
            if (!title) {
                title = $(element).find("img").attr("alt") || $(element).find("a").attr("title") || "";
            }

            // Handle lazy load for search too
            if (image && image.includes("data:image")) {
                const dataSrc = $(element).find("img").attr("data-src");
                if (dataSrc) image = dataSrc;
            }

            if (image && !image.startsWith("http") && !image.startsWith("data:")) {
                image = baseUrl + image;
            }

            if (title && link && !catalog.some((p) => p.link === link)) {
                catalog.push({
                    title,
                    link,
                    image: image || "",
                });
            }
        });

        return catalog;
    } catch (err) {
        console.error("Mlfbd getSearchPosts error:", err);
        return [];
    }
}
