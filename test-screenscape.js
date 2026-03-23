const { getEpisodes } = require('./dist/screenscape/episodes');
const axios = require('axios');

async function test() {
    console.log("Testing ScreenScape Episodes...");
    const providerContext = { axios };
    const url = "https://screenscape.me/watch/tv/1396";
    
    try {
        const episodes = await getEpisodes({ url, providerContext });
        console.log(`✅ Found ${episodes.length} episodes.`);
        if (episodes.length > 0) {
            console.log(`First episode: ${episodes[0].title} (${episodes[0].link})`);
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

test();
