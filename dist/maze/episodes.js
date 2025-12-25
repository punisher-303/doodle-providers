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
        const { axios, cheerio } = providerContext;
        try {
            const res = yield axios.get(url);
            const html = res.data;
            const $ = cheerio.load(html);
            const episodeLinks = [];
            // Parse episode files from directory
            $("table tbody tr").each((i, element) => {
                const $row = $(element);
                const linkElement = $row.find("td:first-child a");
                const fileName = linkElement.text().trim();
                const fileLink = linkElement.attr("href");
                if (fileName &&
                    fileLink &&
                    fileName !== "../" &&
                    fileName !== "Parent Directory") {
                    // Check if it's a video file
                    if (fileName.includes(".mp4") ||
                        fileName.includes(".mkv") ||
                        fileName.includes(".avi") ||
                        fileName.includes(".mov")) {
                        const fullLink = fileLink;
                        // Try to extract episode information from filename
                        let episodeTitle = fileName;
                        const episodeMatch = fileName.match(/[Ss](\d+)[Ee](\d+)/);
                        const simpleEpisodeMatch = fileName.match(/[Ee](\d+)/);
                        if (episodeMatch) {
                            episodeTitle = `S${episodeMatch[1]}E${episodeMatch[2]} - ${fileName}`;
                        }
                        else if (simpleEpisodeMatch) {
                            episodeTitle = `Episode ${simpleEpisodeMatch[1]} - ${fileName}`;
                        }
                        else {
                            // Try to extract episode number from various patterns
                            const numberMatch = fileName.match(/(\d+)/);
                            if (numberMatch) {
                                episodeTitle = `Episode ${numberMatch[1]} - ${fileName}`;
                            }
                        }
                        episodeLinks.push({
                            title: episodeTitle,
                            link: fullLink,
                        });
                    }
                }
            });
            return episodeLinks;
        }
        catch (err) {
            console.error("111477 episodes error:", err);
            return [];
        }
    });
};
exports.getEpisodes = getEpisodes;
