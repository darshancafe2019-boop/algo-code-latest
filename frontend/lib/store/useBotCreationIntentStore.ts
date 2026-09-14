import { create } from "zustand";
import { BotCreationIntent } from "@/types/bot-creation-intent";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const STORAGE_KEY = "quantos_active_bot_creation_intent";

interface BotCreationIntentState {
  activeIntent: BotCreationIntent | null;
  setIntent: (intent: BotCreationIntent) => void;
  clearIntent: () => void;
  loadStoredIntent: () => BotCreationIntent | null;
}

export const useBotCreationIntentStore = create<BotCreationIntentState>((set) => ({
  activeIntent: null,
  setIntent: (intent: BotCreationIntent) => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
      }
    } catch {
      // ignore storage errors
    }
    set({ activeIntent: intent });
  },
  clearIntent: () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
    set({ activeIntent: null });
  },
  loadStoredIntent: () => {
    try {
      if (typeof window !== "undefined") {
        const item = sessionStorage.getItem(STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item) as BotCreationIntent;
          set({ activeIntent: parsed });
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  },
}));

/**
 * Dispatches a typed BotCreationIntent:
 * 1. Generates an idempotency intent ID if missing
 * 2. Saves intent into central Zustand store and sessionStorage
 * 3. Navigates to `/bots/create` with minimal non-sensitive URL query params
 */
export function dispatchBotCreation(
  router: AppRouterInstance | { push: (url: string) => void },
  intent: BotCreationIntent
) {
  const intentWithId: BotCreationIntent = {
    ...intent,
    creationIntentId: intent.creationIntentId || `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: intent.timestamp || Date.now(),
  };

  useBotCreationIntentStore.getState().setIntent(intentWithId);

  const queryParams = new URLSearchParams();
  queryParams.set("symbol", intentWithId.symbol);
  queryParams.set("side", intentWithId.side);
  queryParams.set("origin", intentWithId.origin);
  if (intentWithId.assetClass) queryParams.set("assetClass", intentWithId.assetClass);
  if (intentWithId.broker) queryParams.set("broker", intentWithId.broker);

  router.push(`/bots/create?${queryParams.toString()}`);
}
