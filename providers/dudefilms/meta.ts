import { Info, Link, ProviderContext } from "../types";

// Headers
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
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio } = providerContext;
  const url = link;
  const baseUrl = url.split("/").slice(0, 3).join("/");

  const emptyResult: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "movie",
    linkList: [],
  };

  try {
    const response = await axios.get(url, {
      headers: { ...headers, Referer: baseUrl },
    });
    const $ = cheerio.load(response.data);
    const content = $(".entry-content, .post-inner").length
      ? $(".entry-content, .post-inner")
      : $("body");

    const result: Info = {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };

    // --- Clean Title ---
    const rawTitle =
      content.find("h1.page-title .material-text").text().trim() ||
      content.find("h1").first().text().trim() ||
      $("h1").text().trim() ||
      $("title").text().trim();

    // Truncate at Year, Season (S01), Quality (720p), Brackets, or Pipes
    result.title = rawTitle
      .replace(/^Download\s*/i, "")
      .split(/\s*(\d{4}|S\d+|Season|(?:\d+p)|\[|\|)/i)[0]
      .replace(/[:\-]$/, "") // Remove trailing colons or dashes
      .trim();

    // --- Type Detect ---
    const pageText = content.text();
    if (/Season\s*\d+|S\d+/i.test(rawTitle) || /Season\s*\d+/i.test(pageText)) {
      result.type = "series";
    } else {
      result.type = "movie";
    }

    // --- IMDb ID ---
    const imdbHref = content.find("a[href*='imdb.com/title/']").attr("href");
    const imdbMatch = imdbHref?.match(/tt\d+/);
    result.imdbId = imdbMatch ? imdbMatch[0] : "";

    // --- Image ---
    let image =
      content.find("img").first().attr("data-src") ||
      content.find("img").first().attr("src") ||
      "";
    if (image.startsWith("//")) image = "https:" + image;
    else if (image.startsWith("/")) image = baseUrl + image;
    if (image.includes("no-thumbnail") || image.includes("placeholder"))
      image = "";
    result.image = image;

    // --- Synopsis ---
    result.synopsis = content.find("p").first().text().trim() || "";

    // --- Download Links Extraction ---
    const links: Link[] = [];

if (result.type === "series") {
  content.find("h3, h4, h5").each((_, header) => {
    const headerText = $(header).text().trim();

    // ❌ Skip metadata sections
    if (
      /Series Info|Screenshots|Storyline|Info|Trailer/i.test(headerText) &&
      !/\d+p/i.test(headerText)
    ) {
      return;
    }

    const qualityMatch = headerText.match(/\d+p/)?.[0] || "";
    const paragraph = $(header).next("p");

    // ✅ STRICT: HubCloud only
    const hubCloudAnchor = paragraph
      .find("a")
      .filter((_, a) => /HubCloud/i.test($(a).text()))
      .first();

    if (!hubCloudAnchor.length) return;

    const hubCloudLink = hubCloudAnchor.attr("href");
    if (!hubCloudLink) return;

    links.push({
      title: headerText,
      quality: qualityMatch,
      episodesLink: hubCloudLink,
    });
  });
}
 else {
  // 🎬 Movie case (HubCloud Fast-Server)
  const movieBlocks = content.find("h4, h5").toArray();

  for (const heading of movieBlocks) {
    const headingText = $(heading).text().trim();

    // Skip junk sections
    if (/Screenshots|Trailer|Storyline/i.test(headingText)) continue;

    const qualityMatch = headingText.match(/\d+p/)?.[0] || "";
    if (!qualityMatch) continue;

    const redirectUrl = $(heading)
      .next("p")
      .find("a.maxbutton-download-link")
      .attr("href");

    if (!redirectUrl) continue;

    try {
      // Step 1: open dflinks.online page
      const page = await axios.get(redirectUrl, {
        headers: {
          "User-Agent": headers["User-Agent"],
          Referer: redirectUrl,
        },
      });

      const $$ = cheerio.load(page.data || "");

      // Step 2: extract HubCloud Fast-Server link
      const hubCloudLink = $$(".timed-content-client_show_0_5 a")
        .filter((_, a) =>
          /hubcloud/i.test($$(a).text()) ||
          /hubcloud/i.test($$(a).attr("href") || "")
        )
        .first()
        .attr("href");

      if (!hubCloudLink) continue;

      links.push({
        title: headingText,
        quality: qualityMatch,
        episodesLink: "",
        directLinks: [
          {
            title: "HubCloud",
            link: hubCloudLink,
            type: "movie",
          },
        ],
      });
    } catch (err) {
      console.log("HubCloud movie scrape error:", err);
    }
  }
}

    result.linkList = links;
    return result;
  } catch (err) {
    console.error("getMeta error:", err instanceof Error ? err.message : err);
    return emptyResult;
  }
};