/**
 * Delta Exchange India API Typed Client (HMAC SHA256 Signing)
 */
import crypto from "crypto";

export interface DeltaRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, any>;
  data?: any;
  apiKey?: string;
  apiSecret?: string;
  timeoutMs?: number;
}

export class DeltaClient {
  private baseUrl: string = "https://cdn.india.delta.exchange";
  private restUrl: string = "https://api.india.delta.exchange";
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || process.env.DELTA_API_KEY || "";
    this.apiSecret = apiSecret || process.env.DELTA_API_SECRET || "";
  }

  public setCredentials(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey.trim();
    this.apiSecret = apiSecret.trim();
  }

  public hasCredentials(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  public generateSignature(method: string, timestamp: string, path: string, queryStr: string = "", bodyStr: string = ""): string {
    const payload = method.toUpperCase() + timestamp + path + (queryStr ? `?${queryStr}` : "") + bodyStr;
    try {
      // Dynamic require on Node.js / Server runtime
      const cryptoMod = typeof window === "undefined" ? require("crypto") : null;
      if (cryptoMod) {
        return cryptoMod.createHmac("sha256", this.apiSecret).update(payload).digest("hex");
      }
    } catch {}
    return "";
  }

  public async request<T = any>(options: DeltaRequestOptions): Promise<T> {
    const method = options.method || "GET";
    const apiKey = options.apiKey || this.apiKey;
    const apiSecret = options.apiSecret || this.apiSecret;
    const timeoutMs = options.timeoutMs || 8000;

    const cleanPath = `/${options.path.replace(/^\//, "")}`;
    const queryParams = options.query ? new URLSearchParams(options.query).toString() : "";
    const bodyStr = options.data && method !== "GET" ? JSON.stringify(options.data) : "";

    const url = `${this.restUrl}${cleanPath}${queryParams ? `?${queryParams}` : ""}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (apiKey && apiSecret) {
      const signature = this.generateSignature(method, timestamp, cleanPath, queryParams, bodyStr);
      headers["api-key"] = apiKey;
      headers["timestamp"] = timestamp;
      headers["signature"] = signature;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: bodyStr || undefined,
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
          errBody?.error?.message ||
          errBody?.message ||
          `Delta HTTP ${response.status}`;
        const err = new Error(errorMsg) as any;
        err.statusCode = response.status;
        err.raw = errBody;
        throw err;
      }

      const resJson = await response.json();
      return (resJson?.result ?? resJson) as T;
    } catch (error: any) {
      clearTimeout(timer);
      if (error.name === "AbortError") {
        throw new Error(`DELTA_TIMEOUT: Request to Delta Exchange India timed out after ${timeoutMs}ms.`);
      }
      throw error;
    }
  }
}
