/**
 * Dhan HQ API v2 Typed Client (Sandbox & Live)
 */

export interface DhanRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  data?: any;
  accessToken?: string;
  clientId?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class DhanClient {
  private baseUrl: string;
  private accessToken: string;
  private clientId: string;

  constructor(accessToken?: string, clientId?: string, baseUrl?: string) {
    this.accessToken = accessToken || process.env.DHAN_ACCESS_TOKEN || "";
    this.clientId = clientId || process.env.DHAN_CLIENT_ID || "";
    const isSandbox =
      process.env.DHAN_SANDBOX === "true" ||
      process.env.DHAN_ENV?.toUpperCase() === "SANDBOX";
    this.baseUrl =
      baseUrl ||
      process.env.DHAN_BASE_URL ||
      (isSandbox ? "https://sandbox.dhan.co/v2" : "https://api.dhan.co/v2");
  }

  public setCredentials(accessToken: string, clientId?: string, baseUrl?: string) {
    this.accessToken = accessToken.trim();
    if (clientId !== undefined) this.clientId = clientId.trim();
    if (baseUrl) this.baseUrl = baseUrl.trim();
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public isSandbox(): boolean {
    return this.baseUrl.includes("sandbox");
  }

  public hasToken(): boolean {
    return Boolean(this.accessToken);
  }

  public async request<T = any>(options: DhanRequestOptions): Promise<T> {
    const token = options.accessToken || this.accessToken;
    const cid = options.clientId || this.clientId;
    const base = options.baseUrl || this.baseUrl;
    const method = options.method || "GET";
    const timeoutMs = options.timeoutMs || 8000;

    if (!token) {
      throw new Error("DHAN_AUTH_REQUIRED: Dhan Access Token is not configured.");
    }

    const cleanPath = options.path.replace(/^\//, "");
    const url = `${base.replace(/\/$/, "")}/${cleanPath}`;

    const headers: Record<string, string> = {
      "access-token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (cid) {
      headers["client-id"] = cid;
    }

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
          errBody?.errorMessage ||
          errBody?.message ||
          errBody?.error ||
          `Dhan HTTP ${response.status}`;
        const err = new Error(errorMsg) as any;
        err.statusCode = response.status;
        err.dhanErrorCode = errBody?.errorCode || errBody?.errorType;
        err.raw = errBody;
        throw err;
      }

      const resJson = await response.json();
      return resJson as T;
    } catch (error: any) {
      clearTimeout(timer);
      if (error.name === "AbortError") {
        throw new Error(`DHAN_TIMEOUT: Request to Dhan timed out after ${timeoutMs}ms.`);
      }
      throw error;
    }
  }
}
