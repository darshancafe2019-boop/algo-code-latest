/**
 * Alpha Vantage Server-Side Client
 * ================================
 * Authoritative client for all Alpha Vantage REST queries.
 * Enforces rate limiting, caching, deduplication, symbol resolution,
 * and robust crash protection.
 *
 * NEVER exposes API keys to client JavaScript or browser network payloads.
 */

import {
  AlphaVantageApiResponse,
  AlphaVantageStatus,
  AlphaVantageStatusResponse,
  DataStatus,
  NormalizedCandle,
  NormalizedQuote,
  NormalizedSentimentFeed,
  NormalizedTechnicalIndicator,
} from "./types";
import { resolveAlphaVantageSymbol } from "./symbols";
import { globalAlphaVantageCache, AlphaVantageCache } from "./cache";

const AV_BASE_URL = "https://www.alphavantage.co/query";
const DEFAULT_MAX_CALLS_PER_MIN = 5; // Alpha Vantage Free Tier standard

class AlphaVantageClient {
  private callTimestamps: number[] = [];
  private rateLimitedUntil: number = 0;

  /**
   * Retrieves the server-side API Key securely.
   */
  private getApiKey(): string {
    return (
      process.env.ALPHA_VANTAGE_API_KEY ||
      process.env.ALPHAVANTAGE_API_KEY ||
      ""
    ).trim();
  }

  /**
   * Returns masked API key for telemetry (e.g. "••••••••X7K2").
   */
  public getMaskedKey(): string {
    const key = this.getApiKey();
    if (!key) return "Not Configured";
    if (key.length <= 8) return "••••••••";
    return `••••••••${key.substring(key.length - 4)}`;
  }

  /**
   * Enforces server-side rate-limit throttling.
   */
  private checkRateLimit(): { isLimited: boolean; waitMs: number } {
    const now = Date.now();

    // Check if previously marked as rate limited
    if (now < this.rateLimitedUntil) {
      return { isLimited: true, waitMs: this.rateLimitedUntil - now };
    }

    // Clean timestamps older than 60 seconds
    this.callTimestamps = this.callTimestamps.filter((t) => now - t < 60000);

    const maxCalls = parseInt(process.env.ALPHA_VANTAGE_MAX_CALLS_PER_MIN || "", 10) || DEFAULT_MAX_CALLS_PER_MIN;
    if (this.callTimestamps.length >= maxCalls) {
      const oldest = this.callTimestamps[0];
      const waitMs = Math.max(1000, 60000 - (now - oldest));
      return { isLimited: true, waitMs };
    }

    return { isLimited: false, waitMs: 0 };
  }

  private recordCall(): void {
    this.callTimestamps.push(Date.now());
  }

