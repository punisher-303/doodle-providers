import { Info, ProviderContext } from "../types";
import { MovieBoxClient } from "./client";

function resolveValue(data: any[], value: any): any {
  if (Array.isArray(value)) {
    return value.map((v) => {
      const target = typeof v === "number" ? data[v] : v;
      return resolveValue(data, target);
    });
  } else if (typeof value === "object" && value !== null) {
    const processedValue: any = {};
    for (const k in value) {
      const v = value[k];
      const target = typeof v === "number" ? data[v] : v;
      processedValue[k] = resolveValue(data, target);
    }
    return processedValue;
  }
  return value;
}

export async function getMetaData({
  link,
  providerContext,
}: {
  link: string;
  provider: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const client = new MovieBoxClient(providerContext.axios);
  const { cheerio } = providerContext;

  // link format: movieboxapi://${item.detailPath}?id=${item.subjectId}
  const url = link.replace("movieboxapi://", "https://h5.aoneroom.com/detail/");

  try {
    const response = await providerContext.axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        }
    });
    const $ = cheerio.load(response.data);
    let script = $('script[type="application/json"]').text();
    
    if (!script) {
        // Fallback: look for any script containing resData
        $('script').each((i, el) => {
            const text = $(el).text();
            if (text.includes('resData')) {
                script = text;
                return false; // break
            }
        });
    }

    if (!script) {
        throw new Error("MovieBox: Metadata script not found");
    }

    let rawData: any;
    try {
        rawData = JSON.parse(script);
    } catch (e) {
        // Nuxt might have window.__NUXT__ around it or other garbage
        const match = script.match(/\[[\s\S]*\]/);
        if (match) {
            try {
                rawData = JSON.parse(match[0]);
            } catch (e2) {
                throw new Error("MovieBox: Failed to parse script JSON");
            }
        } else {
            throw new Error("MovieBox: Script is not a JSON array");
        }
    }
    let extracted: any = null;

    // Logic from moviebox-api JsonDetailsExtractor
    const extracts: any[] = [];
    for (const entry of rawData) {
        if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
            const details: any = {};
            for (const key in entry) {
                details[key] = resolveValue(rawData, rawData[entry[key]]);
            }
            extracts.push(details);
        }
    }

    if (extracts.length > 0) {
        // console.log("MovieBox: Found extracts", extracts.length);
        const state = extracts[0].state;
        if (state && Array.isArray(state) && state.length > 1) {
            const targetData = state[1];
            extracted = {};
            for (const key in targetData) {
                const cleanKey = key.substring(2);
                extracted[cleanKey] = targetData[key];
            }
        }
    }

    if (!extracted || !extracted.resData) {
        console.error("MovieBox: extracted keys:", extracted ? Object.keys(extracted) : "null");
        if (extracts.length > 0) {
            console.error("MovieBox: extracts[0] keys:", Object.keys(extracts[0]));
        }
        throw new Error("MovieBox: Failed to extract resData");
    }

    const { resData } = extracted;
    const { subject, metadata, resource, stars } = resData;

    return {
      title: subject.title,
      image: subject.cover?.url || "",
      synopsis: metadata.description || subject.description || "",
      imdbId: "", // MovieBox search might not have it directly, but meta might
      type: subject.subjectType === 1 ? "movie" : "series",
      cast: stars?.map((s: any) => ({
        id: s.starId,
        name: s.name,
        character: s.character,
        image: s.avatar?.url || "",
      })) || [],
      linkList: [
        {
          title: "Default",
          directLinks: [
            {
              title: "MovieBox Pro",
              link: link, // Pass it to GetStream
              type: subject.subjectType === 1 ? "movie" : "series",
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error("MovieBox: getMetaData error", error);
    throw error;
  }
}
