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
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://dramafull.cc/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, signal, providerContext, }) {
        var _b, _c;
        const { axios } = providerContext;
        try {
            /**
             * STEP 1: Load watch page
             */
            const watchRes = yield axios.get(link, {
                headers,
                signal,
            });
            const html = watchRes.data;
            /**
             * STEP 2: Extract signed API URL
             * window.signedUrl = "https://dramafull.cc/api/get-link/504936?...";
             */
            const signedUrlMatch = html.match(/window\.signedUrl\s*=\s*"([^"]+)"/);
            if (!signedUrlMatch)
                return [];
            const apiUrl = signedUrlMatch[1].replace(/\\\//g, "/");
            /**
             * STEP 3: Call signed API
             */
            const apiRes = yield axios.get(apiUrl, {
                headers,
                signal,
            });
            const data = apiRes.data;
            if (!(data === null || data === void 0 ? void 0 : data.success) || !data.video_source)
                return [];
            const streams = [];
            /**
             * STEP 4: Build stream list
             */
            for (const [quality, videoUrl] of Object.entries(data.video_source)) {
                streams.push({
                    server: "dramafull-sharepoint",
                    link: videoUrl,
                    type: "mp4",
                    subtitles: (_c = (_b = data.sub) === null || _b === void 0 ? void 0 : _b[quality]) === null || _c === void 0 ? void 0 : _c.map((sub) => ({
                        lang: "en",
                        url: `https://dramafull.cc${sub}`,
                    })),
                });
            }
            return streams;
        }
        catch (err) {
            console.error("getStream error:", err.message);
            return [];
        }
    });
}
