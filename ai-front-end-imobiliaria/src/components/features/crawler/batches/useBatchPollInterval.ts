"use client";
import { useEffect, useState } from "react";
import { crawlerPollInterval } from "../operations/crawlerPolling";
export function useBatchPollInterval(): number {
  const [visibility, setVisibility] =
    useState<DocumentVisibilityState>("visible");
  useEffect(() => {
    const update = () => setVisibility(document.visibilityState);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return crawlerPollInterval(visibility);
}
