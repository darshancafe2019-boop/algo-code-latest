/**
 * Stocks Real-Time Streaming Client (SSE / Polling)
 * ==================================================
 */

import { StockQuoteRow } from "../types/stocks";

export class StockStreamClient {
  private eventSource: EventSource | null = null;
  private listeners: ((quotes: StockQuoteRow[]) => void)[] = [];

  public connect(): void {
    if (this.eventSource || typeof window === "undefined") return;

    try {
      this.eventSource = new EventSource("/api/market-data/stocks/stream");

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "STOCKS_TICK" && Array.isArray(parsed.data)) {
            this.notify(parsed.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      };
    } catch {
      // Fallback to no SSE
    }
  }

  public subscribe(callback: (quotes: StockQuoteRow[]) => void): () => void {
    this.listeners.push(callback);
    this.connect();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
      if (this.listeners.length === 0 && this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  private notify(quotes: StockQuoteRow[]): void {
    for (const listener of this.listeners) {
      listener(quotes);
    }
  }
}

export const globalStockStreamClient = new StockStreamClient();
