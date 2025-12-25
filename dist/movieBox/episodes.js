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
const getEpisodes = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        var _b;
        const { axios, cheerio } = providerContext;
        try {
            const episodeLinks = [];
            const response = yield fetch("https://dob-worker.8man.workers.dev", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: url,
                    method: "GET",
                }),
            });
            const data = yield response.json();
            const list = ((_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.list) || [];
            list.forEach((item) => {
                const seriesTitle = (item === null || item === void 0 ? void 0 : item.ep)
                    ? `S-${item === null || item === void 0 ? void 0 : item.se} E-${item === null || item === void 0 ? void 0 : item.ep}`
                    : (item === null || item === void 0 ? void 0 : item.title) || "";
                const episodesLink = (item === null || item === void 0 ? void 0 : item.resourceLink) || "";
                if (episodesLink) {
                    episodeLinks.push({
                        title: seriesTitle.trim(),
                        link: JSON.stringify({
                            url: episodesLink,
                            title: seriesTitle.trim(),
                        }),
                    });
                }
            });
            return episodeLinks;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
