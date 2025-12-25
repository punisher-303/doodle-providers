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
// 🌍 CORS PROXY
const withProxy = (url) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        const { axios, cheerio, commonHeaders: headers } = providerContext;
        if (!url || !url.includes("watching.html")) {
            console.warn("❌ Not a watch link:", url);
            return [];
        }
        try {
            console.log("▶️ Fetching WATCH video from:", url);
            const res = yield axios.get(withProxy(url), { headers });
            const $ = cheerio.load(res.data || "");
            // ✅ ONLY iframe-embed
            const videoSrc = $("#iframe-embed").attr("src") ||
                $("#iframe-embed").attr("data-src");
            if (!videoSrc) {
                console.warn("❌ No video iframe found");
                return [];
            }
            return [
                {
                    title: "Play",
                    link: videoSrc, // ✅ DIRECT VIDEO LINK
                },
            ];
        }
        catch (err) {
            console.error("❌ Episodes fetch error:", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
