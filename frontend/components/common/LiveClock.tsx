"use client";

import React, { useEffect, useState } from "react";

export interface LiveClockProps {
  className?: string;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
}

export function LiveClock({
  className,
  locale = "en-IN",
  options = {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  },
  fallback = "--:--:--",
}: LiveClockProps) {
  const [time, setTime] = useState<string>(fallback);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(locale, options);
    const updateTime = () => {
      try {
        setTime(formatter.format(new Date()));
      } catch {
        setTime(new Date().toISOString().substring(11, 19));
      }
    };

    updateTime();
    const timer = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(timer);
  }, [locale, options]);

  return <span className={className} suppressHydrationWarning>{time}</span>;
}
