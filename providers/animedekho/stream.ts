import { ProviderContext, Stream } from "../types";

const BASE_URL = "https://animedekho.app";

const headers = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
};

export const getStream = function ({
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
  const streams: Stream[] = [];

  // 1. Fetch the page to get the ID
  return axios
    .get(link, { headers: { ...headers, Referer: link }, signal })
    .then((res: any) => {
      const $ = cheerio.load(res.data);

      const bodyClass = $("body").attr("class") || "";
      const idMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
      const termId = idMatch ? idMatch[1] : null;

      if (!termId) {
        console.log("Animedekho: No postid/term found");
        return [];
      }

      const trType = type === "movie" ? 1 : 2;
      const promises = [];

      // Loop 0..10 to fetch server iframes
      for (let i = 0; i <= 10; i++) {
        const iframeUrl = `${BASE_URL}/?trdekho=${i}&trid=${termId}&trtype=${trType}`;

        const p = axios
          .get(iframeUrl, { headers, signal })
          .then((iframeRes: any) => {
            const $$ = cheerio.load(iframeRes.data);
            const src = $$("iframe").attr("src");

            if (!src) return;

            // ===========================
            // 1. STRMUP EXTRACTION
            // ===========================
            if (src.indexOf("strmup.to") > -1) {
              const codeMatch = src.match(/strmup\.to\/([a-zA-Z0-9]+)/);
              const fileCode = codeMatch ? codeMatch[1] : null;

              if (fileCode) {
                const apiUrl = `https://strmup.to/ajax/stream?filecode=${fileCode}`;
                return axios
                  .get(apiUrl, { headers: headers, signal })
                  .then((apiRes: any) => {
                    const data = apiRes.data;
                    if (data && data.streaming_url) {
                      streams.push({
                        server: `StrmUp (Server ${i + 1})`,
                        link: data.streaming_url,
                        type: "m3u8",
                        headers: { "Referer": "https://strmup.to/" }
                      });
                    }
                  })
                  .catch(() => {
                    // Extraction failed; skip.
                  });
              }
            }

            // ===========================
            // 2. VIDCLOUD / UPNS
            // ===========================
            else if (src.indexOf("vidcloud.upns.ink") > -1) {
              const hashParts = src.split("#");
              const id = hashParts.length > 1 ? hashParts[1] : null;

              if (id) {
                const timestamp = Math.floor(Date.now() / 1000);
                const m3u8Url = `https://spuc.satoriwell.online/v4/lf/${id}/cf-master.${timestamp}.txt`;

                streams.push({
                  server: `VidCloud (Server ${i + 1})`,
                  link: m3u8Url,
                  type: "m3u8",
                  headers: {
                    "Referer": "https://vidcloud.upns.ink/",
                    "Origin": "https://vidcloud.upns.ink",
                    "User-Agent": headers["User-Agent"],
                    "Accept": "*/*"
                  }
                });
              }
            }

            // ===========================
            // 3. VIDMOLY EXTRACTION
            // ===========================
            else if (src.indexOf("vidmoly.net") > -1) {
               return axios.get(src, { headers, signal }).then((vmRes: any) => {
                  let pageBody = vmRes.data;
                  const tokenMatch = pageBody.match(/\?g=([a-zA-Z0-9]+)/);
                  
                  let nextPromise = Promise.resolve(vmRes); 
                  if (tokenMatch) {
                      const token = tokenMatch[1];
                      nextPromise = axios.get(src + "?g=" + token, { headers, signal });
                  }

                  return nextPromise.then((finalRes: any) => {
                      const finalBody = finalRes.data;
                      const fileMatch = finalBody.match(/file\s*:\s*"([^"]+)"/);
                      if (fileMatch) {
                          streams.push({
                              server: `Vidmoly (Server ${i + 1})`,
                              link: fileMatch[1],
                              type: "m3u8",
                              headers: { "Referer": "https://vidmoly.net/", "User-Agent": headers["User-Agent"] }
                          });
                      }
                  });
               }).catch(() => {
                  // Extraction failed; skip.
               });
            }

            // ===========================
            // 4. BLAKITE (RUMBLE)
            // ===========================
            else if (src.indexOf("blakiteapi.xyz") > -1) {
              const parts = src.split("/embed/");
              if (parts.length > 1) {
                const idParts = parts[1].split("/");
                if (idParts.length >= 2) {
                  const tmdbId = idParts[0];
                  const id = idParts[1];
                  const apiUrl = `https://blakiteapi.xyz/api/get.php?id=${id}&tmdbId=${tmdbId}`;

                  return axios.get(apiUrl, { headers, signal }).then((apiRes: any) => {
                    const data = apiRes.data;
                    if (data && data.success && data.data && data.data.dataId) {
                      const videoUrl = `https://hugh.cdn.rumble.cloud/video/${data.data.dataId}.caa.mp4`;
                      streams.push({
                        server: `Blakite (Server ${i + 1})`,
                        link: videoUrl,
                        type: "mp4",
                        headers: { "User-Agent": headers["User-Agent"] }
                      });
                    }
                  }).catch(() => {
                      // Extraction failed; skip.
                  });
                }
              }
            }

            // ===========================
            // 5. TURBOVID EXTRACTION
            // ===========================
            else if (src.indexOf("turbovidhls.com") > -1) {
                return axios.get(src, { headers, signal }).then((res: any) => {
                    const m3u8Match = res.data.match(/(https?:\/\/[^"']+\.m3u8)/);
                    if (m3u8Match) {
                        streams.push({
                            server: `TurboVid (Server ${i + 1})`,
                            link: m3u8Match[1],
                            type: "m3u8",
                            headers: { 
                                "Referer": "https://turbovidhls.com/",
                                "User-Agent": headers["User-Agent"]
                            }
                        });
                    }
                }).catch(() => {
                    // Extraction failed; skip.
                });
            }

            // ===========================
            // 6. ANIMEDEKHO VIDSRC EXTRACTION
            // ===========================
            else if (src.indexOf("/aaa/ad/vidsrc/") > -1) {
                return axios.get(src, { headers, signal }).then((vRes: any) => {
                    const $v = cheerio.load(vRes.data);
                    
                    $v("#sourceSelector option").each((_: any, el: any) => {
                        const vidUrl = $v(el).attr("value");
                        const label = $v(el).attr("data-label") || `Option ${_ + 1}`;
                        
                        if (vidUrl) {
                            streams.push({
                                server: `VidSrc ${i+1} (${label})`,
                                link: vidUrl,
                                type: vidUrl.includes(".m3u8") ? "m3u8" : "mp4",
                                headers: { "User-Agent": headers["User-Agent"] }
                            });
                        }
                    });
                }).catch(() => {
                    // Extraction failed; skip.
                });
            }

            // ===========================
            // 7. PIXELDRAIN EXTRACTION
            // ===========================
            else if (src.indexOf("/aaa/pixel/") > -1) {
                // Link format: https://animedekho.app/aaa/pixel/?slug=6e4Whsgw
                const slugMatch = src.match(/slug=([a-zA-Z0-9]+)/);
                const slug = slugMatch ? slugMatch[1] : null;

                if (slug) {
                    const directUrl = `https://pixeldrain.net/api/file/${slug}`;
                    streams.push({
                        server: `PixelDrain (Server ${i + 1})`,
                        link: directUrl,
                        type: "", // Direct file
                        headers: { "User-Agent": headers["User-Agent"] }
                    });
                }
            }

            // ===========================
            // 8. FALLBACK (None)
            // ===========================
            // We do not add generic iframes anymore.
          })
          .catch(() => {
            // Ignore individual server failures
          });

        promises.push(p);
      }

      return Promise.all(promises).then(() => streams);
    })
    .catch((err: any) => {
      console.error("Animedekho getStream error:", err.message || err);
      return [];
    });
};