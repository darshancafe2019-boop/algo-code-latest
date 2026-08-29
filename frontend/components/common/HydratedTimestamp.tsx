"use client";

import React, { useEffect, useState } from "react";

export interface HydratedTimestampProps {
  timestamp?: string | number | Date | null;
  className?: string;
  fallback?: string;
  formatType?: "time" | "date" | "datetime";
  options?: Intl.DateTimeFormatOptions;
  locale?: string;
}

export function HydratedTimestamp({
  timestamp,
  className,
  fallback = "--:--:--",
  formatType = "time",
  options,
  locale = "en-IN",
}: HydratedTimestampProps) {
  const [formatted, setFormatted] = useState<string>(fallback);

  useEffect(() => {
    if (!timestamp) {
      setFormatted(fallback);
      return;
    }

    try {
      const d = typeof timestamp === "string" || typeof timestamp === "number" ? new Date(timestamp) : timestamp;
      if (isNaN(d.getTime())) {
        setFormatted(fallback);
        return;
      }

      const defaultOptions: Intl.DateTimeFormatOptions =
        formatType === "time"
          ? { hour: "numeric", minute: "2-digit", second: "2-digit" }
          : formatType === "date"
          ? { year: "numeric", month: "short", day: "numeric" }
          : { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" };

      const formatter = new Intl.DateTimeFormat(locale, options || defaultOptions);
      setFormatted(formatter.format(d));
    } catch {
      setFormatted(fallback);
    }
  }, [timestamp, formatType, options, locale, fallback]);

  return <span className={className} suppressHydrationWarning>{formatted}</span>;
}

export function useHydratedTime(initialFallback: string = "--:--:--") {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(initialFallback);

  useEffect(() => {
    setIsHydrated(true);
    const update = () => {
      try {
        setCurrentTime(new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()));
      } catch {
        setCurrentTime(new Date().toISOString().substring(11, 19));
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [initialFallback]);

  return { isHydrated, currentTime };
}
