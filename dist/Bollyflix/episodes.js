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
exports.getEpisodes = void 0;
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        const { axios, cheerio, commonHeaders } = providerContext;
        console.log("🎬 Fetching episode links from:", url);
        // ✅ Custom realistic headers for better Cloudflare compatibility
        const headers = Object.assign(Object.assign({}, commonHeaders), { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", "Accept-Language": "en-US,en;q=0.9", "Cache-Control": "no-cache", DNT: "1", Referer: url, "Upgrade-Insecure-Requests": "1", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not=A?Brand";v="99"', "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"', Cookie: "prefetchAd_8508552=true; _ga=GA1.1.1001107919.1762037833; _ga_7YXLT91MT2=GS2.1.s1762037832$o1$g1$t1762037851$j41$l0$h0" });
        try {
            // Step 1️⃣: Fetch main episode page
            const res = yield axios.get(url, { headers });
            const $ = cheerio.load(res.data);
            // Step 2️⃣: Locate all V-Cloud buttons
            const episodes = [];
            // Finds all anchor tags whose href contains "/reder.php?v="
            $('a[href*="/reder.php?v="]').each((index, element) => {
                const el = $(element);
                const relativeLink = el.attr("href");
                const baseUrl = new URL(url).origin;
                const vcloudLink = new URL(relativeLink !== null && relativeLink !== void 0 ? relativeLink : "", baseUrl).href;
                const title = "⚡ V-Cloud [Resumable]";
                episodes.push({
                    title,
                    link: vcloudLink,
                });
            });
            console.log(`✅ Found ${episodes.length} V-Cloud link(s).`);
            return episodes;
        }
        catch (err) {
            console.error("💥 getEpisodes error:", err.message);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
