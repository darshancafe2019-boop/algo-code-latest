/**
 * Upstox API v2 / v3 Typed Client
 */

export interface UpstoxRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  data?: any;
  accessToken?: string;
  timeoutMs?: number;
}

export class UpstoxClient {
  private baseUrl: string = "https://api.upstox.com/v2";
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.UPSTOX_ACCESS_TOKEN || "";
  }

  public setAccessToken(token: string) {
    this.accessToken = token.trim();
  }

  public hasToken(): boolean {
    return Boolean(this.accessToken);
  }

  public async request<T = any>(options: UpstoxRequestOptions): Promise<T> {
    const token = options.accessToken || this.accessToken;
    const method = options.method || "GET";
    const timeoutMs = options.timeoutMs || 8000;

    if (!token) {
      throw new Error("UPSTOX_AUTH_REQUIRED: Upstox Access Token is not configured.");
    }

    const cleanPath = options.path.replace(/^\//, "");
    const url = `${this.baseUrl}/${cleanPath}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.data && method !== "GET" ? JSON.stringify(options.data) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errBody: any;
        try {
          errBody = await response.json();
        } catch {
          errBody = { message: await response.text() };
        }
        const errorMsg =
          errBody?.errors?.[0]?.message ||
          errBody?.message ||
          `Upstox HTTP ${response.status}`;
        const err = new Error(errorMsg) as any;
        err.statusCode = response.status;
        err.raw = errBody;
        throw err;
      }

      const resJson = await response.json();
      return resJson as T;
    } catch (error: any) {
      clearTimeout(timer);
      if (error.name === "AbortError") {
        throw new Error(`UPSTOX_TIMEOUT: Request to Upstox timed out after ${timeoutMs}ms.`);
      }
      throw error;
    }
  }
}
