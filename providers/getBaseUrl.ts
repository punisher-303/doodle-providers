// 1 hour
const expireTime = 60 * 60 * 1000;

export const getBaseUrl = async (providerValue: string) => {
  try {
    let baseUrl = "";
    const cacheKey = "CacheBaseUrl" + providerValue;
    const timeKey = "baseUrlTime" + providerValue;

    // const cachedUrl = cacheStorageService.getString(cacheKey);
    // const cachedTime = cacheStorageService.getObject<number>(timeKey);

    // if (cachedUrl && cachedTime && Date.now() - cachedTime < expireTime) {
    //   baseUrl = cachedUrl;
    // } else {
    const localMapPath = "./modflix.json";
    let baseUrlData: any = {};

    try {
        // Try local file first (for development/audit)
        const fs = require('fs');
        if (fs.existsSync(localMapPath)) {
            baseUrlData = JSON.parse(fs.readFileSync(localMapPath, 'utf8'));
        } else {
            // Fallback to remote
            const baseUrlRes = await fetch(
                "https://himanshu8443.github.io/providers/modflix.json"
            );
            baseUrlData = await baseUrlRes.json();
        }
    } catch (e) {
        // Fallback to remote if local fails
        const baseUrlRes = await fetch(
            "https://himanshu8443.github.io/providers/modflix.json"
        );
        baseUrlData = await baseUrlRes.json();
    }
    
    baseUrl = baseUrlData[providerValue]?.url || "";
    // cacheStorageService.setString(cacheKey, baseUrl);
    // cacheStorageService.setObject(timeKey, Date.now());
    // }
    return baseUrl;
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    return "";
  }
};
