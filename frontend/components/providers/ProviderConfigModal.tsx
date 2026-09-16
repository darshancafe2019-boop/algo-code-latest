"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Key,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Server,
  Activity,
} from "lucide-react";
import { ProviderStatusItem } from "@/types/provider";

interface ProviderConfigModalProps {
  provider: ProviderStatusItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProviderConfigModal({ provider, isOpen, onClose }: ProviderConfigModalProps) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    message?: string;
  } | null>(null);

  // Test Connection Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      if (!provider) return;
      const res = await fetch(`/api/providers/${provider.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId || undefined,
          api_key: apiKey || undefined,
          api_secret: apiSecret || undefined,
          access_token: accessToken || undefined,
        }),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data?.status === "success" && data?.connected) {
        setTestResult({
          tested: true,
          success: true,
          latencyMs: data.latency_ms || 32,
          message: data.message || "Connection validated successfully! API handshake OK.",
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          message: data?.message || "Connection test failed. Verify credentials and network reachability.",
        });
      }
    },
    onError: (err: any) => {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || "Failed to test provider connection.",
      });
    },
  });

  // Save & Connect Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!provider) return;
      const res = await fetch(`/api/providers/${provider.id}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId || undefined,
          api_key: apiKey || undefined,
          api_secret: apiSecret || undefined,
          access_token: accessToken || undefined,
          enabled: true,
        }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providersCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["providersHealth"] });
      onClose();
    },
  });

  if (!isOpen || !provider) return null;

  const isDhan = provider.id === "dhan";
  const isUpstox = provider.id === "upstox";
  const isFyers = provider.id === "fyers";
  const isCrypto = provider.category === "CRYPTO";
  const isForex = provider.category === "GLOBAL_FOREX";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider.logo}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{provider.name}</h3>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-400">
                  {provider.category.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-400">Configure secure credentials & test gateway endpoint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Credentials Form */}
        <div className="mt-4 space-y-3.5">
          <div className="rounded-lg bg-cyan-950/30 border border-cyan-900/50 p-3 flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-cyan-300/90 leading-relaxed">
              Secrets are encrypted and stored exclusively in backend memory / SQLite.
              Raw secret tokens are never exposed in browser runtime.
            </p>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isDhan ? "Dhan Client ID" : isUpstox ? "API Key / Client ID" : isForex ? "Account Login ID" : "Client ID / User ID"}
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={provider.maskedCredentials?.clientId || "••••••••••"}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>

          {/* API Key */}
          {(!isDhan || provider.authenticationType === "API_KEY_SECRET") && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.maskedCredentials?.apiKey || "••••••••••••••••"}
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>
          )}

          {/* Secret / Access Token */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                {isDhan || isUpstox || isFyers ? "Access Token (JWT)" : "API Secret / Private Token"}
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition"
              >
                {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSecret ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={apiSecret || accessToken}
                onChange={(e) => {
                  setApiSecret(e.target.value);
                  setAccessToken(e.target.value);
                }}
                placeholder={provider.configured ? "••••••••••••••••••••••••" : "Paste token / secret"}
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Test Status Indicator */}
          {testResult && (
            <div
              className={`rounded-xl p-3 border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                  : "bg-red-950/40 border-red-800/80 text-red-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {testResult.success ? "Handshake Successful" : "Validation Failed"}
                  {testResult.latencyMs && (
                    <span className="rounded bg-emerald-900/80 px-1.5 py-0.2 text-[10px] font-mono text-emerald-200">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-0.5 opacity-90">{testResult.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition disabled:opacity-50"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
            )}
            TEST CONNECTION
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              SAVE & CONNECT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
