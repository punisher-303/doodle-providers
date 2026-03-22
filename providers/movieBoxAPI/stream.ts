import { Stream, ProviderContext } from "../types";
import { MovieBoxClient } from "./client";

export async function getStream({
  link,
  type,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Stream[]> {
  const client = new MovieBoxClient(providerContext.axios);
  const detailPath = link.split("?")[0].replace("movieboxapi://", "");
  const urlParams = new URLSearchParams(link.split("?")[1]);
  const subjectId = urlParams.get("id");
  const subjectType = urlParams.get("type");

  if (!subjectId) {
    throw new Error("MovieBox: subjectId not found in link");
  }

  // For movies (type 1), se and ep are normally 0
  // For TV series (type 2), use the values from context or link
  const context = providerContext as any;
  const se = urlParams.get("se") || (subjectType === "1" ? (context?.season ?? 0) : (context?.season ?? 1));
  const ep = urlParams.get("ep") || (subjectType === "1" ? (context?.episode ?? 0) : (context?.episode ?? 1));

  try {
    // Using lok-lok.cc as it was verified to return streams for free users
    const playUrl = "https://lok-lok.cc/wefeed-h5api-bff/subject/play";
    
    // Construct Referer similar to what the browser does
    const referer = `https://lok-lok.cc/spa/videoPlayPage/${subjectType === "1" ? "movies" : "tv"}/${detailPath}?id=${subjectId}&type=${subjectType === "1" ? "/movie/detail" : "/tv/detail"}&lang=en`;

    const data = await client.getFromApi(playUrl, {
      subjectId,
      se,
      ep,
      detailPath
    }, {
      Referer: referer,
      "X-Client-Info": JSON.stringify({ timezone: "Asia/Calcutta" })
    });

    const streams: Stream[] = [];

    if (data.streams) {
      data.streams.forEach((s: any) => {
        streams.push({
          name: `MovieBox Pro - ${s.resolutions}p`,
          server: "MovieBox",
          link: s.url,
          type: "file",
          quality: s.resolutions.toString(),
        });
      });
    }

    if (data.hls && data.hls.length > 0) {
        data.hls.forEach((h: any, index: number) => {
             streams.push({
                name: `MovieBox Pro - HLS ${index + 1}`,
                server: "MovieBox HLS",
                link: h.playUrl || h.url,
                type: "hls",
            });
        });
    }

    return streams;
  } catch (error) {
    console.error("MovieBox: getStream error", error);
    return [];
  }
}
