import { ProviderContext, Stream } from "../types";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://bollydrive.baby/",
};

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, extractors } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const streamLinks: Stream[] = [];

    // 1. Fetch the BollyDrive Landing Page
    const bollyRes = await axios.get(link, { headers, signal });
    const $bolly = cheerio.load(bollyRes.data);

    // 2. Extract HubCloud Link
    const hubcloudUrl = $bolly('button.btn-hcloud').attr('data-href');
    if (hubcloudUrl) {
      console.log("Found HubCloud:", hubcloudUrl);
      const hubStreams = await hubcloudExtracter(hubcloudUrl, signal);
      streamLinks.push(...hubStreams);
    }

    // 3. Extract GDFlix -> PixelDrain/Cloud Links
    const gdflixUrl = $bolly('button.btn-warning').attr('data-href');
    if (gdflixUrl) {
      try {
        console.log("Scraping GDFlix:", gdflixUrl);
        const gdRes = await axios.get(gdflixUrl, { headers, signal });
        const $gd = cheerio.load(gdRes.data);

        // A. Extract Cloud Download [R2]
        const cloudLink = $gd('a:contains("CLOUD DOWNLOAD")').attr('href');
        if (cloudLink) {
          streamLinks.push({
            server: "Cloud R2",
            link: cloudLink,
            type: "mkv",
          });
        }

        // B. Extract PixelDrain and Convert to API Link
        const pixelRaw = $gd('a[href*="pixeldrain.dev/u/"]').attr('href');
        if (pixelRaw) {
          // Convert https://pixeldrain.dev/u/ID to https://pixeldrain.dev/api/file/ID
          const pixelApiLink = pixelRaw.replace("/u/", "/api/file/");
          streamLinks.push({
            server: "PixelDrain",
            link: pixelApiLink,
            type: "mkv",
          });
        }
      } catch (gdErr) {
        console.error("GDFlix Scrape Error:", gdErr);
      }
    }

    // 4. Fallback for generic filepress or other links if needed
    const filepressUrl = $bolly('button.btn-primary').attr('data-href');
    if (filepressUrl && streamLinks.length === 0) {
        // You can add your existing filepress logic here if required
    }

    return streamLinks;

  } catch (error: any) {
    console.log("getStream error: ", error);
    return [];
  }
}