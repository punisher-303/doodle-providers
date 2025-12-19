import { ProviderContext } from "../types";

<<<<<<< HEAD
interface EpisodeLink {
  title: string;
  link: string;
}

export const getEpisodes = function ({
  url,
  providerContext,
}: {
  url: string;
  providerContext: ProviderContext;
}): Promise<EpisodeLink[]> {
  const { axios, cheerio, commonHeaders } = providerContext;

  return axios
    .get(url, { headers: commonHeaders })
    .then((res: any) => {
      const $ = cheerio.load(res.data);
      const episodePages: { title: string; page: string }[] = [];

      // =====================================================
      // STEP 1️⃣ : SERIES PAGE → EPISODE PAGES
      // =====================================================
      $("#episode_by_temp li").each((_, el) => {
        const card = $(el);

        const title =
          card.find("h2.entry-title").text().trim() ||
          card.find(".num-epi").text().trim();

        let page = card.find("a.lnk-blk").attr("href") || "";
        if (page) {
          if (page.startsWith("//")) page = "https:" + page;
          episodePages.push({ title, page });
        }
      });

      // =====================================================
      // STEP 2️⃣ : IF DIRECT EPISODE PAGE
      // =====================================================
      if (episodePages.length === 0) {
        return resolveEpisodeStream(
          url,
          axios,
          cheerio,
          commonHeaders,
          "Play"
        ).then((r) => (r ? [r] : []));
      }

      // =====================================================
      // STEP 3️⃣ : VISIT EACH EPISODE PAGE
      // =====================================================
      const tasks = episodePages.map((ep) =>
        resolveEpisodeStream(
          ep.page,
          axios,
          cheerio,
          commonHeaders,
          ep.title
        )
      );

      return Promise.all(tasks).then((all) =>
        all.filter(Boolean) as EpisodeLink[]
      );
    })
    .catch((err: any) => {
      console.log("episodes error:", err);
      return [];
    });
};

// =====================================================
// 🔥 CORE: 2-STEP IFRAME RESOLVER
// =====================================================
function resolveEpisodeStream(
  episodePage: string,
  axios: any,
  cheerio: any,
  headers: any,
  title: string
): Promise<EpisodeLink | null> {
  return axios
    .get(episodePage, { headers })
    .then((res: any) => {
      const $ = cheerio.load(res.data);

      // 1️⃣ FIRST IFRAME (toonstream embed)
      let embed =
        $("section.player iframe").first().attr("src") ||
        $("iframe").first().attr("src") ||
        "";

      if (!embed) return null;
      if (embed.startsWith("//")) embed = "https:" + embed;

      // 2️⃣ OPEN EMBED PAGE
      return axios.get(embed, { headers }).then((embedRes: any) => {
        const $$ = cheerio.load(embedRes.data);

        // ✅ REAL STREAM IFRAME
        let stream = $$(".Video iframe").attr("src") || "";
        if (!stream) return null;

        if (stream.startsWith("//")) stream = "https:" + stream;

        return {
          title,
          link: stream,
        };
      });
    })
    .catch(() => null);
=======
export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}) {
  const { axios, cheerio, extractors, commonHeaders: headers } = providerContext;
  const { hubcloudExtracter } = extractors;

  try {
    const res = await axios.get(link, { headers, signal });
    const $ = cheerio.load(res.data);

    const streamLinks: { title: string; link: string; type: string; quality?: string }[] = [];

    // --- 1. Episodes
    $('a:contains("Episode"), a:contains("EPiSODE")').each((_, el) => {
      const epLink = $(el).attr("href");
      const epTitle = $(el).text().trim();
      if (!epLink) return;

      streamLinks.push({
        title: epTitle,
        link: epLink.startsWith("http") ? epLink : new URL(epLink, link).href,
        type: "episode",
      });
    });

    // --- 2. Movies / Quality links
    $('a')
      .filter((_, el) => /480|720|1080|2160|4K|mp4|m3u8/i.test($(el).text()))
      .each((_, el) => {
        const qLink = $(el).attr("href");
        if (!qLink) return;

        const quality = $(el).text().match(/\b(480p|720p|1080p|2160p|4K|mp4|m3u8)\b/i)?.[0] || "";

        streamLinks.push({
          title: $(el).text().trim() || "Movie",
          link: qLink.startsWith("http") ? qLink : new URL(qLink, link).href,
          type: "movie",
          quality,
        });
      });

    // --- 3. JS / HubCloud / encrypted streaming
    const scriptData = $("script")
      .map((i, el) => $(el).html())
      .get()
      .join(" ");

    const encryptedMatches = scriptData.match(/s\('o','(.+?)',180\)/);
    if (encryptedMatches?.[1]) {
      const decoded: any = decodeString(encryptedMatches[1]);
      const hubLink = decoded?.o ? atob(decoded.o) : null;

      if (hubLink) {
        const resolvedLinks = await hubcloudExtracter(hubLink, signal);
        streamLinks.push(...resolvedLinks.map((l: any) => ({ ...l, type: "movie" })));
      }
    }

    return streamLinks;
  } catch (err) {
    console.error("❌ RareAnimes stream fetch error:", err);
    return [];
  }
}

// --- Helpers ---
function decodeString(encryptedString: string): any {
  try {
    let decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Error decoding string:", err);
    return null;
  }
}

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const charCode = char.charCodeAt(0);
    const isUpper = char >= "A" && char <= "Z";
    const base = isUpper ? 65 : 97;
    return String.fromCharCode(((charCode - base + 13) % 26) + base);
  });
>>>>>>> 7f000b622e14a4045c1d1bf3af4fa78965b8b3b3
}
