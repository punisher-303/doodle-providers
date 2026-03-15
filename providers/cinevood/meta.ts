import { Info, Link, ProviderContext } from "../types";

const kmmHeaders = {
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  try {
    const { axios, cheerio } = providerContext;

    if (!link.startsWith("http")) {
      link = new URL(link, "https://kmmovies.world").href; // Note: Ensure baseUrl matches the site
    }

    const res = await axios.get(link, { headers: kmmHeaders, validateStatus: () => true });
    const $ = cheerio.load(res.data);

    // --- Clean Title ---
    // Targets the new hero-title, falls back to h1 or og:title. 
    // Removes the year (e.g., "(2022)") and trailing/leading spaces.
    let rawTitle = 
      $("h1.hero-title").first().text().trim() || 
      $("h1, h2, .animated-text").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim() ||
      "Unknown";

    let title = rawTitle.replace(/\s*\(\d{4}\).*$/g, "").trim();

    // --- Poster Image ---
    let image =
      $("img.hero-poster").first().attr("src") || 
      $("div.wp-slider-container img").first().attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      "";
      
    if (!image || !image.startsWith("http")) {
      image = new URL(image || "/placeholder.png", link).href;
    }

    // --- Synopsis ---
    let synopsis = $(".hero-description").first().text().trim();
    if (!synopsis) {
        $("p").each((_, el) => {
          const text = $(el).text().trim();
          if (
            text &&
            text.length > 40 &&
            !text.toLowerCase().includes("download") &&
            !text.toLowerCase().includes("quality")
          ) {
            synopsis = text;
            return false;
          }
        });
    }
    if (!synopsis) {
      synopsis = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
    }

    // --- Metadata (Tags, Cast, Rating, IMDb) ---
    const tags: string[] = [];
    if (res.data.toLowerCase().includes("action")) tags.push("Action");
    if (res.data.toLowerCase().includes("drama")) tags.push("Drama");
    if (res.data.toLowerCase().includes("romance")) tags.push("Romance");
    if (res.data.toLowerCase().includes("thriller")) tags.push("Thriller");

    const cast: string[] = [];
    // Site doesn't explicitly list cast in the snippet, but we keep fallback
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (/starring|cast/i.test(text)) {
        text.split(",").forEach((name) => cast.push(name.trim()));
      }
    });

    let rating = $(".rating-star").first().text().replace("★", "").trim();
    if (!rating) rating = $("p").text().match(/IMDb Rating[:\s]*([0-9.]+)/i)?.[1] || "";
    if (rating && !rating.includes("/")) rating = rating + "/10";

    const imdbLink = $("a.btn[href*='imdb.com']").attr("href") || $("p a[href*='imdb.com']").attr("href") || "";
    const imdbId = imdbLink && imdbLink.includes("/tt") ? "tt" + imdbLink.split("/tt")[1].split("/")[0] : "";

    // --- Download Links ---
    const linkList: Link[] = [];
    const isSeries = /season|episode/i.test(rawTitle) || $(".download-options-grid").length > 0;

    // 1. New Structure (.downloads-section a.dl-btn)
    $("a.dl-btn").each((_, a) => {
        const btn = $(a);
        const href = btn.attr("href");
        if (!href || href === "#") return;

        const qualityNode = btn.find(".dl-quality").text().trim() || btn.find(".dl-res").text().trim() || "HD";
        const sizeNode = btn.find(".dl-size").text().trim();
        
        // Extract a clean standard quality (480p, 720p, etc.) for sorting purposes
        const qualityMatch = qualityNode.match(/\b(480p|720p|1080p|2160p|4K)\b/i)?.[0]?.toLowerCase() || "HD";
        
        const linkTitle = `Play ${qualityNode} ${sizeNode ? `[${sizeNode}]` : ""}`.trim();

        linkList.push({
            title: linkTitle,
            quality: qualityMatch,
            episodesLink: href,
            directLinks: [{ 
                link: href, 
                title: linkTitle, 
                type: isSeries ? "series" : "movie" 
            }],
        });
    });

    // 2. Fallback for older series structure (.download-card)
    if (linkList.length === 0 && isSeries) {
      $(".download-card").each((_, card) => {
        const card$ = $(card);
        const quality = card$.find(".download-quality-text").text().trim() || "AUTO";
        const size = card$.find(".download-size-info").text().trim() || "";
        const href = card$.find("a.tabs-download-button").attr("href") || "";
        if (href) {
          const titleText = `Download ${quality} ${size}`.trim();
          linkList.push({
            title: titleText,
            quality: quality,
            episodesLink: href,
            directLinks: [{ link: href, title: titleText, type: "series" }],
          });
        }
      });
    } 
    
    // 3. Fallback for older movie structure (.modern-download-button)
    if (linkList.length === 0 && !isSeries) {
      $("a.modern-download-button").each((_, a) => {
        const parent = $(a).closest(".modern-option-card");
        const quality = parent.find(".modern-badge").text().trim() || "AUTO";
        const href = $(a).attr("href") || "";
        const titleText = `Play ${quality}`;
        if (href) {
          linkList.push({
            title: titleText,
            quality: quality,
            episodesLink: href,
            directLinks: [{ link: href, title: titleText, type: "movie" }],
          });
        }
      });
    }

    // Deduplicate identical links
    const uniqueLinks = Array.from(new Map(linkList.map(item => [item.episodesLink, item])).values());

    return {
      title,
      synopsis,
      image,
      imdbId,
      type: isSeries ? "series" : "movie",
      tags,
      cast,
      rating,
      linkList: uniqueLinks,
    };
  } catch (err: any) {
    console.error("KMMOVIES getMeta error:", err.message);
    return {
      title: "Unknown",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      tags: [],
      cast: [],
      rating: "",
      linkList: [],
    };
  }
};