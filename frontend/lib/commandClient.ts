"use client";

import { QueryClient } from "@tanstack/react-query";
import { apiClient } from "./apiClient";

export interface CommandResponse<T = any> {
  command_id?: string;
  action: string;
  bot_id?: string;
  status: "ACCEPTED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "REJECTED";
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  latency_ms?: number;
}

// In-flight command tracking map to prevent duplicate executions across identical targets
const activeInFlightCommands = new Map<string, Promise<CommandResponse<any>>>();

export function generateIdempotencyKey(action: string, botId?: string): string {
  return apiClient.generateIdempotencyKey(action, botId || undefined);
}

export async function executeCommand<T = any>(
  action: string,
  botId?: string | null,
  payload: Record<string, any> = {},
  queryClient?: QueryClient,
  customInvalidations?: string[]
): Promise<CommandResponse<T>> {
  const lockKey = `${action}:${botId || "GLOBAL"}`;

  // If identical command is in flight, reuse/await existing promise rather than firing duplicate broker/engine requests
  if (activeInFlightCommands.has(lockKey)) {
    console.warn(`[COMMAND_LOCK] Action '${lockKey}' already in flight. Awaiting authoritative in-flight promise.`);
    return activeInFlightCommands.get(lockKey) as Promise<CommandResponse<T>>;
  }

  const idempotencyKey = generateIdempotencyKey(action, botId || undefined);

  const commandPromise = (async (): Promise<CommandResponse<T>> => {
    try {
      const res = await apiClient.post<CommandResponse<T>>(
        "/api/command",
        {
          action,
          bot_id: botId || undefined,
          payload,
          idempotency_key: idempotencyKey,
        },
        {
          idempotencyKey,
          timeoutMs: 15000,
        }
      );

      if (!res.ok) {
        const errMsg = res.error?.message || `Command ${action} failed`;
        throw new Error(errMsg);
      }

      const data = res.data;
      if (!data || data.success === false || data.status === "FAILED" || data.status === "REJECTED") {
        const errMsg = data?.message || data?.error || `Command ${action} was rejected by engine`;
        throw new Error(errMsg);
      }

      // Automatically trigger cache invalidations on success
      if (queryClient) {
        const defaultKeys = [
          "botsList",
          "botsSummary",
          "systemStatus",
          "systemHealth",
          "openPositions",
          "tradeJournal",
          "riskOverview",
          "auditEvents",
          "marketUniverseMaster",
          "authoritativeFleetBots",
        ];
        const keysToInvalidate = customInvalidations ? [...defaultKeys, ...customInvalidations] : defaultKeys;

        for (const key of keysToInvalidate) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }

      return data;
    } catch (error: any) {
      console.error(`[COMMAND_CLIENT_ERROR] executing action '${action}':`, error?.message || error);
      throw error;
    } finally {
      activeInFlightCommands.delete(lockKey);
    }
  })();

  activeInFlightCommands.set(lockKey, commandPromise);
  return commandPromise;
}

