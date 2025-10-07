import { Info, Link, ProviderContext } from "../types";

const headers = {
  Referer: "https://google.com",
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
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    // --- Container
    const container = $("article, .entry-content").first();

    // --- Title
    let rawTitle =
      container.find("h1").first().text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim();
    const title = rawTitle
      .replace(/RareAnimes/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\(.+?\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    // --- Type
    const type: "movie" | "series" = /season|episode|ep\s*\d+/i.test(title)
      ? "series"
      : "movie";

    // --- Synopsis
    const synopsis =
      container
        .find("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .join(" ") ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // --- Image
    const image =
      container.find("img").first().attr("src") ||
      container.find("img").first().attr("data-src") ||
      $("meta[property='og:image']").attr("content") ||
      $("img").first().attr("src") ||
      "";

    // --- IMDb Id
    const imdbId =
      $('a[href*="imdb.com/title/tt"]').attr("href")?.match(/tt\d+/)?.[0] || "";

    // --- Links
    const links: Link[] = [];
    const episodeLinks: Link["directLinks"] = [];
    const seenLinks = new Set<string>();

    // --- Episodes (improved selectors)
    $(
      'a:contains("Episode"), a:contains("EP"), .eplister a, .episodelist a, ul li a'
    ).each((_, el) => {
      const epTitle = $(el).text().trim();
      const epLink = $(el).attr("href");
      if (!epLink) return;

      const finalLink = epLink.startsWith("http")
        ? epLink
        : new URL(epLink, link).href;
      if (seenLinks.has(finalLink)) return;
      seenLinks.add(finalLink);

      // Extract episode number
      const numberMatch = epTitle.match(/(\d+)/);
      const fullTitle = numberMatch
        ? `Episode ${numberMatch[0]} - ${title}`
        : epTitle || `Episode - ${title}`;

      episodeLinks.push({
        title: fullTitle,
        link: finalLink,
        type: "episode",
      });
    });

    // --- Movie / Quality Links
    container.find("a").each((_, el) => {
      const qText = $(el).text().trim();
      const qLink = $(el).attr("href");
      if (!qLink) return;

      const finalLink = qLink.startsWith("http")
        ? qLink
        : new URL(qLink, link).href;
      if (seenLinks.has(finalLink)) return;

      if (/480|720|1080|2160|4K|mp4|m3u8/i.test(qText)) {
        seenLinks.add(finalLink);
        episodeLinks.push({
          title: qText || "Movie",
          link: finalLink,
          type: "movie",
          quality:
            qText.match(/\b(480p|720p|1080p|2160p|4K)\b/i)?.[0] || "",
        });
      }
    });

    // --- Embedded JS links (mp4/m3u8 inside <script>)
    const scriptData = $("script")
      .map((_, el) => $(el).html())
      .get()
      .join(" ");
    const jsMatches = [
      ...scriptData.matchAll(/https?:\/\/[^\s'"]+\.(mp4|m3u8)/gi),
    ];
    jsMatches.forEach((m) => {
      if (!seenLinks.has(m[0])) {
        seenLinks.add(m[0]);
        episodeLinks.push({
          title: "Stream Link",
          link: m[0],
          type: "movie",
        });
      }
    });

    // --- Push into final structure
    if (episodeLinks.length > 0) {
      links.push({
        title,
        directLinks: episodeLinks,
      });
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links,
    };
  } catch (err) {
    console.error("❌ RareAnimes meta fetch error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: [],
    };
  }
};
