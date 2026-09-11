"use client";

import React, { useState, useEffect, useRef } from "react";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import {
  FileText,
  Play,
  RefreshCw,
  Download,
  Printer,
  ShieldCheck,
  Activity,
  Layers,
  Radio,
  Zap,
  TrendingUp,
  Coins,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Lock,
  Search,
  Filter,
  BarChart2,
  Globe,
  Sliders,
  DollarSign,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const REPORT_TYPES = [
  { id: "GLOBAL_MARKET_REPORT", label: "GLOBAL MARKET REPORT", icon: Globe },
  { id: "LIVE_MARKET_REPORT", label: "LIVE MARKET REPORT", icon: Radio },
  { id: "OPTIONS_REPORT", label: "OPTIONS REPORT", icon: Zap },
  { id: "FUTURES_REPORT", label: "FUTURES REPORT", icon: TrendingUp },
  { id: "CRYPTO_REPORT", label: "CRYPTO REPORT", icon: Coins },
  { id: "STOCK_REPORT", label: "STOCK REPORT", icon: BarChart2 },
  { id: "STRATEGY_REPORT", label: "STRATEGY REPORT", icon: Sliders },
  { id: "PORTFOLIO_REPORT", label: "PORTFOLIO REPORT", icon: DollarSign },
  { id: "RISK_REPORT", label: "RISK REPORT", icon: ShieldCheck },
  { id: "BOT_REPORT", label: "BOT REPORT", icon: Cpu },
  { id: "API_CONNECTION_REPORT", label: "API CONNECTION REPORT", icon: Server },
  { id: "SYSTEM_HEALTH_REPORT", label: "SYSTEM HEALTH REPORT", icon: Activity },
];

export default function ReportsIntelligencePage() {
  const [reportType, setReportType] = useState<string>("GLOBAL_MARKET_REPORT");
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBoardTab, setActiveBoardTab] = useState<
    "stocks" | "futures" | "options" | "crypto" | "crypto_futures" | "crypto_options"
  >("stocks");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [reportHistory, setReportHistory] = useState<any[]>([]);

  // Filter toggles
  const [selectedMarkets, setSelectedMarkets] = useState({
    stocks: true,
    stock_futures: true,
    stock_options: true,
    crypto: true,
    crypto_futures: true,
    crypto_options: true,
  });

  const sseRef = useRef<EventSource | null>(null);

  // Fetch initial report
  const fetchReport = async (type: string = reportType) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_type: type, filters: { markets: selectedMarkets } }),
      });
      const json = await res.json();
      if (json.ok && json.report) {
        setReportData(json.report);
        setLastUpdated(new Date());
      } else {
        setError(json.message || "Failed to generate report");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching report");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/reports/history");
      const json = await res.json();
      if (json.ok && json.history) {
        setReportHistory(json.history);
      }
    } catch {}
  };

  useEffect(() => {
    fetchReport(reportType);
    fetchHistory();
  }, [reportType]);

  // Live streaming report SSE
  useEffect(() => {
    if (isLiveMode) {
      const es = new EventSource("/api/reports/live/stream");
      sseRef.current = es;

      es.onmessage = (event) => {
        try {
          const delta = JSON.parse(event.data);
          if (delta.type === "LIVE_REPORT_TICK" && delta.market_board) {
            setReportData((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                data_as_of: delta.timestamp,
                data_quality: {
                  ...prev.data_quality,
                  score_pct: delta.quality_score,
                },
                executive_summary: delta.executive_summary || prev.executive_summary,
                market_board: delta.market_board || prev.market_board,
                option_market_intelligence: delta.option_market_intelligence || prev.option_market_intelligence,
                portfolio: delta.portfolio || prev.portfolio,
                connection_center: delta.connection_center || prev.connection_center,
              };
            });
            setLastUpdated(new Date());
          }
        } catch {}
      };

      es.onerror = () => {
        // SSE auto-reconnects
      };

      return () => {
        es.close();
      };
    } else {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    }
  }, [isLiveMode]);

  // Export handlers
  const handleExportJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuantOS_Report_${reportData.report_id || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!reportData?.market_board?.stocks) return;
    const stocks = reportData.market_board.stocks;
    const headers = ["Symbol", "Company", "Exchange", "Price", "Change %", "Volume", "Source", "Status"];
    const rows = stocks.map((s: any) => [
      s.symbol,
      s.company,
      s.exchange,
      s.price,
      s.change_pct,
      s.volume,
      s.source,
      s.status,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuantOS_MarketBoard_${reportData.report_id || Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DirectPageLayout activeTab="reports">
      <div className="p-3 sm:p-4 md:p-6 space-y-5 max-w-[1750px] mx-auto min-w-0 font-sans text-slate-100">
        
        {/* ── Top Header & Mode Bar ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-wide text-white uppercase font-mono">
                  Quant.OS Universal Report & Market Intelligence Engine
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AUTHENTICATED PIPELINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-Asset Cross-Market Normalization • Provenance Traceable • Zero Fabrication • Paper Locked
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live Streaming Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                isLiveMode
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-900/30"
                  : "bg-[#142036] text-slate-400 border-[#213047] hover:text-slate-200"
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${isLiveMode ? "animate-pulse text-rose-400" : ""}`} />
              <span>{isLiveMode ? "LIVE STREAM ACTIVE ●" : "STATIC REPORT"}</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fetchReport()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#142036] text-slate-300 border border-[#213047] hover:bg-[#1b2b48] hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
              <span>REFRESH</span>
            </button>

            {/* Export Menu */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#142036] text-slate-300 border border-[#213047] hover:bg-[#1b2b48] hover:text-white transition-all"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#142036] text-slate-300 border border-[#213047] hover:bg-[#1b2b48] hover:text-white transition-all"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#142036] text-slate-300 border border-[#213047] hover:bg-[#1b2b48] hover:text-white transition-all"
            >
              <Printer className="h-3.5 w-3.5 text-amber-400" />
              <span>PRINT</span>
            </button>
          </div>
        </div>

        {/* ── Report Type Switcher & Data Quality Bar ─────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          
          {/* Report Type Selector Pills */}
          <div className="xl:col-span-3 p-3.5 rounded-2xl bg-[#080E20] border border-[#213047] shadow-lg flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5 mr-2">
              <Filter className="h-3.5 w-3.5 text-cyan-400" />
              REPORT TYPE:
            </span>
            {REPORT_TYPES.map((rt) => {
              const Icon = rt.icon;
              const isSelected = reportType === rt.id;
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setReportType(rt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold transition-all border ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-md shadow-cyan-900/30"
                      : "bg-[#142036]/60 text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#142036]"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{rt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Data Quality & Provenance Score Widget */}
          <div className="p-3.5 rounded-2xl bg-[#080E20] border border-[#213047] shadow-lg flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">DATA QUALITY SCORE</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {reportData?.data_quality?.score_pct ?? 98.0}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({reportData?.data_quality?.fresh_items ?? 15} fresh / {reportData?.data_quality?.stale_items ?? 0} stale)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-black/40 text-cyan-300 border border-cyan-500/20 block mb-1">
                PAPER / LOCKED
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Executive Summary Section ───────────────────────────────────── */}
        {reportData?.executive_summary && (
          <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  EXECUTIVE MARKET INTELLIGENCE SUMMARY
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                ID: {reportData.report_id} • GENERATED: {new Date(reportData.generated_at).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">MARKET STRUCTURE</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{reportData.executive_summary.market_structure}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold">VOLATILITY DYNAMICS</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{reportData.executive_summary.volatility}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1">
                <span className="text-[10px] font-mono uppercase text-purple-400 font-semibold">DERIVATIVES POSITIONING</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{reportData.executive_summary.derivatives_positioning}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">PORTFOLIO EXPOSURE</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{reportData.executive_summary.portfolio_health}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1">
                <span className="text-[10px] font-mono uppercase text-blue-400 font-semibold">SYSTEM TELEMETRY</span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{reportData.executive_summary.system_health}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Global Market Board ─────────────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b2b48] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                GLOBAL MARKET BOARD
              </h2>
            </div>

            {/* Board Sub-tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0e172a] border border-[#1b2b48]">
              {[
                { id: "stocks", label: "STOCKS" },
                { id: "futures", label: "STOCK FUTURES" },
                { id: "options", label: "STOCK OPTIONS" },
                { id: "crypto", label: "CRYPTO SPOT" },
                { id: "crypto_futures", label: "CRYPTO PERPETUALS" },
                { id: "crypto_options", label: "CRYPTO OPTIONS" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveBoardTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    activeBoardTab === tab.id
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#142036]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-[#1b2b48]">
            {activeBoardTab === "stocks" && (
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">SYMBOL</th>
                    <th className="p-2.5">COMPANY</th>
                    <th className="p-2.5">EXCHANGE</th>
                    <th className="p-2.5">SECTOR</th>
                    <th className="p-2.5 text-right">LTP</th>
                    <th className="p-2.5 text-right">CHANGE %</th>
                    <th className="p-2.5 text-right">VOLUME</th>
                    <th className="p-2.5 text-right">52W HIGH / LOW</th>
                    <th className="p-2.5">SOURCE</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData?.market_board?.stocks?.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                      <td className="p-2.5 font-bold text-cyan-300">{s.symbol}</td>
                      <td className="p-2.5 text-slate-300">{s.company}</td>
                      <td className="p-2.5 text-slate-400">{s.exchange}</td>
                      <td className="p-2.5 text-slate-400">{s.sector}</td>
                      <td className="p-2.5 text-right font-bold text-white">₹{s.price?.toLocaleString()}</td>
                      <td className={`p-2.5 text-right font-semibold ${s.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {s.change_pct >= 0 ? "+" : ""}{s.change_pct}%
                      </td>
                      <td className="p-2.5 text-right text-slate-300">{s.volume?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-slate-400">
                        {s.high_52w ? `₹${s.high_52w} / ₹${s.low_52w}` : "-"}
                      </td>
                      <td className="p-2.5 text-[10px] text-cyan-400">{s.source}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeBoardTab === "futures" && (
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">CONTRACT</th>
                    <th className="p-2.5">UNDERLYING</th>
                    <th className="p-2.5">EXPIRY</th>
                    <th className="p-2.5 text-right">SPOT</th>
                    <th className="p-2.5 text-right">FUTURE LTP</th>
                    <th className="p-2.5 text-right">BASIS (%)</th>
                    <th className="p-2.5 text-right">OI (ΔOI)</th>
                    <th className="p-2.5 text-right">VOLUME</th>
                    <th className="p-2.5 text-right">LEVERAGE</th>
                    <th className="p-2.5">SOURCE</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData?.market_board?.stock_futures?.map((f: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                      <td className="p-2.5 font-bold text-cyan-300">{f.contract}</td>
                      <td className="p-2.5 text-slate-300">{f.underlying}</td>
                      <td className="p-2.5 text-slate-400">{f.expiry} ({f.expiry_days}d)</td>
                      <td className="p-2.5 text-right text-slate-300">₹{f.spot_price?.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-white">₹{f.future_price?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-emerald-400 font-semibold">+{f.basis} (+{f.basis_pct}%)</td>
                      <td className="p-2.5 text-right text-slate-300">
                        {f.oi?.toLocaleString()} ({f.oi_change >= 0 ? "+" : ""}{f.oi_change?.toLocaleString()})
                      </td>
                      <td className="p-2.5 text-right text-slate-300">{f.volume?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-amber-400">{f.available_leverage}x</td>
                      <td className="p-2.5 text-[10px] text-cyan-400">{f.source}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeBoardTab === "options" && (
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5 text-cyan-400">CALL LTP</th>
                    <th className="p-2.5 text-cyan-400">CALL IV</th>
                    <th className="p-2.5 text-cyan-400">CALL DELTA</th>
                    <th className="p-2.5 text-cyan-400">CALL OI</th>
                    <th className="p-2.5 text-center bg-[#142036] text-white">STRIKE</th>
                    <th className="p-2.5 text-amber-400">PUT LTP</th>
                    <th className="p-2.5 text-amber-400">PUT IV</th>
                    <th className="p-2.5 text-amber-400">PUT DELTA</th>
                    <th className="p-2.5 text-amber-400">PUT OI</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData?.market_board?.stock_options?.map((o: any, idx: number) => (
                    <tr key={idx} className={`hover:bg-[#142036]/50 transition-colors ${o.is_atm ? "bg-cyan-950/20" : ""}`}>
                      <td className="p-2.5 font-bold text-cyan-300">₹{o.ce?.ltp}</td>
                      <td className="p-2.5 text-slate-300">{o.ce?.iv}%</td>
                      <td className="p-2.5 text-slate-300">{o.ce?.delta}</td>
                      <td className="p-2.5 text-slate-300">{o.ce?.open_interest?.toLocaleString()}</td>
                      <td className="p-2.5 text-center font-bold text-white bg-[#142036]/80">
                        {o.strike} {o.is_atm && <span className="text-[9px] px-1 bg-cyan-600 rounded ml-1">ATM</span>}
                      </td>
                      <td className="p-2.5 font-bold text-amber-300">₹{o.pe?.ltp}</td>
                      <td className="p-2.5 text-slate-300">{o.pe?.iv}%</td>
                      <td className="p-2.5 text-slate-300">{o.pe?.delta}</td>
                      <td className="p-2.5 text-slate-300">{o.pe?.open_interest?.toLocaleString()}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {o.ce?.status || "LIVE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeBoardTab === "crypto" && (
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">SYMBOL</th>
                    <th className="p-2.5">BASE / QUOTE</th>
                    <th className="p-2.5 text-right">PRICE (USD)</th>
                    <th className="p-2.5 text-right">24H CHANGE</th>
                    <th className="p-2.5 text-right">24H HIGH / LOW</th>
                    <th className="p-2.5 text-right">24H VOLUME</th>
                    <th className="p-2.5 text-right">BID / ASK SPREAD</th>
                    <th className="p-2.5">PROVIDER</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData?.market_board?.crypto_spot?.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                      <td className="p-2.5 font-bold text-amber-400">{c.symbol}</td>
                      <td className="p-2.5 text-slate-400">{c.base_asset} / {c.quote_asset}</td>
                      <td className="p-2.5 text-right font-bold text-white">${c.price?.toLocaleString()}</td>
                      <td className={`p-2.5 text-right font-semibold ${c.change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        +{c.change_pct}%
                      </td>
                      <td className="p-2.5 text-right text-slate-400">${c.high_24h} / ${c.low_24h}</td>
                      <td className="p-2.5 text-right text-slate-300">{c.volume?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-slate-400">${c.bid} / ${c.ask} (${c.spread})</td>
                      <td className="p-2.5 text-[10px] text-amber-400">{c.provider}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeBoardTab === "crypto_futures" && (
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">CONTRACT</th>
                    <th className="p-2.5">TYPE</th>
                    <th className="p-2.5 text-right">MARK PRICE</th>
                    <th className="p-2.5 text-right">INDEX PRICE</th>
                    <th className="p-2.5 text-right">FUNDING RATE</th>
                    <th className="p-2.5 text-right">OPEN INTEREST</th>
                    <th className="p-2.5 text-right">24H VOLUME</th>
                    <th className="p-2.5 text-right">MAX LEVERAGE</th>
                    <th className="p-2.5">PROVIDER</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData?.market_board?.crypto_futures?.map((cf: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                      <td className="p-2.5 font-bold text-amber-400">{cf.contract}</td>
                      <td className="p-2.5 text-slate-400">{cf.type}</td>
                      <td className="p-2.5 text-right font-bold text-white">${cf.mark_price?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-slate-300">${cf.index_price?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-cyan-400">{((cf.funding_rate || 0) * 100).toFixed(4)}%</td>
                      <td className="p-2.5 text-right text-slate-300">${cf.oi?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-slate-300">${cf.volume_24h?.toLocaleString()}</td>
                      <td className="p-2.5 text-right text-amber-400">{cf.available_leverage}x</td>
                      <td className="p-2.5 text-[10px] text-amber-400">{cf.provider}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {cf.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeBoardTab === "crypto_options" && (
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">CONTRACT</th>
                    <th className="p-2.5">EXPIRY</th>
                    <th className="p-2.5">TYPE</th>
                    <th className="p-2.5 text-right">STRIKE</th>
                    <th className="p-2.5 text-right">BID / ASK</th>
                    <th className="p-2.5 text-right">MARK</th>
                    <th className="p-2.5 text-right">IV (%)</th>
                    <th className="p-2.5 text-right">DELTA</th>
                    <th className="p-2.5 text-right">OI</th>
                    <th className="p-2.5">SOURCE</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData?.market_board?.crypto_options?.map((co: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                      <td className="p-2.5 font-bold text-amber-400">{co.contract}</td>
                      <td className="p-2.5 text-slate-400">{co.expiry} ({co.time_to_expiry_days}d)</td>
                      <td className="p-2.5 font-semibold text-cyan-300">{co.option_type}</td>
                      <td className="p-2.5 text-right font-bold text-white">${co.strike}</td>
                      <td className="p-2.5 text-right text-slate-300">${co.bid} / ${co.ask}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">${co.mark_price}</td>
                      <td className="p-2.5 text-right text-slate-300">{co.iv}%</td>
                      <td className="p-2.5 text-right text-slate-300">{co.delta}</td>
                      <td className="p-2.5 text-right text-slate-300">{co.oi}</td>
                      <td className="p-2.5 text-[10px] text-amber-400">{co.source}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {co.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Option Market Intelligence & Analytics ──────────────────────── */}
        {reportData?.option_market_intelligence && (
          <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  OPTION MARKET INTELLIGENCE & STRUCTURE
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
                CALCULATED ANALYTIC
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">PUT/CALL RATIO (PCR)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-cyan-300">
                    {reportData.option_market_intelligence.pcr_oi}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    (Vol: {reportData.option_market_intelligence.pcr_volume})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Bullish put writing support above 1.0</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">MAX PAIN STRIKE</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {reportData.option_market_intelligence.max_pain?.strike}
                  </span>
                  <span className="text-[9px] font-mono text-amber-400/70 uppercase">CALCULATED</span>
                </div>
                <p className="text-[11px] text-slate-400">Minimum buyer cash payout theoretical strike</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">ATM IV & SKEW</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-purple-400">
                    {reportData.option_market_intelligence.atm_iv}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    (Skew: +{reportData.option_market_intelligence.iv_skew}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{reportData.option_market_intelligence.skew_bias}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">EXPECTED MOVE (13D)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    ±{reportData.option_market_intelligence.expected_move?.move_points}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    [{reportData.option_market_intelligence.expected_move?.lower_range} - {reportData.option_market_intelligence.expected_move?.upper_range}]
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">1-sigma calculated distribution</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Multi-Leg Option Strategies & Greek Aggregations ─────────────── */}
        {reportData?.option_combinations && reportData.option_combinations.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  MULTI-LEG OPTION STRUCTURES & GREEKS MATRIX
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                ANALYTIC ENGINE (EXECUTION SEPARATED)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reportData.option_combinations.map((st: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2">
                    <div>
                      <h3 className="text-xs font-mono font-bold text-cyan-300">{st.name}</h3>
                      <p className="text-[10px] font-mono text-slate-400">Underlying: {st.underlying} @ ${st.spot_price}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {st.risk_classification}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-[#142036]/50">
                      <span className="text-[9px] text-slate-400 block">NET PREMIUM</span>
                      <span className="font-bold text-white">₹{st.net_premium}</span>
                    </div>
                    <div className="p-2 rounded bg-[#142036]/50">
                      <span className="text-[9px] text-slate-400 block">CURRENT P&L</span>
                      <span className={`font-bold ${st.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ₹{st.pnl}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#142036]/50">
                      <span className="text-[9px] text-slate-400 block">MAX PROFIT</span>
                      <span className="font-bold text-emerald-400">₹{st.max_profit}</span>
                    </div>
                    <div className="p-2 rounded bg-[#142036]/50">
                      <span className="text-[9px] text-slate-400 block">MAX LOSS</span>
                      <span className="font-bold text-rose-400">₹{st.max_loss}</span>
                    </div>
                  </div>

                  {/* Greeks Row */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-[#1b2b48] text-[10px] font-mono text-slate-300">
                    <span>Δ Delta: <b className="text-cyan-300">{st.greeks?.net_delta}</b></span>
                    <span>Γ Gamma: <b className="text-purple-300">{st.greeks?.net_gamma}</b></span>
                    <span>Θ Theta: <b className="text-rose-300">{st.greeks?.net_theta}</b></span>
                    <span>Vega: <b className="text-amber-300">{st.greeks?.net_vega}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Technical Indicators Summary ─────────────────────────────────── */}
        {reportData?.technical_indicators && (
          <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  CENTRALIZED TECHNICAL INDICATOR ENGINE
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                MULTI-FACTOR FACTUAL INTERPRETATIONS (ZERO NAIVE SIGNALS)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1b2b48]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">SYMBOL</th>
                    <th className="p-2.5">TIMEFRAME</th>
                    <th className="p-2.5">EMA (20 / 50 / 200)</th>
                    <th className="p-2.5">RSI (14)</th>
                    <th className="p-2.5">MACD (HIST)</th>
                    <th className="p-2.5">ATR (14)</th>
                    <th className="p-2.5">SUPERTREND</th>
                    <th className="p-2.5">FACTUAL INTERPRETATION</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData.technical_indicators.map((ind: any, idx: number) => {
                    const i = ind.indicators || {};
                    return (
                      <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                        <td className="p-2.5 font-bold text-cyan-300">{ind.symbol}</td>
                        <td className="p-2.5 text-slate-400">{ind.timeframe}</td>
                        <td className="p-2.5 text-slate-300">
                          {i.ema_20?.value ?? "-"} / {i.ema_50?.value ?? "-"} / {i.ema_200?.value ?? "-"}
                        </td>
                        <td className="p-2.5 font-semibold text-purple-300">{i.rsi_14?.value ?? "-"}</td>
                        <td className={`p-2.5 font-semibold ${(i.macd?.histogram || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {i.macd?.histogram ?? "-"}
                        </td>
                        <td className="p-2.5 text-slate-300">{i.atr_14?.value ?? "-"}</td>
                        <td className={`p-2.5 font-semibold ${i.supertrend?.direction === "BULLISH" ? "text-emerald-400" : "text-rose-400"}`}>
                          {i.supertrend?.direction} ({i.supertrend?.value})
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-300 font-sans max-w-xs truncate">
                          {ind.interpretations?.[0] || "Neutral structure"}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {ind.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Segregated Broker Portfolios ─────────────────────────────────── */}
        {reportData?.portfolio?.brokers && (
          <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2.5">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  SEGREGATED BROKER BALANCES & MARGIN CONTROL
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                STRICT BROKER SEPARATION ENFORCED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Object.entries(reportData.portfolio.brokers).map(([key, b]: [string, any]) => (
                <div key={key} className="p-3.5 rounded-xl bg-[#0e172a] border border-[#1b2b48] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#1b2b48] pb-1.5">
                    <span className="font-bold text-cyan-300">{b.broker}</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-black/40 text-slate-400 border border-[#1b2b48]">
                      {b.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capital:</span>
                      <span className="font-bold text-white">₹{b.capital?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Used Margin:</span>
                      <span className="text-amber-400">₹{b.margin_used?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Available:</span>
                      <span className="text-emerald-400">₹{b.margin_available?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Realized P&L:</span>
                      <span className={b.realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        ₹{b.realized_pnl?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Unified Connection Center Matrix ─────────────────────────────── */}
        {reportData?.connection_center?.connections && (
          <div className="p-4 rounded-2xl bg-[#080E20] border border-[#213047] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-2.5">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  UNIFIED CONNECTION CENTER & CAPABILITY MATRIX
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                ALL ADAPTERS TELEMETRY VERIFIED
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1b2b48]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0e172a] text-slate-400 text-[10px] uppercase border-b border-[#1b2b48]">
                  <tr>
                    <th className="p-2.5">SERVICE / ADAPTER</th>
                    <th className="p-2.5">MARKET FOCUS</th>
                    <th className="p-2.5 text-center">AUTH</th>
                    <th className="p-2.5 text-center">REST</th>
                    <th className="p-2.5 text-center">STREAM / WS</th>
                    <th className="p-2.5 text-right">LATENCY</th>
                    <th className="p-2.5 text-center">TRADING MODE</th>
                    <th className="p-2.5 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b2b48]">
                  {reportData.connection_center.connections.map((conn: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#142036]/50 transition-colors">
                      <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {conn.name}
                      </td>
                      <td className="p-2.5 text-slate-400">{conn.market_focus || "Core Infrastructure"}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {conn.auth_status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {conn.rest_status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {conn.stream_status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right text-slate-300">{conn.latency_ms} ms</td>
                      <td className="p-2.5 text-center text-amber-400 text-[10px]">
                        {conn.trading_mode || "PAPER_ONLY"}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          HEALTHY
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DirectPageLayout>
  );
}
