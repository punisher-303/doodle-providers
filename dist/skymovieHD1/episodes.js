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
                headers: Object.assign(Object.assign({}, headers), { cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; cf_clearance=Zl2yiOCN3pzGUd0Bgs.VyBXniJooDbG2Tk1g7DEoRnw-1756381111-1.2.1.1-RVPZoWGCAygGNAHavrVR0YaqASWZlJyYff8A.oQfPB5qbcPrAVud42BzsSwcDgiKAP0gw5D92V3o8XWwLwDRNhyg3DuL1P8wh2K4BCVKxWvcy.iCCxczKtJ8QSUAsAQqsIzRWXk29N6X.kjxuOTYlfB2jrlq12TRDld_zTbsskNcTxaA.XQekUcpGLseYqELuvlNOQU568NZD6LiLn3ICyFThMFAx6mIcgXkxVAvnxU; xla=s4t" }),
            });
            const $ = cheerio.load(res.data);
            const container = $(".entry-content,.entry-inner, .download-links-div");
            $(".unili-content,.code-block-1").remove();
            const episodes = [];
            container.find("h5").each((index, element) => {
                const el = $(element);
                const title = el.text().trim(); // e.g., "-:Episodes: 1:- (Grand Premiere)"
                const hubCloudLink = el
                    .next(".downloads-btns-div")
                    .find('a[style*="background: linear-gradient(135deg,#e629d0,#007bff);"]')
                    .attr("href");
                if (title && hubCloudLink) {
                    const cleanedTitle = title.replace(/[-:]/g, "").trim();
                    episodes.push({
                        title: cleanedTitle,
                        link: hubCloudLink,
                    });
                }
            });
            return episodes;
        }
        catch (err) {
            console.log("getEpisodeLinks error: ");
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
