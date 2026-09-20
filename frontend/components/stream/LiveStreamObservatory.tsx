"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { NormalizedEvent } from "@/types/data-core";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Code2,
  Database,
  Eye,
  Layers3,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  Trash2,
  X,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function safeText(value: unknown, fallback = "--") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatTime(value?: string | null) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleTimeString();
}

function getLatencyTone(latency: number) {
  if (latency <= 0) {
    return "text-slate-400";
  }

  if (latency <= 50) {
    return "text-emerald-300";
  }

  if (latency <= 150) {
    return "text-amber-300";
  }

  return "text-rose-300";
}

function getDomainClasses(domain: string) {
  switch (domain) {
    case "MARKET_DATA":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";

    case "ORDER":
    case "FILL":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

    case "POSITION":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";

    case "CAPITAL":
    case "ACCOUNT":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";

    case "SYSTEM":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";

    default:
      return "border-slate-700 bg-slate-800/60 text-slate-300";
  }
}

/* -------------------------------------------------------------------------- */
/*                               METRIC CARD                                  */
/* -------------------------------------------------------------------------- */

function StreamMetricCard({
  title,
  value,
  subtitle,
  icon,
  tone = "cyan",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "cyan" | "emerald" | "amber" | "violet";
}) {
  const styles = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    emerald:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    violet:
      "border-violet-400/20 bg-violet-400/10 text-violet-300",
  };

  return (
    <div
      className="
        rounded-xl
        border border-slate-700/60
        bg-[#081522]
        p-3
        shadow-[0_8px_25px_rgba(0,0,0,0.15)]
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </div>

          <div className="mt-1.5 truncate text-lg font-bold text-slate-100">
            {value}
          </div>

          {subtitle && (
            <div className="mt-0.5 truncate text-[9px] text-slate-500">
              {subtitle}
            </div>
          )}
        </div>

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${styles[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           LIVE STREAM OBSERVATORY                          */
/* -------------------------------------------------------------------------- */

export function LiveStreamObservatory() {
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedDomain, setSelectedDomain] =
    useState<string>("ALL");

  const [selectedProvider, setSelectedProvider] =
    useState<string>("ALL");

  const [selectedEvent, setSelectedEvent] =
    useState<NormalizedEvent | null>(null);

  const [events, setEvents] = useState<NormalizedEvent[]>([]);

  /* ---------------------------------------------------------------------- */
  /* LIVE STREAM QUERY                                                      */
  /* ---------------------------------------------------------------------- */

  const {
    data: streamData,
    refetch,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["v2_stream_recent"],

    queryFn: async () => {
      const res = await apiClient.get<{
        status: string;
        data: NormalizedEvent[];
        metrics: any;
      }>("/api/v2/stream/recent?limit=200");

      return (
        res.data || {
          status: "error",
          data: [],
          metrics: {},
        }
      );
    },

    refetchInterval: isPaused ? false : 1500,
    staleTime: 1000,

    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  /* ---------------------------------------------------------------------- */
  /* SYNC API DATA                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!isPaused && Array.isArray(streamData?.data)) {
      setEvents(streamData.data);
    }
  }, [streamData, isPaused]);

  /* ---------------------------------------------------------------------- */
  /* DYNAMIC PROVIDERS + DOMAINS                                             */
  /* ---------------------------------------------------------------------- */

  const providers = useMemo(() => {
    const values = events
      .map((event) => safeText(event.provider, ""))
      .filter(Boolean);

    return ["ALL", ...Array.from(new Set(values)).sort()];
  }, [events]);

  const domains = useMemo(() => {
    const values = events
      .map((event) => safeText(event.domain, ""))
      .filter(Boolean);

    return ["ALL", ...Array.from(new Set(values)).sort()];
  }, [events]);

  /* ---------------------------------------------------------------------- */
  /* FILTERED EVENTS                                                        */
  /* ---------------------------------------------------------------------- */

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      if (
        selectedDomain !== "ALL" &&
        event.domain !== selectedDomain
      ) {
        return false;
      }

      if (
        selectedProvider !== "ALL" &&
        event.provider !== selectedProvider
      ) {
        return false;
      }

      if (!q) return true;

      const searchableValues = [
        event.eventType,
        event.provider,
        event.domain,
        event.instrumentId,
        event.canonicalInstrumentId,
        event.eventId,
        event.environment,
      ];

      return searchableValues.some((value) =>
        safeText(value, "").toLowerCase().includes(q)
      );
    });
  }, [
    events,
    searchQuery,
    selectedDomain,
    selectedProvider,
  ]);

  /* ---------------------------------------------------------------------- */
  /* LIVE METRICS                                                           */
  /* ---------------------------------------------------------------------- */

  const streamMetrics = useMemo(() => {
    if (events.length === 0) {
      return {
        total: 0,
        providers: 0,
        domains: 0,
        avgLatency: 0,
        maxLatency: 0,
        lastEvent: null as NormalizedEvent | null,
      };
    }

    const latencyValues = events
      .map((event) => Number(event.latencyMs ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0);

    const latencyTotal = latencyValues.reduce(
      (sum, value) => sum + value,
      0
    );

    const avgLatency =
      latencyValues.length > 0
        ? latencyTotal / latencyValues.length
        : 0;

    const maxLatency =
      latencyValues.length > 0
        ? Math.max(...latencyValues)
        : 0;

    return {
      total: events.length,

      providers: new Set(
        events
          .map((event) => event.provider)
          .filter(Boolean)
      ).size,

      domains: new Set(
        events
          .map((event) => event.domain)
          .filter(Boolean)
      ).size,

      avgLatency,

      maxLatency,

      lastEvent: events[0] ?? null,
    };
  }, [events]);

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <section
        className="
          rounded-xl
          border border-slate-700/60
          bg-[#07131f]
          px-4 py-3
          shadow-[0_10px_30px_rgba(0,0,0,0.18)]
        "
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="
                flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-cyan-400/20
                bg-cyan-400/10
                text-cyan-300
              "
            >
              <Radio
                className={`h-5 w-5 ${!isPaused ? "animate-pulse" : ""
                  }`}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">
                  Global Live Stream Observatory
                </h2>

                <span
                  className="
                    rounded-md
                    border border-cyan-400/20
                    bg-cyan-400/10
                    px-2 py-0.5
                    text-[9px]
                    font-bold uppercase
                    tracking-[0.12em]
                    text-cyan-300
                  "
                >
                  EVENT BUS
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-bold ${isPaused
                      ? "bg-amber-400/10 text-amber-300"
                      : "bg-emerald-400/10 text-emerald-300"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isPaused
                        ? "bg-amber-400"
                        : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      }`}
                  />

                  {isPaused ? "PAUSED" : "STREAMING"}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                Normalized market, account, position, order, fill,
                capital and system events
              </p>
            </div>
          </div>

          {/* Actions */}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaused((previous) => !previous)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-semibold transition ${isPaused
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"
                }`}
            >
              {isPaused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}

              {isPaused ? "Resume Stream" : "Pause Stream"}
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="
                flex items-center gap-2
                rounded-lg
                border border-slate-700/80
                bg-[#0a1826]
                px-3 py-2
                text-[10px] font-semibold
                text-slate-300
                transition
                hover:border-cyan-400/30
                hover:text-cyan-300
                disabled:opacity-50
              "
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""
                  }`}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setEvents([]);
                setSelectedEvent(null);
              }}
              className="
                flex items-center gap-2
                rounded-lg
                border border-slate-700/80
                bg-[#0a1826]
                px-3 py-2
                text-[10px] font-semibold
                text-slate-400
                transition
                hover:border-rose-400/30
                hover:bg-rose-400/5
                hover:text-rose-300
              "
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear View
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* KPI STRIP                                                          */}
      {/* ================================================================== */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StreamMetricCard
          title="Buffer Events"
          value={streamMetrics.total}
          subtitle="Current event snapshot"
          icon={<Database className="h-4 w-4" />}
          tone="cyan"
        />

        <StreamMetricCard
          title="Providers"
          value={streamMetrics.providers}
          subtitle="Active in current buffer"
          icon={<Server className="h-4 w-4" />}
          tone="emerald"
        />

        <StreamMetricCard
          title="Domains"
          value={streamMetrics.domains}
          subtitle="Event categories"
          icon={<Layers3 className="h-4 w-4" />}
          tone="violet"
        />

        <StreamMetricCard
          title="Average Latency"
          value={
            streamMetrics.total > 0
              ? `${streamMetrics.avgLatency.toFixed(1)} ms`
              : "--"
          }
          subtitle={
            streamMetrics.maxLatency > 0
              ? `Peak ${streamMetrics.maxLatency.toFixed(1)} ms`
              : "No latency telemetry"
          }
          icon={<Zap className="h-4 w-4" />}
          tone="amber"
        />

        <StreamMetricCard
          title="Last Event"
          value={
            streamMetrics.lastEvent
              ? formatTime(
                streamMetrics.lastEvent.receivedTimestamp
              )
              : "--"
          }
          subtitle={
            streamMetrics.lastEvent
              ? safeText(streamMetrics.lastEvent.provider)
              : "Waiting for events"
          }
          icon={<Clock3 className="h-4 w-4" />}
          tone="cyan"
        />
      </section>

      {/* ================================================================== */}
      {/* ERROR / CONNECTION STATUS                                           */}
      {/* ================================================================== */}

      {isError && (
        <section
          className="
            flex items-center gap-3
            rounded-xl
            border border-rose-400/20
            bg-rose-400/5
            px-4 py-3
          "
        >
          <AlertTriangle className="h-4 w-4 text-rose-300" />

          <div>
            <div className="text-xs font-semibold text-rose-300">
              Stream API unavailable
            </div>

            <div className="mt-0.5 text-[10px] text-slate-500">
              The observatory could not refresh the recent event
              buffer.
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* SEARCH + FILTERS                                                    */}
      {/* ================================================================== */}

      <section
        className="
          rounded-xl
          border border-slate-700/60
          bg-[#07131f]
          p-3
        "
      >
        <div className="flex flex-col gap-3">
          {/* Search */}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="
                  absolute left-3 top-1/2
                  h-3.5 w-3.5
                  -translate-y-1/2
                  text-slate-500
                "
              />

              <input
                type="text"
                placeholder="Search event type, provider, instrument, event ID..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                className="
                  w-full
                  rounded-lg
                  border border-slate-700/70
                  bg-[#06111c]
                  py-2 pl-9 pr-3
                  text-[11px]
                  text-slate-200
                  outline-none
                  placeholder:text-slate-600
                  focus:border-cyan-400/40
                  focus:ring-1
                  focus:ring-cyan-400/10
                "
              />
            </div>

            <div
              className="
                flex shrink-0 items-center gap-2
                text-[10px] text-slate-500
              "
            >
              <Eye className="h-3.5 w-3.5" />

              {filteredEvents.length} / {events.length} visible
            </div>
          </div>

          {/* Domains */}

          <div className="border-t border-slate-800 pt-3">
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
              Event Domain
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {domains.map((domain) => (
                <button
                  type="button"
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[9px] font-semibold transition ${selectedDomain === domain
                      ? domain === "ALL"
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                        : getDomainClasses(domain)
                      : "border-slate-800 bg-[#081522] text-slate-500 hover:border-slate-700 hover:text-slate-300"
                    }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          {/* Providers */}

          <div>
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
              Provider
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {providers.map((provider) => (
                <button
                  type="button"
                  key={provider}
                  onClick={() =>
                    setSelectedProvider(provider)
                  }
                  className={`shrink-0 rounded-md border px-2.5 py-1 text-[9px] font-semibold transition ${selectedProvider === provider
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-slate-800 bg-[#081522] text-slate-500 hover:border-slate-700 hover:text-slate-300"
                    }`}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* STREAM TERMINAL                                                     */}
      {/* ================================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border border-slate-700/60
          bg-[#07131f]
          shadow-[0_12px_40px_rgba(0,0,0,0.2)]
        "
      >
        {/* Terminal Header */}

        <div
          className="
            flex flex-wrap items-center justify-between gap-3
            border-b border-slate-800
            bg-[#06101a]
            px-4 py-3
          "
        >
          <div className="flex items-center gap-2">
            <Activity
              className={`h-4 w-4 ${isPaused
                  ? "text-amber-300"
                  : "text-emerald-300"
                }`}
            />

            <div>
              <h3 className="text-xs font-bold text-slate-200">
                Live Event Terminal
              </h3>

              <div className="mt-0.5 text-[9px] text-slate-600">
                Click any event to inspect its normalized payload
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPaused && !isError ? (
              <span
                className="
                  inline-flex items-center gap-1.5
                  rounded-md
                  bg-emerald-400/10
                  px-2 py-1
                  text-[9px] font-semibold
                  text-emerald-300
                "
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                LIVE
              </span>
            ) : isPaused ? (
              <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-300">
                PAUSED
              </span>
            ) : (
              <span className="rounded-md bg-rose-400/10 px-2 py-1 text-[9px] font-semibold text-rose-300">
                DISCONNECTED
              </span>
            )}
          </div>
        </div>

        {/* Table + Inspector */}

        <div
          className="
            flex
            min-h-[580px]
            max-h-[720px]
            overflow-hidden
          "
        >
          {/* ============================================================ */}
          {/* EVENTS TABLE                                                 */}
          {/* ============================================================ */}

          <div className="min-w-0 flex-1 overflow-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead
                className="
                  sticky top-0 z-20
                  border-b border-slate-800
                  bg-[#06101a]
                "
              >
                <tr className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
                  <th className="px-3 py-2.5">Seq</th>

                  <th className="px-3 py-2.5">
                    Received
                  </th>

                  <th className="px-3 py-2.5">
                    Provider
                  </th>

                  <th className="px-3 py-2.5">
                    Domain
                  </th>

                  <th className="px-3 py-2.5">
                    Event
                  </th>

                  <th className="px-3 py-2.5">
                    Instrument
                  </th>

                  <th className="px-3 py-2.5 text-right">
                    Latency
                  </th>

                  <th className="px-3 py-2.5 text-right">
                    Inspect
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div
                        className="
                          flex min-h-[350px]
                          flex-col items-center justify-center
                          px-5 text-center
                        "
                      >
                        <Radio className="h-7 w-7 text-slate-700" />

                        <div className="mt-3 text-xs font-semibold text-slate-400">
                          No matching events
                        </div>

                        <div className="mt-1 text-[10px] text-slate-600">
                          Waiting for the event bus or change the
                          active filters.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => {
                    const isSelected =
                      selectedEvent?.eventId ===
                      event.eventId;

                    const latency = Number(
                      event.latencyMs ?? 0
                    );

                    return (
                      <tr
                        key={event.eventId}
                        onClick={() =>
                          setSelectedEvent(event)
                        }
                        className={`cursor-pointer border-b border-slate-800/70 transition ${isSelected
                            ? "bg-cyan-400/[0.07]"
                            : "hover:bg-cyan-400/[0.025]"
                          }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">
                          {safeText(event.sequence)}
                        </td>

                        <td className="px-3 py-2.5 text-[10px] font-medium text-slate-300">
                          {formatTime(
                            event.receivedTimestamp
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <span
                            className="
                              inline-flex
                              rounded-md
                              border border-slate-700
                              bg-[#0a1a29]
                              px-2 py-0.5
                              text-[9px]
                              font-semibold
                              text-slate-300
                            "
                          >
                            {safeText(event.provider)}
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-semibold ${getDomainClasses(
                              safeText(event.domain, "")
                            )}`}
                          >
                            {safeText(event.domain)}
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="max-w-[230px] truncate text-[10px] font-semibold text-slate-200">
                            {safeText(event.eventType)}
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="max-w-[220px] truncate font-mono text-[10px] font-medium text-cyan-300">
                            {safeText(
                              event.instrumentId ||
                              event.canonicalInstrumentId
                            )}
                          </div>
                        </td>

                        <td
                          className={`px-3 py-2.5 text-right font-mono text-[10px] font-semibold ${getLatencyTone(
                            latency
                          )}`}
                        >
                          {latency > 0
                            ? `${latency.toFixed(1)} ms`
                            : "< 1 ms"}
                        </td>

                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();

                              setSelectedEvent(event);
                            }}
                            className="
                              rounded-md
                              border border-slate-700
                              bg-[#091827]
                              px-2 py-1
                              text-[9px] font-semibold
                              text-slate-400
                              transition
                              hover:border-cyan-400/30
                              hover:text-cyan-300
                            "
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ============================================================ */}
          {/* EVENT INSPECTOR                                             */}
          {/* ============================================================ */}

          {selectedEvent && (
            <aside
              className="
                hidden w-[390px] shrink-0
                border-l border-slate-800
                bg-[#06101a]
                xl:flex xl:flex-col
              "
            >
              {/* Inspector Header */}

              <div
                className="
                  flex items-center justify-between
                  border-b border-slate-800
                  px-4 py-3
                "
              >
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-300" />

                  <div>
                    <h3 className="text-xs font-bold text-slate-200">
                      Event Inspector
                    </h3>

                    <div className="mt-0.5 text-[9px] text-slate-600">
                      Normalized event payload
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedEvent(null)
                  }
                  className="
                    rounded-md
                    border border-slate-800
                    p-1.5
                    text-slate-500
                    transition
                    hover:border-slate-700
                    hover:text-slate-200
                  "
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Inspector Body */}

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div
                  className="
                    rounded-lg
                    border border-slate-800
                    bg-[#081522]
                    p-3
                  "
                >
                  <div className="text-[9px] uppercase tracking-wider text-slate-600">
                    Event Type
                  </div>

                  <div className="mt-1 break-all text-xs font-bold text-cyan-300">
                    {safeText(selectedEvent.eventType)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="
                      rounded-lg
                      border border-slate-800
                      bg-[#081522]
                      p-3
                    "
                  >
                    <div className="text-[9px] uppercase text-slate-600">
                      Provider
                    </div>

                    <div className="mt-1 truncate text-[11px] font-semibold text-slate-200">
                      {safeText(selectedEvent.provider)}
                    </div>
                  </div>

                  <div
                    className="
                      rounded-lg
                      border border-slate-800
                      bg-[#081522]
                      p-3
                    "
                  >
                    <div className="text-[9px] uppercase text-slate-600">
                      Environment
                    </div>

                    <div className="mt-1 truncate text-[11px] font-semibold text-slate-200">
                      {safeText(
                        selectedEvent.environment
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-600">
                    Event ID
                  </div>

                  <div
                    className="
                      break-all
                      rounded-lg
                      border border-slate-800
                      bg-[#081522]
                      p-3
                      font-mono
                      text-[9px]
                      text-slate-400
                    "
                  >
                    {safeText(selectedEvent.eventId)}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-600">
                    Instrument
                  </div>

                  <div
                    className="
                      rounded-lg
                      border border-slate-800
                      bg-[#081522]
                      p-3
                      font-mono
                      text-[10px]
                      text-cyan-300
                    "
                  >
                    {safeText(
                      selectedEvent.instrumentId ||
                      selectedEvent.canonicalInstrumentId
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-600">
                    Received Timestamp
                  </div>

                  <div
                    className="
                      rounded-lg
                      border border-slate-800
                      bg-[#081522]
                      p-3
                      font-mono
                      text-[9px]
                      text-slate-400
                    "
                  >
                    {safeText(
                      selectedEvent.receivedTimestamp
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-slate-600">
                      Normalized Payload
                    </span>

                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      JSON
                    </span>
                  </div>

                  <pre
                    className="
                      max-h-[380px]
                      overflow-auto
                      rounded-lg
                      border border-slate-800
                      bg-[#030912]
                      p-3
                      font-mono
                      text-[9px]
                      leading-relaxed
                      text-emerald-300
                    "
                  >
                    {JSON.stringify(
                      selectedEvent.payload,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Mobile selected event notice */}

        {selectedEvent && (
          <div className="border-t border-slate-800 bg-[#06101a] px-4 py-3 xl:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] uppercase text-slate-600">
                  Selected Event
                </div>

                <div className="truncate text-[10px] font-semibold text-cyan-300">
                  {safeText(selectedEvent.eventType)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-md border border-slate-700 px-2 py-1 text-[9px] text-slate-400"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}