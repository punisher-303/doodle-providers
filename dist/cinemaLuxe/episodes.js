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
            const episodes = [];
            // अब हर Episode ब्लॉक को पकड़ो जो -:Episodes: या Episode शब्द रखता हो
            $("h4:contains('Episode'), h4:contains('Episodes')").each((_, el) => {
                const episodeTitle = $(el).text().trim();
                // Episode number निकालना
                const episodeNumberMatch = episodeTitle.match(/\d+/);
                const episodeNumber = episodeNumberMatch ? episodeNumberMatch[0] : "";
                // इसके नीचे वाले <p> में सारे links
                const nextLinks = $(el).next("p").find("a");
                nextLinks.each((__, linkEl) => {
                    const btn = $(linkEl);
                    const link = btn.attr("href") || "";
                    const btnText = btn.text().trim();
                    // सिर्फ Zee-Cloud [Resumable] वाले लिंक
                    if (/zcloud\.lol/i.test(link) || /Zee-Cloud/i.test(btnText)) {
                        episodes.push({
                            title: `Episode ${episodeNumber || ""}`.trim(),
                            link: link,
                        });
                    }
                });
            });
            return episodes;
        }
        catch (err) {
            console.log("getEpisodeLinks error:", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
