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
exports.scrapeEpisodePage = exports.getMeta = void 0;
const headers = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cache-Control": "no-store",
    "Accept-Language": "en-US,en;q=0.9",
    DNT: "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
// --- getMeta using Promise ---
const getMeta = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, providerContext, }) {
        const { axios, cheerio } = providerContext;
        return axios
            .get(link, { headers })
            .then((response) => {
            var _a;
            const $ = cheerio.load(response.data);
            const infoContainer = $(".entry-content,.post-inner");
            const title = $("h1.entry-title").text().trim() ||
                $("h2.entry-title").text().trim() ||
                "";
            const imdbMatch = (_a = infoContainer.html()) === null || _a === void 0 ? void 0 : _a.match(/tt\d+/);
            const imdbId = imdbMatch ? imdbMatch[0] : "";
            const synopsis = infoContainer
                .find("h3:contains('SYNOPSIS'), h3:contains('synopsis')")
                .next("p")
                .text()
                .trim() || "";
            let image = infoContainer.find("img").first().attr("src") || "";
            if (image.startsWith("//"))
                image = "https:" + image;
            const type = /Season \d+/i.test(infoContainer.text())
                ? "series"
                : "movie";
            const linkList = [];
            if (type === "series") {
                // Single Episode Links
                infoContainer.find("h2 a").each((_, el) => {
                    var _a;
                    const el$ = $(el);
                    const href = (_a = el$.attr("href")) === null || _a === void 0 ? void 0 : _a.trim();
                    const linkText = el$.text().trim();
                    if (href && linkText.includes("Single Episode")) {
                        linkList.push({
                            title: linkText,
                            episodesLink: href,
                            directLinks: [],
                        });
                    }
                });
            }
            else {
                // Movies
                infoContainer.find("a[href]").each((_, aEl) => {
                    var _a;
                    const el$ = $(aEl);
                    const href = ((_a = el$.attr("href")) === null || _a === void 0 ? void 0 : _a.trim()) || "";
                    if (!href)
                        return;
                    const btnText = el$.text().trim() || "Download";
                    linkList.push({
                        title: btnText,
                        directLinks: [{ title: btnText, link: href, type: "movie" }],
                        episodesLink: "",
                    });
                });
            }
            return { title, synopsis, image, imdbId, type, linkList };
        })
            .catch((err) => {
            console.error("getMeta error:", err);
            return {
                title: "",
                synopsis: "",
                image: "",
                imdbId: "",
                type: "movie",
                linkList: [],
            };
        });
    });
};
exports.getMeta = getMeta;
// --- scrapeEpisodePage using Promise ---
const scrapeEpisodePage = function ({ link, providerContext, }) {
    const { axios, cheerio } = providerContext;
    const result = [];
    return axios
        .get(link, { headers })
        .then((response) => {
        const $ = cheerio.load(response.data);
        $(".entry-content,.post-inner")
            .find("h3 a")
            .each((_, el) => {
            var _a;
            const el$ = $(el);
            const href = (_a = el$.attr("href")) === null || _a === void 0 ? void 0 : _a.trim();
            const btnText = el$.text().trim() || "Download";
            if (href)
                result.push({ title: btnText, link: href, type: "series" });
        });
        return result;
    })
        .catch((err) => {
        console.error("scrapeEpisodePage error:", err);
        return result;
    });
};
exports.scrapeEpisodePage = scrapeEpisodePage;
