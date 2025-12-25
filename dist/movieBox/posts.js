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
exports.getSearchPosts = exports.getPosts = void 0;
const getPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ filter, page, signal, providerContext, }) {
        var _b, _c, _d, _e;
        const posts = [];
        const { getBaseUrl } = providerContext;
        if (page > 1) {
            return posts;
        }
        const baseUrl = yield getBaseUrl("movieBox");
        console.log("baseUrl", baseUrl);
        const url = `${baseUrl}/wefeed-mobile-bff/tab-operating?page=3&tabId=0&version=2fe0d7c224603ff7b0df294b46d3b84b`;
        const response = yield fetch("https://dob-worker.8man.workers.dev", {
            signal: signal,
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
        const list = (_d = (_c = (_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.items) === null || _c === void 0 ? void 0 : _c[parseInt(filter)]) === null || _d === void 0 ? void 0 : _d.subjects;
        console.log("list", list);
        for (const item of list) {
            const post = {
                image: item === null || item === void 0 ? void 0 : item.cover.url,
                title: (_e = item === null || item === void 0 ? void 0 : item.title) === null || _e === void 0 ? void 0 : _e.replace(/\s*\[.*?\]\s*$/, ""),
                link: `${baseUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${item === null || item === void 0 ? void 0 : item.subjectId}`,
            };
            posts.push(post);
        }
        return posts;
    });
};
exports.getPosts = getPosts;
const getSearchPosts = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ searchQuery, page, signal, providerContext, }) {
        var _b, _c, _d;
        const { getBaseUrl, axios, cheerio } = providerContext;
        const baseUrl = yield getBaseUrl("movieBox");
        const url = `${baseUrl}/wefeed-mobile-bff/subject-api/search/v2`;
        if (page > 1) {
            return [];
        }
        // this is just a proxy please host your own if you want to use this code:- https://github.com/himanshu8443/Cf-Workers/blob/main/src/dob-worker/index.js
        const response = yield fetch("https://dob-worker.8man.workers.dev", {
            signal: signal,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
                method: "POST",
                body: { page: 1, perPage: 20, keyword: searchQuery, tabId: "Movie" },
            }),
        });
        const data = yield response.json();
        const list = ((_d = (_c = (_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.results) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.subjects) || [];
        const posts = list.map((item) => {
            var _a;
            return ({
                image: (_a = item === null || item === void 0 ? void 0 : item.cover) === null || _a === void 0 ? void 0 : _a.url,
                title: item === null || item === void 0 ? void 0 : item.title,
                link: `${baseUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${item === null || item === void 0 ? void 0 : item.subjectId}`,
            });
        });
        return posts;
    });
};
exports.getSearchPosts = getSearchPosts;
