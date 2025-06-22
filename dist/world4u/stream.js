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
exports.getStream = void 0;
const getStream = function (_a) {
    return __awaiter(this, arguments, void 0, function* ({ link: url, type, providerContext, }) {
        var _b;
        const { axios, cheerio } = providerContext;
        const headers = {
            "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        };
        try {
            if (type === "movie") {
                const linkRes = yield axios.get(url, { headers });
                const linkData = linkRes.data;
                const $ = cheerio.load(linkData);
                url = $('strong:contains("INSTANT")').parent().attr("href") || url;
            }
            // fastilinks
            if (url.includes("fastilinks")) {
                const fastilinksRes = yield axios.get(url, { headers });
                const fastilinksData = fastilinksRes.data;
                const $$ = cheerio.load(fastilinksData);
                const fastilinksKey = $$('input[name="_csrf_token_645a83a41868941e4692aa31e7235f2"]').attr("value");
                console.log("fastilinksKey", fastilinksKey);
                const fastilinksFormData = new FormData();
                fastilinksFormData.append("_csrf_token_645a83a41868941e4692aa31e7235f2", fastilinksKey || "");
                const fastilinksRes2 = yield fetch(url, {
                    method: "POST",
                    headers: headers,
                    body: fastilinksFormData,
                });
                const fastilinksHtml = yield fastilinksRes2.text();
                // console.log('fastilinksHtml', fastilinksHtml);
                const $$$ = cheerio.load(fastilinksHtml);
                const fastilinksLink = $$$('a:contains("mediafire")').attr("href") ||
                    $$$('a:contains("photolinx")').attr("href");
                console.log("fastilinksLink", fastilinksLink);
                url = fastilinksLink || url;
            }
            console.log("world4uGetStream", type, url);
            if (url.includes("photolinx")) {
                console.log("photolinx", url);
                // const photolinxBaseUrl = url.split('/').slice(0, 3).join('/');
                const photolinxRes = yield axios.get(url, { headers });
                const photolinxData = photolinxRes.data;
                const $$$ = cheerio.load(photolinxData);
                const access_token = $$$("#generate_url").attr("data-token");
                const uid = $$$("#generate_url").attr("data-uid");
                const body = {
                    type: "DOWNLOAD_GENERATE",
                    payload: {
                        access_token,
                        uid,
                    },
                };
                console.log("photolinxData", JSON.stringify(body));
                const photolinxRes2 = yield fetch("https://photolinx.shop/action", {
                    headers: {
                        "sec-fetch-site": "same-origin",
                        "x-requested-with": "xmlhttprequest",
                        cookie: "PHPSESSID=9a8d855c700cf0711831c04960c2e2b4",
                        Referer: "https://photolinx.shop/download/5mPkrBD0D2x",
                        "Referrer-Policy": "strict-origin-when-cross-origin",
                    },
                    body: JSON.stringify(body),
                    method: "POST",
                });
                const photolinxData2 = yield photolinxRes2.json();
                console.log("photolinxData2", photolinxData2);
                const dwUrl = photolinxData2 === null || photolinxData2 === void 0 ? void 0 : photolinxData2.download_url;
                if (dwUrl) {
                    const streamLinks = [
                        {
                            server: "Photolinx",
                            link: dwUrl,
                            type: "mkv",
                        },
                    ];
                    return streamLinks;
                }
            }
            const res = yield axios.get(url, { headers });
            const html = res.data;
            const streamLinks = [];
            let data = { download: "" };
            try {
                const key = ((_b = html.match(/formData\.append\('key',\s*'(\d+)'\);/)) === null || _b === void 0 ? void 0 : _b[1]) || "";
                console.log("key", key);
                const formData = new FormData();
                formData.append("key", key);
                const streamRes = yield fetch(url, {
                    method: "POST",
                    headers: headers,
                    body: formData,
                });
                data = yield streamRes.json();
            }
            catch (err) {
                console.log("error in world4uGetStream", err);
            }
            // console.log('streamRes', streamRes);
            let $ = cheerio.load(html);
            // console.log('data', html);
            const mediafireUrl = $('h1:contains("Download")').find("a").attr("href") ||
                $(".input.popsok").attr("href");
            console.log("mediafireUrl", mediafireUrl);
            if (mediafireUrl) {
                const directUrl = yield axios.head(mediafireUrl);
                const urlContentType = directUrl.headers["content-type"];
                console.log("mfcontentType", urlContentType);
                if (urlContentType && urlContentType.includes("video")) {
                    streamLinks.push({
                        server: "Mediafire",
                        link: mediafireUrl,
                        type: "mkv",
                    });
                    return streamLinks;
                }
                else {
                    const repairRes = yield axios.get(mediafireUrl, {
                        headers: {
                            Referer: url,
                        },
                    });
                    const repairHtml = repairRes.data;
                    // Regex to match the window.location.href assignment in the script content
                    const hrefRegex = /window\.location\.href\s*=\s*['"]([^'"]+)['"]/;
                    const match = repairHtml.match(hrefRegex);
                    // If a match is found, return the URL; otherwise return null
                    let downloadLInk = match ? match[1] : null;
                    console.log("downloadLInk", downloadLInk);
                    if (downloadLInk) {
                        streamLinks.push({
                            server: "Mediafire",
                            link: downloadLInk,
                            type: "mkv",
                        });
                    }
                    return streamLinks;
                }
            }
            const requireRepairRes = yield axios.head(data.download);
            const contentType = requireRepairRes.headers["content-type"];
            console.log("contentType", contentType);
            if (contentType && contentType.includes("video")) {
                streamLinks.push({
                    server: "Mediafire",
                    link: data.download,
                    type: "mkv",
                });
                return streamLinks;
            }
            else {
                const repairRes = yield axios.get(data.download, {
                    headers: {
                        Referer: url,
                    },
                });
                const repairHtml = repairRes.data;
                const $ = cheerio.load(repairHtml);
                const repairLink = $("#continue-btn").attr("href");
                console.log("repairLink", "https://www.mediafire.com" + repairLink);
                const repairRequireRepairRes = yield axios.get("https://www.mediafire.com" + repairLink);
                const $$ = cheerio.load(repairRequireRepairRes.data);
                const repairDownloadLink = $$(".input.popsok").attr("href");
                console.log("repairDownloadLink", repairDownloadLink);
                if (repairDownloadLink) {
                    streamLinks.push({
                        server: "Mediafire",
                        link: repairDownloadLink,
                        type: "mkv",
                    });
                }
            }
            return streamLinks;
        }
        catch (err) {
            console.log(err);
            return [];
        }
    });
};
exports.getStream = getStream;
