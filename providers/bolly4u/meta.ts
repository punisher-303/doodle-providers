import { Info, Link, ProviderContext } from "../types";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
    .get(link, { headers })
    .then(({ data }) => {
      const $ = cheerio.load(data);
      const body = $(".entry-content, .post-inner").first();

      // -------- CLEAN TITLE --------
      let rawTitle = $("h1.entry-title").first().text().trim() || $("h1").first().text().trim();
      let title = rawTitle
      .replace(/Download|Full Movie|Web Series|All Episodes|Complete/gi, "")
      .replace(/Original|NetFlix/gi, "") // Added Original/Netflix
      .replace(/&/g, "") // Added & symbol
      .replace(/\(\d{4}\)/g, "")
      .replace(/\|\s*\d{4}\s*\|/g, "")
      .replace(/Season\s*\d+|S\d+/gi, "")
      .replace(/\b(480p|720p|1080p|2160p|4k|Hindi|English|Dual Audio|WEB-DL|Bluray|Webrip|Dvdrip|DDP5\.1|DD5\.1|Multi Audio)\b/gi, "")
      .replace(/[|–—\[\]{}()]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

      const isSeries = /Season|Episode/i.test(rawTitle) || data.toLowerCase().includes("season");

      const info: Info = {
        title: title || "Unknown",
        synopsis: body.find("p:contains('Plot'), p:contains('SYNOPSIS')").next("p").text().trim() || body.find(".overview").text().trim(),
        image: body.find("img[src]").first().attr("src") || "",
        imdbId: "",
        type: isSeries ? "series" : "movie",
        linkList: [],
      };

      const links: Link[] = [];

      if (isSeries) {
        // SERIES: Show Season link
        $("h3:contains('Links')").each((_, el) => {
          const text = $(el).text().trim();
          const quality = text.match(/\d+p/i)?.[0] || "HD";
          const epLink = $(el).find("a").attr("href") || $(el).next("h3").find("a").attr("href");

          if (epLink) {
            links.push({
              title: `Season ${text.match(/\d+/)?.[0] || ""} (${quality})`,
              quality,
              episodesLink: epLink,
              directLinks: [{ title: "View Episodes", link: epLink, type: "series" }]
            });
          }
        });
      } else {
        // MOVIE: Show Play button with size
        const pageText = body.text();
        $("h3:contains('Links')").each((_, el) => {
          const qText = $(el).text();
          const quality = qText.match(/\d+p/i)?.[0] || "HD";
          const href = $(el).find("a").attr("href");
          
          // Regex to find size like [800MB] or [2GB] near the quality text
          const sizeMatch = pageText.match(new RegExp(`${quality}.*?\\[(.*?)\\]`, "i"));
          const size = sizeMatch ? sizeMatch[1] : "";

          if (href) {
            links.push({
              title: `Play ${quality} ${size ? `(${size})` : ""}`,
              quality,
              episodesLink: href,
              directLinks: [{ title: `Play ${quality} (${size})`, link: href, type: "movie" }]
            });
          }
        });
      }

      info.linkList = links;
      return info;
    })
    .catch((err) => {
      console.error("getMeta error:", err);
      return { title: "", synopsis: "", image: "", imdbId: "", type: "movie" as const, linkList: [] };
    });
};