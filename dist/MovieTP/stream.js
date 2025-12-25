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
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        const { axios, cheerio } = providerContext;
        try {
            const response = yield axios.get(link, { headers });
            const html = response.data;
            const $ = cheerio.load(html);
            const streamLinks = [];
            // 1️⃣ Try PixelDrain Direct Link
            const pixelHref = $("a[href*='pixeldrain.dev/api/file/']").attr("href");
            if (pixelHref) {
                const finalUrl = pixelHref.startsWith("http")
                    ? pixelHref
                    : `https://${pixelHref.replace(/^\/+/, "")}`;
                streamLinks.push({
                    server: "PixelDrain",
                    link: finalUrl,
                    type: "mkv",
                });
                return streamLinks;
            }
            // 2️⃣ Try Instant BusyCDN link (fallback)
            const busyHref = $("a[href*='instant.busycdn.cfd']").attr("href");
            if (busyHref) {
                const busyUrl = busyHref.startsWith("http")
                    ? busyHref
                    : `https://${busyHref.replace(/^\/+/, "")}`;
                const busyPage = yield axios.get(busyUrl, { headers });
                const _$ = cheerio.load(busyPage.data);
                // 3️⃣ Extract Google video download link from div.vd
                let googleHref = _$("div.vd a#vd").attr("href");
                // Backup regex
                if (!googleHref) {
                    const regex = /(https?:\/\/video-downloads\.googleusercontent\.com\/[A-Za-z0-9_\-\?=]+)/;
                    const match = busyPage.data.match(regex);
                    googleHref = match ? match[0] : null;
                }
                if (googleHref) {
                    const finalGoogleUrl = googleHref.startsWith("http")
                        ? googleHref
                        : `https://${googleHref.replace(/^\/+/, "")}`;
                    streamLinks.push({
                        server: "GoogleVideo",
                        link: finalGoogleUrl,
                        type: "mkv",
                    });
                    return streamLinks;
                }
            }
            return [];
        }
        catch (error) {
            console.error("getStream error:", error);
            return [];
        }
    });
}
