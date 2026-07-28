"use client";

import { useEffect, useRef } from "react";

import { getOnboardingExecution } from "@/services/crawlerService";
import type { OnboardingExecution } from "@/types/crawler";

import { crawlerPollInterval } from "../operations/crawlerPolling";

const TERMINAL_STATES: OnboardingExecution["state"][] = ["completed", "cancelled"];

export function isTerminalOnboardingExecution(execution: OnboardingExecution): boolean {
  return TERMINAL_STATES.includes(execution.state);
}

interface OnboardingExecutionPollingOptions {
  execution: OnboardingExecution | null;
  onError?: (error: unknown) => void;
  onExecution: (execution: OnboardingExecution) => void;
}

export function useOnboardingExecutionPolling({
  execution,
  onError,
  onExecution,
}: OnboardingExecutionPollingOptions) {
  const onErrorRef = useRef(onError);
  const onExecutionRef = useRef(onExecution);
  const executionId = execution?.id;
  const terminal = execution === null || isTerminalOnboardingExecution(execution);

  useEffect(() => {
    onErrorRef.current = onError;
    onExecutionRef.current = onExecution;
  }, [onError, onExecution]);

  useEffect(() => {
    if (executionId === undefined || terminal) return;

    let interval: number | undefined;
    let disposed = false;
    const poll = () => {
      void getOnboardingExecution(executionId)
        .then((updated) => {
          if (!disposed) onExecutionRef.current(updated);
        })
        .catch((error: unknown) => {
          if (!disposed) onErrorRef.current?.(error);
        });
    };
    const schedule = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = window.setInterval(poll, crawlerPollInterval(document.visibilityState));
    };

    poll();
    schedule();
    document.addEventListener("visibilitychange", schedule);

    return () => {
      disposed = true;
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [executionId, terminal]);
}
