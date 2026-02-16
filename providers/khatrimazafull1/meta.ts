import { Info, Link, ProviderContext } from "../types";

const defaultHeaders = {
  Referer: "https://www.google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
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

    const res = await axios.get(link, {
      headers: defaultHeaders,
    });

    const $ = cheerio.load(res.data || "");
    const content = $(".entry-content");

    // -------- TITLE --------
    const title =
      $("h1.entry-title").text().trim() ||
      content.find("p strong").first().text().trim();

    // -------- IMAGE --------
    const image =
      content.find("img.aligncenter").first().attr("src") ||
      content.find("img").first().attr("src") ||
      "";

    // -------- SYNOPSIS --------
    let synopsis = "";
    content.find("p").each((_, el) => {
      const txt = $(el).text().trim();
      if (
        txt.startsWith("Genres:") ||
        txt.startsWith("Director:") ||
        txt.startsWith("Writers:") ||
        txt.startsWith("Stars:")
      ) {
        synopsis += txt + "\n";
      }
    });
    synopsis = synopsis.trim();

    // -------- DOWNLOAD LINKS --------
    const linkList: Link[] = [];
    const directLinks: Link["directLinks"] = [];

    content.find("h3").each((_, el) => {
      const headingText = $(el).text().trim();
      const qualityMatch = headingText.match(/\b(480p|720p|1080p)\b/i);
      if (!qualityMatch) return;

      const quality = qualityMatch[1];
      const linkTag = $(el).next("h3").find("a");
      const dlLink = linkTag.attr("href");
      if (!dlLink) return;

      const sizeMatch = linkTag.text().match(/\[(.*?)\]/);

      directLinks.push({
        title: `${quality}${sizeMatch ? " " + sizeMatch[1] : ""}`,
        link: dlLink,
        type: "movie",
      });
    });

    if (directLinks.length > 0) {
      linkList.push({
        title,
        quality: "",
        directLinks,
      });
    }

    // ✅ imdbId REQUIRED by Info type
    return {
      title,
      synopsis,
      image,
      imdbId: "", // <-- FIX
      type: "movie",
      linkList,
    };
  } catch (err) {
    console.error("Meta fetch error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "", // <-- FIX
      type: "movie",
      linkList: [],
    };
  }
};
