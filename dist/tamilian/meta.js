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
exports.getMeta = void 0;
const headers = {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-store",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const BASE_URL = "https://tamilian.io";
const PROXY_URL = "https://api.allorigins.win/raw?url=";
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c, _d, _e;
        const { axios, cheerio } = providerContext;
        const empty = {
            title: "",
            synopsis: "",
            image: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };
        try {
            if (!link.startsWith("http"))
                return empty;
            // --------------------------------------------------
            // 1️⃣ Parse link & ajax param
            // --------------------------------------------------
            const urlObj = new URL(link);
            const ajaxPath = urlObj.searchParams.get("ajax"); // /ajax/movie_load_info/4723/
            if (!ajaxPath)
                return empty;
            const movieId = (_b = ajaxPath.match(/\/(\d+)\//)) === null || _b === void 0 ? void 0 : _b[1];
            if (!movieId)
                return empty;
            // --------------------------------------------------
            // 2️⃣ Load movie page (for title / image)
            // --------------------------------------------------
            const pageUrl = PROXY_URL + encodeURIComponent(urlObj.origin + urlObj.pathname);
            const pageRes = yield axios.get(pageUrl, { headers });
            const $page = cheerio.load(pageRes.data || "");
            const title = $page(".mvic-desc > h3").first().text().trim();
            const synopsis = $page(".mvic-desc .desc").first().text().trim();
            const posterStyle = $page(".thumb.mvic-thumb").attr("style") || "";
            const posterMatch = posterStyle.match(/url\((['"]?)(.*?)\1\)/);
            const image = (posterMatch === null || posterMatch === void 0 ? void 0 : posterMatch[2]) || "";
            // --------------------------------------------------
            // 3️⃣ Get servers list
            // --------------------------------------------------
            const serversApi = `${BASE_URL}/ajax/movie/episode/servers/${movieId}_1_full`;
            const serversRes = yield axios.get(PROXY_URL + encodeURIComponent(serversApi), { headers });
            const serversHtml = ((_c = serversRes.data) === null || _c === void 0 ? void 0 : _c.html) || "";
            if (!serversHtml)
                return empty;
            const $servers = cheerio.load(serversHtml);
            const directLinks = [];
            // --------------------------------------------------
            // 4️⃣ For each server → fetch source
            // --------------------------------------------------
            const serverEls = $servers("a[data-id][data-name]").toArray();
            for (const el of serverEls) {
                const serverId = $servers(el).attr("data-id");
                const serverName = $servers(el).attr("data-name");
                if (!serverId || !serverName)
                    continue;
                const sourceApi = `${BASE_URL}/ajax/movie/episode/server/sources/${serverId}_${serverName}`;
                try {
                    const sourceRes = yield axios.get(PROXY_URL + encodeURIComponent(sourceApi), { headers });
                    if (((_d = sourceRes.data) === null || _d === void 0 ? void 0 : _d.status) && ((_e = sourceRes.data) === null || _e === void 0 ? void 0 : _e.src)) {
                        directLinks.push({
                            title: "Server",
                            link: sourceRes.data.src, // ✅ FINAL VIDEO / EMBED LINK
                            type: "movie",
                            quality: "HD",
                        });
                    }
                }
                catch (_f) {
                    continue;
                }
            }
            // --------------------------------------------------
            // 5️⃣ Return final Info
            // --------------------------------------------------
            return {
                title,
                synopsis,
                image,
                imdbId: "",
                type: "movie",
                linkList: directLinks.length
                    ? [
                        {
                            title: "Watch",
                            quality: "HD",
                            directLinks,
                        },
                    ]
                    : [],
            };
        }
        catch (err) {
            console.error("❌ Meta fetch error:", err);
            return empty;
        }
    });
};
exports.getMeta = getMeta;
