import { ProviderContext, Stream } from "../types";

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};

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
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const streamLinks: Stream[] = [];

    // Fetch the movie page
    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    const downloadLinks: string[] = [];

    // Strategy 1: Look for "Download" text in links
    $("a").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (href && (text.includes("Download") || text.includes("Drive") || href.includes("hubcloud") || href.includes("gdflix"))) {
        // Filter out internal links or unrelated downloads if necessary
        if (href.startsWith("http")) {
          downloadLinks.push(href);
        }
      }
    });

    // Strategy 2: Look for specific classes if Strategy 1 yields nothing (fallback)
    if (downloadLinks.length === 0) {
      $(".download-link, .dlink").each((_, el) => {
        const href = $(el).attr("href");
        if (href) downloadLinks.push(href);
      });
    }

    // Resolve links
    const uniqueLinks = [...new Set(downloadLinks)];
    console.log("Found links:", uniqueLinks);

    for (const dLink of uniqueLinks) {
      // We rely on hubcloudExtracter to handle supported hosts (hubcloud, gdflix, etc.)
      // It returns an array of streams.
      try {
        const streams = await hubcloudExtracter(dLink, signal);
        if (streams && streams.length > 0) {
          streamLinks.push(...streams);
        }
      } catch (e) {
        console.log(`Error extracting from ${dLink}:`, e);
      }
    }

    return streamLinks;

  } catch (error: any) {
    console.log("getStream error: ", error);
    return [];
  }
}