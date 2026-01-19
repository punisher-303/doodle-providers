import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  try {
    const { axios, cheerio } = providerContext;
    const res = await axios.get(url);
    const html = res.data;
    let $ = cheerio.load(html);

    const episodeLinks: EpisodeLink[] = [];

    /* ===== EXISTING LOGIC (NO CHANGE) ===== */
    $('a:contains("HubCloud")').map((i, element) => {
      const title = $(element).parent().prev().text();
      const link = $(element).attr("href");
      if (link && (title.includes("Ep") || title.includes("Download"))) {
        episodeLinks.push({
          title: title.includes("Download") ? "Play" : title,
          link,
        });
      }
    });

    /* ===== NEW ADDITION (IMAGE BASED LINKS) ===== */
    $('a[href]').each((_, el) => {
      const link = $(el).attr("href") || "";

      // HubCloud / Gdflix detect by URL or image src
      const imgSrc = $(el).find("img").attr("src") || "";

      if (
        link.includes("hubcloud") ||
        imgSrc.includes("hubcloud")
      ) {
        const title =
          $(el).closest("p, h4").prev().text().trim() ||
          "Play";

        // duplicate avoid
        if (!episodeLinks.find(e => e.link === link)) {
          episodeLinks.push({
            title,
            link,
          });
        }
      }
    });

    return episodeLinks;
  } catch (err) {
    console.error(err);
    return [
      {
        title: "Server 1",
        link: url,
      },
    ];
  }
};
