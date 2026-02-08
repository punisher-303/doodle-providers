import { Info, ProviderContext } from "../types";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://fibwatchdrama.xyz/",
};

export const getMeta = function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { getBaseUrl, axios, cheerio } = providerContext;

  return getBaseUrl("fibdrama").then((baseUrl) => {
    return axios.get(link, { headers }).then((response) => {
      const $ = cheerio.load(response.data);

      const videoId = $("input#video-id").val()?.toString();
      const rawTitle =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().trim();
      const image = $('meta[property="og:image"]').attr("content") || "";
      const synopsis =
        $('meta[property="og:description"]').attr("content") || "";

      const cleanTitle = rawTitle
        .split(
          /\s*(?:\(\d{4}\)|s\d{1,2}e\d{1,3}|s\d{1,2}|season|episode|720p|1080p|web-dl|dual|hindi|english|bluray|cam|hdts|hdrip|\[)/i
        )[0]
        .replace(/[-|:|–]$/, "")
        .trim();

      const isSeries = /s(\d{1,2})e(\d{1,3})|s(\d{1,2})|e(\d{1,3})/i.test(
        rawTitle.toLowerCase()
      );

      const result: Info = {
        title: cleanTitle,
        synopsis: synopsis,
        image: image,
        imdbId: "",
        type: isSeries ? "series" : "movie",
        linkList: [],
      };

      if (isSeries && videoId) {
        return axios
          .get(`${baseUrl}/ajax/episodes.php?video_id=${videoId}`, { headers })
          .then((epRes) => {
            const epData = epRes.data;
            if (epData && Array.isArray(epData.episodes)) {
              const seasons = new Set<number>();
              epData.episodes.forEach((ep: any) => {
                const match = ep.title.match(/s(\d{1,2})/i);
                if (match) seasons.add(parseInt(match[1]));
              });

              Array.from(seasons)
                .sort((a, b) => a - b)
                .forEach((s) => {
                  result.linkList.push({
                    title: `Season ${s}`,
                    quality: "HD",
                    episodesLink: `season:${s}:vd:${videoId}`,
                  });
                });
            }
            return result;
          })
          .catch((err) => {
            // Series endpoint failed, return what we have (likely empty)
            return result;
          });
      } else if (videoId) {
        // MOVIE LOGIC
        return axios
          .get(`${baseUrl}/ajax/resolution_switcher.php?video_id=${videoId}`, {
            headers,
          })
          .then((resSwitcher) => {
            const resData = resSwitcher.data;
            const sources = [
              ...(resData.current || []),
              ...(resData.popup || []),
            ];

            sources.forEach((item: any) => {
              if (item.url) {
                const fullLink = item.url.startsWith("http")
                  ? item.url
                  : `${baseUrl}${item.url.startsWith("/") ? "" : "/"}${item.url}`;
                result.linkList.push({
                  title: `Play ${item.res || "HD"}`,
                  quality: item.res || "HD",
                  episodesLink: fullLink.trim(),
                });
              }
            });
          })
          .catch((e) => {
            // 404 or other error on switcher: ignore and proceed to fallback
            // console.error("FibDrama: Switcher failed", e);
          })
          .then(() => {
            // FALLBACK: Red Button (buttonDownloadnew)
            if (result.linkList.length === 0) {
              const downloadOnclick = $(
                "a.hidden-button.buttonDownloadnew"
              ).attr("onclick");
              const match = downloadOnclick?.match(/url=(.*?)',/);
              if (match?.[1]) {
                const rawUrl = match[1].trim();
                const fullLink = rawUrl.startsWith("http")
                  ? rawUrl
                  : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

                if (fullLink) {
                  result.linkList.push({
                    title: "Play Movie",
                    quality: "Multi",
                    episodesLink: fullLink,
                  });
                }
              }
            }
            return result;
          });
      }

      return Promise.resolve(result);
    });
  });
};