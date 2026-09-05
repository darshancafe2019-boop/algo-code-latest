"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { apiClient, ApiError } from "@/lib/apiClient";

export type AsyncCommandStatus = "idle" | "pending" | "success" | "error";

export interface AsyncCommandState<T = unknown> {
  status: AsyncCommandStatus;
  isPending: boolean;
  data: T | null;
  error: ApiError | null;
  errorMessage: string | null;
  lastExecutedAt: number | null;
  idempotencyKey: string | null;
}

export interface UseAsyncCommandOptions<TParams = unknown, TResult = unknown> {
  actionName: string;
  targetId?: string;
  timeoutMs?: number;
  onSuccess?: (data: TResult, params: TParams) => void | Promise<void>;
  onError?: (error: ApiError, params: TParams) => void;
  onRollback?: (params: TParams) => void;
  resetSuccessDelayMs?: number;
}

export interface UseAsyncCommandResult<TParams = void, TResult = unknown> {
  execute: (params: TParams) => Promise<TResult | null>;
  state: AsyncCommandState<TResult>;
  isPending: boolean;
  status: AsyncCommandStatus;
  data: TResult | null;
  error: ApiError | null;
  errorMessage: string | null;
  reset: () => void;
}

/**
 * useAsyncCommand
 * ===============
 * Institutional single-click command executor for Quant.OS.
 * 
 * Guarantees:
 * 1. Immediate in-flight locking: rapid double/multi-clicks are blocked before network dispatch.
 * 2. Automatic unique idempotency key generation (`crypto.randomUUID()`).
 * 3. Timeout protection with AbortSignal.
 * 4. Structured status state machine: 'idle' | 'pending' | 'success' | 'error'.
 * 5. Memory leak protection: safely unmounts without state updates.
 */
export function useAsyncCommand<TParams = void, TResult = unknown>(
  commandFn: (params: TParams, signal: AbortSignal, idempotencyKey: string) => Promise<TResult>,
  options: UseAsyncCommandOptions<TParams, TResult>
): UseAsyncCommandResult<TParams, TResult> {
  const {
    actionName,
    targetId,
    timeoutMs = 15000,
    onSuccess,
    onError,
    onRollback,
    resetSuccessDelayMs,
  } = options;

  const [state, setState] = useState<AsyncCommandState<TResult>>({
    status: "idle",
    isPending: false,
    data: null,
    error: null,
    errorMessage: null,
    lastExecutedAt: null,
    idempotencyKey: null,
  });

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const activeControllerRef = useRef<AbortController | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
        activeControllerRef.current = null;
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (isMountedRef.current) {
      setState({
        status: "idle",
        isPending: false,
        data: null,
        error: null,
        errorMessage: null,
        lastExecutedAt: null,
        idempotencyKey: null,
      });
    }
  }, []);

  const execute = useCallback(
    async (params: TParams): Promise<TResult | null> => {
      // 1. Single-Click Lock: If command is already in flight, drop duplicate clicks immediately
      if (inFlightRef.current) {
        console.warn(`[COMMAND_LOCK] Action '${actionName}' is already executing. Dropping duplicate click.`);
        return null;
      }

      inFlightRef.current = true;

      // Abort any prior orphaned controller
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeControllerRef.current = controller;
      const timeoutTimer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const idempotencyKey = apiClient.generateIdempotencyKey(actionName, targetId);

      if (isMountedRef.current) {
        setState({
          status: "pending",
          isPending: true,
          data: null,
          error: null,
          errorMessage: null,
          lastExecutedAt: Date.now(),
          idempotencyKey,
        });
      }

      try {
        const result = await commandFn(params, controller.signal, idempotencyKey);
        clearTimeout(timeoutTimer);
        activeControllerRef.current = null;
        inFlightRef.current = false;

        if (isMountedRef.current) {
          setState({
            status: "success",
            isPending: false,
            data: result,
            error: null,
            errorMessage: null,
            lastExecutedAt: Date.now(),
            idempotencyKey,
          });

          if (resetSuccessDelayMs && resetSuccessDelayMs > 0) {
            resetTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setState((prev) => (prev.status === "success" ? { ...prev, status: "idle" } : prev));
              }
            }, resetSuccessDelayMs);
          }
        }

        if (onSuccess) {
          try {
            await onSuccess(result, params);
          } catch (callbackErr) {
            console.error(`[COMMAND_SUCCESS_CALLBACK_ERROR] in '${actionName}':`, callbackErr);
          }
        }

        return result;
      } catch (err: unknown) {
        clearTimeout(timeoutTimer);
        activeControllerRef.current = null;
        inFlightRef.current = false;

        const isAbort = err instanceof Error && err.name === "AbortError";
        const normalizedError: ApiError = {
          code: isAbort ? "REQUEST_TIMEOUT" : "BUSINESS_LOGIC_ERROR",
          message: isAbort
            ? `Command '${actionName}' timed out after ${timeoutMs}ms`
            : err instanceof Error
            ? err.message
            : "An unexpected error occurred while processing command.",
          details: err,
        };

        if (isMountedRef.current) {
          setState({
            status: "error",
            isPending: false,
            data: null,
            error: normalizedError,
            errorMessage: normalizedError.message,
            lastExecutedAt: Date.now(),
            idempotencyKey,
          });
        }

        if (onRollback) {
          try {
            onRollback(params);
          } catch (rollbackErr) {
            console.error(`[COMMAND_ROLLBACK_ERROR] in '${actionName}':`, rollbackErr);
          }
        }

        if (onError) {
          try {
            onError(normalizedError, params);
          } catch (errorCallbackErr) {
            console.error(`[COMMAND_ERROR_CALLBACK_ERROR] in '${actionName}':`, errorCallbackErr);
          }
        }

        return null;
      }
    },
    [
      actionName,
      targetId,
      timeoutMs,
      commandFn,
      onSuccess,
      onError,
      onRollback,
      resetSuccessDelayMs,
    ]
  );

  return {
    execute,
    state,
    isPending: state.isPending,
    status: state.status,
    data: state.data,
    error: state.error,
    errorMessage: state.errorMessage,
    reset,
  };
}
