import { Info, Link, ProviderContext } from "../types";

// Upgraded headers to mimic a modern browser and bypass basic Cloudflare checks
const defaultHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios, cheerio } = providerContext;

  return axios
    .get(link, { 
      headers: defaultHeaders,
      validateStatus: () => true // Prevent Axios from crashing on 403/503 errors
    })
    .then(({ data, status }) => {
      
      if (status === 403 || status === 503 || data.includes("Just a moment...")) {
         console.error(`🚨 [Movies4u Meta] BLOCKED BY CLOUDFLARE on ${link}`);
         throw new Error("Cloudflare block");
      }

      const $ = cheerio.load(data);
      const body = $(".entry-content, .post-inner, article").first();

      // -------- CLEAN TITLE --------
      let rawTitle = $("h1.entry-title").first().text().trim() || $("h1").first().text().trim();
      
      // Bulletproof title cleaning: 
      // 1. Remove "Download " from the start
      // 2. Split at the first "|" or "(" and take only the first chunk
      // Result: "Download Paanch Minar | 2025" -> "Paanch Minar"
      let title = rawTitle.replace(/^Download\s+/i, "").split(/[|()]/)[0].trim();
      
      if (!title) title = "Unknown Title";

      const isSeries = /Season|Episode/i.test(rawTitle) || data.toLowerCase().includes("season");

      // -------- SYNOPSIS --------
      // Find the header containing SYNOPSIS, then get the text of the next element
      let synopsis = body.find("div:contains('SYNOPSIS'), div:contains('Storyline'), p:contains('Storyline')")
                         .next("div, p").text().trim();
      
      // Fallback: Grab the first paragraph that looks like a plot summary (over 100 characters)
      if (!synopsis) {
         synopsis = body.find("p").filter((_, el) => $(el).text().trim().length > 100).first().text().trim();
      }

      const info: Info = {
        title,
        synopsis,
        image: body.find("img[src]").first().attr("src") || "",
        imdbId: "",
        type: isSeries ? "series" : "movie",
        linkList: [],
      };

      const links: Link[] = [];

      // -------- LINKS EXTRACTOR --------
      // Iterating over anchor tags inside headings to grab the URLs and sizes
      body.find("h3 a, h4 a, p a").each((_, el) => {
        const anchor = $(el);
        const href = anchor.attr("href");
        
        // Look at the anchor's text (e.g., "480p Links [458MB]")
        const text = anchor.text().trim() || anchor.parent().text().trim();

        if (!href || href.startsWith("#") || href === "/") return;
        
        // Only process if it actually mentions a resolution or the word "Links"
        if (/480p|720p|1080p|2160p|Links|Download|Episode/i.test(text)) {
            const quality = text.match(/\b(480p|720p|1080p|2160p|4K)\b/i)?.[0]?.toLowerCase() || "HD";
            
            // Extract the size from brackets e.g. [458MB] -> 458MB
            const sizeMatch = text.match(/\[(.*?MB|.*?GB)\]/i);
            const size = sizeMatch ? sizeMatch[1] : "";
            
            const linkTitle = isSeries 
                ? `Season / Episode (${quality}) ${size ? `[${size}]` : ""}`.trim()
                : `Play ${quality} ${size ? `[${size}]` : ""}`.trim();

            links.push({
              title: linkTitle,
              quality,
              episodesLink: href,
              directLinks: [{ 
                  title: linkTitle, 
                  link: href, 
                  type: isSeries ? "series" : "movie" 
              }]
            });
        }
      });

      // Deduplicate links in case the site repeats buttons
      const uniqueLinks = Array.from(new Map(links.map(item => [item.episodesLink, item])).values());
      info.linkList = uniqueLinks;

      return info;
    })
    .catch((err) => {
      console.error("getMeta error:", err.message);
      return { title: "", synopsis: "", image: "", imdbId: "", type: "movie" as const, linkList: [] };
    });
};