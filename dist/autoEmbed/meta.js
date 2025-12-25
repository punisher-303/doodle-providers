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
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const axios = providerContext.axios;
        try {
            console.log("all", link);
            const res = yield axios.get(link);
            const data = res.data;
            const meta = {
                title: ((_b = data === null || data === void 0 ? void 0 : data.meta) === null || _b === void 0 ? void 0 : _b.name) || "",
                synopsis: ((_c = data === null || data === void 0 ? void 0 : data.meta) === null || _c === void 0 ? void 0 : _c.description) || "",
                image: ((_d = data === null || data === void 0 ? void 0 : data.meta) === null || _d === void 0 ? void 0 : _d.background) || "",
                imdbId: ((_e = data === null || data === void 0 ? void 0 : data.meta) === null || _e === void 0 ? void 0 : _e.imdb_id) || "",
                type: ((_f = data === null || data === void 0 ? void 0 : data.meta) === null || _f === void 0 ? void 0 : _f.type) || "movie",
            };
            const links = [];
            let directLinks = [];
            let season = new Map();
            if (meta.type === "series") {
                (_h = (_g = data === null || data === void 0 ? void 0 : data.meta) === null || _g === void 0 ? void 0 : _g.videos) === null || _h === void 0 ? void 0 : _h.map((video) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    if ((video === null || video === void 0 ? void 0 : video.season) <= 0)
                        return;
                    if (!season.has(video === null || video === void 0 ? void 0 : video.season)) {
                        season.set(video === null || video === void 0 ? void 0 : video.season, []);
                    }
                    season.get(video === null || video === void 0 ? void 0 : video.season).push({
                        title: "Episode " + (video === null || video === void 0 ? void 0 : video.episode),
                        type: "series",
                        link: JSON.stringify({
                            title: (_a = data === null || data === void 0 ? void 0 : data.meta) === null || _a === void 0 ? void 0 : _a.name,
                            imdbId: (_b = data === null || data === void 0 ? void 0 : data.meta) === null || _b === void 0 ? void 0 : _b.imdb_id,
                            season: (_c = video === null || video === void 0 ? void 0 : video.id) === null || _c === void 0 ? void 0 : _c.split(":")[1],
                            episode: (_d = video === null || video === void 0 ? void 0 : video.id) === null || _d === void 0 ? void 0 : _d.split(":")[2],
                            type: (_e = data === null || data === void 0 ? void 0 : data.meta) === null || _e === void 0 ? void 0 : _e.type,
                            tmdbId: ((_g = (_f = data === null || data === void 0 ? void 0 : data.meta) === null || _f === void 0 ? void 0 : _f.moviedb_id) === null || _g === void 0 ? void 0 : _g.toString()) || "",
                            year: (_h = data === null || data === void 0 ? void 0 : data.meta) === null || _h === void 0 ? void 0 : _h.year,
                        }),
                    });
                });
                const keys = Array.from(season.keys());
                keys.sort();
                keys.map((key) => {
                    directLinks = season.get(key);
                    links.push({
                        title: `Season ${key}`,
                        directLinks: directLinks,
                    });
                });
            }
            else {
                links.push({
                    title: (_j = data === null || data === void 0 ? void 0 : data.meta) === null || _j === void 0 ? void 0 : _j.name,
                    directLinks: [
                        {
                            title: "Movie",
                            type: "movie",
                            link: JSON.stringify({
                                title: (_k = data === null || data === void 0 ? void 0 : data.meta) === null || _k === void 0 ? void 0 : _k.name,
                                imdbId: (_l = data === null || data === void 0 ? void 0 : data.meta) === null || _l === void 0 ? void 0 : _l.imdb_id,
                                season: "",
                                episode: "",
                                type: (_m = data === null || data === void 0 ? void 0 : data.meta) === null || _m === void 0 ? void 0 : _m.type,
                                tmdbId: ((_p = (_o = data === null || data === void 0 ? void 0 : data.meta) === null || _o === void 0 ? void 0 : _o.moviedb_id) === null || _p === void 0 ? void 0 : _p.toString()) || "",
                                year: (_q = data === null || data === void 0 ? void 0 : data.meta) === null || _q === void 0 ? void 0 : _q.year,
                            }),
                        },
                    ],
                });
            }
            return Object.assign(Object.assign({}, meta), { linkList: links });
        }
        catch (err) {
            console.error(err);
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
