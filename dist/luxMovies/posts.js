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
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    Cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=lDWFqLsHL5LZ.VpfxQRtHY2_mpXRuq3OFTbVDKNIZGw-1752051595-1.2.1.1-VZ2S8yUrcCuOMLUgWfNv9a1LrtuhUKEd.uPN1Au_9tuTFYLra7ugoFBYKfsunvzrBOlYSYM0q8J7vpw.JhGZH0RO6MlaVBKH5olmoryhd6s11LXg7ZF1Ld_NedYoA7uKk_SBhbb1CCsj11S52U9VUve7twrLEjILmw3MEURU1eGqOOi3YGxtGgpQBNYgfnkJCoRkLB_6vQESw4RcIvO1j1BHMuyMVEkbn7sBtLEX52w",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
};
const getPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ filter, page, providerValue, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = yield getBaseUrl("lux");
    console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
    const url = `${baseUrl}/${filter}/page/${page}/`;
    console.log("lux url:", url);
    return posts(url, signal, providerContext);
});
exports.getPosts = getPosts;
const getSearchPosts = (_a) => __awaiter(void 0, [_a], void 0, function* ({ searchQuery, page, providerValue, signal, providerContext, }) {
    const { getBaseUrl } = providerContext;
    const baseUrl = yield getBaseUrl("lux");
    console.log("vegaGetPosts baseUrl:", providerValue, baseUrl);
    const url = page === 1
        ? `${baseUrl}/?s=${searchQuery}`
        : `${baseUrl}/page/${page}/?s=${searchQuery}`;
    console.log("lux url:", url);
    return posts(url, signal, providerContext);
});
exports.getSearchPosts = getSearchPosts;
function posts(url, signal, providerContext) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const { axios, cheerio } = providerContext;
            const urlRes = yield axios.get(url, {
                headers: Object.assign(Object.assign({}, headers), { Referer: url }),
                signal,
            });
            const $ = cheerio.load(urlRes.data);
            const posts = [];
            (_b = (_a = $(".blog-items")) === null || _a === void 0 ? void 0 : _a.children("article")) === null || _b === void 0 ? void 0 : _b.each((index, element) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                const post = {
                    title: ((_e = (_d = (_c = (_b = (_a = $(element)) === null || _a === void 0 ? void 0 : _a.find("a")) === null || _b === void 0 ? void 0 : _b.attr("title")) === null || _c === void 0 ? void 0 : _c.replace("Download", "")) === null || _d === void 0 ? void 0 : _d.match(/^(.*?)\s*\((\d{4})\)|^(.*?)\s*\((Season \d+)\)/)) === null || _e === void 0 ? void 0 : _e[0]) ||
                        ((_h = (_g = (_f = $(element)) === null || _f === void 0 ? void 0 : _f.find("a")) === null || _g === void 0 ? void 0 : _g.attr("title")) === null || _h === void 0 ? void 0 : _h.replace("Download", "")) ||
                        "",
                    link: ((_k = (_j = $(element)) === null || _j === void 0 ? void 0 : _j.find("a")) === null || _k === void 0 ? void 0 : _k.attr("href")) || "",
                    image: $(element).find("a").find("img").attr("data-lazy-src") ||
                        $(element).find("a").find("img").attr("data-src") ||
                        $(element).find("a").find("img").attr("src") ||
                        "",
                };
                if (post.image.startsWith("//")) {
                    post.image = "https:" + post.image;
                }
                posts.push(post);
            });
            // console.log(posts);
            return posts;
        }
        catch (error) {
            console.error("vegaGetPosts error:", error);
            return [];
        }
    });
}
