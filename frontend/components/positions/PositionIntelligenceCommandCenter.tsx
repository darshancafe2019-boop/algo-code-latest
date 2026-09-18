"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { apiClient } from "@/lib/apiClient";
import { PositionItem } from "@/types/data-core";
import { Position20GateRiskMatrix } from "./Position20GateRiskMatrix";
import { PositionOrderFlowViewer } from "./PositionOrderFlowViewer";
import { LiveStreamObservatory } from "@/components/stream/LiveStreamObservatory";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Edit2,
  Eye,
  Layers,
  Percent,
  RefreshCw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  Sliders,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from "lucide-react";

export function PositionIntelligenceCommandCenter() {
  const queryClient = useQueryClient();
  const {
    environment,
    setEnvironment,
    positions,
    portfolioSummary,
    reconciliation,
    providersSummary,
    refreshAll,
  } = useQuantDataCore();

  const [activeTab, setActiveTab] = useState<
    "overview" | "positions" | "exposure" | "order_flow" | "orders" | "risk" | "stream" | "providers" | "reconciliation"
  >("positions");

  const [selectedPosition, setSelectedPosition] = useState<PositionItem | null>(null);
  const [modifyingPosition, setModifyingPosition] = useState<PositionItem | null>(null);
  const [newStopLoss, setNewStopLoss] = useState<string>("");
  const [newTakeProfit, setNewTakeProfit] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Close Position Mutation
  const closePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const res = await apiClient.post(`/api/v2/positions/${positionId}/close`);
      if (!res.ok) throw new Error(res.error?.message || "Failed to close position");
      return res.data;
    },
    onSuccess: () => {
      setStatusMessage({ text: "Position safely closed via Central OMS.", type: "success" });
      setTimeout(() => setStatusMessage(null), 4000);
      refreshAll();
    },
    onError: (err: any) => {
      setStatusMessage({ text: `Failed to close position: ${err.message}`, type: "error" });
      setTimeout(() => setStatusMessage(null), 4000);
    },
  });

  // Modify Protection Mutation
  const modifyProtectionMutation = useMutation({
    mutationFn: async ({ id, sl, tp }: { id: string; sl?: number; tp?: number }) => {
      const res = await apiClient.post(`/api/v2/positions/${id}/modify-protection`, {
        stopLoss: sl,
        takeProfit: tp,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to modify protection");
      return res.data;
    },
    onSuccess: () => {
      setStatusMessage({ text: "Position SL/TP protection updated in Risk Engine.", type: "success" });
      setTimeout(() => setStatusMessage(null), 4000);
      setModifyingPosition(null);
      refreshAll();
    },
    onError: (err: any) => {
      setStatusMessage({ text: `Protection update failed: ${err.message}`, type: "error" });
      setTimeout(() => setStatusMessage(null), 4000);
    },
  });

  // KPI Calculations
  const totalUnrealized = positions.reduce((sum, p) => sum + (p.unrealizedPnL * (p.fxRate || 1.0)), 0);
  const totalRealized = positions.reduce((sum, p) => sum + (p.realizedPnL * (p.fxRate || 1.0)), 0);
  const grossExposure = positions.reduce((sum, p) => sum + (p.marketValue * (p.fxRate || 1.0)), 0);
  const longCount = positions.filter((p) => p.side === "LONG").length;
  const shortCount = positions.filter((p) => p.side === "SHORT").length;
  const marginUsed = positions.reduce((sum, p) => sum + (p.marginUsed * (p.fxRate || 1.0)), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:bg-black/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Environment Scope */}
      <div className="p-4 rounded-xl border border-border bg-card/40 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Position Intelligence Command Center</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-semibold">
                Authoritative MTM
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Multi-venue marked-to-market positions, independent market data vs execution broker tracking, and 20-gate risk controls
            </p>
          </div>
        </div>

        {/* Environment Selector and Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-background border border-border text-xs font-medium">
            <button
              onClick={() => setEnvironment("PAPER")}
              className={`px-3 py-1 rounded-md transition-colors ${
                environment === "PAPER"
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PAPER (Simulated)
            </button>
            <button
              onClick={() => setEnvironment("LIVE")}
              className={`px-3 py-1 rounded-md transition-colors ${
                environment === "LIVE"
                  ? "bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              LIVE (Broker Ledger)
            </button>
          </div>

          <button
            onClick={() => refreshAll()}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh All Positions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {/* Unrealized P&L */}
        <div className="p-3.5 rounded-xl border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
            <span>Unrealized P&L</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-background border border-border text-foreground">LIVE MTM</span>
          </div>
          <div className={`text-xl font-bold mt-1 ${totalUnrealized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalUnrealized >= 0 ? "+" : ""}${totalUnrealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Marked to Live Feed</div>
        </div>

        {/* Realized P&L */}
        <div className="p-3.5 rounded-xl border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-between">
            <span>Realized P&L</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-background border border-border text-sky-400 font-bold">TODAY</span>
          </div>
          <div className={`text-xl font-bold mt-1 ${totalRealized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalRealized >= 0 ? "+" : ""}${totalRealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Authoritative Fills</div>
        </div>

        {/* Gross Exposure */}
        <div className="p-3.5 rounded-xl border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground uppercase">Gross Notional</div>
          <div className="text-xl font-bold text-foreground mt-1">
            ${grossExposure.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">All Open Contracts</div>
        </div>

        {/* Margin Used */}
        <div className="p-3.5 rounded-xl border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground uppercase">Margin Deployed</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            ${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Collateral Locked</div>
        </div>

        {/* Position Count */}
        <div className="p-3.5 rounded-xl border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground uppercase">Active Positions</div>
          <div className="text-xl font-bold text-foreground mt-1">{positions.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            <span className="text-emerald-400">{longCount} Long</span> • <span className="text-rose-400">{shortCount} Short</span>
          </div>
        </div>

        {/* Reconciliation Status */}
        <div className="p-3.5 rounded-xl border border-border bg-card/30">
          <div className="text-[10px] text-muted-foreground uppercase">Reconciliation</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{reconciliation?.status || "HEALTHY"}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{reconciliation?.driftsFound ?? 0} Drifts Detected</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: "positions", label: `Live Positions (${positions.length})`, icon: Layers },
          { id: "order_flow", label: "Order Flow & Tape", icon: Activity },
          { id: "risk", label: "20-Gate Risk Matrix", icon: Shield },
          { id: "stream", label: "Live Event Stream", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-card text-foreground border border-border shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Live Positions Table */}
      {activeTab === "positions" && (
        <div className="border border-border rounded-xl bg-card/30 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[#0b0f17] border-b border-border text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="px-3 py-3">Instrument</th>
                  <th className="px-3 py-3">Data Provider</th>
                  <th className="px-3 py-3">Execution Broker</th>
                  <th className="px-3 py-3">Side</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Avg Entry</th>
                  <th className="px-3 py-3 text-right">Mark Price</th>
                  <th className="px-3 py-3 text-right">Market Value</th>
                  <th className="px-3 py-3 text-right">Margin</th>
                  <th className="px-3 py-3 text-right">Stop Loss</th>
                  <th className="px-3 py-3 text-right">Take Profit</th>
                  <th className="px-3 py-3 text-right">Unrealized P&L</th>
                  <th className="px-3 py-3 text-center">Config Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono text-xs">
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center text-muted-foreground">
                      No open positions in {environment} environment.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => {
                    const sym = pos.nativeCurrency === "INR" ? "₹" : "$";
                    const isLong = pos.side === "LONG";
                    const isConfigured = pos.configState === "CONFIGURED";

                    return (
                      <tr
                        key={pos.positionId}
                        onClick={() => setSelectedPosition(pos)}
                        className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                          selectedPosition?.positionId === pos.positionId ? "bg-cyan-500/10" : ""
                        }`}
                      >
                        {/* Instrument */}
                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground font-sans text-xs">{pos.symbol}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{pos.exchange} • {pos.assetClass}</div>
                        </td>

                        {/* Market Data Provider */}
                        <td className="px-3 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-card border border-border text-sky-400 font-semibold">
                            {pos.marketDataProvider}
                          </span>
                        </td>

                        {/* Execution Broker */}
                        <td className="px-3 py-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-card border border-border text-emerald-400 font-semibold">
                            {pos.executionBroker}
                          </span>
                        </td>

                        {/* Side & Leverage */}
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLong ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {pos.side} {pos.leverage > 1 ? `${pos.leverage}x` : ""}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="px-3 py-3 text-right font-medium text-foreground">
                          {pos.quantity > 0 ? `+${pos.quantity}` : pos.quantity}
                        </td>

                        {/* Entry Price */}
                        <td className="px-3 py-3 text-right font-medium text-foreground">
                          {sym}{pos.averageEntry.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Mark Price & Feed Age */}
                        <td className="px-3 py-3 text-right">
                          <div className="font-bold text-foreground">
                            {sym}{pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-muted-foreground">{pos.feedAgeMs}ms</div>
                        </td>

                        {/* Market Value */}
                        <td className="px-3 py-3 text-right font-medium text-foreground">
                          {sym}{pos.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Margin */}
                        <td className="px-3 py-3 text-right font-medium text-amber-400">
                          {sym}{pos.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Stop Loss */}
                        <td className="px-3 py-3 text-right">
                          {pos.stopLoss ? (
                            <span className="text-rose-300 font-medium">
                              {sym}{pos.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1 py-0.5 rounded">
                              MISSING
                            </span>
                          )}
                        </td>

                        {/* Take Profit */}
                        <td className="px-3 py-3 text-right">
                          {pos.takeProfit ? (
                            <span className="text-emerald-300 font-medium">
                              {sym}{pos.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">--</span>
                          )}
                        </td>

                        {/* Unrealized P&L */}
                        <td className="px-3 py-3 text-right">
                          <div
                            className={`font-bold ${
                              pos.unrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {pos.unrealizedPnL >= 0 ? "+" : ""}{sym}{pos.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* Explainable Config Status */}
                        <td className="px-3 py-3 text-center">
                          <span
                            title={pos.configReason}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              isConfigured
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            }`}
                          >
                            {pos.configState}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setModifyingPosition(pos);
                              setNewStopLoss(pos.stopLoss ? String(pos.stopLoss) : "");
                              setNewTakeProfit(pos.takeProfit ? String(pos.takeProfit) : "");
                            }}
                            className="p-1 rounded bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Modify Stop Loss / Take Profit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => closePositionMutation.mutate(pos.positionId)}
                            className="p-1 rounded bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400"
                            title="Close Position via Central OMS"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Order Flow & Live Tape */}
      {activeTab === "order_flow" && (
        <PositionOrderFlowViewer
          symbol={selectedPosition?.symbol || "BTC/USDT"}
          provider={selectedPosition?.marketDataProvider || "BINANCE_USDM"}
          markPrice={selectedPosition?.markPrice || 78950.0}
          currency={selectedPosition?.nativeCurrency || "USD"}
        />
      )}

      {/* TAB 3: 20-Gate Risk Matrix */}
      {activeTab === "risk" && <Position20GateRiskMatrix />}

      {/* TAB 4: Live Event Stream */}
      {activeTab === "stream" && <LiveStreamObservatory />}

      {/* Protection Modal */}
      {modifyingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0d1117] border border-border rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Modify Position Protection ({modifyingPosition.symbol})
              </h3>
              <button onClick={() => setModifyingPosition(null)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Stop Loss Price ({modifyingPosition.nativeCurrency})</label>
                <input
                  type="number"
                  placeholder="Enter stop price..."
                  value={newStopLoss}
                  onChange={(e) => setNewStopLoss(e.target.value)}
                  className="w-full p-2 rounded-lg bg-card border border-border text-foreground font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Take Profit Price ({modifyingPosition.nativeCurrency})</label>
                <input
                  type="number"
                  placeholder="Enter target price..."
                  value={newTakeProfit}
                  onChange={(e) => setNewTakeProfit(e.target.value)}
                  className="w-full p-2 rounded-lg bg-card border border-border text-foreground font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setModifyingPosition(null)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  modifyProtectionMutation.mutate({
                    id: modifyingPosition.positionId,
                    sl: newStopLoss ? parseFloat(newStopLoss) : undefined,
                    tp: newTakeProfit ? parseFloat(newTakeProfit) : undefined,
                  });
                }}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md"
              >
                Update Protection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
