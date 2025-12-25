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
    return __awaiter(this, arguments, void 0, function* ({ link: url, type, providerContext, }) {
        const { axios, cheerio } = providerContext;
        try {
            const stream = [];
            const data = JSON.parse(url);
            stream.push({
                link: data.url,
                server: data.title || "Unknown Server",
                type: "mp4",
            });
            console.log("stream", stream);
            return stream;
        }
        catch (err) {
            console.log("getStream error", err);
            return [];
        }
    });
};
exports.getStream = getStream;
