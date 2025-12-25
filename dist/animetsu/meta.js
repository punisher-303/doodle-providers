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
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c, _d, _e, _f, _g;
        try {
            const { axios } = providerContext;
            const baseUrl = "https://backend.animetsu.to";
            const url = `${baseUrl}/api/anime/info/${link}`;
            const res = yield axios.get(url, {
                headers: {
                    Referer: "https://animetsu.to/",
                },
            });
            const data = res.data;
            const meta = {
                title: ((_b = data.title) === null || _b === void 0 ? void 0 : _b.english) || ((_c = data.title) === null || _c === void 0 ? void 0 : _c.romaji) || ((_d = data.title) === null || _d === void 0 ? void 0 : _d.native) || "",
                synopsis: data.description || "",
                image: ((_e = data.coverImage) === null || _e === void 0 ? void 0 : _e.extraLarge) ||
                    ((_f = data.coverImage) === null || _f === void 0 ? void 0 : _f.large) ||
                    ((_g = data.coverImage) === null || _g === void 0 ? void 0 : _g.medium) ||
                    "",
                tags: [data === null || data === void 0 ? void 0 : data.format, data === null || data === void 0 ? void 0 : data.status, ...((data === null || data === void 0 ? void 0 : data.genres) || [])].filter(Boolean),
                imdbId: "",
                type: data.format === "MOVIE" ? "movie" : "series",
            };
            const linkList = [];
            // Get episodes data
            try {
                const episodesRes = yield axios.get(`${baseUrl}/api/anime/eps/${link}`, {
                    headers: {
                        Referer: "https://animetsu.to/",
                    },
                });
                const episodes = episodesRes.data;
                if (episodes && episodes.length > 0) {
                    const directLinks = [];
                    episodes.forEach((episode) => {
                        const title = `Episode ${episode.number}`;
                        const episodeLink = `${link}:${episode.number}`;
                        if (episodeLink && title) {
                            directLinks.push({
                                title,
                                link: episodeLink,
                            });
                        }
                    });
                    linkList.push({
                        title: meta.title,
                        directLinks: directLinks,
                    });
                }
                else {
                    // Movie case - single episode
                    linkList.push({
                        title: meta.title,
                        directLinks: [
                            {
                                title: "Movie",
                                link: `${link}:1`,
                            },
                        ],
                    });
                }
            }
            catch (episodeErr) {
                console.error("Error fetching episodes:", episodeErr);
                // Fallback for movie or single episode
                linkList.push({
                    title: meta.title,
                    directLinks: [
                        {
                            title: meta.title,
                            link: `${link}:1`,
                        },
                    ],
                });
            }
            return Object.assign(Object.assign({}, meta), { linkList: linkList });
        }
        catch (err) {
            console.error("animetsu meta error:", err);
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
        }
    });
};
exports.getMeta = getMeta;
