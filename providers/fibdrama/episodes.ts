// episodes.ts
import { EpisodeLink, ProviderContext } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://fibwatchdrama.xyz/",
};

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { getBaseUrl, axios, cheerio } = providerContext;

  return getBaseUrl("fibdrama").then((baseUrl) => {
    if (url.startsWith("season:")) {
      const parts = url.split(":");
      const seasonNum = parseInt(parts[1]);
      const parentVideoId = parts[3];

      return axios
        .get(`${baseUrl}/ajax/episodes.php?video_id=${parentVideoId}`, {
          headers,
        })
        .then((epRes) => {
          if (!epRes.data || !Array.isArray(epRes.data.episodes)) {
            return [];
          }

          const seasonEpisodes = epRes.data.episodes.filter((ep: any) => {
            const sMatch = ep.title.match(/s(\d{1,2})/i);
            return sMatch && parseInt(sMatch[1]) === seasonNum;
          });

          const episodePromises = seasonEpisodes.map((ep: any) => {
            const epPageUrl = ep.url.trim().startsWith("http")
              ? ep.url.trim()
              : `${baseUrl}${ep.url.trim().startsWith("/") ? "" : "/"}${ep.url.trim()}`;

            return axios
              .get(epPageUrl, { headers })
              .then((pageRes) => {
                const $ = cheerio.load(pageRes.data);
                const innerVideoId = $("input#video-id").val()?.toString();
                let finalLink = "";

                let switcherPromise = Promise.resolve();

                if (innerVideoId) {
                  switcherPromise = axios
                    .get(
                      `${baseUrl}/ajax/resolution_switcher.php?video_id=${innerVideoId}`,
                      { headers }
                    )
                    .then((switcher) => {
                      const sources = [
                        ...(switcher.data.current || []),
                        ...(switcher.data.popup || []),
                      ];
                      const validSource = sources.find((s: any) => s.url);
                      if (validSource) {
                        finalLink = validSource.url;
                      }
                    })
                    .catch(() => {});
                }

                return switcherPromise.then(() => {
                  if (!finalLink) {
                    const dlClick = $(
                      "a.hidden-button.buttonDownloadnew"
                    ).attr("onclick");
                    const match = dlClick?.match(/url=(.*?)',/);
                    if (match?.[1]) {
                      finalLink = match[1].trim();
                    }
                  }

                  if (finalLink) {
                    finalLink = finalLink.startsWith("http")
                      ? finalLink
                      : `${baseUrl}${finalLink.startsWith("/") ? "" : "/"}${finalLink}`;
                    return {
                      title: ep.title || "Episode",
                      link: finalLink,
                    };
                  }
                  return null;
                });
              })
              .catch(() => null);
          });

          return Promise.all(episodePromises).then((results) =>
            results.filter((e): e is EpisodeLink => e !== null)
          );
        })
        .catch(() => []); // Return empty if episodes.php 404s
    }

    return Promise.resolve([
      {
        title: "Play Movie",
        link: url,
      },
    ]);
  });
};