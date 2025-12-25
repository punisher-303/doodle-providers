"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeta = getMeta;
async function getMeta({ link, providerContext, }) {
    try {
        const { axios, cheerio } = providerContext;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };
        const res = await axios.get(link, { headers });
        const $ = cheerio.load(res.data);
        const title = $(".data h1").text().trim();
        const image = $(".poster img").attr("src") || $(".wp-content img").first().attr("src") || "";
        const synopsis = $(".wp-content p").text().trim() || $(".entry-content p").text().trim() || "";
        const tags = [];
        $(".genres a").each((_, el) => {
            tags.push($(el).text().trim());
        });
        const linkList = [];
        return {
            title,
            image,
            synopsis,
            imdbId: "",
            type: "movie",
            tags,
            cast: [],
            rating: "",
            linkList,
        };
    }
    catch (err) {
        console.error("Mlfbd getMeta error:", err);
        return {
            title: "",
            image: "",
            synopsis: "",
            imdbId: "",
            type: "movie",
            linkList: [],
        };
    }
}
