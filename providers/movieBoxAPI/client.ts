import { AxiosStatic } from "axios";

export class MovieBoxClient {
  private axios: AxiosStatic;
  private baseUrl: string = "https://h5.aoneroom.com";
  private cookies: string = "";
  private accountCookie: string | null = null;

  constructor(axios: AxiosStatic) {
    this.axios = axios;
  }

  private get defaultHeaders() {
    return {
      "X-Client-Info": JSON.stringify({ timezone: "Africa/Nairobi" }),
      "Accept-Language": "en-US,en;q=0.5",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
      Referer: this.baseUrl + "/",
      Cookie: this.cookies,
    };
  }

  async ensureCookies() {
    if (this.accountCookie) return;

    try {
      // Logic from moviebox-api: fetch app info to get cookies
      const url = `${this.baseUrl}/wefeed-h5-bff/app/get-latest-app-pkgs?app_name=moviebox`;
      const response = await this.axios.get(url, {
        headers: {
          ...this.defaultHeaders,
          Cookie: "", // Start fresh
        },
      });

      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        this.cookies = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
        // Find 'account' cookie
        const match = this.cookies.match(/account=([^;]+)/);
        if (match) {
          this.accountCookie = match[1];
        }
      }
    } catch (error) {
      console.error("MovieBoxClient: Failed to ensure cookies", error);
    }
  }

  async getFromApi(endpoint: string, params: any = {}, headers: any = {}) {
    await this.ensureCookies();
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await this.axios.get(url, {
      params,
      headers: { ...this.defaultHeaders, ...headers },
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  }

  async postToApi(endpoint: string, data: any = {}, headers: any = {}) {
    await this.ensureCookies();
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await this.axios.post(url, data, {
      headers: { ...this.defaultHeaders, ...headers },
    });

    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  }
}
