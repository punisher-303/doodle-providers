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
exports.getEpisodeLinks = getEpisodeLinks;
exports.getEpisodes = getEpisodes;
/**
 * Fetches episode links from a given URL, filters them for specific providers (SkyDrop/Flexplayer),
 * and returns them sorted by episode number.
 *
 * @param {object} params - The parameters object.
 * @param {string} params.url - The URL of the page containing the episode links.
 * @param {ProviderContext} params.providerContext - Context containing axios and cheerio for HTTP and HTML parsing.
 * @returns {Promise<EpisodeLink[]>} A promise that resolves to an array of sorted episode links.
 */
function getEpisodeLinks(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        try {
            // 1. Fetch the HTML content of the page
            const res = yield providerContext.axios.get(url);
            // 2. Load the content into Cheerio for parsing
            const $ = providerContext.cheerio.load(res.data || "");
            const episodes = [];
            // 3. Iterate over all episode title headings
            $("h4.fittexted_for_content_h4").each((_, h4El) => {
                // Extract the main episode title (e.g., "Episode 11")
                const epTitle = $(h4El).text().trim();
                if (!epTitle)
                    return;
                // 4. Find all links (<a> tags) under the current <h4> until the next <h4> or an <hr>
                $(h4El)
                    .nextUntil("h4, hr")
                    .find("a[href]") // only select <a> tags that have an 'href' attribute
                    .each((_, linkEl) => {
                    let href = ($(linkEl).attr("href") || "").trim();
                    if (!href)
                        return;
                    // Resolve relative URLs to absolute URLs
                    if (!href.startsWith("http"))
                        href = new URL(href, url).href;
                    const btnText = $(linkEl).text().trim() || "Watch Episode";
                    // 5. --- Filter: Only include SkyDrop or Flexplayer links
                    const lowerHref = href.toLowerCase();
                    if (lowerHref.includes("skydro") || lowerHref.includes("flexplayer.buzz")) {
                        episodes.push({
                            title: `${epTitle} - ${btnText}`,
                            link: href,
                        });
                    }
                });
            });
            // 6. --- Sort: Sort the collected episodes by episode number extracted from the title
            episodes.sort((a, b) => {
                var _a, _b;
                // Use regex to find the first number in the title string
                const numA = parseInt(((_a = a.title.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || "0");
                const numB = parseInt(((_b = b.title.match(/\d+/)) === null || _b === void 0 ? void 0 : _b[0]) || "0");
                return numA - numB; // Ascending sort
            });
            return episodes;
        }
        catch (err) {
            // Log any errors that occur during fetching or parsing
            console.error("getEpisodeLinks error:", err);
            return []; // Return an empty array on failure
        }
    });
}
// --- System wrapper: Export the main function with the expected name
function getEpisodes(_a) {
    return __awaiter(this, arguments, void 0, function* ({ url, providerContext, }) {
        // Simply call the core logic function
        return yield getEpisodeLinks({ url, providerContext });
    });
}
