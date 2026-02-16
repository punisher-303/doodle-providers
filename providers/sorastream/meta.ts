import { EpisodeLink, Info, Link, ProviderContext } from "../types";

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const axios = providerContext.axios;

  try {
    const res = await axios.get(link);
    const data = res.data;
    const metaData = data?.meta || {};

    const meta: Info = {
      title: metaData.name || "",
      synopsis: metaData.description || "",
      image: metaData.background || "",
      imdbId: metaData.imdb_id || "",
      type: metaData.type || "movie",
      linkList: [],
    };

    const seasonMap = new Map<number, EpisodeLink[]>();

    /* =======================
       SERIES
    ======================= */
    if (meta.type === "series") {
      (metaData.videos || []).forEach((video: any) => {
        if (!video?.season || video.season <= 0) return;

        const seasonNum = Number(video.season);
        const episodeNum = Number(video.episode);

        if (!seasonMap.has(seasonNum)) {
          seasonMap.set(seasonNum, []);
        }

        seasonMap.get(seasonNum)!.push({
          title: `Episode ${episodeNum}`,
          link: JSON.stringify({
            title: meta.title,
            imdbId: meta.imdbId,
            type: "series",
            season: episodeNum ? seasonNum : undefined,
            episode: episodeNum,
            tmdbId: metaData.moviedb_id
              ? Number(metaData.moviedb_id)
              : undefined,
            year: metaData.year ? Number(metaData.year) : undefined,
          }),
        });
      });

      [...seasonMap.keys()]
        .sort((a, b) => a - b)
        .forEach((season) => {
          meta.linkList.push({
            title: `Season ${season}`,
            directLinks: seasonMap.get(season)!,
          });
        });
    }

    /* =======================
       MOVIE
    ======================= */
    else {
      meta.linkList.push({
        title: meta.title,
        directLinks: [
          {
            title: "Movie",
            link: JSON.stringify({
              title: meta.title,
              imdbId: meta.imdbId,
              type: "movie",
              tmdbId: metaData.moviedb_id
                ? Number(metaData.moviedb_id)
                : undefined,
              year: metaData.year ? Number(metaData.year) : undefined,
            }),
          },
        ],
      });
    }

    return meta;
  } catch (err) {
    console.error("Meta load failed:", err);
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
