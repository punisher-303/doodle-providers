import { EpisodeLink, ProviderContext } from "../types";

export const getEpisodes = async function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders: headers } = providerContext;

  try {
    const res = await axios.get(url, {
      headers: {
        ...headers,
        cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t",
      },
    });

    const $ = cheerio.load(res.data || "");

    // remove ads / junk
    $(".unili-content, .code-block-1, script").remove();

    const episodes: EpisodeLink[] = [];

    // ✅ HubCloud episode buttons
    $(".timed-content-client_show_0_5 a.maxbutton-ep").each((_, el) => {
      const anchor = $(el);

      const text = anchor.text().trim(); // "Episode 01"
      const link = anchor.attr("href");

      if (!link || !/hubcloud/i.test(link)) return;

      const episodeNo =
        text.match(/\d+/)?.[0] || "";

      episodes.push({
        title: episodeNo ? `Episode ${episodeNo}` : text,
        link,
      });
    });

    return episodes;
  } catch (err) {
    console.error("getEpisodes error:", err);
    return [];
  }
};
