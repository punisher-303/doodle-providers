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
        var _b, _c, _d;
        try {
            const { axios, cheerio, getBaseUrl } = providerContext;
            const baseUrl = yield getBaseUrl("movieBox");
            const links = [];
            // this is just a proxy please host your own if you want to use this code:- https://github.com/himanshu8443/Cf-Workers/blob/main/src/dob-worker/index.js
            const response = yield fetch("https://dob-worker.8man.workers.dev", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: link,
                    method: "GET",
                }),
            });
            const data = (yield response.json()).data;
            console.log("data", data);
            // metadata
            const title = ((data === null || data === void 0 ? void 0 : data.title) || "").replace(/\s*\[.*?\]\s*$/, "");
            const synopsis = (data === null || data === void 0 ? void 0 : data.description) || "";
            const image = ((_b = data === null || data === void 0 ? void 0 : data.cover) === null || _b === void 0 ? void 0 : _b.url) || "";
            const rating = (data === null || data === void 0 ? void 0 : data.imdbRatingValue) || "";
            const tags = ((_d = (_c = data === null || data === void 0 ? void 0 : data.genre) === null || _c === void 0 ? void 0 : _c.split(",")) === null || _d === void 0 ? void 0 : _d.map((tag) => tag.trim())) || [];
            const dubs = (data === null || data === void 0 ? void 0 : data.dubs) || [];
            dubs === null || dubs === void 0 ? void 0 : dubs.forEach((dub) => {
                const link = {
                    title: dub === null || dub === void 0 ? void 0 : dub.lanName,
                    episodesLink: `${baseUrl}/wefeed-mobile-bff/subject-api/resource?subjectId=${dub === null || dub === void 0 ? void 0 : dub.subjectId}&page=1&perPage=20&all=0&startPosition=1&endPosition=1&pagerMode=0&resolution=1080&se=1&epFrom=1&epTo=1`,
                };
                links.push(link);
            });
            console.log("meta", {
                title,
                synopsis,
                image,
                rating,
                tags,
                links,
            });
            return {
                title,
                synopsis,
                image,
                rating,
                tags,
                imdbId: "",
                type: "movie",
                linkList: links,
            };
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
