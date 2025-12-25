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
        const { axios, cheerio, commonHeaders: headers } = providerContext;
        console.log("getEpisodeLinks", url);
        try {
            const res = yield axios.get(url, {
                headers: Object.assign(Object.assign({}, headers), { cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D9qV3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t" }),
            });
            const $ = cheerio.load(res.data);
            const container = $(".download-links-section");
            $(".unili-content,.code-block-1").remove();
            const episodes = [];
            container.find("a[target='_blank']").each((index, element) => {
                var _a, _b, _c;
                const btnEl = $(element);
                const link = btnEl.attr("href");
                const buttonText = btnEl.find("button.dipesh").text().trim();
                if (link && buttonText) {
                    // सिर्फ़ Gdflix वाले links को रखो
                    if (!buttonText.toLowerCase().includes("gdflix"))
                        return;
                    const qualityMatch = ((_a = buttonText.match(/(\d+p)\b/i)) === null || _a === void 0 ? void 0 : _a[1]) || "HD";
                    const serviceMatch = ((_b = buttonText.match(/\[(.*?)\]/i)) === null || _b === void 0 ? void 0 : _b[1]) || "Direct Download";
                    const sizeMatch = ((_c = buttonText.match(/(\d+\.?\d*\s*(?:GB|MB))\b/i)) === null || _c === void 0 ? void 0 : _c[1]) || "";
                    const finalTitle = `${qualityMatch} [${serviceMatch}] ${sizeMatch}`;
                    episodes.push({
                        title: finalTitle,
                        link: link,
                    });
                }
            });
            return episodes;
        }
        catch (err) {
            console.log("getEpisodeLinks error: ", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
