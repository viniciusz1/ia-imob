"use client";
import { usePathname } from "next/navigation";
import { CrawlerAutoRefresh } from "./CrawlerAutoRefresh";
export function CrawlerRefreshBoundary() {
  const pathname = usePathname();
  return pathname.startsWith("/admin/crawler/batches") ? null : (
    <CrawlerAutoRefresh />
  );
}
