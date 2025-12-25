"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStream = getStream;
async function getStream({ link, type, signal, providerContext, }) {
    try {
        const { axios, cheerio, extractors } = providerContext;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };
        //console.log("mlfbd getStream", link);
        // INSTANT DEBUG: Verify function execution immediately
        const streams = [];
        streams.push({
            server: "Insta-Debug: Version 2.3",
            link: "https://google.com",
            type: "mkv"
        });
        // Continue with actual fetch
        const res = await axios.get(link, { headers, signal });
        const $ = cheerio.load(res.data);
        // const streams: Stream[] = []; // removed valid line since we init above
        // Strategy 1: Look for the download table
        // Selector: #download .links_table table tr
        const pendingStreams = [];
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
                    // Mlfbd links usually redirect to a file host or an extractor compatible site like gdflix.
                    // We need to resolve the redirect.
                    pendingStreams.push((async () => {
                        var _a, _b, _c;
                        try {
                            // Follow the redirect to see where it goes
                            const linkRes = await axios.get(url, {
                                headers,
                                maxRedirects: 5,
                                validateStatus: (status) => status < 400 // Accept 3xx
                            });
                            // Cross-platform URL detection
                            const finalUrl = ((_a = linkRes.request) === null || _a === void 0 ? void 0 : _a.responseURL) || // Browser/Axios adapter
                                ((_c = (_b = linkRes.request) === null || _b === void 0 ? void 0 : _b.res) === null || _c === void 0 ? void 0 : _c.responseUrl) || // Node
                                linkRes.headers['location'] ||
                                linkRes.config.url || // Fallback to requested URL
                                url;
                            // console.log("Resolved", url, "to", finalUrl);
                            // DEBUG: Push the resolved URL to the UI to verify redirect
                            // streams.push({
                            //    server: `DBG: ${finalUrl.substring(0, 40)}...`,
                            //    link: finalUrl,
                            //    type: "mkv"
                            // });
                            if (finalUrl.includes("gdflix") || finalUrl.includes("drivebot")) {
                                if (!extractors.gdFlixExtracter) {
                                    streams.push({ server: "ERR: No gdFlixExtracter", link: finalUrl, type: "error" });
                                }
                                else {
                                    const extracted = await extractors.gdFlixExtracter(finalUrl, signal);
                                    if (!extracted || extracted.length === 0) {
                                        streams.push({ server: "ERR: Gdflix empty", link: finalUrl, type: "error" });
                                    }
                                    extracted.forEach(s => {
                                        s.server = `Mlfbd ${resolution} - ${s.server}`;
                                        streams.push(s);
                                    });
                                }
                            }
                            else {
                                // Fallback: it might be a direct link or handled by generic extractors
                                streams.push({
                                    server: "Mlfbd " + resolution,
                                    link: finalUrl,
                                    type: "mkv",
                                });
                            }
                        }
                        catch (e) {
                            streams.push({ server: `ERR: ${e.message}`, link: url, type: "error" });
                        }
                    })());
                }
            }
        });
        await Promise.all(pendingStreams);
        // Strategy 2: Look for 'Watch Online' player options if Downloads are empty
        // But typically downloads are better. 
        // If we want to support the 'Watch Online' iframe:
        // It requires more logic to resolve the iframe source (often ajax).
        // Let's stick to the download links for now as they are explicit in the task (add one provider).
        if (streams.length === 0) {
            streams.push({
                server: "DBG: No streams found",
                link: "error",
                type: "error"
            });
            // Try to provide more context
            const downloadSection = $("#download").length;
            const tableSection = $(".links_table").length;
            streams.push({
                server: `DBG: Sel: #dl=${downloadSection} .tbl=${tableSection}`,
                link: "error",
                type: "error"
            });
        }
        return streams;
    }
    catch (err) {
        console.error("Mlfbd getStream error:", err);
        return [{
                server: `ERR: TopLevel ${err.message}`,
                link: "error",
                type: "error"
            }];
    }
}
