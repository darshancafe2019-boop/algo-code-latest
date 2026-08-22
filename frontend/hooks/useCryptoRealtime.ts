"use client";

import { useState, useEffect, useRef } from "react";
import { DataQualityStatus } from "@/types/crypto-derivatives";

export interface CryptoTickData {
  type: string;
  underlying: string;
  spot_price: number;
  futures_price: number;
  mark_price: number;
  funding_rate_pct: number;
  funding_countdown: string;
  open_interest: number;
  timestamp: string;
}

export function useCryptoRealtime() {
  const [latestTick, setLatestTick] = useState<CryptoTickData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<DataQualityStatus>("LIVE");
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;

    const connectSSE = () => {
      if (!isMountedRef.current) return;

      // Close previous connection if any
      if (es) {
        try {
          es.close();
        } catch {}
        es = null;
      }

      try {
        es = new EventSource("/api/stream/crypto");

        es.onopen = () => {
          if (!isMountedRef.current) return;
          retryAttempt = 0;
          const now = Date.now();
          lastHeartbeatRef.current = now;
          setLastHeartbeatTime(now);
          setConnectionStatus("LIVE");
        };

        es.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            const now = Date.now();
            lastHeartbeatRef.current = now;
            setLastHeartbeatTime(now);

            if (data.type === "CRYPTO_TICK") {
              setLatestTick(data);
              setConnectionStatus("LIVE");
            } else if (data.type === "HEARTBEAT") {
              setConnectionStatus("LIVE");
            }
          } catch {
            // Ignore malformed frames
          }
        };

        es.onerror = () => {
          if (!isMountedRef.current) return;
          setConnectionStatus("DISCONNECTED");
          if (es) {
            try {
              es.close();
            } catch {}
            es = null;
          }

          // Exponential backoff with jitter
          retryAttempt = Math.min(retryAttempt + 1, 5);
          const delay = Math.min(10000, 1000 * Math.pow(1.5, retryAttempt) + Math.floor(Math.random() * 500));
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, delay);
        };
      } catch {
        if (!isMountedRef.current) return;
        setConnectionStatus("DISCONNECTED");
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, 4000);
      }
    };

    connectSSE();

    // Heartbeat watchdog: checks staleness without triggering re-connection
    const watchdog = setInterval(() => {
      if (!isMountedRef.current) return;
      const elapsed = Date.now() - lastHeartbeatRef.current;
      if (elapsed > 20000) {
        setConnectionStatus("STALE");
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      clearInterval(watchdog);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) {
        try {
          es.close();
        } catch {}
      }
    };
  }, []); // Run only once on mount

  return {
    latestTick,
    connectionStatus,
    lastHeartbeat: lastHeartbeatTime,
  };
}
