import { Info, Link, ProviderContext } from "../types";

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
  Cookie:
    "_ga=GA1.1.10613951.1756380104; xla=s4t; _ga_1CG5NQ0F53=GS2.1.s1756380103$o1$g1$t1756380120$j43$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};

export const getMeta = ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> => {
  const { axios, cheerio } = providerContext;
  const url = link;
  const baseUrl = url.split("/").slice(0, 3).join("/");

  return axios
    .get(url, {
      headers: {
        ...headers,
        Referer: baseUrl,
      },
    })
    .then((response: any) => {
      const $ = cheerio.load(response.data || "");
      const rawHtml = $.html();
      
      const container = $(".post-content, .page-body, .entry-content, .post-inner").first();

      // Title Extraction (Fallback chain)
      const titleText = $("h1.post-title").text() || container.find("h1, h2, h3").first().text() || "";
      const title = titleText.replace(/Download/i, "").trim();

      // IMDb ID Extraction (Regex search over raw HTML covers nested <a> tags)
      const imdbMatch = rawHtml.match(/title\/(tt\d+)/);
      const imdbId = imdbMatch ? imdbMatch[1] : "";

      // Type classification (Series/Movie)
      const type = rawHtml.match(/Series Name|Season[\s]*:/i) ? "series" : "movie";

      // Synopsis
      let synopsis = "";
      const plotHeading = container
        .find("h2, h3, h4")
        .filter((_i: number, el: any) => !!$(el).text().match(/SYNOPSIS|PLOT/i));

      if (plotHeading.length > 0) {
        synopsis = plotHeading.next("p").text().trim();
        if (!synopsis) {
            synopsis = plotHeading.next().next("p").text().trim();
        }
      }

      // Image Extraction
      let image =
        container.find("img[data-lazy-src]").attr("data-lazy-src") ||
        container.find("img[src]").first().attr("src") ||
        "";
      if (image.startsWith("//")) {
        image = "https:" + image;
      }

      // -----------------------------------------------------------------
      // LINK EXTRACTION
      // -----------------------------------------------------------------
      // Find ALL headings denoting quality or a download section (h2 to h6)
      const headings = container.find("h2, h3, h4, h5, h6").filter((_i: number, el: any) => {
        const txt = $(el).text().toLowerCase();
        return /(480p|720p|1080p|2160p|4k)/.test(txt) || txt.includes("download");
      }).toArray();

      const links: Link[] = [];

      if (!headings || headings.length === 0) {
        return {
          title,
          synopsis,
          image,
          imdbId,
          type: type as "movie" | "series",
          linkList: [],
        };
      }

      $(headings).each((i: number, el: any) => {
        const $el = $(el);
        const headingText = $el.text().trim();
        const qualityMatch = headingText.match(/\d+p|4K\b/i);
        const quality = qualityMatch ? qualityMatch[0] : "";

        // Iterate through sibling elements until the next heading is reached
        let nextEl = $el.next();
        const anchors: any[] = [];

        while (nextEl.length > 0 && !nextEl.is("h2, h3, h4, h5, h6")) {
          nextEl.find("a").each((_idx: number, aEl: any) => anchors.push(aEl));
          if (nextEl.is("a")) anchors.push(nextEl[0]); // Case where top level sibling is an anchor
          nextEl = nextEl.next();
        }

        if (anchors.length > 0) {
          // Default to the first found button link
          let targetLink = $(anchors[0]).attr("href") || "";

          // Iterate to prioritize specific high-quality links (like VCloud) if present
          $(anchors).each((_idx: number, aEl: any) => {
            const btnText = $(aEl).text().toLowerCase();
            const href = $(aEl).attr("href");
            if (!href) return;
            
            if (btnText.includes("v-cloud") || btnText.includes("vcloud")) {
              targetLink = href;
            }
          });

          if (targetLink) {
            if (type === "movie") {
              links.push({
                title: headingText,
                quality: quality,
                directLinks: [{ title: "Download", link: targetLink, type: "movie" }],
                episodesLink: "",
              });
            } else {
              links.push({
                title: headingText,
                quality: quality,
                directLinks: [],
                episodesLink: targetLink, // Forward to episodes.ts
              });
            }
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
    .catch((error: any) => {
      console.error("getMeta error:", error);
      return {
        title: "",
        synopsis: "",
        image: "",
        imdbId: "",
        type: "movie" as const,
        linkList: [],
      };
    });
};