<<<<<<< HEAD
import { Info, ProviderContext } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-store",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export const getMeta = function ({
=======
import { Info, Link, ProviderContext } from "../types";

const headers = {
  Referer: "https://google.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
};

export const getMeta = async function ({
>>>>>>> 7f000b622e14a4045c1d1bf3af4fa78965b8b3b3
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
<<<<<<< HEAD
  const { axios, cheerio } = providerContext;

  const empty: Info = {
    title: "",
    synopsis: "",
    image: "",
    imdbId: "",
    type: "series",
    linkList: [],
  };

  return axios
    .get(link, { headers })
    .then((res: any) => {
      const $ = cheerio.load(res.data);

      // ---------------- TITLE ----------------
      const title = $("header.entry-header h1.entry-title")
        .first()
        .text()
        .trim();

      // ---------------- IMAGE ----------------
      let image =
        $(".post-thumbnail img").first().attr("src") ||
        $("img").first().attr("src") ||
        "";

      if (image.startsWith("//")) image = "https:" + image;

      // ---------------- SYNOPSIS ----------------
      const synopsis = $(".description p").first().text().trim();

      const info: Info = {
        title,
        synopsis,
        image,
        imdbId: "",
        type: "series",
        linkList: [],
      };

      // ---------------- SEASONS ----------------
      $(".choose-season ul.sub-menu li a").each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/\d+/);
        const seasonNum = match ? match[0] : null;

        if (seasonNum) {
          info.linkList.push({
            title: "Season " + seasonNum,
            quality: "Season " + seasonNum,
            episodesLink: link,
            directLinks: [],
          });
        }
      });

      // ---------------- FALLBACK (Single Season) ----------------
      if (
        info.linkList.length === 0 &&
        $("section.episodes").length > 0
      ) {
        info.linkList.push({
          title: "Season 1",
          quality: "Season 1",
          episodesLink: link,
          directLinks: [],
        });
      }

      return info;
    })
    .catch((err: any) => {
      console.log("meta error:", err);
      return empty;
    });
};
=======
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(link, { headers });
    const $ = cheerio.load(res.data);

    // --- Main container
    const container = $("article.post.single, .entry-content").first();

    // --- Title
    const rawTitle = container.find("h1.entry-title").text().trim() ||
      $("meta[property='og:title']").attr("content")?.trim() ||
      $("title").text().trim();
    const title = rawTitle.replace(/\s{2,}/g, " ").trim();

    // --- Type
    const type: "movie" | "series" = /season|episode|ep\s*\d+/i.test(title)
      ? "series"
      : "movie";

    // --- Synopsis
    const synopsis = container.find(".entry-content p").map((_, el) => $(el).text().trim()).get().join(" ") ||
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    // --- Image
    const image = container.find(".post-thumbnail img").attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";

    // --- Links
    const links: Link[] = [];
    const episodeLinks: Link["directLinks"] = [];
    const seenLinks = new Set<string>();

    // --- Episodes buttons
    $(".seasons-lst li").each((_, el) => {
      const ep = $(el);
      const epTitle = ep.find("h3.title").text().trim();
      const epLink = ep.find("a.btn").attr("href");
      const epImage = ep.find("img").attr("src") || "";

      if (!epLink || seenLinks.has(epLink)) return;
      seenLinks.add(epLink);

      episodeLinks.push({
        title: epTitle,
        link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
        type: "episode",
      });
    });

    // --- Download links
    $(".download-links a[data-url]").each((_, el) => {
      const base64Link = $(el).attr("data-url");
      const quality = $(el).closest("tr").find("td:nth-child(3)").text().trim() || "HD";
      if (!base64Link) return;
      const finalLink = atob(base64Link); // decode base64

      if (seenLinks.has(finalLink)) return;
      seenLinks.add(finalLink);

      episodeLinks.push({
        title: `Download - ${quality}`,
        link: finalLink,
        type: "movie",
        quality,
      });
    });

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
      imdbId: "", // TOONo me IMDb ID nahi hota
      type,
      linkList: links,
    };
  } catch (err) {
    console.error("❌ TOONo meta fetch error:", err);
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



>>>>>>> 7f000b622e14a4045c1d1bf3af4fa78965b8b3b3
