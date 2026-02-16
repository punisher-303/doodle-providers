import { Info, ProviderContext } from "../types";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://fibwatch.biz/",
};

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { getBaseUrl, axios, cheerio } = providerContext;
  const baseUrl = await getBaseUrl("fibwatch");

  const response = await axios.get(link, { headers });
  const $ = cheerio.load(response.data);

  const videoId = $("input#video-id").val()?.toString();
  const rawTitle = $('meta[property="og:title"]').attr("content") || $("title").text().trim();
  const image = $('meta[property="og:image"]').attr("content") || "";
  const synopsis = $('meta[property="og:description"]').attr("content") || "";

  // --- 1. CLEAN TITLE LOGIC ---
  // Removes: (2024), S01E01, Season 1, 720p, WEB-DL, Dual Audio, etc.
  const cleanTitle = rawTitle
    .split(/\s*(?:\(\d{4}\)|s\d{1,2}e\d{1,3}|s\d{1,2}|season|episode|720p|1080p|web-dl|dual|hindi|english|bluray|cam|hdts|hdrip|\[)/i)[0]
    .replace(/[-|:|–]$/, "") // Remove trailing separators
    .trim();

  // --- 2. TYPE DETECTION ---
  // Following Kotlin logic: checks for season (s01) or episode (e01) markers
  const isSeries = /s(\d{1,2})e(\d{1,3})|s(\d{1,2})|e(\d{1,3})/i.test(rawTitle.toLowerCase());

  const result: Info = {
    title: cleanTitle,
    synopsis: synopsis,
    image: image,
    imdbId: "",
    type: isSeries ? "series" : "movie",
    linkList: [],
  };

  if (isSeries && videoId) {
    // --- SERIES LOGIC: Aggregating Seasons ---
    const epRes = await axios.get(`${baseUrl}/ajax/episodes.php?video_id=${videoId}`, { headers });
    const epData = epRes.data;

    if (epData && Array.isArray(epData.episodes)) {
      const seasons = new Set<number>();
      epData.episodes.forEach((ep: any) => {
        const match = ep.title.match(/s(\d{1,2})/i);
        if (match) seasons.add(parseInt(match[1]));
      });

      Array.from(seasons).sort((a, b) => a - b).forEach(s => {
        result.linkList.push({
          title: `Season ${s}`,
          quality: "HD",
          episodesLink: `season:${s}:vd:${videoId}`,
        });
      });
    }
  } else if (videoId) {
    // --- MOVIE LOGIC: Server buttons appear directly as "Play" buttons ---
    const resSwitcher = await axios.get(`${baseUrl}/ajax/resolution_switcher.php?video_id=${videoId}`, { headers });
    const resData = resSwitcher.data; 

    // Combine current and popup sources as found in the Kotlin load logic
    const sources = [...(resData.current || []), ...(resData.popup || [])];

    sources.forEach((item: any) => {
      if (item.url) {
        const fullLink = item.url.startsWith("http") ? item.url : `${baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`;
        result.linkList.push({
          title: `Play ${item.res || "HD"}`, // Shows as "Play 720p", "Play 480p", etc.
          quality: item.res || "HD",
          episodesLink: fullLink.trim(),
        });
      }
    });

    // Fallback: Check for the "Red Button" onclick logic from the Kotlin loadLinks function
    if (result.linkList.length === 0) {
      const downloadOnclick = $("a.hidden-button.buttonDownloadnew").attr("onclick");
      const match = downloadOnclick?.match(/url=(.*?)',/);
      if (match?.[1]) {
        const rawUrl = match[1].trim();
        const fullLink = rawUrl.startsWith("http") ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
        result.linkList.push({
          title: "Play Movie",
          quality: "Multi",
          episodesLink: fullLink,
        });
      }
    }
  }

  return result;
};