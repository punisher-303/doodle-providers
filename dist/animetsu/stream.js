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
exports.getStream = void 0;
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: id, providerContext, }) {
        try {
            const { axios } = providerContext;
            const baseUrl = "https://backend.animetsu.to";
            // Parse link format: "animeId:episodeNumber"
            const [animeId, episodeNumber] = id.split(":");
            if (!animeId || !episodeNumber) {
                throw new Error("Invalid link format");
            }
            const servers = ["pahe", "zoro"]; // Available servers based on API structure
            const streamLinks = [];
            yield Promise.all(servers.map((server) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const url = `${baseUrl}/api/anime/tiddies?server=${server}&id=${animeId}&num=${episodeNumber}&subType=sub`;
                    const res = yield axios.get(url, {
                        headers: {
                            Referer: "https://animetsu.to/",
                        },
                    });
                    if (res.data && res.data.sources) {
                        const subtitles = [];
                        // if (res.data.subtitles && Array.isArray(res.data.subtitles)) {
                        //   res.data.subtitles.forEach((sub: any) => {
                        //     if (sub.url && sub.lang) {
                        //       // Extract language code from lang string (e.g., "English" -> "en", "Arabic - CR" -> "ar")
                        //       const langCode = sub.lang.toLowerCase().includes("english")
                        //         ? "en"
                        //         : sub.lang.toLowerCase().includes("arabic")
                        //         ? "ar"
                        //         : sub.lang.toLowerCase().includes("french")
                        //         ? "fr"
                        //         : sub.lang.toLowerCase().includes("german")
                        //         ? "de"
                        //         : sub.lang.toLowerCase().includes("italian")
                        //         ? "it"
                        //         : sub.lang.toLowerCase().includes("portuguese")
                        //         ? "pt"
                        //         : sub.lang.toLowerCase().includes("russian")
                        //         ? "ru"
                        //         : sub.lang.toLowerCase().includes("spanish")
                        //         ? "es"
                        //         : "und";
                        //       subtitles.push({
                        //         title: sub.lang,
                        //         language: langCode,
                        //         type: "text/vtt",
                        //         uri: sub.url,
                        //       });
                        //     }
                        //   });
                        // }
                        res.data.sources.forEach((source) => {
                            streamLinks.push({
                                server: server + `: ${source.quality}`,
                                link: `https://m3u8.8man.workers.dev?url=${source.url}`,
                                type: "m3u8",
                                quality: source.quality,
                                headers: {
                                    referer: "https://animetsu.to/",
                                },
                                subtitles: subtitles.length > 0 ? subtitles : [],
                            });
                        });
                    }
                }
                catch (e) {
                    console.log(`Error with server ${server}:`, e);
                }
            })));
            // Try dub version as well
            yield Promise.all(servers.map((server) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const url = `${baseUrl}/api/anime/tiddies?server=${server}&id=${animeId}&num=${episodeNumber}&subType=dub`;
                    const res = yield axios.get(url, {
                        headers: {
                            referer: "https://animetsu.to/",
                        },
                    });
                    if (res.data && res.data.sources) {
                        const subtitles = [];
                        // if (res.data.subtitles && Array.isArray(res.data.subtitles)) {
                        //   res.data.subtitles.forEach((sub: any) => {
                        //     if (sub.url && sub.lang) {
                        //       // Extract language code from lang string (e.g., "English" -> "en", "Arabic - CR" -> "ar")
                        //       const langCode = sub.lang.toLowerCase().includes("english")
                        //         ? "en"
                        //         : sub.lang.toLowerCase().includes("arabic")
                        //         ? "ar"
                        //         : sub.lang.toLowerCase().includes("french")
                        //         ? "fr"
                        //         : sub.lang.toLowerCase().includes("german")
                        //         ? "de"
                        //         : sub.lang.toLowerCase().includes("italian")
                        //         ? "it"
                        //         : sub.lang.toLowerCase().includes("portuguese")
                        //         ? "pt"
                        //         : sub.lang.toLowerCase().includes("russian")
                        //         ? "ru"
                        //         : sub.lang.toLowerCase().includes("spanish")
                        //         ? "es"
                        //         : "und";
                        //       subtitles.push({
                        //         title: sub.lang,
                        //         language: langCode,
                        //         type: "text/vtt",
                        //         uri: sub.url,
                        //       });
                        //     }
                        //   });
                        // }
                        res.data.sources.forEach((source) => {
                            streamLinks.push({
                                server: `${server} (Dub) : ${source.quality}`,
                                link: `https://m3u8.8man.workers.dev?url=${source.url}`,
                                type: "m3u8",
                                quality: source.quality,
                                headers: {
                                    referer: "https://animetsu.to/",
                                },
                                subtitles: subtitles.length > 0 ? subtitles : [],
                            });
                        });
                    }
                }
                catch (e) {
                    console.log(`Error with server ${server} (dub):`, e);
                }
            })));
            console.log("Stream links:", streamLinks);
            return streamLinks;
        }
        catch (err) {
            console.error("animetsu stream error:", err);
            return [];
        }
    });
};
exports.getStream = getStream;
