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
// Standard headers
const defaultHeaders = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://dramafull.cc/",
};
/**
 * Fetch episode list using Dramafull API
 */
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        var _b;
        const { axios } = providerContext;
        try {
            /**
             * Example watch URL:
             * https://dramafull.cc/watch/41507-luban-mysteries-2025-504815
             */
            const match = url.match(/\/watch\/(\d+)-/);
            if (!match)
                return [];
            const filmId = match[1];
            const apiUrl = `https://dramafull.cc/api/films/${filmId}/seasons/1/episodes`;
            const res = yield axios.get(apiUrl, {
                headers: defaultHeaders,
            });
            const data = (_b = res.data) === null || _b === void 0 ? void 0 : _b.data;
            if (!Array.isArray(data))
                return [];
            const episodes = data.map((ep) => ({
                title: `Episode ${ep.episode}`,
                link: ep.url,
            }));
            return episodes;
        }
        catch (err) {
            console.error("getEpisodes API error:", err instanceof Error ? err.message : String(err));
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
