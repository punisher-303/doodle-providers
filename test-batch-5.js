const axios = require('axios');
const cheerio = require('cheerio');

const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};

// Mock getBaseUrl
const mirrors = {
    "asianflix": "https://asianflix.one/",
    "dramafull": "https://dramafull.cc/",
    "dramakey": "https://dramakey.com/",
    "tamilblaster": "https://1tamilblasters.courses/",
    "tamilian": "https://tamilian.io/",
    "ridomovies": "https://ridomovies.tv/"
};

async function testProvider(name, value) {
    console.log(`\n--- Testing ${name} (${value}) ---`);
    const providerContext = {
        axios: {
            get: (url, opts) => axios.get(url, { ...opts, headers: { ...defaultHeaders, ...opts?.headers } }),
            post: (url, data, opts) => axios.post(url, data, { ...opts, headers: { ...defaultHeaders, ...opts?.headers } }),
        },
        cheerio,
        getBaseUrl: async (key) => mirrors[key.toLowerCase()] || mirrors[key]
    };

    try {
        const postsModule = require(`./dist/${value}/posts`);
        
        // Test getPosts (Home)
        console.log(`   Fetching Home...`);
        const posts = await postsModule.getPosts({ 
            filter: "", 
            page: 1, 
            providerContext 
        });
        console.log(`   ✅ [Posts] Found ${posts.length} results.`);
        if (posts.length > 0) {
            console.log(`      Sample: ${posts[0].title.slice(0, 50)}...`);
        }

        // Test getSearchPosts
        console.log(`   Searching...`);
        const searchResults = await postsModule.getSearchPosts({ 
            searchQuery: "Breaking Bad", 
            page: 1, 
            providerContext 
        });
        console.log(`   ✅ [Search] Found ${searchResults.length} results.`);
        
    } catch (err) {
        console.error(`   ❌ [${name}] Error:`, err.message);
    }
}

async function runAll() {
    await testProvider("Asianflix", "asianflix");
    await testProvider("Dramafull", "Dramafull");
    await testProvider("DramaKey", "DramaKey");
    await testProvider("TamilBlaster", "tamilblaster");
    await testProvider("Tamilian", "tamilian");
    await testProvider("RidoMovies", "ridoMovies");
}

runAll();
