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
const API_BASE = "https://9aniwatch.tailcf24b9.ts.net/url";
const SERVERS = ["alpha", "bravo", "delta"];
const TYPES = ["sub", "dub"];
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        var _b, _c;
        const { axios } = providerContext;
        const streams = [];
        try {
            // --------------------------------------------------
            // 🔑 Extract episodeId
            // --------------------------------------------------
            const epMatch = link.match(/[?&]ep=(\d+)/);
            const episodeId = epMatch === null || epMatch === void 0 ? void 0 : epMatch[1];
            if (!episodeId)
                return [];
            // --------------------------------------------------
            // 🔁 SUB / DUB + SERVERS
            // --------------------------------------------------
            for (const type of TYPES) {
                for (const server of SERVERS) {
                    try {
                        const apiUrl = `${API_BASE}?server=${server}&type=${type}&episodeId=${episodeId}`;
                        const res = yield axios.get(apiUrl);
                        const data = res === null || res === void 0 ? void 0 : res.data;
                        if (!data)
                            continue;
                        // ---------------- STREAM URL ----------------
                        let streamUrl = "";
                        if (Array.isArray(data.sources)) {
                            streamUrl = (_b = data.sources[0]) === null || _b === void 0 ? void 0 : _b.file;
                        }
                        else if ((_c = data.sources) === null || _c === void 0 ? void 0 : _c.file) {
                            streamUrl = data.sources.file;
                        }
                        if (!streamUrl)
                            continue;
                        // ---------------- SUBTITLES (STRICT TYPE) ----------------
                        const subtitles = [];
                        if (type === "sub" && Array.isArray(data.tracks)) {
                            for (const track of data.tracks) {
                                if (track.file) {
                                    subtitles.push({
                                        title: track.label || "English",
                                        language: "en",
                                        type: "text/vtt",
                                        uri: track.file,
                                    });
                                }
                            }
                        }
                        streams.push({
                            server: `${server.toUpperCase()}-${type.toUpperCase()}`,
                            link: streamUrl,
                            type: "m3u8",
                        });
                    }
                    catch (_d) {
                        // skip broken server
                    }
                }
            }
            return streams;
        }
        catch (err) {
            console.log("stream api error:", (err === null || err === void 0 ? void 0 : err.message) || err);
            return [];
        }
    });
};
exports.getStream = getStream;
