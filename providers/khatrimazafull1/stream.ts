import { ProviderContext, Stream } from "../types";

/* ---------------- COMMON HEADERS ---------------- */
const commonHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
};

/* ---------------- GOFILE HEADERS (IMPORTANT) ---------------- */
const gofileHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  Referer: "https://gofile.io/",
  Accept: "*/*",
  "Accept-Encoding": "identity",
  Range: "bytes=0-",
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
  const { axios, cheerio } = providerContext;

  try {
    const streams: Stream[] = [];

    /* ---------- STEP 1: Load main page ---------- */
    const res = await axios.get(link, {
      headers: commonHeaders,
      signal,
    });

    const $ = cheerio.load(res.data || "");

    const links: string[] = [];

    /* ---------- STEP 2: Collect pixeldrain & gofile ---------- */
    $(".entry-content .well a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (
        href.includes("pixeldrain.com/u/") ||
        href.includes("gofile.io/d/")
      ) {
        links.push(href);
      }
    });

    /* ---------- STEP 3: Process links ---------- */
    for (const url of links) {
      /* ===== PIXELDRAIN ===== */
      if (url.includes("pixeldrain.com/u/")) {
        const fileId = url.split("/u/")[1];
        if (!fileId) continue;

        streams.push({
          server: "pixeldrain",
          type: "mkv",
          link: `https://pixeldrain.com/api/file/${fileId}`,
        });
      }

      /* ===== GOFILE ===== */
      if (url.includes("gofile.io/d/")) {
        const code = url.split("/d/")[1];
        if (!code) continue;

        try {
          const apiUrl = `https://api.gofile.io/contents/${code}?page=1&pageSize=1000`;
          const apiRes = await axios.get(apiUrl, {
            headers: commonHeaders,
            signal,
          });

          const data = apiRes.data;

          if (data?.status === "ok" && data?.data?.children) {
            const children = data.data.children;

            for (const key in children) {
              const file = children[key];
              if (!file?.link) continue;

              streams.push({
                server: "gofile",
                type: "mkv",
                link: file.link,
                headers: gofileHeaders, // 🔥 CRITICAL FIX
              });
            }
          }
        } catch (err) {
          console.log("Gofile API error:", err);
        }
      }
    }

    return streams;
  } catch (error) {
    console.log("getStream error:", error);
    return [];
  }
}
