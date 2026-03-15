import { Info, Link, ProviderContext } from "../types";

// Headers optimized to mimic a real browser session
const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/signed-exchange;v=b3;q=0.7",
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

export const getMeta = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;

  const baseUrl = link.split("/").slice(0, 3).join("/");

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  // Removed the slow public CORS proxy. React Native (Hermes) bypasses CORS natively.
  // Added a 10s timeout to prevent the app from hanging if the site is down.
  return axios
    .get(link, {
      headers: { ...headers, Referer: baseUrl },
      timeout: 10000, 
    })
    .then((response: any) => {
      const $ = cheerio.load(response.data || "");
      const infoContainer = $(".single_post, .entry-content, .post-inner").first();

      // ----- TITLE EXTRACTION & CLEANUP -----
      let title = $("h1.entry-title").text().trim();
      
      if (!title) {
        const downloadTitleMatch = infoContainer
          .find("h6 span")
          .first()
          .text()
          .match(/(.*)\s*\(\d{4}\)/);
        if (downloadTitleMatch) {
          title = downloadTitleMatch[1].trim();
        }
      }

      if (!title) {
        const rawTitle = $("#movie_title a").text().trim();
        title = rawTitle.replace(/<small>.*<\/small>/, "").trim() || "Unknown Title";
      }

      // 1. Remove "Download" keyword
      title = title.replace(/^Download\s+/i, "").trim();
      // 2. Aggressively strip everything from the first quality/audio tag onwards
      title = title.replace(/\s*(HQ|HDTC|HDRip|WEB-DL|AMZN|BluRay|480p|720p|1080p|2160p|4K|x264|x265|HEVC|AAC|AVC|Dual Audio|Hindi|Tamil|Telugu|English).*/i, "").trim();
      // 3. Remove any trailing hyphens, brackets, or stray punctuation left behind
      title = title.replace(/[-:[\]()]+$/, "").trim();

      // ----- TYPE (MOVIE / SERIES) -----
      const fullText = infoContainer.text().toLowerCase();
      const type =
        fullText.includes("season") ||
        fullText.includes("episode") ||
        fullText.match(/s\d{2}e\d{2}/)
          ? "series"
          : "movie";

      // ----- IMDb ID -----
      const imdbMatch = infoContainer.html()?.match(/title\/(tt\d+)/);
      const imdbId = imdbMatch ? imdbMatch[1] : "";

      // ----- IMAGE -----
      let image =
        infoContainer.find('img[decoding="async"]').first().attr("src") ||
        infoContainer.find("img").first().attr("src") ||
        "";
      if (image.startsWith("//")) image = "https:" + image;

      // ----- SYNOPSIS -----
      let synopsis = "";
      const genresParagraph = infoContainer.find("p").filter((_, el) => $(el).text().includes("Genres:"));
      if (genresParagraph.length > 0) {
        synopsis = genresParagraph.prev("p").text().trim();
      }
      if (!synopsis) {
        synopsis = infoContainer.find("p").first().text().trim();
      }

      // ----- LINK LIST -----
      const links: Link[] = [];
      const qualityBlocks = infoContainer.find("h6");

      qualityBlocks.each((_, element) => {
        const el = $(element);
        const fullHeadingText = el.text().trim();

        const qualityMatch = fullHeadingText.match(/\d{3,4}p/)?.[0] || "";
        const fileSizeMatch = fullHeadingText.match(/\[([^\]]+)\](?=[^\[]*$)/)?.[1] || "";

        const directLinks: any[] = [];
        
        // Find anchor tags immediately following the h6 block
        const nextSiblings = el.nextUntil("h6, h2, hr");

        nextSiblings
          .filter("a")
          .add(nextSiblings.find("a"))
          .each((i, btn) => {
            const b = $(btn);
            const href = b.attr("href");
            if (href && href.startsWith("http")) {
              directLinks.push({
                title: b.attr("title")?.trim() || b.find(".mb-text").text().trim() || b.text().trim() || "Download Link",
                link: href,
                type: type,
              });
            }
          });

        if (directLinks.length > 0) {
          const seMatch = fullHeadingText.match(/(S\d{2}E\d{2}|S\d{2}|E\d{2})/i);
          const seasonEpisode = seMatch ? `${seMatch[0]} | ` : "";
          
          let linkTitle = `${seasonEpisode}${qualityMatch}${fileSizeMatch ? " | " + fileSizeMatch : ""}`.trim();
          if (!linkTitle) linkTitle = fullHeadingText || "Download";

          if (type === "movie") {
            links.push({
              title: linkTitle,
              quality: qualityMatch,
              directLinks: directLinks,
              episodesLink: "",
            });
          } else {
             links.push({
              title: linkTitle,
              quality: qualityMatch,
              directLinks: [],
              episodesLink: directLinks[0].link,
            });
          }
        }
      });

      return {
        title,
        synopsis,
        image,
        imdbId,
        type: type as "movie" | "series",
        linkList: links,
      };
    })
    .catch((err: any) => {
      console.error("getMeta error:", err instanceof Error ? err.message : String(err));
      return emptyResult;
    });
};