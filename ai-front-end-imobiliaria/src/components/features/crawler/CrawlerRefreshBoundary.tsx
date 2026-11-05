"use client";

import { usePathname } from "next/navigation";
import { CrawlerAutoRefresh } from "./CrawlerAutoRefresh";

const AUTO_REFRESH_EXACT_PATHS = new Set([
  "/admin/crawler",
  "/admin/crawler/agencies",
]);

const AUTO_REFRESH_PREFIXES = [
  "/admin/crawler/prospects",
  "/admin/crawler/queue",
  "/admin/crawler/quality",
];

export function shouldAutoRefreshCrawlerPath(pathname: string): boolean {
  if (AUTO_REFRESH_EXACT_PATHS.has(pathname)) return true;
  return AUTO_REFRESH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function CrawlerRefreshBoundary() {
  const pathname = usePathname();
  return shouldAutoRefreshCrawlerPath(pathname) ? <CrawlerAutoRefresh /> : null;
}
