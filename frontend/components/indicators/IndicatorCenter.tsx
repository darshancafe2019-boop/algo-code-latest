"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Gauge,
  Layers3,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";

import { useActiveBot } from "@/context/ActiveBotContext";

import {
  IndicatorConfigItem,
  IndicatorProfile,
  MarketSummaryData,
} from "@/types/indicator";

import { IndicatorHeader } from "./IndicatorHeader";
import { ActiveIndicatorsTable } from "./ActiveIndicatorsTable";
import { MarketSummaryCard } from "./MarketSummaryCard";
import { IndicatorHealthCard } from "./IndicatorHealthCard";
import { AddIndicatorDrawer } from "./AddIndicatorDrawer";
import { IndicatorPresetsModal } from "./IndicatorPresetsModal";
import { IndicatorConfigDrawer } from "./IndicatorConfigDrawer";
import { AdvancedAnalysisSection } from "./AdvancedAnalysisSection";
import { IndicatorDiagnosticsPanel } from "./IndicatorDiagnosticsPanel";
import { IndicatorBacktestModal } from "./IndicatorBacktestModal";
import { IndicatorCompareModal } from "./IndicatorCompareModal";

export function IndicatorCenter() {
  const queryClient = useQueryClient();
  const { activeBot } = useActiveBot();

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [selectedBotId, setSelectedBotId] = useState<string>(
    activeBot?.id || "bot-1"
  );

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    activeBot?.symbol || "BTC/USDT"
  );

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(
    activeBot?.timeframe || "15m"
  );

  const [selectedIndicator, setSelectedIndicator] =
    useState<IndicatorConfigItem | null>(null);

  const [isConfigDrawerOpen, setIsConfigDrawerOpen] =
    useState<boolean>(false);

  const [isAddDrawerOpen, setIsAddDrawerOpen] =
    useState<boolean>(false);

  const [isPresetsModalOpen, setIsPresetsModalOpen] =
    useState<boolean>(false);

  const [isBacktestOpen, setIsBacktestOpen] =
    useState<boolean>(false);

  const [isCompareOpen, setIsCompareOpen] =
    useState<boolean>(false);

  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] =
    useState<boolean>(false);

  /*
  |--------------------------------------------------------------------------
  | ACTIVE BOT SYNC
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!activeBot) return;

    setSelectedBotId(activeBot.id);

    if (activeBot.symbol) {
      setSelectedSymbol(activeBot.symbol);
    }

    if (activeBot.timeframe) {
      setSelectedTimeframe(activeBot.timeframe);
    }
  }, [activeBot]);

  /*
  |--------------------------------------------------------------------------
  | FETCH INDICATORS
  |--------------------------------------------------------------------------
  */

  const {
    data: indicatorData,
    isLoading: isIndsLoading,
    isFetching: isIndsFetching,
    refetch: refetchInds,
  } = useQuery<{
    indicators: IndicatorConfigItem[];
    market_summary?: MarketSummaryData;
  }>({
    queryKey: [
      "indicatorsCatalog",
      selectedBotId,
      selectedSymbol,
      selectedTimeframe,
    ],

    queryFn: async () => {
      const params = new URLSearchParams({
        bot_id: selectedBotId,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
      });

      const response = await fetch(
        `/api/indicators?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch indicators");
      }

      const json = await response.json();

      return {
        indicators: (json.indicators ||
          json.data ||
          []) as IndicatorConfigItem[],

        market_summary:
          json.market_summary as MarketSummaryData,
      };
    },

    staleTime: 3000,
    refetchInterval: 6000,
    refetchOnWindowFocus: false,
  });

  const indicators = indicatorData?.indicators || [];

  const marketSummary =
    indicatorData?.market_summary;

  /*
  |--------------------------------------------------------------------------
  | FETCH INDICATOR PROFILES
  |--------------------------------------------------------------------------
  */

  const { data: profiles = [] } =
    useQuery<IndicatorProfile[]>({
      queryKey: ["indicatorProfiles"],

      queryFn: async () => {
        const response = await fetch(
          "/api/indicators/profiles"
        );

        if (!response.ok) {
          return [];
        }

        const json = await response.json();

        return (json.profiles ||
          json.data ||
          []) as IndicatorProfile[];
      },

      staleTime: 10000,
      refetchOnWindowFocus: false,
    });

  /*
  |--------------------------------------------------------------------------
  | FETCH ENGINE STATUS
  |--------------------------------------------------------------------------
  */

  const { data: indicatorStatus } = useQuery({
    queryKey: [
      "indicatorStatus",
      selectedBotId,
      selectedSymbol,
      selectedTimeframe,
    ],

    queryFn: async () => {
      const params = new URLSearchParams({
        bot_id: selectedBotId,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
      });

      const response = await fetch(
        `/api/indicators/status?${params.toString()}`
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    },

    staleTime: 3000,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  /*
  |--------------------------------------------------------------------------
  | SAVE INDICATOR CONFIGURATION
  |--------------------------------------------------------------------------
  */

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: {
      indicatorId: string;
      enabled: boolean;
      weight: number;
      parameters: Record<string, any>;
    }) => {
      const response = await fetch(
        `/api/indicators/${payload.indicatorId}/apply`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            bot_id: selectedBotId,
            enabled: payload.enabled,
            weight: payload.weight,
            parameters: payload.parameters,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to save indicator configuration"
        );
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["indicatorsCatalog"],
      });

      queryClient.invalidateQueries({
        queryKey: ["indicatorStatus"],
      });
    },
  });

  /*
  |--------------------------------------------------------------------------
  | ENABLE / DISABLE SINGLE INDICATOR
  |--------------------------------------------------------------------------
  */

  const toggleEnableMutation = useMutation({
    mutationFn: async (payload: {
      indicatorId: string;
      enabled: boolean;
    }) => {
      const target = indicators.find(
        (indicator) =>
          (indicator.indicator_id ||
            indicator.id) ===
          payload.indicatorId
      );

      const response = await fetch(
        `/api/indicators/${payload.indicatorId}/apply`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            bot_id: selectedBotId,
            enabled: payload.enabled,
            weight: target?.weight ?? 15,
            parameters: target?.parameters ?? {},
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to toggle indicator"
        );
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["indicatorsCatalog"],
      });

      queryClient.invalidateQueries({
        queryKey: ["indicatorStatus"],
      });
    },
  });

  /*
  |--------------------------------------------------------------------------
  | ENABLE / DISABLE ALL
  |--------------------------------------------------------------------------
  */

  const bulkEnableDisableMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const endpoint = enabled
        ? "/api/indicators/enable-all"
        : "/api/indicators/disable-all";

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          bot_id: selectedBotId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to update indicators"
        );
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["indicatorsCatalog"],
      });

      queryClient.invalidateQueries({
        queryKey: ["indicatorStatus"],
      });
    },
  });

  /*
  |--------------------------------------------------------------------------
  | RESET INDICATOR
  |--------------------------------------------------------------------------
  */

  const resetMutation = useMutation({
    mutationFn: async (
      indicatorId?: string
    ) => {
      const endpoint = indicatorId
        ? `/api/indicators/${indicatorId}/reset`
        : "/api/indicators/reset-all";

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          bot_id: selectedBotId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to reset indicator"
        );
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["indicatorsCatalog"],
      });

      queryClient.invalidateQueries({
        queryKey: ["indicatorStatus"],
      });
    },
  });

  /*
  |--------------------------------------------------------------------------
  | APPLY INDICATOR PROFILE
  |--------------------------------------------------------------------------
  */

  const applyProfileMutation = useMutation({
    mutationFn: async ({
      profileId,
      mode,
    }: {
      profileId: string;
      mode: "REPLACE" | "MERGE";
    }) => {
      const response = await fetch(
        "/api/indicators/apply-preset",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            bot_id: selectedBotId,
            preset_name: profileId,
            mode: mode.toLowerCase(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to apply profile preset"
        );
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["indicatorsCatalog"],
      });

      queryClient.invalidateQueries({
        queryKey: ["indicatorStatus"],
      });
    },
  });

  /*
  |--------------------------------------------------------------------------
  | LIVE CALCULATED METRICS
  |--------------------------------------------------------------------------
  */

  const activeCount = useMemo(() => {
    return indicators.filter(
      (indicator) => indicator.enabled
    ).length;
  }, [indicators]);

  const healthyCount = useMemo(() => {
    return indicators.filter(
      (indicator) =>
        indicator.enabled &&
        indicator.status !== "ERROR" &&
        indicator.status !== "STALE"
    ).length;
  }, [indicators]);

  const issueCount = useMemo(() => {
    return indicators.filter(
      (indicator) =>
        indicator.enabled &&
        (indicator.status === "ERROR" ||
          indicator.status === "STALE")
    ).length;
  }, [indicators]);

  const latencyMs = Number(
    indicatorStatus?.diagnostics
      ?.avg_calc_time_ms ?? 0
  );

  const dataAgeSeconds = Number(
    indicatorStatus?.diagnostics
      ?.data_age_seconds ?? 0
  );

  const engineStatus = String(
    indicatorStatus?.status ||
    indicatorStatus?.engine_status ||
    ""
  ).toUpperCase();

  const engineIsLive =
    engineStatus === "LIVE" ||
    engineStatus === "READY" ||
    engineStatus === "HEALTHY" ||
    engineStatus === "OK";

  const decision =
    marketSummary?.decision || "HOLD";

  const confluence = Number(
    marketSummary?.confluence_pct ?? 0
  );

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="indicator-redesign relative min-h-full w-full overflow-hidden bg-[#05070B] text-white">

      {/* =========================================================== */}
      {/* GLOBAL INDICATOR PAGE STYLE */}
      {/* =========================================================== */}

      <style jsx global>{`
        .indicator-redesign .line-free table,
        .indicator-redesign .line-free thead,
        .indicator-redesign .line-free tbody,
        .indicator-redesign .line-free tr,
        .indicator-redesign .line-free th,
        .indicator-redesign .line-free td {
          border-color: transparent !important;
        }

        .indicator-redesign
          .line-free
          [class*="divide-"]
          > * {
          border-color: transparent !important;
        }

        .indicator-redesign
          .line-free
          [class*="border-b"] {
          border-color: transparent !important;
        }

        .indicator-redesign
          .line-free
          [class*="border-t"] {
          border-color: transparent !important;
        }

        .indicator-redesign
          .line-free
          [class*="border-slate"] {
          border-color: transparent !important;
        }

        .indicator-redesign
          .line-free
          [class*="border-white"] {
          border-color: transparent !important;
        }

        .indicator-redesign .premium-surface {
          border: 0 !important;

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.015),
            0 18px 55px
              rgba(0, 0, 0, 0.25);
        }

        .indicator-redesign
          .indicator-table-wrap::-webkit-scrollbar {
          height: 5px;
          width: 5px;
        }

        .indicator-redesign
          .indicator-table-wrap::-webkit-scrollbar-track {
          background: transparent;
        }

        .indicator-redesign
          .indicator-table-wrap::-webkit-scrollbar-thumb {
          background: #1c2635;
          border-radius: 999px;
        }
      `}</style>

      {/* =========================================================== */}
      {/* AMBIENT BACKGROUND */}
      {/* =========================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute left-[5%] top-[-180px] h-[500px] w-[500px] rounded-full bg-cyan-400/[0.035] blur-[150px]" />

        <div className="absolute right-[-150px] top-[180px] h-[500px] w-[500px] rounded-full bg-blue-500/[0.03] blur-[150px]" />

        <div className="absolute bottom-[-250px] left-[35%] h-[500px] w-[500px] rounded-full bg-violet-500/[0.02] blur-[160px]" />

      </div>

      {/* =========================================================== */}
      {/* PAGE */}
      {/* =========================================================== */}

      <div className="relative mx-auto w-full max-w-[1780px] px-3 pb-12 pt-3 sm:px-4 lg:px-6">

        {/* ========================================================= */}
        {/* MAIN COMMAND PANEL */}
        {/* ========================================================= */}

        <section className="premium-surface relative overflow-hidden rounded-[26px] bg-[#090D14] p-4 sm:p-5 lg:p-6">

          <div className="pointer-events-none absolute left-[-100px] top-[-130px] h-[300px] w-[300px] rounded-full bg-cyan-400/[0.055] blur-[100px]" />

          <div className="pointer-events-none absolute right-[-80px] top-[-150px] h-[350px] w-[350px] rounded-full bg-blue-500/[0.03] blur-[120px]" />

          <div className="relative">

            {/* ===================================================== */}
            {/* TITLE / STATUS */}
            {/* ===================================================== */}

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex min-w-0 items-center gap-3.5">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-gradient-to-br from-cyan-400/[0.14] to-blue-500/[0.045] shadow-[0_12px_35px_rgba(34,211,238,0.07)]">

                  <BarChart3 className="h-5 w-5 text-cyan-300" />

                </div>

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <h1 className="truncate text-[17px] font-semibold tracking-[-0.025em] text-white">

                      Indicator Intelligence

                    </h1>

                    <span className="rounded-full bg-[#121925] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500">

                      Quant Engine

                    </span>

                  </div>

                  <p className="mt-1 truncate text-[11px] text-slate-500">

                    Live technical analysis, signal confluence,
                    diagnostics and quantitative intelligence

                  </p>

                </div>

              </div>

              {/* =================================================== */}
              {/* STATUS PILLS */}
              {/* =================================================== */}

              <div className="flex flex-wrap items-center gap-2">

                <TopStatus
                  icon={Radio}
                  text={
                    isIndsFetching
                      ? "SYNCING"
                      : engineIsLive
                        ? "LIVE ENGINE"
                        : engineStatus || "ENGINE"
                  }
                  tone={
                    isIndsFetching
                      ? "cyan"
                      : engineIsLive
                        ? "green"
                        : "neutral"
                  }
                />

                <TopStatus
                  icon={CircleDot}
                  text={`${selectedSymbol} · ${selectedTimeframe}`}
                  tone="neutral"
                />

                <TopStatus
                  icon={Sparkles}
                  text={decision}
                  tone={
                    decision === "LONG"
                      ? "green"
                      : decision === "SHORT"
                        ? "red"
                        : "neutral"
                  }
                />

              </div>

            </div>

            {/* ===================================================== */}
            {/* INDICATOR CONTROLS */}
            {/* ===================================================== */}

            <div className="line-free mt-5 rounded-[20px] bg-[#0D131D] p-3 sm:p-4">

              <IndicatorHeader
                symbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                timeframe={selectedTimeframe}
                onSelectTimeframe={setSelectedTimeframe}
                activeCount={activeCount}
                totalCount={indicators.length}
                isLive={engineIsLive}
                isSyncing={isIndsFetching}
                onRefresh={() =>
                  refetchInds()
                }
                onOpenAddModal={() =>
                  setIsAddDrawerOpen(true)
                }
                onOpenPresets={() =>
                  setIsPresetsModalOpen(true)
                }
                onOpenBacktest={() =>
                  setIsBacktestOpen(true)
                }
                onOpenCompare={() =>
                  setIsCompareOpen(true)
                }
                onOpenDiagnostics={() =>
                  setIsDiagnosticsModalOpen(true)
                }
                onEnableAll={() =>
                  bulkEnableDisableMutation.mutate(
                    true
                  )
                }
                onDisableAll={() =>
                  bulkEnableDisableMutation.mutate(
                    false
                  )
                }
                onResetAll={() =>
                  resetMutation.mutate(
                    undefined
                  )
                }
              />

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* KPI METRICS */}
        {/* ========================================================= */}

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">

          <CleanMetric
            label="Active"
            value={activeCount}
            detail={`${indicators.length} available`}
            icon={Activity}
            tone="cyan"
          />

          <CleanMetric
            label="Healthy"
            value={healthyCount}
            detail={
              activeCount > 0
                ? `${Math.round(
                  (healthyCount /
                    activeCount) *
                  100
                )}% operational`
                : "No active indicators"
            }
            icon={CheckCircle2}
            tone="green"
          />

          <CleanMetric
            label="Issues"
            value={issueCount}
            detail={
              issueCount > 0
                ? "Review diagnostics"
                : "System normal"
            }
            icon={TriangleAlert}
            tone={
              issueCount > 0
                ? "red"
                : "neutral"
            }
          />

          <CleanMetric
            label="Latency"
            value={
              latencyMs > 0
                ? `${latencyMs.toFixed(
                  1
                )} ms`
                : "—"
            }
            detail={
              dataAgeSeconds > 0
                ? `Data age ${dataAgeSeconds.toFixed(
                  1
                )}s`
                : "Awaiting telemetry"
            }
            icon={Gauge}
            tone="blue"
          />

          <div className="col-span-2 md:col-span-1">

            <CleanMetric
              label="Confluence"
              value={
                confluence > 0
                  ? `${confluence.toFixed(
                    0
                  )}%`
                  : "—"
              }
              detail={decision}
              icon={Layers3}
              tone={
                decision === "LONG"
                  ? "green"
                  : decision === "SHORT"
                    ? "red"
                    : "neutral"
              }
            />

          </div>

        </section>

        {/* ========================================================= */}
        {/* ACTIVE INDICATORS */}
        {/* ========================================================= */}

        <section className="premium-surface mt-4 rounded-[24px] bg-[#090E16] p-4 sm:p-5">

          <CleanSectionTitle
            icon={Activity}
            title="Active Indicators"
            description="Live indicator values, signals, weights and execution state"
            badge={`${activeCount} ACTIVE`}
            badgeTone="cyan"
          />

          <div className="indicator-table-wrap line-free mt-5 overflow-x-auto rounded-[19px] bg-[#0C121B] p-2 sm:p-3">

            <ActiveIndicatorsTable
              indicators={indicators}
              onConfigure={(
                indicator
              ) => {
                setSelectedIndicator(
                  indicator
                );

                setIsConfigDrawerOpen(
                  true
                );
              }}
              onToggleEnable={(
                id,
                enabled
              ) =>
                toggleEnableMutation.mutate({
                  indicatorId: id,
                  enabled,
                })
              }
              onOpenAddModal={() =>
                setIsAddDrawerOpen(
                  true
                )
              }
              isLoading={
                isIndsLoading
              }
            />

          </div>

        </section>

        {/* ========================================================= */}
        {/* MARKET CONFLUENCE + HEALTH */}
        {/* ========================================================= */}

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_0.85fr]">

          {/* ======================================================= */}
          {/* CONFLUENCE */}
          {/* ======================================================= */}

          <div className="premium-surface rounded-[24px] bg-[#090E16] p-4 sm:p-5">

            <CleanSectionTitle
              icon={Layers3}
              title="Market Confluence"
              description="Combined multi-indicator directional intelligence"
              badge={
                decision === "LONG"
                  ? "LONG BIAS"
                  : decision ===
                    "SHORT"
                    ? "SHORT BIAS"
                    : "NEUTRAL"
              }
              badgeTone={
                decision === "LONG"
                  ? "green"
                  : decision ===
                    "SHORT"
                    ? "red"
                    : "neutral"
              }
            />

            <div className="line-free mt-5 rounded-[19px] bg-[#0C121B] p-3 sm:p-4">

              <MarketSummaryCard
                summary={
                  marketSummary
                }
              />

            </div>

          </div>

          {/* ======================================================= */}
          {/* ENGINE HEALTH */}
          {/* ======================================================= */}

          <div className="premium-surface rounded-[24px] bg-[#090E16] p-4 sm:p-5">

            <CleanSectionTitle
              icon={ShieldCheck}
              title="Engine Health"
              description="Calculation performance, freshness and reliability"
              badge={
                issueCount > 0
                  ? `${issueCount} ISSUE${issueCount > 1
                    ? "S"
                    : ""
                  }`
                  : "HEALTHY"
              }
              badgeTone={
                issueCount > 0
                  ? "red"
                  : "green"
              }
            />

            <div className="line-free mt-5 rounded-[19px] bg-[#0C121B] p-3 sm:p-4">

              <IndicatorHealthCard
                activeCount={
                  activeCount
                }
                healthyCount={
                  healthyCount
                }
                errorCount={
                  issueCount
                }
                dataAgeSeconds={
                  dataAgeSeconds
                }
                latencyMs={
                  latencyMs
                }
                onOpenDiagnostics={() =>
                  setIsDiagnosticsModalOpen(
                    true
                  )
                }
              />

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* ADVANCED ANALYSIS */}
        {/* ========================================================= */}

        <section className="premium-surface mt-4 rounded-[24px] bg-[#090E16] p-4 sm:p-5">

          <CleanSectionTitle
            icon={Sparkles}
            title="Advanced Intelligence"
            description="Multi-timeframe analysis, indicator comparison and backtesting"
            badge="QUANT LAB"
            badgeTone="purple"
          />

          <div className="line-free mt-5 rounded-[19px] bg-[#0C121B] p-3 sm:p-4">

            <AdvancedAnalysisSection
              symbol={selectedSymbol}
              onOpenBacktest={() =>
                setIsBacktestOpen(
                  true
                )
              }
              onOpenCompare={() =>
                setIsCompareOpen(
                  true
                )
              }
            />

          </div>

        </section>

        {/* ========================================================= */}
        {/* ADD INDICATOR DRAWER */}
        {/* ========================================================= */}

        <AddIndicatorDrawer
          isOpen={isAddDrawerOpen}
          onClose={() =>
            setIsAddDrawerOpen(false)
          }
          activeIndicatorIds={indicators
            .filter(
              (indicator) =>
                indicator.enabled
            )
            .map(
              (indicator) =>
                indicator.indicator_id ||
                indicator.id
            )}
          onAddIndicator={(id) =>
            toggleEnableMutation.mutate({
              indicatorId: id,
              enabled: true,
            })
          }
          onRemoveIndicator={(id) =>
            toggleEnableMutation.mutate({
              indicatorId: id,
              enabled: false,
            })
          }
          onConfigureIndicator={(
            indicatorDefinition
          ) => {
            const matchingIndicator =
              indicators.find(
                (indicator) =>
                  (indicator.indicator_id ||
                    indicator.id) ===
                  indicatorDefinition.id
              );

            const parameters =
              Object.fromEntries(
                Object.entries(
                  indicatorDefinition.parameters ||
                  {}
                ).map(
                  ([
                    key,
                    value,
                  ]: [
                      string,
                      any
                    ]) => [
                      key,
                      value?.default ??
                      value,
                    ]
                )
              );

            setSelectedIndicator(
              matchingIndicator || {
                id:
                  indicatorDefinition.id,

                indicator_id:
                  indicatorDefinition.id,

                name:
                  indicatorDefinition.name,

                category:
                  indicatorDefinition.category as any,

                description:
                  indicatorDefinition.description,

                enabled: true,

                weight: 15,

                timeframe:
                  selectedTimeframe,

                parameters,

                status:
                  "READY",

                effective_source:
                  "GLOBAL DEFAULT",
              }
            );

            setIsAddDrawerOpen(
              false
            );

            setIsConfigDrawerOpen(
              true
            );
          }}
          isSaving={
            toggleEnableMutation.isPending
          }
        />

        {/* ========================================================= */}
        {/* PRESETS */}
        {/* ========================================================= */}

        <IndicatorPresetsModal
          isOpen={
            isPresetsModalOpen
          }
          onClose={() =>
            setIsPresetsModalOpen(
              false
            )
          }
          profiles={profiles}
          onApplyProfile={(
            profileId,
            mode
          ) =>
            applyProfileMutation.mutate({
              profileId,
              mode,
            })
          }
        />

        {/* ========================================================= */}
        {/* CONFIGURATION DRAWER */}
        {/* ========================================================= */}

        <IndicatorConfigDrawer
          indicator={
            selectedIndicator
          }
          isOpen={
            isConfigDrawerOpen
          }
          onClose={() => {
            setIsConfigDrawerOpen(
              false
            );

            setSelectedIndicator(
              null
            );
          }}
          onSave={(
            id,
            enabled,
            weight,
            parameters
          ) =>
            saveConfigMutation.mutate({
              indicatorId: id,
              enabled,
              weight,
              parameters,
            })
          }
          onReset={(id) =>
            resetMutation.mutate(
              id
            )
          }
          onDelete={(id) =>
            toggleEnableMutation.mutate({
              indicatorId: id,
              enabled: false,
            })
          }
          isSaving={
            saveConfigMutation.isPending
          }
        />

        {/* ========================================================= */}
        {/* BACKTEST */}
        {/* ========================================================= */}

        <IndicatorBacktestModal
          isOpen={
            isBacktestOpen
          }
          onClose={() =>
            setIsBacktestOpen(
              false
            )
          }
          selectedBotName={
            activeBot?.name ||
            "Selected Bot"
          }
          selectedSymbol={
            selectedSymbol
          }
        />

        {/* ========================================================= */}
        {/* COMPARISON */}
        {/* ========================================================= */}

        <IndicatorCompareModal
          isOpen={
            isCompareOpen
          }
          onClose={() =>
            setIsCompareOpen(
              false
            )
          }
        />

        {/* ========================================================= */}
        {/* DIAGNOSTICS MODAL */}
        {/* ========================================================= */}

        {isDiagnosticsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5">

            <div className="premium-surface flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-[#080C13] shadow-[0_35px_130px_rgba(0,0,0,0.8)]">

              {/* =================================================== */}
              {/* MODAL HEADER */}
              {/* =================================================== */}

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-cyan-400/[0.08]">

                    <Activity className="h-4 w-4 text-cyan-300" />

                  </div>

                  <div>

                    <h3 className="text-[13px] font-semibold text-white">

                      Engine Diagnostics

                    </h3>

                    <p className="mt-1 text-[10px] text-slate-500">

                      Freshness, latency, calculation state and errors

                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsDiagnosticsModalOpen(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#131A25] text-slate-500 transition-all hover:bg-[#192231] hover:text-white"
                >

                  <X className="h-4 w-4" />

                </button>

              </div>

              {/* =================================================== */}
              {/* MODAL CONTENT */}
              {/* =================================================== */}

              <div className="line-free max-h-[78vh] overflow-y-auto px-4 pb-5 sm:px-5">

                <div className="rounded-[19px] bg-[#0C121B] p-3 sm:p-4">

                  <IndicatorDiagnosticsPanel />

                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| UI TYPES
|--------------------------------------------------------------------------
*/

type UITone =
  | "cyan"
  | "green"
  | "red"
  | "blue"
  | "purple"
  | "neutral";

/*
|--------------------------------------------------------------------------
| CLEAN KPI CARD
|--------------------------------------------------------------------------
*/

function CleanMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  tone: UITone;
}) {
  const styles: Record<
    UITone,
    {
      icon: string;
      glow: string;
      value: string;
    }
  > = {
    cyan: {
      icon:
        "bg-cyan-400/[0.09] text-cyan-300",

      glow:
        "bg-cyan-400/[0.045]",

      value:
        "text-white",
    },

    green: {
      icon:
        "bg-emerald-400/[0.09] text-emerald-300",

      glow:
        "bg-emerald-400/[0.04]",

      value:
        "text-white",
    },

    red: {
      icon:
        "bg-rose-400/[0.09] text-rose-300",

      glow:
        "bg-rose-400/[0.04]",

      value:
        "text-white",
    },

    blue: {
      icon:
        "bg-blue-400/[0.09] text-blue-300",

      glow:
        "bg-blue-400/[0.04]",

      value:
        "text-white",
    },

    purple: {
      icon:
        "bg-violet-400/[0.09] text-violet-300",

      glow:
        "bg-violet-400/[0.04]",

      value:
        "text-white",
    },

    neutral: {
      icon:
        "bg-[#151C27] text-slate-400",

      glow:
        "bg-slate-400/[0.015]",

      value:
        "text-white",
    },
  };

  const style =
    styles[tone];

  return (
    <div className="premium-surface group relative min-h-[112px] overflow-hidden rounded-[20px] bg-[#090E16] p-4">

      {/* glow */}

      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-[40px] ${style.glow}`}
      />

      <div className="relative flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">

            {label}

          </p>

          <p
            className={`mt-2 truncate text-[21px] font-semibold tracking-[-0.035em] ${style.value}`}
          >

            {value}

          </p>

          <p className="mt-1 truncate text-[10px] text-slate-500">

            {detail}

          </p>

        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ${style.icon}`}
        >

          <Icon className="h-4 w-4" />

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SECTION HEADER
|--------------------------------------------------------------------------
*/

function CleanSectionTitle({
  icon: Icon,
  title,
  description,
  badge,
  badgeTone = "neutral",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  badgeTone?: UITone;
}) {
  const badges: Record<
    UITone,
    string
  > = {
    cyan:
      "bg-cyan-400/[0.08] text-cyan-300",

    green:
      "bg-emerald-400/[0.08] text-emerald-300",

    red:
      "bg-rose-400/[0.08] text-rose-300",

    blue:
      "bg-blue-400/[0.08] text-blue-300",

    purple:
      "bg-violet-400/[0.08] text-violet-300",

    neutral:
      "bg-[#151C27] text-slate-400",
  };

  return (
    <div className="flex items-center justify-between gap-4">

      <div className="flex min-w-0 items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#131A25]">

          <Icon className="h-4 w-4 text-cyan-300" />

        </div>

        <div className="min-w-0">

          <h2 className="truncate text-[12px] font-semibold tracking-[-0.01em] text-slate-100">

            {title}

          </h2>

          <p className="mt-1 hidden truncate text-[10px] text-slate-600 sm:block">

            {description}

          </p>

        </div>

      </div>

      {badge && (
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] ${badges[badgeTone]}`}
        >

          {badge}

        </span>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TOP STATUS
|--------------------------------------------------------------------------
*/

function TopStatus({
  icon: Icon,
  text,
  tone = "neutral",
}: {
  icon: React.ElementType;
  text: string;
  tone?: UITone;
}) {
  const styles: Record<
    UITone,
    string
  > = {
    cyan:
      "bg-cyan-400/[0.08] text-cyan-300",

    green:
      "bg-emerald-400/[0.08] text-emerald-300",

    red:
      "bg-rose-400/[0.08] text-rose-300",

    blue:
      "bg-blue-400/[0.08] text-blue-300",

    purple:
      "bg-violet-400/[0.08] text-violet-300",

    neutral:
      "bg-[#141B26] text-slate-400",
  };

  return (
    <div
      className={`flex h-8 items-center gap-2 rounded-full px-3 text-[8px] font-semibold uppercase tracking-[0.1em] ${styles[tone]}`}
    >

      <Icon className="h-3 w-3 shrink-0" />

      <span className="whitespace-nowrap">
        {text}
      </span>

    </div>
  );
}