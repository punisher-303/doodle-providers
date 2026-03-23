import { Post, ProviderContext } from "../types";

// --- Get normal posts (homepage / categories) - REWRITTEN FOR PROMISES ---
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
    const { axios, cheerio, getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("Vega");
    
    console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);

    // Akro filter support
    const akroFilter = providerValue?.toLowerCase() === "akro" ? "/akro" : "";
    const url = `${baseUrl}/${filter}${akroFilter}${page > 1 ? `/page/${page}` : ""}/`;
    
    console.log("vegaGetPosts url:", url);

    // The function signature now returns a Promise directly
    return posts(baseUrl, url, signal, {}, axios, cheerio);
};

// --- Search posts (FIXED LOGIC to use GET URL and POST body for better compatibility) ---
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
    if (!searchQuery || !searchQuery.trim()) return Promise.resolve([]);

    const { axios, cheerio, getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("Vega");

    console.log("vegaGetSearchPosts baseUrl:", providerValue, baseUrl);
    
    const cleanedQuery = searchQuery.trim().replace(/\s+/g, "+");
    
    // The search URL is always a GET request structure: /?s=query[&page=x]
    const akroFilter = providerValue?.toLowerCase() === "akro" ? "&akro=true" : "";
    const url = `${baseUrl}/?s=${cleanedQuery}${akroFilter}${page > 1 ? `&page=${page}` : ""}`;
    
    // The Referer must look like the search result page that triggered the POST/challenge
    const searchReferer = `${baseUrl}/?s=${cleanedQuery}`;
    
    const searchHeaders = { 
        "Referer": searchReferer 
    };

    console.log("vegaGetSearchPosts url:", url);
    
    // Using GET for simplicity as it usually works if the domain is correct
    return posts(baseUrl, url, signal, searchHeaders, axios, cheerio);
};

// --- Core function (MODIFIED to use .then() and return a Promise) ---
function posts(
    baseUrl: string,
    url: string,
    signal: AbortSignal,
    headers: Record<string, string> = {},
    axios: ProviderContext["axios"],
    cheerio: ProviderContext["cheerio"],
    method: "GET" | "POST" = "GET",
    data?: string,
): Promise<Post[]> {
    
    let requestPromise;
    // NOTE: Referer is now passed correctly from the calling function via headers object
    const requestHeaders = headers; 

    // Decide between axios.post and axios.get
    if (method === "POST" && data) {
        requestPromise = axios.post(url, data, { headers: requestHeaders, signal });
    } else {
        requestPromise = axios.get(url, { headers: requestHeaders, signal });
    }
    
    return requestPromise
        .then(res => {
            const html = res.data; // axios returns data in the .data property
            const $ = cheerio.load(html);

            const posts: Post[] = [];
            const seen = new Set<string>();

            $(".blog-items,.post-list, .blog-items-wrap")
                ?.children("article")
                ?.each((_, element) => {
                    const el = $(element);
                    
                    // Find the main link
                    const link = el.find("a[href]").first().attr("href") || "";
                    if (!link || seen.has(link)) return;
                    seen.add(link);

                    // Extract and clean title
                    let title = (
                        el
                            ?.find("a")
                            ?.attr("title")
                            ?.replace("Download", "")
                            // Simplified regex for robustness, as complex match group regex can be fragile
                            // .match(/^(.*?)\s*\((\d{4})\)|^(.*?)\s*\((Season \d+)\)/)?.[0] ||
                            ?.replace(/\[.*?\]/g, "") // Remove bracketed tags early
                            ?.replace(/\s{2,}/g, " ") // Collapse multiple spaces
                            ?.trim() ||
                        el?.find(".post-title").text()?.replace("Download", "") ||
                        el?.find("h2 a").text()?.replace("Download", "") ||
                        ""
                    ).trim();
                    
                    // Final cleanup
                    title = title.replace(/\[.*?\]/g, "").replace(/\s{2,}/g, " ").trim();
                    if (!title) return;


                    // Image extraction
                    let image =
                        el.find("a").find("img").attr("data-lazy-src") ||
                        el.find("a").find("img").attr("data-src") ||
                        el.find("a").find("img").attr("src") ||
                        "";

                    if (image.startsWith("//")) image = "https:" + image;

                    posts.push({ title, link, image });
                });

            console.log("Fetched posts:", posts.length);
            return posts;
        })
        .catch(error => {
            console.error("vegaGetPosts error:", error);
            // This needs to return a promise that resolves to an empty array
            return []; 
        });
}