"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const CRAWLER_REFRESH_INTERVAL_MS = 5_000;
const CRAWLER_REFRESH_INTERVAL_SECONDS = CRAWLER_REFRESH_INTERVAL_MS / 1_000;

export function CrawlerAutoRefresh() {
  const router = useRouter();
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(CRAWLER_REFRESH_INTERVAL_SECONDS);
  const secondsUntilRefreshRef = useRef(CRAWLER_REFRESH_INTERVAL_SECONDS);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextSeconds = secondsUntilRefreshRef.current > 1
        ? secondsUntilRefreshRef.current - 1
        : CRAWLER_REFRESH_INTERVAL_SECONDS;

      secondsUntilRefreshRef.current = nextSeconds;
      setSecondsUntilRefresh(nextSeconds);

      if (nextSeconds === CRAWLER_REFRESH_INTERVAL_SECONDS) router.refresh();
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="flex justify-end border-b bg-muted/20 px-6 py-2 text-xs text-muted-foreground" role="status">
      Atualizando em {secondsUntilRefresh} {secondsUntilRefresh === 1 ? "segundo" : "segundos"}
    </div>
  );
}