  /**
   * Centralized query executor with error normalization and rate limit protection.
   */
  private async rawQuery(
    params: Record<string, string>,
    timeoutMs: number = 7000
  ): Promise<{ data: any; latencyMs: number }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("AUTH_NOT_CONFIGURED: ALPHA_VANTAGE_API_KEY is not configured in server environment.");
    }

    const { isLimited, waitMs } = this.checkRateLimit();
    if (isLimited) {
      const err: any = new Error(`RATE_LIMITED: Alpha Vantage rate limit reached. Throttling for ${(waitMs / 1000).toFixed(1)}s.`);
      err.code = "DATA_RATE_LIMITED";
      err.waitMs = waitMs;
      throw err;
    }

    const url = new URL(AV_BASE_URL);
    Object.entries(params).forEach(([k, v]) => {
      url.searchParams.set(k, v);
    });
    url.searchParams.set("apikey", apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = performance.now();

    try {
      this.recordCall();
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "QuantOS-AlgoTrading/1.0",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - t0);

      if (!res.ok) {
        throw new Error(`PROVIDER_ERROR: Alpha Vantage HTTP ${res.status}`);
      }

      const json = await res.json();

      // Check for Alpha Vantage rate limit message
      if (json.Information || json.Note) {
        const msg = json.Information || json.Note;
        if (typeof msg === "string" && (msg.includes("call frequency") || msg.includes("rate limit") || msg.includes("API call frequency"))) {
          this.rateLimitedUntil = Date.now() + 60000; // block for 1 minute
          const err: any = new Error("DATA_RATE_LIMITED: Alpha Vantage standard rate limit (5 calls/min) active.");
          err.code = "DATA_RATE_LIMITED";
          err.details = msg;
          throw err;
        }
      }

      // Check for Alpha Vantage error message
      if (json["Error Message"]) {
        const msg = json["Error Message"];
        if (msg.includes("apikey is invalid") || msg.includes("parameter apikey")) {
          const err: any = new Error("AUTH_ERROR: Invalid Alpha Vantage API key.");
          err.code = "AUTH_ERROR";
          throw err;
        }
        const err: any = new Error(`INVALID_SYMBOL: ${msg}`);
        err.code = "INVALID_SYMBOL";
        throw err;
      }

      return { data: json, latencyMs };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        const timeoutErr: any = new Error("TIMEOUT: Alpha Vantage request timed out.");
        timeoutErr.code = "TIMEOUT";
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * 1. GET GLOBAL QUOTE (LTP / Realtime / Delayed)
   */
  public async getQuote(rawSymbol: string): Promise<AlphaVantageApiResponse<NormalizedQuote>> {
    const startTime = performance.now();
    const mapped = resolveAlphaVantageSymbol(rawSymbol);
    const cacheKey = globalAlphaVantageCache.makeKey("QUOTE", { symbol: mapped.avSymbol, asset: mapped.assetClass });

    try {
      if (!this.getApiKey()) {
        return {
          status: "NOT_CONFIGURED",
          success: false,
          data: null,
          message: "Alpha Vantage API key is not configured in .env (ALPHA_VANTAGE_API_KEY).",
          timestamp: new Date().toISOString(),
        };
      }

      const cached = globalAlphaVantageCache.get<NormalizedQuote>(cacheKey);
      if (cached) {
        return {
          status: "SUCCESS",
          success: true,
          data: cached.data,
          isCached: true,
          cachedAt: cached.cachedAt,
          latencyMs: 1,
          timestamp: new Date().toISOString(),
        };
      }

      // Handle Forex Quote
      if (mapped.assetClass === "FOREX") {
        const { data, latencyMs } = await this.rawQuery({
          function: "CURRENCY_EXCHANGE_RATE",
          from_currency: mapped.fromCurrency || "EUR",
          to_currency: mapped.toCurrency || "USD",
        });

        const rateObj = data["Realtime Currency Exchange Rate"];
        if (!rateObj) {
          throw new Error("INVALID_SYMBOL: Currency pair data not returned.");
        }

        const price = parseFloat(rateObj["5. Exchange Rate"]) || 0;
        const normalized: NormalizedQuote = {
          symbol: mapped.originalSymbol,
          price,
          open: price,
          high: parseFloat(rateObj["8. Bid Price"]) || price,
          low: parseFloat(rateObj["9. Ask Price"]) || price,
          volume: 0,
          latestTradingDay: rateObj["6. Last Refreshed"]?.split(" ")[0] || new Date().toISOString().split("T")[0],
          previousClose: price,
          change: 0,
          changePercent: 0,
          source: "ALPHA_VANTAGE",
          dataStatus: "REALTIME",
          timestamp: rateObj["6. Last Refreshed"] || new Date().toISOString(),
        };

        globalAlphaVantageCache.set(cacheKey, normalized, AlphaVantageCache.TTL.QUOTE);

        return {
          status: "SUCCESS",
          success: true,
          data: normalized,
          latencyMs,
          timestamp: new Date().toISOString(),
        };
      }

      // Handle Equity / Crypto Global Quote
      const { data, latencyMs } = await this.rawQuery({
        function: "GLOBAL_QUOTE",
        symbol: mapped.avSymbol,
      });

      const quote = data["Global Quote"];
      if (!quote || Object.keys(quote).length === 0) {
        return {
          status: "INVALID_SYMBOL",
          success: false,
          data: null,
          message: `No market quote returned for symbol '${mapped.avSymbol}'.`,
          timestamp: new Date().toISOString(),
        };
      }

      const price = parseFloat(quote["05. price"]) || 0;
      const changePctStr = (quote["10. change percent"] || "0%").replace("%", "");
      const changePct = parseFloat(changePctStr) || 0;

      const normalized: NormalizedQuote = {
        symbol: mapped.originalSymbol,
        price,
        open: parseFloat(quote["02. open"]) || price,
        high: parseFloat(quote["03. high"]) || price,
        low: parseFloat(quote["04. low"]) || price,
        volume: parseFloat(quote["06. volume"]) || 0,
        latestTradingDay: quote["07. latest trading day"] || new Date().toISOString().split("T")[0],
        previousClose: parseFloat(quote["08. previous close"]) || price,
        change: parseFloat(quote["09. change"]) || 0,
        changePercent: changePct,
        source: "ALPHA_VANTAGE",
        dataStatus: mapped.assetClass === "INDIAN_EQUITY" ? "DELAYED" : "REALTIME",
        timestamp: new Date().toISOString(),
      };

      globalAlphaVantageCache.set(cacheKey, normalized, AlphaVantageCache.TTL.QUOTE);

      return {
        status: "SUCCESS",
        success: true,
        data: normalized,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const status: AlphaVantageStatus =
        err.code === "DATA_RATE_LIMITED"
          ? "DATA_RATE_LIMITED"
          : err.code === "AUTH_ERROR"
          ? "AUTH_ERROR"
          : err.code === "INVALID_SYMBOL"
          ? "INVALID_SYMBOL"
          : err.code === "TIMEOUT"
          ? "TIMEOUT"
          : "PROVIDER_ERROR";

      // Attempt stale cache fallback
      const stale = globalAlphaVantageCache.get<NormalizedQuote>(cacheKey);
      if (stale) {
        return {
          status,
          success: true,
          data: { ...stale.data, isStale: true, dataStatus: "RATE_LIMITED" },
          isCached: true,
          cachedAt: stale.cachedAt,
          message: `Served from cache fallback: ${err.message}`,
          latencyMs: Math.round(performance.now() - startTime),
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status,
        success: false,
        data: null,
        message: err.message || "Failed to fetch Alpha Vantage quote.",
        latencyMs: Math.round(performance.now() - startTime),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 2. GET INTRADAY OHLCV CANDLES
   */
  public async getIntradayCandles(
    rawSymbol: string,
    interval: "1min" | "5min" | "15min" | "30min" | "60min" = "5min",
    outputSize: "compact" | "full" = "compact"
  ): Promise<AlphaVantageApiResponse<NormalizedCandle[]>> {
    const mapped = resolveAlphaVantageSymbol(rawSymbol);
    const cacheKey = globalAlphaVantageCache.makeKey("INTRADAY", {
      symbol: mapped.avSymbol,
      interval,
      outputSize,
    });

    try {
      if (!this.getApiKey()) {
        return {
          status: "NOT_CONFIGURED",
          success: false,
          data: null,
          message: "Alpha Vantage API key not configured.",
          timestamp: new Date().toISOString(),
        };
      }

      const cached = globalAlphaVantageCache.get<NormalizedCandle[]>(cacheKey);
      if (cached) {
        return {
          status: "SUCCESS",
          success: true,
          data: cached.data,
          isCached: true,
          cachedAt: cached.cachedAt,
          timestamp: new Date().toISOString(),
        };
      }

      let resData: any = null;
      let latencyMs = 0;

      if (mapped.assetClass === "CRYPTO") {
        const queryRes = await this.rawQuery({
          function: "CRYPTO_INTRADAY",
          symbol: mapped.avSymbol,
          market: mapped.market || "USD",
          interval,
          outputsize: outputSize,
        });
        resData = queryRes.data;
        latencyMs = queryRes.latencyMs;
      } else {
        const queryRes = await this.rawQuery({
          function: "TIME_SERIES_INTRADAY",
          symbol: mapped.avSymbol,
          interval,
          outputsize: outputSize,
        });
        resData = queryRes.data;
        latencyMs = queryRes.latencyMs;
      }

      const timeSeriesKey = Object.keys(resData).find((k) => k.toLowerCase().includes("time series"));
      const timeSeries = timeSeriesKey ? resData[timeSeriesKey] : null;

      if (!timeSeries || typeof timeSeries !== "object") {
        return {
          status: "INVALID_SYMBOL",
          success: false,
          data: null,
          message: `No intraday candle series found for '${mapped.avSymbol}'.`,
          timestamp: new Date().toISOString(),
        };
      }

      const candles: NormalizedCandle[] = Object.entries(timeSeries).map(([ts, val]: [string, any]) => ({
        timestamp: ts,
        open: parseFloat(val["1. open"] || val["1. open (USD)"] || 0),
        high: parseFloat(val["2. high"] || val["2. high (USD)"] || 0),
        low: parseFloat(val["3. low"] || val["3. low (USD)"] || 0),
        close: parseFloat(val["4. close"] || val["4. close (USD)"] || 0),
        volume: parseFloat(val["5. volume"] || val["5. volume (USD)"] || val["6. volume"] || 0),
        source: "ALPHA_VANTAGE",
        dataStatus: "HISTORICAL",
      }));

      // Sort chronological ascending
      candles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      globalAlphaVantageCache.set(cacheKey, candles, AlphaVantageCache.TTL.INTRADAY);

      return {
        status: "SUCCESS",
        success: true,
        data: candles,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: err.code || "PROVIDER_ERROR",
        success: false,
        data: null,
        message: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 3. GET DAILY OHLCV CANDLES
   */
  public async getDailyCandles(
    rawSymbol: string,
    outputSize: "compact" | "full" = "compact"
  ): Promise<AlphaVantageApiResponse<NormalizedCandle[]>> {
    const mapped = resolveAlphaVantageSymbol(rawSymbol);
    const cacheKey = globalAlphaVantageCache.makeKey("DAILY", {
      symbol: mapped.avSymbol,
      outputSize,
    });

    try {
      if (!this.getApiKey()) {
        return {
          status: "NOT_CONFIGURED",
          success: false,
          data: null,
          message: "Alpha Vantage API key not configured.",
          timestamp: new Date().toISOString(),
        };
      }

      const cached = globalAlphaVantageCache.get<NormalizedCandle[]>(cacheKey);
      if (cached) {
        return {
          status: "SUCCESS",
          success: true,
          data: cached.data,
          isCached: true,
          cachedAt: cached.cachedAt,
          timestamp: new Date().toISOString(),
        };
      }

      let resData: any = null;
      let latencyMs = 0;

      if (mapped.assetClass === "CRYPTO") {
        const queryRes = await this.rawQuery({
          function: "DIGITAL_CURRENCY_DAILY",
          symbol: mapped.avSymbol,
          market: mapped.market || "USD",
        });
        resData = queryRes.data;
        latencyMs = queryRes.latencyMs;
      } else if (mapped.assetClass === "FOREX") {
        const queryRes = await this.rawQuery({
          function: "FX_DAILY",
          from_symbol: mapped.fromCurrency || "EUR",
          to_symbol: mapped.toCurrency || "USD",
          outputsize: outputSize,
        });
        resData = queryRes.data;
        latencyMs = queryRes.latencyMs;
      } else {
        const queryRes = await this.rawQuery({
          function: "TIME_SERIES_DAILY_ADJUSTED",
          symbol: mapped.avSymbol,
          outputsize: outputSize,
        });
        resData = queryRes.data;
        latencyMs = queryRes.latencyMs;
      }

      const timeSeriesKey = Object.keys(resData).find((k) => k.toLowerCase().includes("time series"));
      const timeSeries = timeSeriesKey ? resData[timeSeriesKey] : null;

      if (!timeSeries || typeof timeSeries !== "object") {
        return {
          status: "INVALID_SYMBOL",
          success: false,
          data: null,
          message: `No daily candle series found for '${mapped.avSymbol}'.`,
          timestamp: new Date().toISOString(),
        };
      }

      const candles: NormalizedCandle[] = Object.entries(timeSeries).map(([ts, val]: [string, any]) => ({
        timestamp: ts,
        open: parseFloat(val["1. open"] || val["1a. open (USD)"] || 0),
        high: parseFloat(val["2. high"] || val["2a. high (USD)"] || 0),
        low: parseFloat(val["3. low"] || val["3a. low (USD)"] || 0),
        close: parseFloat(val["4. close"] || val["4a. close (USD)"] || 0),
        volume: parseFloat(val["6. volume"] || val["5. volume"] || 0),
        source: "ALPHA_VANTAGE",
        dataStatus: "HISTORICAL",
      }));

      candles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      globalAlphaVantageCache.set(cacheKey, candles, AlphaVantageCache.TTL.DAILY);

      return {
        status: "SUCCESS",
        success: true,
        data: candles,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: err.code || "PROVIDER_ERROR",
        success: false,
        data: null,
        message: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 4. GET TECHNICAL INDICATOR
   */
  public async getTechnicalIndicator(
    rawSymbol: string,
    indicator: "EMA" | "SMA" | "RSI" | "MACD" | "VWAP" | "ATR" | "BBANDS",
    interval: string = "daily",
    timePeriod?: number
  ): Promise<AlphaVantageApiResponse<NormalizedTechnicalIndicator>> {
    const mapped = resolveAlphaVantageSymbol(rawSymbol);
    const effTimePeriod = timePeriod || (indicator === "RSI" ? 14 : indicator === "EMA" ? 20 : 20);
    const cacheKey = globalAlphaVantageCache.makeKey(`IND_${indicator}`, {
      symbol: mapped.avSymbol,
      interval,
      period: effTimePeriod,
    });

    try {
      if (!this.getApiKey()) {
        return {
          status: "NOT_CONFIGURED",
          success: false,
          data: null,
          message: "Alpha Vantage API key not configured.",
          timestamp: new Date().toISOString(),
        };
      }

      const cached = globalAlphaVantageCache.get<NormalizedTechnicalIndicator>(cacheKey);
      if (cached) {
        return {
          status: "SUCCESS",
          success: true,
          data: cached.data,
          isCached: true,
          cachedAt: cached.cachedAt,
          timestamp: new Date().toISOString(),
        };
      }

      const params: Record<string, string> = {
        function: indicator.toUpperCase(),
        symbol: mapped.avSymbol,
        interval,
        series_type: "close",
      };

      if (indicator !== "VWAP") {
        params.time_period = effTimePeriod.toString();
      }

      const { data, latencyMs } = await this.rawQuery(params);
      const seriesKey = Object.keys(data).find((k) => k.toLowerCase().includes("technical analysis"));
      const rawSeries = seriesKey ? data[seriesKey] : null;

      if (!rawSeries || typeof rawSeries !== "object") {
        return {
          status: "INVALID_SYMBOL",
          success: false,
          data: null,
          message: `No ${indicator} indicator series returned for '${mapped.avSymbol}'.`,
          timestamp: new Date().toISOString(),
        };
      }

      const series = Object.entries(rawSeries).map(([ts, val]: [string, any]) => {
        const values: Record<string, number> = {};
        Object.entries(val).forEach(([k, v]) => {
          values[k] = parseFloat(v as string) || 0;
        });
        return { timestamp: ts, values };
      });

      series.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const normalized: NormalizedTechnicalIndicator = {
        symbol: mapped.originalSymbol,
        indicator,
        interval,
        timePeriod: effTimePeriod,
        series,
        source: "ALPHA_VANTAGE",
        dataStatus: "HISTORICAL",
        timestamp: new Date().toISOString(),
      };

      globalAlphaVantageCache.set(cacheKey, normalized, AlphaVantageCache.TTL.INDICATOR);

      return {
        status: "SUCCESS",
        success: true,
        data: normalized,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: err.code || "PROVIDER_ERROR",
        success: false,
        data: null,
        message: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 5. GET NEWS & MARKET SENTIMENT
   */
  public async getNewsSentiment(
    tickers?: string[],
    topics?: string[]
  ): Promise<AlphaVantageApiResponse<NormalizedSentimentFeed[]>> {
    const tickerStr = tickers && tickers.length > 0 ? tickers.map((t) => resolveAlphaVantageSymbol(t).avSymbol).join(",") : "";
    const topicStr = topics && topics.length > 0 ? topics.join(",") : "";
    const cacheKey = globalAlphaVantageCache.makeKey("SENTIMENT", { tickers: tickerStr, topics: topicStr });

    try {
      if (!this.getApiKey()) {
        return {
          status: "NOT_CONFIGURED",
          success: false,
          data: null,
          message: "Alpha Vantage API key not configured.",
          timestamp: new Date().toISOString(),
        };
      }

      const cached = globalAlphaVantageCache.get<NormalizedSentimentFeed[]>(cacheKey);
      if (cached) {
        return {
          status: "SUCCESS",
          success: true,
          data: cached.data,
          isCached: true,
          cachedAt: cached.cachedAt,
          timestamp: new Date().toISOString(),
        };
      }

      const params: Record<string, string> = { function: "NEWS_SENTIMENT" };
      if (tickerStr) params.tickers = tickerStr;
      if (topicStr) params.topics = topicStr;

      const { data, latencyMs } = await this.rawQuery(params);
      const feed = data.feed;

      if (!Array.isArray(feed)) {
        return {
          status: "SUCCESS",
          success: true,
          data: [],
          message: "No news sentiment items returned.",
          timestamp: new Date().toISOString(),
        };
      }

      const normalized: NormalizedSentimentFeed[] = feed.map((item: any) => ({
        title: item.title || "",
        url: item.url || "",
        timePublished: item.time_published || "",
        summary: item.summary || "",
        overallSentimentScore: parseFloat(item.overall_sentiment_score) || 0,
        overallSentimentLabel: item.overall_sentiment_label || "Neutral",
        tickerSentiment: item.ticker_sentiment || [],
      }));

      globalAlphaVantageCache.set(cacheKey, normalized, AlphaVantageCache.TTL.SENTIMENT);

      return {
        status: "SUCCESS",
        success: true,
        data: normalized,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: err.code || "PROVIDER_ERROR",
        success: false,
        data: null,
        message: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 6. GET PROVIDER STATUS TELEMETRY
   */
  public async getStatus(): Promise<AlphaVantageStatusResponse> {
    const hasApiKey = Boolean(this.getApiKey());
    const isRateLimited = Date.now() < this.rateLimitedUntil;

    return {
      status: !hasApiKey ? "NOT_CONFIGURED" : isRateLimited ? "RATE_LIMITED" : "CONNECTED",
      connected: hasApiKey && !isRateLimited,
      hasApiKey,
      apiKeyMasked: this.getMaskedKey(),
      latencyMs: 12,
      rateLimit: {
        maxCallsPerMin: parseInt(process.env.ALPHA_VANTAGE_MAX_CALLS_PER_MIN || "", 10) || DEFAULT_MAX_CALLS_PER_MIN,
        callsMadeThisMin: this.callTimestamps.filter((t) => Date.now() - t < 60000).length,
        isRateLimited,
        rateLimitedUntil: isRateLimited ? new Date(this.rateLimitedUntil).toISOString() : null,
      },
      supportedCapabilities: [
        "Daily OHLCV (TIME_SERIES_DAILY_ADJUSTED)",
        "Intraday OHLCV (1m, 5m, 15m, 30m, 60m)",
        "Real-Time Quotes (GLOBAL_QUOTE)",
        "Technical Indicators (EMA, SMA, RSI, MACD, VWAP, ATR, BBANDS)",
        "Forex & Currency Pairs (FX_DAILY, CURRENCY_EXCHANGE_RATE)",
        "Crypto Daily & Intraday (DIGITAL_CURRENCY_DAILY, CRYPTO_INTRADAY)",
        "Market News & Sentiment (NEWS_SENTIMENT)",
        "Indian BSE / Global Equities Coverage",
      ],
      providerRole: "MARKET_DATA_ONLY",
      orderExecutionBroker: "BINANCE_UPSTOX_PAPER_UNMODIFIED",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 7. PING / DIAGNOSTIC TEST
   */
  public async ping(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const t0 = performance.now();
    if (!this.getApiKey()) {
      return {
        success: false,
        latencyMs: 0,
        message: "Alpha Vantage API Key is missing in server environment (ALPHA_VANTAGE_API_KEY).",
      };
    }

    try {
      const res = await this.getQuote("AAPL");
      const latencyMs = Math.round(performance.now() - t0);

      if (res.success && res.data) {
        return {
          success: true,
          latencyMs,
          message: `Alpha Vantage REST Ping OK: ${res.data.symbol} price $${res.data.price} (${latencyMs}ms). Feed is operational.`,
        };
      }

      return {
        success: false,
        latencyMs,
        message: res.message || "Alpha Vantage test query failed.",
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - t0),
        message: `Diagnostic ping error: ${err.message}`,
      };
    }
  }
}

// Global server singleton
export const globalAlphaVantageClient = new AlphaVantageClient();
