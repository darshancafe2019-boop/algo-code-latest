"use client";

import { useState, useEffect, useRef } from "react";
import { DataQualityStatus } from "@/types/crypto-derivatives";
import { apiClient } from "@/lib/apiClient";

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

    const handle = apiClient.createResilientEventSource("/api/stream/crypto", {
      key: "stream_crypto",
      onOpen: () => {
        if (!isMountedRef.current) return;
        const now = Date.now();
        lastHeartbeatRef.current = now;
        setLastHeartbeatTime(now);
        setConnectionStatus("LIVE");
      },
      onMessage: (data) => {
        if (!isMountedRef.current) return;
        const now = Date.now();
        lastHeartbeatRef.current = now;
        setLastHeartbeatTime(now);

        if (data?.type === "CRYPTO_TICK") {
          setLatestTick(data);
          setConnectionStatus("LIVE");
        } else if (data?.type === "HEARTBEAT") {
          setConnectionStatus("LIVE");
        }
      },
      onStateChange: (state) => {
        if (!isMountedRef.current) return;
        if (state === "CLOSED" || state === "RECONNECTING") {
          setConnectionStatus("DISCONNECTED");
        } else if (state === "OPEN") {
          setConnectionStatus("LIVE");
        }
      },
    });

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
      handle.close();
    };
  }, []);

  return {
    latestTick,
    connectionStatus,
    lastHeartbeat: lastHeartbeatTime,
  };
}
