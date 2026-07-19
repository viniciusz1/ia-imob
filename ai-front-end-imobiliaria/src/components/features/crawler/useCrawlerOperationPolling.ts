"use client";

import { useEffect, useRef } from "react";

import { getCrawlerOperation } from "@/services/crawlerService";
import type { CrawlerOperation } from "@/types/crawler";

import { crawlerPollInterval } from "./operations/crawlerPolling";

export const ACTIVE_CRAWLER_OPERATION_STATES: CrawlerOperation["state"][] = ["queued", "running", "cancellation_requested"];

export function isActiveCrawlerOperation(operation: CrawlerOperation): boolean {
  return ACTIVE_CRAWLER_OPERATION_STATES.includes(operation.state);
}

interface CrawlerOperationPollingOptions {
  enabled?: boolean;
  onError?: (operationId: number, error: unknown) => void;
  onOperation: (operation: CrawlerOperation) => void;
  operations: CrawlerOperation[];
}

export function useCrawlerOperationPolling({ enabled = true, onError, onOperation, operations }: CrawlerOperationPollingOptions) {
  const onErrorRef = useRef(onError);
  const onOperationRef = useRef(onOperation);
  onErrorRef.current = onError;
  onOperationRef.current = onOperation;
  const activeIds = operations.filter(isActiveCrawlerOperation).map((operation) => operation.id);
  const activeIdsKey = activeIds.join(",");

  useEffect(() => {
    if (!enabled || activeIds.length === 0) return;
    let interval: number | undefined;
    const poll = () => {
      for (const operationId of activeIds) {
        void getCrawlerOperation(operationId)
          .then((operation) => onOperationRef.current(operation))
          .catch((error: unknown) => onErrorRef.current?.(operationId, error));
      }
    };
    const schedule = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = window.setInterval(poll, crawlerPollInterval(document.visibilityState));
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", schedule);
    };
    // activeIdsKey is the stable serialization of the operation IDs this subscription owns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdsKey, enabled]);
}
