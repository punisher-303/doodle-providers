import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";


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
    "xla=s4t; _ga=GA1.1.1081149560.1756378968; _ga_BLZGKYN5PF=GS2.1.s1756378968$o1$g1$t1756378984$j44$l0$h0",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
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
  const { axios, cheerio, } = providerContext;

  try {
    const streamLinks: Stream[] = [];

    // 1) Load page to extract CSRF token
    const pageRes = await axios.get(link, { headers, signal });
    const html = pageRes.data;
    const $ = cheerio.load(html);

    // ---- DYNAMIC CSRF TOKEN DETECTION ----
    const csrfInput = $("input[name^='_csrf']");
    const csrfName = csrfInput.attr("name");
    const csrfValue = csrfInput.val();

    if (!csrfName || !csrfValue) {
      console.warn("Dynamic CSRF token not found");
      return [];
    }

    // 2) POST request with dynamic CSRF field
    const formData = new URLSearchParams();
    formData.append(csrfName, csrfValue as string);

    const unlockRes = await axios.post(link, formData, {
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal,
    });

    const unlockedHTML = unlockRes.data;
    const $$ = cheerio.load(unlockedHTML);

    // 3) Extract HubCloud link after unlock
    let hubcloudLink = "";
    const match = unlockedHTML.match(
      /https?:\/\/hubcloud\.(fit|foo)\/video\/[a-zA-Z0-9_]+/i
    );
    if (match) hubcloudLink = match[0];

    if (!hubcloudLink) {
      $$("a[href*='hubcloud']").each((_, el) => {
        const href = $$(el).attr("href");
        if (href) {
          hubcloudLink = href;
          return false; // break
        }
      });
    }

    if (!hubcloudLink) {
      console.warn("HubCloud link not found after unlock");
      return [];
    }

    // 4) Extract stream from HubCloud extractor
    const hubcloudStreams = await hubcloudExtractor(hubcloudLink, signal, axios, cheerio, headers);

    if (Array.isArray(hubcloudStreams)) {
      streamLinks.push(...hubcloudStreams);
    } else if (hubcloudStreams) {
      streamLinks.push({
        server: "hubcloud",
        link: hubcloudStreams,
        type: "mp4",
      });
    }

    return streamLinks;
  } catch (err: any) {
    console.error("getStream error:", err.message);
    return [];
  }
}
