"use client";

import { useEffect, useState } from "react";

const utcTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function StableUtcClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span aria-label="Current UTC time">
      {now ? `${utcTimeFormatter.format(now)} UTC` : "--:--:-- UTC"}
    </span>
  );
}
