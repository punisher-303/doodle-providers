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
exports.getStream = getStream;
function getStream(_a) {
    return __awaiter(this, arguments, void 0, function* ({ link, type, signal, providerContext, }) {
        try {
            const { axios, cheerio } = providerContext;
            const headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            };
            //console.log("mlfbd getStream", link);
            const res = yield axios.get(link, { headers, signal });
            const $ = cheerio.load(res.data);
            const streams = [];
            // Strategy 1: Look for the download table
            // Selector: #download .links_table table tr
            $("#download .links_table table tr").each((_, el) => {
                // Typically: 
                // <td>...Quality...</td> <td>...Server...</td> <td>...Size...</td> <td><a href="...">Download</a></td>
                // But scraping based on 'a' inside 'tr' is safer.
                const anchor = $(el).find("a");
                if (anchor.length > 0) {
                    const url = anchor.attr("href");
                    const rowText = $(el).text().toLowerCase();
                    let resolution = "720p"; // default
                    if (rowText.includes("1080p"))
                        resolution = "1080p";
                    else if (rowText.includes("480p"))
                        resolution = "480p";
                    else if (rowText.includes("2160p") || rowText.includes("4k"))
                        resolution = "4k";
                    if (url) {
                        streams.push({
                            server: "Mlfbd " + resolution, // Label it clearly
                            link: url,
                            type: "mkv", // Most of these are direct mkv/mp4 or wrapped
                        });
                    }
                }
            });
            // Strategy 2: Look for 'Watch Online' player options if Downloads are empty
            // But typically downloads are better. 
            // If we want to support the 'Watch Online' iframe:
            // It requires more logic to resolve the iframe source (often ajax).
            // Let's stick to the download links for now as they are explicit in the task (add one provider).
            return streams;
        }
        catch (err) {
            console.error("Mlfbd getStream error:", err);
            return [];
        }
    });
}
