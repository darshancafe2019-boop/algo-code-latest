"use client";

import React, { useEffect, useState, useMemo } from "react";
import { BotWizardDraft, SelectedContract, formatPositionBotName } from "./types";
import { api } from "../../lib/api";
import {
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  Radio,
  Clock,
  AlertCircle,
  Target,
} from "lucide-react";

interface Step2Props {
  draft: BotWizardDraft;
  updateDraft: (updates: Partial<BotWizardDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step2LiveMarket({ draft, updateDraft, onNext, onPrev }: Step2Props) {
  const [loading, setLoading] = useState(false);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [expiries, setExpiries] = useState<any[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [optionChain, setOptionChain] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveUnderlyingQuote, setLiveUnderlyingQuote] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [strikeLimit, setStrikeLimit] = useState<number | "ALL">("ALL");
  const [moneynessFilter, setMoneynessFilter] = useState<"ALL" | "ITM" | "ATM" | "OTM">("ALL");
  const [sideFilter, setSideFilter] = useState<"BOTH" | "CALL" | "PUT">("BOTH");
  const [viewMode, setViewMode] = useState<"standard" | "greeks">("standard");
  const [strikeSearch, setStrikeSearch] = useState<string>("");

  const isOptionMarket = draft.market_type.includes("OPTION");
  const isFutureMarket = draft.market_type.includes("FUTURE");
  const isStockMarket = draft.market_type === "INDIA_STOCK" || draft.market_type === "US_STOCK" || draft.market_type === "CRYPTO_SPOT";
  const currencySymbol = draft.market_type.includes("INDIA") ? "₹" : "$";

  // Safe numerical, price, and Greek formatters (strict zero-fabrication: null/empty/untraded -> "—")
  const renderPrice = (val: any, decimals: number = 2): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return "—";
    }
    const n = Number(val);
    if (n <= 0) return "—";
    return `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const renderRawPrice = (val: any, decimals: number = 2): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return "—";
    }
    const n = Number(val);
    if (n <= 0) return "—";
    return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const renderGreek = (val: any, decimals: number = 3): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return "—";
    }
    return Number(val).toFixed(decimals);
  };

  const renderPercent = (val: any, decimals: number = 1): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return "—";
    }
    return `${Number(val).toFixed(decimals)}%`;
  };

  const renderInt = (val: any): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return "—";
    }
    const n = Math.round(Number(val));
    if (n <= 0) return "—";
    return n.toLocaleString();
  };

  const formatGreek = (val: any, decimals: number = 3, defaultVal: string = "—"): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return defaultVal;
    }
    return Number(val).toFixed(decimals);
  };

  const formatPrice = (val: any, decimals: number = 2, defaultVal: string = "—"): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return defaultVal;
    }
    const n = Number(val);
    if (n <= 0 && defaultVal === "—") return defaultVal;
    return n.toFixed(decimals);
  };

  const toIsoDate = (val: any): string => {
    if (!val) return "";
    const s = String(val).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [d, m, y] = s.split("-");
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return s;
    }
    if (s.includes("T")) {
      return s.split("T")[0];
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    } catch {}
    return s;
  };

  const toDdMmYyyy = (val: any): string => {
    if (!val) return "";
    const s = String(val).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-");
      return `${d}-${m}-${y}`;
    }
    if (s.includes("T")) {
      const [y, m, d] = s.split("T")[0].split("-");
      return `${d}-${m}-${y}`;
    }
    return s;
  };

  const formatPercent = (val: any, decimals: number = 1, defaultVal: string = "—"): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return defaultVal;
    }
    return `${Number(val).toFixed(decimals)}%`;
  };

  const formatInt = (val: any, defaultVal: string = "—"): string => {
    if (val === null || val === undefined || val === "" || isNaN(Number(val))) {
      return defaultVal;
    }
    return Math.round(Number(val)).toLocaleString();
  };

  const formatStrike = (st: any): string => {
    if (st === null || st === undefined || isNaN(Number(st))) {
      return String(st || "—");
    }
    return Number(st).toLocaleString();
  };

  const calculateDaysToExpiry = (dateStr: string): number => {
    try {
      const iso = toIsoDate(dateStr);
      const target = new Date(`${iso}T12:00:00Z`).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 0 : diffDays;
    } catch {
      return 0;
    }
  };

  // 1-second real-time clock for truthful age calculation
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // State synchronization and request sequencing guards
  const selectedExpiryRef = React.useRef(selectedExpiry);
  selectedExpiryRef.current = selectedExpiry;
  const inFlightRef = React.useRef(false);
  const reqSeqRef = React.useRef(0);

  // Authoritative Feed Status Derivation: LIVE | STALE | RECONNECTING | NO QUOTES | API ERROR | EXPIRED | UNAVAILABLE
  const feedDiagnostics = useMemo(() => {
    if (errorMsg) {
      return {
        status: "API ERROR",
        badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        dotColor: "bg-rose-400",
        ageSec: null as number | null,
        tickTimeStr: null as string | null,
        receivedTimeStr: null as string | null,
        message: errorMsg,
      };
    }

    const isSelectedExpExpired = (() => {
      if (!selectedExpiry) return false;
      const match = expiries.find((e: any) => toIsoDate(e.expiry_iso) === toIsoDate(selectedExpiry));
      if (match && match.days_to_expiry < 0) return true;
      const expIso = toIsoDate(selectedExpiry);
      if (expIso) {
        const expDate = new Date(`${expIso}T12:00:00Z`).getTime();
        if (!isNaN(expDate) && expDate < Date.now() - 3600000) return true;
      }
      return false;
    })();

    if (isSelectedExpExpired) {
      return {
        status: "EXPIRED",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dotColor: "bg-amber-400",
        ageSec: null as number | null,
        tickTimeStr: null as string | null,
        receivedTimeStr: null as string | null,
        message: "Selected expiry has settled.",
      };
    }

    if (!optionChain && loading) {
      return {
        status: "UNAVAILABLE",
        badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        dotColor: "bg-slate-400",
        ageSec: null as number | null,
        tickTimeStr: null as string | null,
        receivedTimeStr: null as string | null,
        message: "Loading authoritative market feed...",
      };
    }

    if (!optionChain && !loading) {
      return {
        status: "UNAVAILABLE",
        badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        dotColor: "bg-slate-400",
        ageSec: null as number | null,
        tickTimeStr: null as string | null,
        receivedTimeStr: null as string | null,
        message: "No feed response from broker.",
      };
    }

    const rawTs = optionChain?.exchange_ts || optionChain?.exchangeTs || optionChain?.timestamp;
    let tickTimeMs = 0;
    let tickTimeStr = "—";
    if (rawTs) {
      try {
        const d = new Date(rawTs);
        if (!isNaN(d.getTime())) {
          tickTimeMs = d.getTime();
          tickTimeStr = d.toLocaleTimeString([], { hour12: false });
        }
      } catch {}
    }

    const recTs = optionChain?.received_at || optionChain?.receivedAt || optionChain?.timestamp;
    let recTimeStr = "—";
    if (recTs) {
      try {
        const d = new Date(recTs);
        if (!isNaN(d.getTime())) {
          recTimeStr = d.toLocaleTimeString([], { hour12: false });
        }
      } catch {}
    }

    const ageSec = tickTimeMs > 0 ? Math.max(0, Math.floor((nowMs - tickTimeMs) / 1000)) : 0;

    const strikes = optionChain?.strikes || optionChain?.chain || optionChain?.rows || [];
    if (strikes.length === 0) {
      return {
        status: "NO QUOTES",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dotColor: "bg-amber-400",
        ageSec,
        tickTimeStr,
        receivedTimeStr: recTimeStr,
        message: "No live option contracts listed for this expiry.",
      };
    }

    const rawStatus = String(optionChain?.status || optionChain?.data_status || "").toUpperCase();
    if (rawStatus === "RECONNECTING" || rawStatus === "CONNECTING") {
      return {
        status: "RECONNECTING",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dotColor: "bg-amber-400",
        ageSec,
        tickTimeStr,
        receivedTimeStr: recTimeStr,
        message: "Reconnecting to live WebSocket stream...",
      };
    }

    if (rawStatus === "STALE" || rawStatus === "DELAYED" || ageSec > 30) {
      return {
        status: "STALE",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        dotColor: "bg-amber-400",
        ageSec,
        tickTimeStr,
        receivedTimeStr: recTimeStr,
        message: `Feed is delayed (${ageSec}s old).`,
      };
    }

    return {
      status: "LIVE",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      dotColor: "bg-emerald-400",
      ageSec,
      tickTimeStr,
      receivedTimeStr: recTimeStr,
      message: "Streaming live exchange quotes.",
    };
  }, [errorMsg, selectedExpiry, expiries, optionChain, loading, nowMs]);

  // Selected Contract Status & Diagnostics
  const contractDiagnostics = useMemo(() => {
    if (!draft.contract) return null;
    const rawTs = draft.contract.timestamp;
    let tickMs = 0;
    let tickTimeStr = "—";
    if (rawTs) {
      try {
        const d = new Date(rawTs);
        if (!isNaN(d.getTime())) {
          tickMs = d.getTime();
          tickTimeStr = d.toLocaleTimeString([], { hour12: false });
        }
      } catch {}
    }
    const ageSec = tickMs > 0 ? Math.max(0, Math.floor((nowMs - tickMs) / 1000)) : 0;

    let st = "LIVE";
    if (draft.contract.is_live === false) {
      st = "STALE";
    } else if (ageSec > 30) {
      st = "STALE";
    } else if (!draft.contract.premium || draft.contract.premium <= 0) {
      st = "NO QUOTES";
    }

    return {
      status: st,
      ageSec,
      tickTimeStr,
      receivedTimeStr: tickTimeStr,
    };
  }, [draft.contract, nowMs]);

  // Only reset expiry and option chain when underlying or market type genuinely changes
  const prevMarketUnderlyingRef = React.useRef(`${draft.market_type}:${draft.underlying}`);
  useEffect(() => {
    const currentKey = `${draft.market_type}:${draft.underlying}`;
    if (prevMarketUnderlyingRef.current !== currentKey) {
      prevMarketUnderlyingRef.current = currentKey;
      setSelectedExpiry(draft.contract?.expiry || "");
      selectedExpiryRef.current = draft.contract?.expiry || "";
      setOptionChain(null);
      setExpiries([]);
      setErrorMsg(null);
    }
  }, [draft.market_type, draft.underlying]);

  // Load Expiries & Option Chain or Instruments
  const fetchMarketData = async (silent: boolean = false) => {
    if (inFlightRef.current && silent) return;
    inFlightRef.current = true;
    const currentSeq = ++reqSeqRef.current;
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      if (isOptionMarket) {
        const expList = await api.getExpiries(draft.market_type, draft.underlying);
        if (currentSeq !== reqSeqRef.current) return;
        const rawList = Array.isArray(expList) ? expList : ((expList as any)?.data || (expList as any)?.expiries || []);
        const normalizedExpiries = rawList.map((item: any) => {
          const rawExp = typeof item === "string" ? item : (item.expiry || item.expiry_iso || item.expiry_date || item.label || String(item));
          const iso = toIsoDate(rawExp);
          const ddmmyyyy = toDdMmYyyy(rawExp);
          const rawLabel = typeof item === "object" ? (item.display_label || item.label || item.display) : "";
          const dte = item.days_to_expiry ?? calculateDaysToExpiry(iso);

          let suffix = "";
          if (dte <= 0.5) suffix = " (Today)";
          else if (dte <= 1.5) suffix = " (Tomorrow)";
          else if (dte <= 2.5) suffix = " (Daily)";
          else if (dte <= 21) suffix = " (Weekly)";
          else suffix = " (Monthly)";

          const displayLabel = rawLabel || `${ddmmyyyy}${suffix}`;

          return {
            expiry: ddmmyyyy,
            expiry_iso: iso,
            expiry_date: ddmmyyyy,
            settlement_time: item.settlement_time || `${iso}T12:00:00Z`,
            label: displayLabel,
            display_label: displayLabel,
            days_to_expiry: dte,
            expiry_type: item.expiry_type || (dte <= 2.5 ? "DAILY" : dte <= 21 ? "WEEKLY" : "MONTHLY"),
            contract_count: item.contract_count || 0,
          };
        });

        // Ensure chronological order strictly by ISO date
        normalizedExpiries.sort((a, b) => a.expiry_iso.localeCompare(b.expiry_iso));
        setExpiries(normalizedExpiries);

        // Determine active expiry:
        // Priority 1: User's explicitly selected expiry if valid in list (using ISO match)
        // Priority 2: Draft contract expiry if valid in list (using ISO match)
        // Priority 3: Earliest upcoming expiry (days_to_expiry >= 0)
        // Priority 4: First available expiry
        let activeExp = "";
        const currentSelected = selectedExpiryRef.current || selectedExpiry;
        const matchSelected = normalizedExpiries.find((e: any) => toIsoDate(e.expiry_iso) === toIsoDate(currentSelected));
        const matchDraft = normalizedExpiries.find((e: any) => toIsoDate(e.expiry_iso) === toIsoDate(draft.contract?.expiry || ""));

        if (matchSelected) {
          activeExp = matchSelected.expiry;
        } else if (matchDraft) {
          activeExp = matchDraft.expiry;
        } else {
          const upcoming = normalizedExpiries.find((e: any) => e.days_to_expiry >= 0);
          activeExp = upcoming ? upcoming.expiry : (normalizedExpiries.length > 0 ? normalizedExpiries[0].expiry : "");
        }

        if (activeExp && toIsoDate(activeExp) !== toIsoDate(selectedExpiryRef.current)) {
          setSelectedExpiry(activeExp);
          selectedExpiryRef.current = activeExp;
        }

        const chain = await api.getLiveOptionChain(draft.market_type, draft.underlying, activeExp);
        if (currentSeq !== reqSeqRef.current) return;
        if (chain) {
          setOptionChain(chain);
          const spot = chain?.underlying_price ?? chain?.spot_price ?? chain?.spot;
          if (spot !== undefined && spot !== null && !isNaN(Number(spot)) && Number(spot) > 0) {
            setLiveUnderlyingQuote({
              symbol: chain.underlying,
              ltp: Number(spot),
              is_live: chain.status === "LIVE" || chain.data_status === "LIVE",
              provider: chain.provider || draft.broker,
              timestamp: chain.timestamp || new Date().toISOString(),
            });
          }

          const strikes = chain?.strikes || chain?.chain || chain?.rows || [];

          // 1. If contract is already selected, refresh its live quote ONLY if chain matches selected expiry
          if (draft.contract && strikes.length > 0) {
            const chainExpIso = toIsoDate(chain.expiry || chain.selected_expiry || activeExp);
            const contractExpIso = toIsoDate(draft.contract.expiry);
            if (chainExpIso === contractExpIso) {
              const matchStrike = Number(draft.contract.strike);
              const matchingRow = strikes.find((r: any) => Number(r.strike) === matchStrike);
              if (matchingRow) {
                const isCall =
                  draft.contract.option_type === "CE" ||
                  (draft.contract.symbol || "").includes("CE") ||
                  (draft.contract.symbol || "").includes("-C");
                const freshLeg = isCall ? (matchingRow.call || matchingRow.ce) : (matchingRow.put || matchingRow.pe);
                if (freshLeg) {
                  const rawLtp = freshLeg.ltp ?? freshLeg.lastPrice ?? freshLeg.tradePrice ?? freshLeg.close ?? null;
                  const freshLtp = rawLtp != null && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0 ? Number(rawLtp) : null;
                  const freshBid = freshLeg.bid != null && !isNaN(Number(freshLeg.bid)) ? Number(freshLeg.bid) : null;
                  const freshAsk = freshLeg.ask != null && !isNaN(Number(freshLeg.ask)) ? Number(freshLeg.ask) : null;

                  const isActuallyLive = Boolean(freshLeg.exchange_ts || freshLeg.exchangeTs || chain.status === "LIVE" || chain.data_status === "LIVE");

                  if (freshLtp !== null && Math.abs(freshLtp - (draft.contract.premium || 0)) > 0.001) {
                    updateDraft({
                      contract: {
                        ...draft.contract,
                        premium: freshLtp,
                        bid: freshBid !== null ? freshBid : draft.contract.bid,
                        ask: freshAsk !== null ? freshAsk : draft.contract.ask,
                        volume: Number(freshLeg.volume != null ? freshLeg.volume : draft.contract.volume),
                        open_interest: Number(
                          (freshLeg.open_interest ?? freshLeg.oi) != null
                            ? (freshLeg.open_interest ?? freshLeg.oi)
                            : draft.contract.open_interest
                        ),
                        timestamp: chain.timestamp || new Date().toISOString(),
                        is_live: isActuallyLive,
                        greeks: {
                          ...draft.contract.greeks,
                          delta: freshLeg.delta ?? draft.contract.greeks?.delta,
                          gamma: freshLeg.gamma ?? draft.contract.greeks?.gamma,
                          theta: freshLeg.theta ?? draft.contract.greeks?.theta,
                          vega: freshLeg.vega ?? draft.contract.greeks?.vega,
                          iv: freshLeg.iv ?? draft.contract.greeks?.iv,
                        },
                      },
                    });
                  }
                }
              }
            }
          }
          // 2. Otherwise auto-select nearest ATM Call contract if none selected yet
          else if (!draft.contract && strikes.length > 0) {
            const atmRow = strikes.reduce((prev: any, curr: any) => {
              const pDiff = Math.abs((prev.strike || 0) - (spot || 0));
              const cDiff = Math.abs((curr.strike || 0) - (spot || 0));
              return cDiff < pDiff ? curr : prev;
            }, strikes[0]);
            const targetLeg = atmRow?.call || atmRow?.put || atmRow?.ce || atmRow?.pe;
            if (targetLeg) {
              const rawLtp = targetLeg.ltp ?? targetLeg.lastPrice ?? targetLeg.tradePrice ?? targetLeg.close ?? null;
              const legPremium = rawLtp != null && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0 ? Number(rawLtp) : 0;
              const legBid = targetLeg.bid != null && !isNaN(Number(targetLeg.bid)) ? Number(targetLeg.bid) : 0;
              const legAsk = targetLeg.ask != null && !isNaN(Number(targetLeg.ask)) ? Number(targetLeg.ask) : 0;
              const isActuallyLive = Boolean(targetLeg.exchange_ts || targetLeg.exchangeTs || chain.status === "LIVE" || chain.data_status === "LIVE");

              updateDraft({
                contract: {
                  instrument_id: String(targetLeg.product_id || targetLeg.symbol),
                  symbol: targetLeg.symbol,
                  underlying: draft.underlying,
                  expiry: targetLeg.expiry || activeExp,
                  strike: atmRow.strike,
                  option_type: targetLeg.option_type || "CE",
                  premium: legPremium,
                  bid: legBid,
                  ask: legAsk,
                  volume: Number(targetLeg.volume || 0),
                  open_interest: Number(targetLeg.open_interest || targetLeg.oi || 0),
                  lot_size: Number(targetLeg.lot_size || (draft.market_type.includes("INDIA") ? (draft.underlying === "BANKNIFTY" ? 15 : 25) : 0.001)),
                  tick_size: Number(targetLeg.tick_size || 0.05),
                  provider: draft.broker,
                  exchange: draft.market_type.includes("INDIA") ? "NSE" : "DELTA",
                  timestamp: chain.timestamp || new Date().toISOString(),
                  is_live: isActuallyLive,
                  greeks: {
                    delta: targetLeg.delta ?? null,
                    gamma: targetLeg.gamma ?? null,
                    theta: targetLeg.theta ?? null,
                    vega: targetLeg.vega ?? null,
                    iv: targetLeg.iv ?? null,
                    greeks_source: targetLeg.greeks_source || (draft.market_type.includes("INDIA") ? "UPSTOX_LIVE" : "DELTA_LIVE"),
                  },
                },
                bot_name: formatPositionBotName(targetLeg.symbol),
              });
            }
          }
        }
      } else {
        const insts = await api.getInstruments(draft.market_type, draft.underlying, searchTerm);
        if (currentSeq !== reqSeqRef.current) return;
        let safeInsts = Array.isArray(insts) ? insts : ((insts as any)?.data || []);
        setInstruments(safeInsts);
        if (safeInsts.length > 0) {
          const firstInst = safeInsts[0];
          const firstPrice = Number(firstInst.ltp || firstInst.price || firstInst.premium || 0);
          setLiveUnderlyingQuote({
            symbol: firstInst.symbol,
            ltp: firstPrice,
            is_live: Boolean(firstInst.is_live),
            provider: firstInst.provider || draft.broker,
            timestamp: new Date().toISOString(),
          });

          // If draft.contract is already selected, update it with live quotes
          if (draft.contract) {
            const matchingInst = safeInsts.find((inst: any) =>
              inst.symbol === draft.contract?.symbol ||
              inst.canonical_instrument_id === draft.contract?.instrument_id ||
              inst.instrument_id === draft.contract?.instrument_id
            );
            if (matchingInst) {
              const freshPrice = Number(matchingInst.ltp || matchingInst.price || matchingInst.premium || 0);
              if (freshPrice > 0) {
                updateDraft({
                  contract: {
                    ...draft.contract,
                    premium: freshPrice,
                    bid: Number(matchingInst.bid || draft.contract.bid),
                    ask: Number(matchingInst.ask || draft.contract.ask),
                    volume: Number(matchingInst.volume || draft.contract.volume),
                    open_interest: Number(matchingInst.open_interest || draft.contract.open_interest),
                    timestamp: new Date().toISOString(),
                    is_live: Boolean(matchingInst.is_live),
                  },
                });
              }
            }
          } else {
            updateDraft({
              contract: {
                instrument_id: String(firstInst.instrument_id || firstInst.symbol),
                symbol: firstInst.symbol,
                underlying: draft.underlying,
                expiry: firstInst.expiry || "",
                strike: firstInst.strike || 0,
                option_type: null,
                premium: firstPrice,
                bid: Number(firstInst.bid || 0),
                ask: Number(firstInst.ask || 0),
                volume: Number(firstInst.volume || 0),
                open_interest: Number(firstInst.open_interest || 0),
                lot_size: Number(firstInst.lot_size || 1),
                tick_size: Number(firstInst.tick_size || 0.05),
                provider: firstInst.provider || draft.broker,
                exchange: firstInst.exchange || (draft.market_type.includes("INDIA") ? "NSE" : "DELTA"),
                timestamp: new Date().toISOString(),
                is_live: Boolean(firstInst.is_live),
              },
              bot_name: formatPositionBotName(firstInst.symbol),
            });
          }
        }
      }
    } catch (err: any) {
      if (currentSeq === reqSeqRef.current && !silent) setErrorMsg(err.message || "Failed to fetch live market data");
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData(false);
    const interval = setInterval(() => {
      fetchMarketData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [draft.market_type, draft.underlying, selectedExpiry]);

  const handleSelectExpiry = async (expVal: string) => {
    if (toIsoDate(expVal) === toIsoDate(selectedExpiryRef.current)) return;
    setSelectedExpiry(expVal);
    selectedExpiryRef.current = expVal;
    setLoading(true);
    try {
      const chain = await api.getLiveOptionChain(draft.market_type, draft.underlying, expVal);
      if (chain) {
        setOptionChain(chain);
        const spot = chain?.underlying_price ?? chain?.spot_price ?? chain?.spot;
        if (spot !== undefined && spot !== null && !isNaN(Number(spot)) && Number(spot) > 0) {
          setLiveUnderlyingQuote({
            symbol: chain.underlying,
            ltp: Number(spot),
            is_live: chain.status === "LIVE" || chain.data_status === "LIVE",
            provider: chain.provider || draft.broker,
            timestamp: chain.timestamp || new Date().toISOString(),
          });
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch option chain for expiry:", expVal, err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContract = (contract: SelectedContract) => {
    updateDraft({
      contract,
      bot_name: formatPositionBotName(contract.symbol),
      option_strategy: null,
    });
  };

  const handleSelectLeg = (leg: any, strike: number, optType: "CE" | "PE") => {
    if (!leg) return;
    const rawLtp = leg.ltp ?? leg.lastPrice ?? leg.tradePrice ?? leg.close ?? null;
    const legPremium = rawLtp != null && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0 ? Number(rawLtp) : 0;
    const legBid = leg.bid != null && !isNaN(Number(leg.bid)) ? Number(leg.bid) : 0;
    const legAsk = leg.ask != null && !isNaN(Number(leg.ask)) ? Number(leg.ask) : 0;
    const isActuallyLive = Boolean(leg.exchange_ts || leg.exchangeTs || optionChain?.status === "LIVE" || optionChain?.data_status === "LIVE");

    handleSelectContract({
      instrument_id: String(leg.product_id || leg.symbol),
      symbol: leg.symbol,
      underlying: draft.underlying,
      expiry: leg.expiry || selectedExpiry,
      strike: strike,
      option_type: optType,
      premium: legPremium,
      bid: legBid,
      ask: legAsk,
      volume: Number(leg.volume || 0),
      open_interest: Number(leg.open_interest || leg.oi || 0),
      lot_size: Number(leg.lot_size || (draft.market_type.includes("INDIA") ? 25 : 0.001)),
      tick_size: Number(leg.tick_size || 0.05),
      provider: draft.broker,
      exchange: draft.market_type.includes("INDIA") ? "UPSTOX" : "DELTA",
      timestamp: optionChain?.timestamp,
      is_live: isActuallyLive,
      greeks: {
        delta: leg.delta ?? null,
        gamma: leg.gamma ?? null,
        theta: leg.theta ?? null,
        vega: leg.vega ?? null,
        iv: leg.iv ?? null,
        greeks_source: leg.greeks_source || (draft.market_type.includes("INDIA") ? "UPSTOX_LIVE" : "DELTA_LIVE"),
      },
    });
  };

  // Option Chain Derived Metrics & Filtering Logic
  const allStrikes = useMemo(() => {
    return optionChain?.strikes || optionChain?.chain || [];
  }, [optionChain]);

  const spotPrice = useMemo(() => {
    const sp = optionChain?.underlying_price ?? optionChain?.spot_price ?? optionChain?.spot ?? liveUnderlyingQuote?.ltp ?? 0;
    return Number(sp) || 0;
  }, [optionChain, liveUnderlyingQuote]);

  // Deterministic ATM Strike (closest strike to spotPrice)
  const atmStrike = useMemo(() => {
    if (optionChain?.atm_strike != null && !isNaN(Number(optionChain.atm_strike)) && Number(optionChain.atm_strike) > 0) {
      return Number(optionChain.atm_strike);
    }
    if (optionChain?.atmStrike != null && !isNaN(Number(optionChain.atmStrike)) && Number(optionChain.atmStrike) > 0) {
      return Number(optionChain.atmStrike);
    }
    if (!allStrikes || allStrikes.length === 0) return null;
    if (spotPrice > 0) {
      let closest = Number(allStrikes[0].strike);
      let minDiff = Math.abs(closest - spotPrice);
      for (const r of allStrikes) {
        const st = Number(r.strike);
        if (isNaN(st)) continue;
        const diff = Math.abs(st - spotPrice);
        if (diff < minDiff) {
          minDiff = diff;
          closest = st;
        }
      }
      return closest;
    }
    const midIndex = Math.floor(allStrikes.length / 2);
    return Number(allStrikes[midIndex]?.strike ?? null);
  }, [optionChain, allStrikes, spotPrice]);

  const isRowATM = (row: any): boolean => {
    if (atmStrike != null) {
      return Number(row?.strike) === Number(atmStrike);
    }
    return row?.is_atm === true || row?.isATM === true;
  };

  const totalCallOi = useMemo(() => {
    return allStrikes.reduce((acc: number, r: any) => acc + (r.call?.open_interest || r.call?.oi || 0), 0);
  }, [allStrikes]);

  const totalPutOi = useMemo(() => {
    return allStrikes.reduce((acc: number, r: any) => acc + (r.put?.open_interest || r.put?.oi || 0), 0);
  }, [allStrikes]);

  const pcr = totalCallOi > 0 && !isNaN(totalPutOi / totalCallOi) ? (totalPutOi / totalCallOi).toFixed(2) : "—";

  const filteredStrikes = useMemo(() => {
    let list = allStrikes;

    // 1. Strike Search
    if (strikeSearch.trim()) {
      const q = strikeSearch.trim();
      list = list.filter((r: any) => String(r.strike).includes(q));
    }

    // 2. Moneyness Filter
    if (moneynessFilter !== "ALL") {
      list = list.filter((r: any) => {
        const isAtm = isRowATM(r);
        if (moneynessFilter === "ATM") return isAtm;
        if (moneynessFilter === "ITM") {
          return spotPrice > 0 ? ((r.call && r.strike < spotPrice) || (r.put && r.strike > spotPrice)) : true;
        }
        if (moneynessFilter === "OTM") {
          return spotPrice > 0 ? ((r.call && r.strike > spotPrice) || (r.put && r.strike < spotPrice)) : true;
        }
        return true;
      });
    }

    // 3. Strike Limit Filter (Centered around ATM)
    if (typeof strikeLimit === "number" && strikeLimit > 0 && strikeLimit < list.length) {
      const atmIndex = list.findIndex((r: any) => isRowATM(r));
      const center = atmIndex >= 0 ? atmIndex : Math.floor(list.length / 2);
      const half = Math.floor(strikeLimit / 2);
      const start = Math.max(0, center - half);
      const end = Math.min(list.length, start + strikeLimit);
      list = list.slice(start, end);
    }

    return list;
  }, [allStrikes, strikeSearch, moneynessFilter, strikeLimit, spotPrice, atmStrike]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-[#0B1528] via-[#09101F] to-[#0D182E] p-6 shadow-xl flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                Step 2 — Live Market & Option Chain Selection
              </h3>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                REAL-TIME STREAM
              </span>
            </div>
            <p className="text-sm sm:text-[15px] text-slate-300 mt-1.5 leading-relaxed font-sans">
              Authoritative live market depth & option chain. Every strike, expiry, premium, bid, ask, and Greeks are piped directly from active market feeds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border shadow-sm ${feedDiagnostics.badgeColor}`}
            title={`Exchange Tick: ${feedDiagnostics.tickTimeStr || "—"} | Received: ${feedDiagnostics.receivedTimeStr || "—"} | Age: ${feedDiagnostics.ageSec != null ? `${feedDiagnostics.ageSec}s` : "—"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${feedDiagnostics.dotColor} ${
                feedDiagnostics.status === "LIVE" ? "animate-ping" : ""
              }`}
            />
            <span>{feedDiagnostics.status}</span>
            {feedDiagnostics.ageSec !== null && (
              <span className="text-[11px] opacity-80 border-l border-current/20 pl-2">
                {feedDiagnostics.ageSec}s
              </span>
            )}
            {feedDiagnostics.tickTimeStr && feedDiagnostics.tickTimeStr !== "—" && (
              <span className="text-[10px] opacity-70 hidden sm:inline">
                • {feedDiagnostics.tickTimeStr}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchMarketData(false)}
            disabled={loading}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs sm:text-sm font-mono font-bold text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : "text-slate-400"}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Selected Contract Persistent Banner */}
      {draft.contract && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-[#071F18] via-[#091624] to-[#09101F] p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-mono uppercase font-bold text-slate-300 tracking-wider">
                  SELECTED INSTRUMENT:
                </span>
                <span className="text-xs sm:text-sm font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm">
                  {draft.contract.symbol}
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  {draft.contract.provider}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm font-mono text-slate-300 mt-2 font-medium">
                <span>
                  LTP: <strong className="text-emerald-400 font-bold">{renderPrice(draft.contract.premium)}</strong>
                </span>
                <span>
                  Bid: <strong className="text-slate-200">{renderPrice(draft.contract.bid)}</strong>
                </span>
                <span>
                  Ask: <strong className="text-slate-200">{renderPrice(draft.contract.ask)}</strong>
                </span>
                {draft.contract.expiry && <span>Expiry: <strong className="text-slate-200">{draft.contract.expiry}</strong></span>}
                {draft.contract.strike && <span>Strike: <strong className="text-slate-200">{formatStrike(draft.contract.strike)}</strong></span>}
                {draft.contract.option_type && (
                  <span className={`font-bold ${draft.contract.option_type === "CE" ? "text-emerald-400" : "text-rose-400"}`}>
                    Type: {draft.contract.option_type === "CE" ? "CALL (CE)" : "PUT (PE)"}
                  </span>
                )}
                <span>
                  Vol: <strong className="text-slate-200">{renderInt(draft.contract.volume)}</strong>
                </span>
                <span>
                  OI: <strong className="text-slate-200">{renderInt(draft.contract.open_interest)}</strong>
                </span>
                {draft.contract.greeks && (
                  <>
                    <span>Δ: <strong className="text-cyan-300">{renderGreek(draft.contract.greeks.delta, 3)}</strong></span>
                    <span>θ: <strong className="text-amber-300">{renderGreek(draft.contract.greeks.theta, 1)}</strong></span>
                    <span>IV: <strong className="text-purple-300">{draft.contract.greeks.iv != null && !isNaN(Number(draft.contract.greeks.iv)) ? `${Number(draft.contract.greeks.iv).toFixed(1)}%` : "—"}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center justify-end gap-2">
              <span className={`inline-flex items-center gap-1.5 font-bold px-3 py-1 rounded-full text-xs border shadow-sm ${
                contractDiagnostics?.status === "LIVE"
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                  : contractDiagnostics?.status === "STALE"
                  ? "bg-amber-950/60 text-amber-400 border-amber-500/30"
                  : contractDiagnostics?.status === "NO QUOTES"
                  ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  contractDiagnostics?.status === "LIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`} />
                {contractDiagnostics?.status || "LIVE"}
              </span>
            </div>
            {contractDiagnostics && (
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-2 font-mono">
                {contractDiagnostics.tickTimeStr && contractDiagnostics.tickTimeStr !== "—" && (
                  <span>Tick: <strong className="text-slate-300">{contractDiagnostics.tickTimeStr}</strong></span>
                )}
                {contractDiagnostics.ageSec !== null && (
                  <>
                    <span>•</span>
                    <span>Age: <strong className="text-slate-300">{contractDiagnostics.ageSec}s</strong></span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs font-mono text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* OPTION CHAIN VIEW */}
      {isOptionMarket && (
        <div className="space-y-4">
          {/* Expiry Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-medium text-slate-400">Underlying Spot:</span>
              <span className="text-sm font-mono font-bold text-white">
                {draft.underlying} ={" "}
                <span className="text-emerald-400 font-extrabold">
                  {currencySymbol}{spotPrice ? (Number(spotPrice) ? Number(spotPrice).toLocaleString() : String(spotPrice)) : "..."}
                </span>
              </span>
              {atmStrike != null && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/40 border border-purple-500/40 text-[11px] font-mono text-purple-300 font-bold">
                  <Target className="w-3 h-3 text-purple-400" />
                  ATM: {currencySymbol}{formatStrike(atmStrike)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-400 mr-1 uppercase">Expiry:</span>
              {expiries.map((expItem: any) => {
                const expVal = typeof expItem === "string" ? expItem : (expItem.expiry || expItem.label || String(expItem));
                const expLabel = typeof expItem === "string" ? expItem : (expItem.label || expItem.display || expItem.expiry || String(expItem));
                const isSelected = selectedExpiry === expVal;
                return (
                  <button
                    key={expVal}
                    type="button"
                    onClick={() => handleSelectExpiry(expVal)}
                    className={`text-xs sm:text-sm font-mono px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap font-bold shadow-sm ${
                      isSelected
                        ? "border-blue-500 bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-blue-400/40 shadow-lg shadow-blue-500/20"
                        : "border-slate-800 bg-[#080E1A] text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {expLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Filter Controls Bar (Parity with Option Chain Tab) */}
          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 text-sm">
            {/* View Side Filter: BOTH / CALL / PUT */}
            <div className="flex items-center bg-[#080E1A] p-1.5 rounded-xl border border-slate-800 text-xs sm:text-sm">
              <span className="text-xs sm:text-sm text-slate-300 px-2 font-mono uppercase font-bold">Side:</span>
              {(["BOTH", "CALL", "PUT"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setSideFilter(side)}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold transition cursor-pointer text-xs sm:text-sm ${sideFilter === side
                      ? side === "CALL" ? "bg-emerald-500 text-slate-950 shadow" : side === "PUT" ? "bg-rose-500 text-white shadow" : "bg-cyan-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  {side === "BOTH" ? "Both (CE & PE)" : side === "CALL" ? "Calls (CE)" : "Puts (PE)"}
                </button>
              ))}
            </div>

            {/* Moneyness Filter */}
            <div className="flex items-center bg-[#080E1A] p-1.5 rounded-xl border border-slate-800 text-xs sm:text-sm">
              <span className="text-xs sm:text-sm text-slate-300 px-2 font-mono uppercase font-bold">Moneyness:</span>
              {(["ALL", "ITM", "ATM", "OTM"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoneynessFilter(m)}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold transition cursor-pointer text-xs sm:text-sm ${moneynessFilter === m
                      ? "bg-slate-700 text-white shadow"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Strike Range / Limit */}
            <div className="flex items-center bg-[#080E1A] p-1.5 rounded-xl border border-slate-800 text-xs sm:text-sm">
              <span className="text-slate-300 px-2 font-mono text-xs sm:text-sm uppercase font-bold">Strikes:</span>
              {([10, 20, 40, "ALL"] as const).map((limit) => (
                <button
                  key={String(limit)}
                  type="button"
                  onClick={() => setStrikeLimit(limit)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer text-xs sm:text-sm ${strikeLimit === limit ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                    }`}
                >
                  {limit === "ALL" ? "All" : `±${limit / 2}`}
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Standard vs Greeks */}
            <div className="flex items-center bg-[#080E1A] p-1.5 rounded-xl border border-slate-800 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setViewMode("standard")}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition cursor-pointer text-xs sm:text-sm ${viewMode === "standard" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setViewMode("greeks")}
                className={`px-3 py-1.5 rounded-lg font-mono font-bold transition cursor-pointer text-xs sm:text-sm ${viewMode === "greeks" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
              >
                Greeks
              </button>
            </div>

            {/* Strike Search Box */}
            <div className="flex items-center gap-2 bg-[#080E1A] px-3 py-1.5 rounded-xl border border-slate-800">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={strikeSearch}
                onChange={(e) => setStrikeSearch(e.target.value)}
                placeholder="Filter Strike..."
                className="w-28 bg-transparent text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Option Chain Summary Metrics Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3 sm:p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm font-mono">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400">Spot:</span>
                <strong className="text-white font-black text-sm sm:text-base">{currencySymbol}{spotPrice ? spotPrice.toLocaleString() : "..."}</strong>
              </span>
              <div className="flex items-center gap-2 bg-purple-950/50 border border-purple-500/40 px-2.5 py-1 rounded-lg text-purple-300 font-semibold shadow-sm">
                <Target className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>ATM Strike:</span>
                <strong className="text-purple-200 font-black">{atmStrike != null ? `${currencySymbol}${formatStrike(atmStrike)}` : "—"}</strong>
              </div>
              <span>PCR: <strong className="text-cyan-400 font-bold">{pcr}</strong></span>
              <span>Total Calls OI: <strong className="text-emerald-400 font-bold">{totalCallOi.toLocaleString()}</strong></span>
              <span>Total Puts OI: <strong className="text-rose-400 font-bold">{totalPutOi.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-3.5 text-slate-400 text-xs">
              {atmStrike != null && (
                <button
                  type="button"
                  onClick={() => setMoneynessFilter("ATM")}
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-2 flex items-center gap-1.5 cursor-pointer font-bold text-xs sm:text-sm"
                  title="Filter ladder to ATM strike"
                >
                  <Target className="w-3.5 h-3.5" />
                  View ATM
                </button>
              )}
              <span>
                Showing <strong className="text-white font-bold">{filteredStrikes.length}</strong> of {allStrikes.length} strikes
              </span>
            </div>
          </div>

          {/* Option Chain Table */}
          {loading && !optionChain ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              Loading real live option chain from {draft.broker}...
            </div>
          ) : (() => {
            return filteredStrikes.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-2xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400">
                      {(sideFilter === "BOTH" || sideFilter === "CALL") && (
                        <th colSpan={viewMode === "greeks" ? 6 : 7} className="py-3 px-4 text-center border-r border-slate-800 bg-emerald-950/20 text-emerald-400 text-sm sm:text-base font-black tracking-wider">
                          CALLS (CE)
                        </th>
                      )}
                      <th className="py-3 px-5 text-center bg-slate-800 text-white text-sm sm:text-base font-black tracking-wider">
                        STRIKE
                      </th>
                      {(sideFilter === "BOTH" || sideFilter === "PUT") && (
                        <th colSpan={viewMode === "greeks" ? 6 : 7} className="py-3 px-4 text-center border-l border-slate-800 bg-red-950/20 text-red-400 text-sm sm:text-base font-black tracking-wider">
                          PUTS (PE)
                        </th>
                      )}
                    </tr>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40 text-xs sm:text-[13px] font-bold">
                      {/* Call Headers */}
                      {(sideFilter === "BOTH" || sideFilter === "CALL") && (
                        viewMode === "greeks" ? (
                          <>
                            <th className="py-2.5 px-2.5 text-right">IV</th>
                            <th className="py-2.5 px-2.5 text-right">Delta</th>
                            <th className="py-2.5 px-2.5 text-right">Gamma</th>
                            <th className="py-2.5 px-2.5 text-right">Theta</th>
                            <th className="py-2.5 px-2.5 text-right">Vega</th>
                            <th className="py-2.5 px-3 text-right border-r border-slate-800 text-emerald-400 font-black">LTP</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-2.5 text-right">OI</th>
                            <th className="py-2.5 px-2.5 text-right">IV</th>
                            <th className="py-2.5 px-2.5 text-right">Delta</th>
                            <th className="py-2.5 px-2.5 text-right">Theta</th>
                            <th className="py-2.5 px-2.5 text-right">Bid</th>
                            <th className="py-2.5 px-2.5 text-right">Ask</th>
                            <th className="py-2.5 px-3 text-right border-r border-slate-800 text-emerald-400 font-black">LTP</th>
                          </>
                        )
                      )}

                      {/* Strike */}
                      <th className="py-2.5 px-4 text-center bg-slate-900 text-slate-200 font-black">Price</th>

                      {/* Put Headers */}
                      {(sideFilter === "BOTH" || sideFilter === "PUT") && (
                        viewMode === "greeks" ? (
                          <>
                            <th className="py-2.5 px-3 text-left border-l border-slate-800 text-red-400 font-black">LTP</th>
                            <th className="py-2.5 px-2.5 text-left">Delta</th>
                            <th className="py-2.5 px-2.5 text-left">Gamma</th>
                            <th className="py-2.5 px-2.5 text-left">Theta</th>
                            <th className="py-2.5 px-2.5 text-left">Vega</th>
                            <th className="py-2.5 px-2.5 text-left">IV</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5 px-3 text-left border-l border-slate-800 text-red-400 font-black">LTP</th>
                            <th className="py-2.5 px-2.5 text-left">Bid</th>
                            <th className="py-2.5 px-2.5 text-left">Ask</th>
                            <th className="py-2.5 px-2.5 text-left">Delta</th>
                            <th className="py-2.5 px-2.5 text-left">Theta</th>
                            <th className="py-2.5 px-2.5 text-left">IV</th>
                            <th className="py-2.5 px-2.5 text-left">OI</th>
                          </>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredStrikes.map((row: any) => {
                      const call = row.call || row.ce;
                      const put = row.put || row.pe;
                      const strike = row.strike;
                      const isATM = isRowATM(row);

                      const isCallSelected = draft.contract?.symbol === call?.symbol;
                      const isPutSelected = draft.contract?.symbol === put?.symbol;

                      return (
                        <tr
                          key={strike}
                          className={`hover:bg-slate-800/40 transition-colors ${isATM
                              ? "ring-1 ring-inset ring-purple-500/40 bg-purple-950/20 font-semibold"
                              : ""
                            }`}
                        >
                          {/* CALL CELLS */}
                          {(sideFilter === "BOTH" || sideFilter === "CALL") && (
                            call ? (
                              viewMode === "greeks" ? (
                                <>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderPercent(call.iv, 1)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-200 hover:bg-emerald-500/10 font-medium"}`}>{renderGreek(call.delta, 3)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderGreek(call.gamma, 4)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderGreek(call.theta, 1)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderGreek(call.vega, 1)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-3 text-right border-r border-slate-800 cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/20" : "hover:bg-emerald-500/10"}`}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectLeg(call, strike, "CE");
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${isCallSelected
                                          ? "bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400 font-black"
                                          : call.ltp != null && Number(call.ltp) > 0
                                            ? "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30"
                                            : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                                        }`}
                                    >
                                      {renderPrice(call.ltp, 2)}
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderInt(call.open_interest || call.oi)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderPercent(call.iv, 1)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-200 hover:bg-emerald-500/10 font-medium"}`}>{renderGreek(call.delta, 3)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{renderGreek(call.theta, 1)}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{call.bid != null && Number(call.bid) > 0 ? renderPrice(call.bid, 1) : "—"}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-2.5 text-right cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300 hover:bg-emerald-500/10"}`}>{call.ask != null && Number(call.ask) > 0 ? renderPrice(call.ask, 1) : "—"}</td>
                                  <td onClick={() => handleSelectLeg(call, strike, "CE")} className={`py-2.5 px-3 text-right border-r border-slate-800 cursor-pointer transition-colors ${isCallSelected ? "bg-emerald-500/20" : "hover:bg-emerald-500/10"}`}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectLeg(call, strike, "CE");
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${isCallSelected
                                          ? "bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400 font-black"
                                          : call.ltp != null && Number(call.ltp) > 0
                                            ? "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30"
                                            : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                                        }`}
                                    >
                                      {renderPrice(call.ltp, 2)}
                                    </button>
                                  </td>
                                </>
                              )
                            ) : (
                              <td colSpan={viewMode === "greeks" ? 6 : 7} className="text-center text-slate-500 py-3 border-r border-slate-800">
                                —
                              </td>
                            )
                          )}

                          {/* STRIKE CELL */}
                          <td
                            onClick={() => {
                              if (!isCallSelected && call) handleSelectLeg(call, strike, "CE");
                              else if (put) handleSelectLeg(put, strike, "PE");
                            }}
                            className={`py-2.5 px-4 text-center font-black font-mono text-xs sm:text-sm cursor-pointer transition-all ${isCallSelected
                                ? "bg-emerald-950/40 text-emerald-300 border-x border-emerald-500/30"
                                : isPutSelected
                                  ? "bg-red-950/40 text-red-300 border-x border-red-500/30"
                                  : isATM
                                    ? "bg-slate-900 border-x border-slate-800"
                                    : "bg-slate-900 text-slate-200 hover:bg-slate-850"
                              }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center justify-center gap-1.5">
                                {isATM && <span className="text-sm sm:text-base font-bold text-cyan-400">←</span>}
                                <span className={`tracking-tight ${isATM ? "text-cyan-300 font-black text-sm sm:text-base" : "text-white font-bold"}`}>
                                  {formatStrike(strike)}
                                </span>
                                {isATM && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950 shadow-sm">
                                    ATM
                                  </span>
                                )}
                                {isATM && <span className="text-sm sm:text-base font-bold text-cyan-400">→</span>}
                              </div>
                              {isATM && spotPrice > 0 && (
                                <span className="text-[10px] text-purple-400 font-medium">
                                  diff: {Math.abs(Number(strike) - spotPrice).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* PUT CELLS */}
                          {(sideFilter === "BOTH" || sideFilter === "PUT") && (
                            put ? (
                              viewMode === "greeks" ? (
                                <>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-3 text-left border-l border-slate-800 cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/20" : "hover:bg-red-500/10"}`}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectLeg(put, strike, "PE");
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${isPutSelected
                                          ? "bg-red-500 text-slate-950 shadow-md ring-2 ring-red-400 font-black"
                                          : put.ltp != null && Number(put.ltp) > 0
                                            ? "bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30"
                                            : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                                        }`}
                                    >
                                      {renderPrice(put.ltp, 2)}
                                    </button>
                                  </td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-200 hover:bg-red-500/10 font-medium"}`}>{renderGreek(put.delta, 3)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderGreek(put.gamma, 4)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderGreek(put.theta, 1)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderGreek(put.vega, 1)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderPercent(put.iv, 1)}</td>
                                </>
                              ) : (
                                <>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-3 text-left border-l border-slate-800 cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/20" : "hover:bg-red-500/10"}`}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectLeg(put, strike, "PE");
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${isPutSelected
                                          ? "bg-red-500 text-slate-950 shadow-md ring-2 ring-red-400 font-black"
                                          : put.ltp != null && Number(put.ltp) > 0
                                            ? "bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30"
                                            : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                                        }`}
                                    >
                                      {renderPrice(put.ltp, 2)}
                                    </button>
                                  </td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{put.bid != null && Number(put.bid) > 0 ? renderPrice(put.bid, 1) : "—"}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{put.ask != null && Number(put.ask) > 0 ? renderPrice(put.ask, 1) : "—"}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-200 hover:bg-red-500/10 font-medium"}`}>{renderGreek(put.delta, 3)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderGreek(put.theta, 1)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderPercent(put.iv, 1)}</td>
                                  <td onClick={() => handleSelectLeg(put, strike, "PE")} className={`py-2.5 px-2.5 text-left cursor-pointer transition-colors ${isPutSelected ? "bg-red-500/15 text-red-300 font-bold" : "text-slate-300 hover:bg-red-500/10"}`}>{renderInt(put.open_interest || put.oi)}</td>
                                </>
                              )
                            ) : (
                              <td colSpan={viewMode === "greeks" ? 6 : 7} className="text-center text-slate-500 py-3 border-l border-slate-800">
                                —
                              </td>
                            )
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No live option contracts match your filter criteria ({draft.underlying} / {selectedExpiry}).
              </div>
            );
          })()}
        </div>
      )}

      {/* FUTURES / EQUITIES LIST VIEW */}
      {!isOptionMarket && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search live instrument contracts..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-11 pr-4 py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm font-mono text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
              Fetching live contracts from {draft.broker}...
            </div>
          ) : instruments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instruments.map((inst) => {
                const isSelected = draft.contract?.symbol === inst.symbol;
                return (
                  <button
                    key={inst.symbol}
                    type="button"
                    onClick={() =>
                      handleSelectContract({
                        instrument_id: inst.instrument_id || inst.symbol,
                        symbol: inst.symbol,
                        underlying: inst.underlying || draft.underlying,
                        expiry: inst.expiry || "",
                        strike: null,
                        option_type: null,
                        premium: inst.ltp || inst.price || inst.premium || 0,
                        bid: inst.bid != null && Number(inst.bid) > 0 ? Number(inst.bid) : null,
                        ask: inst.ask != null && Number(inst.ask) > 0 ? Number(inst.ask) : null,
                        volume: inst.volume != null ? Number(inst.volume) : null,
                        open_interest: inst.open_interest || 0,
                        lot_size: inst.lot_size || 1,
                        tick_size: inst.tick_size || 0.01,
                        provider: inst.provider || draft.broker,
                        exchange: inst.exchange || (draft.market_type.includes("INDIA") ? "NSE" : "DELTA"),
                        timestamp: new Date().toISOString(),
                        is_live: true,
                      })
                    }
                    className={`p-4 sm:p-5 rounded-2xl border text-left transition-all ${isSelected
                        ? "border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-mono font-bold text-white">{inst.symbol}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {inst.provider || draft.broker}
                      </span>
                    </div>

                    <div className="mt-3.5 flex items-baseline justify-between">
                      <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                        {renderPrice(inst.ltp || inst.price || inst.premium)}
                      </div>
                      {inst.change_pct != null && !isNaN(Number(inst.change_pct)) && (
                        <span
                          className={`text-xs sm:text-sm font-mono font-bold flex items-center gap-1 ${Number(inst.change_pct) >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                        >
                          {Number(inst.change_pct) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {Number(inst.change_pct).toFixed(2)}%
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-3 border-t border-slate-800/80">
                      <div>Bid: <span className="text-white font-medium">{renderPrice(inst.bid)}</span></div>
                      <div>Ask: <span className="text-white font-medium">{renderPrice(inst.ask)}</span></div>
                      <div>Vol: <span className="text-white font-medium">{renderInt(inst.volume)}</span></div>
                      <div>Lot: <span className="text-white font-medium">{inst.lot_size || 1}</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm font-mono text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              No live instruments found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-xl border border-slate-800 bg-[#0B1426] hover:bg-slate-800 px-6 py-3 text-sm sm:text-base font-mono font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          ← Return to Step 1
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!draft.contract}
          className={`inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-sm sm:text-base font-mono font-bold text-white shadow-lg transition-all active:scale-95 ${
            draft.contract
              ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-600/30 cursor-pointer"
              : "bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50"
          }`}
        >
          <span>Continue to Step 3: Indicators</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
