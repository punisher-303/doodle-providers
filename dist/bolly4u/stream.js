"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = getStream;
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
};
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        const { axios, cheerio, extractors } = providerContext;
        const { hubcloudExtracter } = extractors;
        try {
            const streamLinks = [];
            console.log("Scraping page:", link);
            // Step 1: BollyDrive page fetch
            const pageRes = yield axios.get(link, { headers });
            const $ = cheerio.load(pageRes.data);
            // Step 2: Scrape H-Cloud button link
            let hubcloudLink = "";
            $("button, a").each((_, el) => {
                const $el = $(el);
                const onclick = $el.attr("onclick") || "";
                const text = ($el.text() || "").trim();
                if (text.includes("H-Cloud") && onclick.includes("window.open")) {
                    const match = onclick.match(/window\.open\(['"](.+?)['"]/);
                    if (match && match[1])
                        hubcloudLink = match[1];
                }
            });
            if (!hubcloudLink) {
                console.log("No H-Cloud link found on page");
                return [];
            }
            console.log("Found H-Cloud link:", hubcloudLink);
            // Step 3: Call hubcloudExtracter to get final download links
            const hubcloudStreams = yield hubcloudExtracter(hubcloudLink, signal);
            streamLinks.push(...hubcloudStreams);
            return streamLinks;
        }
        catch (error) {
            console.log("getStream error:", error);
            return [];
        }
    });
}
