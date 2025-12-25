"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchPosts = exports.getPosts = void 0;
// --- Base URL (Updated to new domain) ---
const baseUrl = "https://vegamovies.menu";
// --- CRITICAL: New Cookie from the user's request (TIME SENSITIVE - WILL EXPIRE!) ---
// NOTE: For reliable scraping, this cookie must be kept fresh.
// UPDATED with the cookie from the search request data
const CLOUDFLARE_COOKIE = "_ga=GA1.1.310039012.1758436198; xla=s4t; prefetchAd_9600333=true; _ga_BLZGKYN5PF=GS2.1.s1761848188$o9$g1$t1761848242$j6$l0$h0; cf_clearance=Y.gf.B8QYkK_4RQbgIu05JhJvo6hb1KD3P95pINxXOk-1761848264-1.2.1.1-5w4ITbFueT5ijnNgOjm_h4E90CPL7XGEvZn9imbshniq7n9.G.tymIXvGgm5bmStGKHKUhtIfYR_7ZEngXH3NvrHFOJh__2IY6_4l4Dcmew4zxWS3WUmIcdui6tEOaoG1cK3iNY558pMBu5_Hu4q._m8zTVRO8sxC0jJgVzj7ef.vM0sys46L.ncIDilpmoV8R3bjI143scCWHMT0EgEzxLsgffZrDisWbdqD_pv3l0";
// --- Default HTTP headers (Updated based on new request data) ---
const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6,ar;q=0.5,pt;q=0.4",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    // NOTE: This Content-Type is for POST requests, not needed for default GETs
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://vegamovies.menu/",
    "Cookie": CLOUDFLARE_COOKIE,
    "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
};
// --- Utility function to URL-encode form data ---
function buildFormData(data) {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        .join('&');
}
// --- Get normal posts (homepage / categories) - REWRITTEN FOR PROMISES ---
const getPosts = ({ filter, page, providerValue, signal, providerContext, }) => {
    const { axios, cheerio } = providerContext;
    console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
    // Akro filter support
    const akroFilter = (providerValue === null || providerValue === void 0 ? void 0 : providerValue.toLowerCase()) === "akro" ? "/akro" : "";
    const url = `${baseUrl}/${filter}${akroFilter}${page > 1 ? `/page/${page}` : ""}/`;
    console.log("vegaGetPosts url:", url);
    // The function signature now returns a Promise directly
    return posts(baseUrl, url, signal, defaultHeaders, axios, cheerio);
};
exports.getPosts = getPosts;
// --- Search posts (FIXED LOGIC to use GET URL and POST body for better compatibility) ---
const getSearchPosts = ({ searchQuery, page, providerValue, signal, providerContext, }) => {
    if (!searchQuery || !searchQuery.trim())
        return Promise.resolve([]);
    const { axios, cheerio } = providerContext;
    console.log("vegaGetSearchPosts baseUrl:", providerValue, baseUrl);
    const cleanedQuery = searchQuery.trim().replace(/\s+/g, "+");
    // The search URL is always a GET request structure: /?s=query[&page=x]
    const akroFilter = (providerValue === null || providerValue === void 0 ? void 0 : providerValue.toLowerCase()) === "akro" ? "&akro=true" : "";
    const url = `${baseUrl}/?s=${cleanedQuery}${akroFilter}${page > 1 ? `&page=${page}` : ""}`;
    // The POST body is what the search form submits (though form is GET, this is needed for Cloudflare/server logic)
    // We send the 's' parameter in the body as well, mimicking the expected form submission data.
    const postBody = buildFormData({ s: cleanedQuery });
    // The Referer must look like the search result page that triggered the POST/challenge
    const searchReferer = `${baseUrl}/?s=${cleanedQuery}`;
    const searchHeaders = Object.assign(Object.assign({}, defaultHeaders), { 
        // Overwrite the default Referer for search requests
        "Referer": searchReferer });
    console.log("vegaGetSearchPosts url:", url);
    console.log("vegaGetSearchPosts body:", postBody);
    // Using POST with the GET-style URL and form data in the body, which matches the observed network request
    return posts(baseUrl, url, signal, searchHeaders, axios, cheerio, "POST", postBody);
};
exports.getSearchPosts = getSearchPosts;
// --- Core function (MODIFIED to use .then() and return a Promise) ---
function posts(baseUrl, url, signal, headers = {}, axios, cheerio, method = "GET", data) {
    let requestPromise;
    // NOTE: Referer is now passed correctly from the calling function via headers object
    const requestHeaders = headers;
    // Decide between axios.post and axios.get
    if (method === "POST" && data) {
        requestPromise = axios.post(url, data, { headers: requestHeaders, signal });
    }
    else {
        requestPromise = axios.get(url, { headers: requestHeaders, signal });
    }
    return requestPromise
        .then(res => {
        var _a, _b;
        const html = res.data; // axios returns data in the .data property
        const $ = cheerio.load(html);
        const posts = [];
        const seen = new Set();
        (_b = (_a = $(".blog-items,.post-list, .blog-items-wrap")) === null || _a === void 0 ? void 0 : _a.children("article")) === null || _b === void 0 ? void 0 : _b.each((_, element) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const el = $(element);
            // Find the main link
            const link = el.find("a[href]").first().attr("href") || "";
            if (!link || seen.has(link))
                return;
            seen.add(link);
            // Extract and clean title
            let title = (((_e = (_d = (_c = (_b = (_a = el === null || el === void 0 ? void 0 : el.find("a")) === null || _a === void 0 ? void 0 : _a.attr("title")) === null || _b === void 0 ? void 0 : _b.replace("Download", "")) === null || _c === void 0 ? void 0 : _c.replace(/\[.*?\]/g, "") // Remove bracketed tags early
            ) === null || _d === void 0 ? void 0 : _d.replace(/\s{2,}/g, " ") // Collapse multiple spaces
            ) === null || _e === void 0 ? void 0 : _e.trim()) ||
                ((_f = el === null || el === void 0 ? void 0 : el.find(".post-title").text()) === null || _f === void 0 ? void 0 : _f.replace("Download", "")) ||
                ((_g = el === null || el === void 0 ? void 0 : el.find("h2 a").text()) === null || _g === void 0 ? void 0 : _g.replace("Download", "")) ||
                "").trim();
            // Final cleanup
            title = title.replace(/\[.*?\]/g, "").replace(/\s{2,}/g, " ").trim();
            if (!title)
                return;
            // Image extraction
            let image = el.find("a").find("img").attr("data-lazy-src") ||
                el.find("a").find("img").attr("data-src") ||
                el.find("a").find("img").attr("src") ||
                "";
            if (image.startsWith("//"))
                image = "https:" + image;
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
