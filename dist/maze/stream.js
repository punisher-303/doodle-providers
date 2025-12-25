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
    return __awaiter(this, arguments, void 0, function* ({ link: url, }) {
        var _b;
        try {
            const stream = [];
            // Get file extension from URL
            const fileExtension = ((_b = url.split(".").pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "mp4";
            // Determine stream type based on file extension
            let streamType = "mp4";
            if (["mkv", "avi", "mov", "webm"].includes(fileExtension)) {
                streamType = fileExtension;
            }
            stream.push({
                server: "111477.xyz",
                link: url,
                type: streamType,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    Referer: "https://a.111477.xyz/",
                },
            });
            return stream;
        }
        catch (err) {
            console.error("111477 stream error:", err);
            return [];
        }
    });
};
exports.getStream = getStream;
