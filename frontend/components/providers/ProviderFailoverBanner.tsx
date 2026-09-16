"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, Loader2, X } from "lucide-react";
import { ProviderCatalogResponse } from "@/types/provider";

export function ProviderFailoverBanner() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = React.useState(false);

  const { data: catalog } = useQuery<ProviderCatalogResponse>({
    queryKey: ["providersCatalog"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      if (!res.ok) return null;
      return await res.json();
    },
    refetchInterval: 4000,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async ({ role, providerId }: { role: string; providerId: string }) => {
      const res = await fetch("/api/providers/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, provider_id: providerId }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providersCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["providersHealth"] });
      setDismissed(true);
    },
  });

  if (!catalog || dismissed) return null;

  const activeMdId = catalog.active_roles?.marketDataProvider || "dhan";
  const secondaryId = catalog.active_roles?.secondaryFailoverProvider || "fyers";

  const primaryProvider = catalog.providers?.find((p) => p.id === activeMdId);
  const secondaryProvider = catalog.providers?.find((p) => p.id === secondaryId);

  // If primary provider is in error, stale, auth_expired, or disconnected
  const isProblematic =
    primaryProvider &&
    ["DISCONNECTED", "STALE", "ERROR", "AUTH_EXPIRED", "RATE_LIMITED"].includes(
      primaryProvider.connectionState || "DISCONNECTED"
    );

  if (!isProblematic || !primaryProvider) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/90 via-red-950/80 to-amber-950/90 border-b border-red-500/40 px-4 py-2 text-white shadow-lg backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="rounded-full bg-red-500/20 p-1 border border-red-500/40 animate-pulse">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <span className="font-bold text-red-200 uppercase tracking-wide mr-1.5">
              PRIMARY DATA PROVIDER OFFLINE:
            </span>
            <span className="text-slate-200">
              <strong className="text-white">{primaryProvider.name}</strong> feed state is{" "}
              <span className="font-mono text-red-400 font-bold">
                {primaryProvider.connectionState}
              </span>
              . Risk Engine has restricted new automated decision locks.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {secondaryProvider && secondaryProvider.id !== primaryProvider.id && (
            <button
              onClick={() =>
                switchRoleMutation.mutate({
                  role: "market_data_provider",
                  providerId: secondaryProvider.id,
                })
              }
              disabled={switchRoleMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] shadow transition active:scale-95 disabled:opacity-50"
            >
              {switchRoleMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
              Switch Data to {secondaryProvider.name}
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-red-900/40 transition"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
