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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        const { axios, cheerio, extractors } = providerContext;
        const { hubcloudExtracter } = extractors;
        try {
            const streamLinks = [];
            const response = yield axios.get(link, { headers });
            const $ = cheerio.load(response.data);
            // --- PixelDrain link scrape ---
            $("a[href*='pixeldrain.dev/api/file/']").each((_, el) => {
                var _a;
                const href = (_a = $(el).attr("href")) === null || _a === void 0 ? void 0 : _a.trim();
                if (href) {
                    streamLinks.push({
                        server: "pixeldrain",
                        link: href,
                        type: "mp4",
                    });
                }
            });
            // --- hubcloud extraction ---
            const hubcloudStreams = yield hubcloudExtracter(link, signal);
            streamLinks.push(...hubcloudStreams);
            return streamLinks;
        }
        catch (error) {
            console.log("getStream error: ", error);
            return [];
        }
    });
}
