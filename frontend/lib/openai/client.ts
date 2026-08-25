import OpenAI from "openai";
import { getOpenAiConfig } from "./config";

let globalOpenAiClient: OpenAI | null = null;

/**
 * Returns a server-side singleton instance of the OpenAI client.
 * Strictly instantiates once and prevents recreation across render passes.
 */
export function getOpenAiClient(): OpenAI | null {
  const config = getOpenAiConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!globalOpenAiClient) {
    globalOpenAiClient = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs,
      maxRetries: 2,
    });
  }

  return globalOpenAiClient;
}

/**
 * Resets the client instance if configuration changes.
 */
export function resetOpenAiClient(): void {
  globalOpenAiClient = null;
}
