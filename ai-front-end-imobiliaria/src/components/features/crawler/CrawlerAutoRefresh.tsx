"use client";

import { RefreshCw } from "lucide-react";
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
    <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums" role="status">
      <RefreshCw aria-hidden="true" className="size-3.5" />
      Atualizando em {secondsUntilRefresh} {secondsUntilRefresh === 1 ? "segundo" : "segundos"}
    </div>
  );
}
