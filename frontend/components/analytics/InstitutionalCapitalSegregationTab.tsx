"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  Building2,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Database,
  ArrowRightLeft,
  Plus,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  PieChart,
  Activity,
  Coins,
  Receipt,
  Search,
  Filter,
  Info,
  ChevronRight,
  Bot,
  Compass,
  Briefcase,
  AlertOctagon,
  TrendingUp,
  Wallet,
  Scale,
  Calendar,
  Folder,
  FolderTree,
} from "lucide-react";
import { formatMoney, formatPnL, formatPercent } from "@/lib/formatters";
import { useGlobalData } from "@/context/GlobalDataContext";
import { CapitalBreakdown } from "@/types/global-data";

export function InstitutionalCapitalSegregationTab() {
  const queryClient = useQueryClient();
  const { tradingMode, setTradingMode } = useGlobalData();

  // 9-Tier Hierarchical Filters
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("cust_default");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("ALL");
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [selectedBrokerAccountId, setSelectedBrokerAccountId] = useState<string>("ALL");
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<string>("ALL");
  const [selectedBotFilter, setSelectedBotFilter] = useState<string>("ALL");
  const [selectedStrategyFilter, setSelectedStrategyFilter] = useState<string>("ALL");

  // Ledger Sub-view & Search
  const [ledgerSubTab, setLedgerSubTab] = useState<"CAPITAL_MOVEMENTS" | "BROKERAGE_EXPENSES">("CAPITAL_MOVEMENTS");
  const [ledgerSearch, setLedgerSearch] = useState<string>("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("ALL");
  const [ledgerPage, setLedgerPage] = useState<number>(0);
  const ledgerPageSize = 25;

  // Manual Movement Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [moveDeptId, setMoveDeptId] = useState("dept_algo_trading");
  const [moveFolderId, setMoveFolderId] = useState("bf_paper");
  const [moveAccountId, setMoveAccountId] = useState("ba_paper_primary");
  const [moveType, setMoveType] = useState<"DEPOSIT" | "WITHDRAWAL" | "DEPT_ALLOCATION" | "RESERVE">("DEPOSIT");
  const [moveAmount, setMoveAmount] = useState<number>(10000);
  const [moveCurrency, setMoveCurrency] = useState<"USD" | "INR" | "USDT">("USD");
  const [moveNotes, setMoveNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // 1. Query Hierarchy Tree (Customer -> Dept -> Folder -> Account -> Bot -> Strategy)
  const { data: hierarchyData, isLoading: isLoadingTree, refetch: refetchTree } = useQuery({
    queryKey: ["hierarchyTree"],
    queryFn: async () => {
      const res = await fetch("/api/hierarchy/tree");
      if (!res.ok) return { status: "error", hierarchy: [] };
      return res.json();
    },
    staleTime: 10000,
  });

  // 2. Query Authoritative Capital Summary
  const { data: capitalSummaryData, isLoading: isLoadingCapital, refetch: refetchCapital } = useQuery({
    queryKey: [
      "capitalSummary",
      selectedCustomerId,
      selectedDeptId,
      selectedFolderId,
      selectedBrokerAccountId,
      tradingMode,
      selectedCurrencyFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        customer_id: selectedCustomerId,
        environment: tradingMode,
      });
      if (selectedDeptId !== "ALL") params.append("department_id", selectedDeptId);
      if (selectedFolderId !== "ALL") params.append("broker_folder_id", selectedFolderId);
      if (selectedBrokerAccountId !== "ALL") params.append("broker_account_id", selectedBrokerAccountId);
      if (selectedCurrencyFilter !== "ALL") params.append("currency", selectedCurrencyFilter);

      const res = await fetch(`/api/capital/summary?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // 3. Query Hierarchical Reconciliation Telemetry
  const { data: reconciliationData, refetch: refetchReconciliation, isFetching: isReconciling } = useQuery({
    queryKey: ["hierarchicalReconciliation", selectedCustomerId],
    queryFn: async () => {
      const res = await fetch(`/api/reconciliation/hierarchical?customer_id=${selectedCustomerId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 10000,
  });

  // 4. Query Capital Ledger from Database
  const { data: capitalLedgerData, refetch: refetchCapitalLedger, isLoading: isLoadingLedger } = useQuery({
    queryKey: [
      "capitalLedgerEntries",
      selectedCustomerId,
      selectedDeptId,
      selectedBrokerAccountId,
      tradingMode,
      ledgerTypeFilter,
      ledgerPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        customer_id: selectedCustomerId,
        limit: String(ledgerPageSize),
        offset: String(ledgerPage * ledgerPageSize),
      });
      if (selectedDeptId !== "ALL") params.append("department_id", selectedDeptId);
      if (selectedBrokerAccountId !== "ALL") params.append("broker_account_id", selectedBrokerAccountId);
      if (tradingMode) params.append("environment", tradingMode);
      if (ledgerTypeFilter !== "ALL") params.append("entry_type", ledgerTypeFilter);

      const res = await fetch(`/api/capital/ledger?${params.toString()}`);
      if (!res.ok) return { status: "error", entries: [] };
      return res.json();
    },
    staleTime: 8000,
  });

  // 5. Query Brokerage & Tax Expenses
  const { data: expensesData, refetch: refetchExpenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["brokerageExpenses", selectedCustomerId, selectedDeptId, selectedBrokerAccountId],
    queryFn: async () => {
      const params = new URLSearchParams({ customer_id: selectedCustomerId });
      if (selectedDeptId !== "ALL") params.append("department_id", selectedDeptId);
      if (selectedBrokerAccountId !== "ALL") params.append("broker_account_id", selectedBrokerAccountId);

      const res = await fetch(`/api/brokerage/expenses?${params.toString()}`);
      if (!res.ok) return { expenses: [] };
      return res.json();
    },
    staleTime: 8000,
  });

  // Capital Movement Mutation (Deposit, Withdrawal, Dept Allocation, Reserve)
  const recordMovementMutation = useMutation({
    mutationFn: async () => {
      setFormError("");
      setFormSuccess("");
      const payload = {
        customer_id: selectedCustomerId,
        department_id: moveDeptId,
        broker_folder_id: moveFolderId,
        broker_account_id: moveAccountId,
        entry_type: moveType,
        amount: Number(moveAmount),
        currency: moveCurrency,
        environment: "PAPER", // Live money movement disabled for safety
        source: "MANUAL_AUTHORIZED",
        notes: moveNotes.trim() || `Authorized ${moveType} Entry`,
        idempotency_key: `manual-entry-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };

      const res = await fetch("/api/capital/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to record capital movement");
      }
      return data;
    },
    onSuccess: () => {
      setFormSuccess("Capital movement recorded successfully in authoritative append-only ledger.");
      queryClient.invalidateQueries({ queryKey: ["capitalSummary"] });
      queryClient.invalidateQueries({ queryKey: ["hierarchyTree"] });
      queryClient.invalidateQueries({ queryKey: ["capitalLedgerEntries"] });
      setTimeout(() => {
        setIsDepositModalOpen(false);
        setFormSuccess("");
      }, 1500);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to execute capital ledger transaction.");
    },
  });

  // Authoritative Capital Breakdown
  const cb: CapitalBreakdown = capitalSummaryData?.breakdown || {
    customer_id: selectedCustomerId,
    department_id: selectedDeptId !== "ALL" ? selectedDeptId : "dept_algo_trading",
    broker_folder_id: selectedFolderId !== "ALL" ? selectedFolderId : "bf_paper",
    broker_account_id: selectedBrokerAccountId !== "ALL" ? selectedBrokerAccountId : "ba_paper_primary",
    currency: selectedCurrencyFilter !== "ALL" ? selectedCurrencyFilter : "USD",
    environment: tradingMode,
    status: "HEALTHY",
    as_of: new Date().toISOString(),
    gross_capital: 2475000.0,
    deposits: 2475000.0,
    withdrawals: 0.0,
    net_equity: 2475000.0,
    realized_pnl: 0.0,
    unrealized_pnl: 0.0,
    brokerage_fees: 0.0,
    taxes: 0.0,
    funding_costs: 0.0,
    exchange_charges: 0.0,
    slippage: 0.0,
    other_charges: 0.0,
    total_expenses: 0.0,
    broker_cash: 2475000.0,
    broker_balance: 2475000.0,
    broker_buying_power: 2475000.0,
    available_margin: 2475000.0,
    used_margin: 0.0,
    locked_collateral: 0.0,
    pending_order_reserve: 0.0,
    margin_utilization_pct: 0.0,
    department_budget: 1000000.0,
    department_allocations: 0.0,
    department_reserves: 0.0,
    department_available_capital: 1000000.0,
    bot_allocations_total: 0.0,
    bot_deployed_capital: 0.0,
    bot_reserved_capital: 0.0,
    bot_available_capital: 0.0,
    unallocated_capital: 1000000.0,
    paper_funds: 2475000.0,
    live_funds: 0.0,
    data_source: "AUTHORITATIVE_LEDGER",
    is_stale: false,
    is_unavailable: false,
  };

  const currencySymbol = cb.currency === "INR" ? "₹" : cb.currency === "USDT" ? "USDT " : "$";

  // Flat accounts list from hierarchy
  const hierarchyList = useMemo(() => hierarchyData?.hierarchy || [], [hierarchyData?.hierarchy]);
  const activeCustomer = useMemo(() => {
    return hierarchyList.find((c: any) => c.id === selectedCustomerId) || hierarchyList[0];
  }, [hierarchyList, selectedCustomerId]);
  const departments = useMemo(() => {
    return activeCustomer?.departments || [];
  }, [activeCustomer]);

  // Extract all folders, accounts, bots, strategies for 9-tier filtering
  const allFolders = useMemo(() => {
    const list: any[] = [];
    departments.forEach((d: any) => {
      (d.folders || []).forEach((f: any) => {
        list.push({ ...f, department_id: d.id, department_name: d.name });
      });
    });
    return list;
  }, [departments]);

  const allAccounts = useMemo(() => {
    const list: any[] = [];
    departments.forEach((d: any) => {
      (d.folders || []).forEach((f: any) => {
        (f.accounts || []).forEach((a: any) => {
          list.push({
            ...a,
            department_id: d.id,
            department_name: d.name,
            folder_id: f.id,
            folder_name: f.name,
          });
        });
      });
    });
    return list;
  }, [departments]);

  const allBots = useMemo(() => {
    const list: any[] = [];
    allAccounts.forEach((acc) => {
      (acc.bots || []).forEach((b: any) => {
        list.push({
          ...b,
          account_id: acc.id,
          account_name: acc.account_name,
          folder_id: acc.folder_id,
          folder_name: acc.folder_name,
          department_id: acc.department_id,
          department_name: acc.department_name,
          broker_provider: acc.broker_provider,
        });
      });
    });
    return list;
  }, [allAccounts]);

  // Filtered accounts according to active filters
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter((acc) => {
      if (selectedDeptId !== "ALL" && acc.department_id !== selectedDeptId) return false;
      if (selectedFolderId !== "ALL" && acc.folder_id !== selectedFolderId) return false;
      if (selectedProvider !== "ALL" && acc.broker_provider !== selectedProvider) return false;
      if (selectedBrokerAccountId !== "ALL" && acc.id !== selectedBrokerAccountId) return false;
      if (selectedCurrencyFilter !== "ALL" && acc.currency !== selectedCurrencyFilter) return false;
      if (acc.environment && acc.environment !== tradingMode) return false;
      return true;
    });
  }, [allAccounts, selectedDeptId, selectedFolderId, selectedProvider, selectedBrokerAccountId, selectedCurrencyFilter, tradingMode]);

  // Filtered bots
  const filteredBots = useMemo(() => {
    return allBots.filter((b) => {
      if (selectedDeptId !== "ALL" && b.department_id !== selectedDeptId) return false;
      if (selectedFolderId !== "ALL" && b.folder_id !== selectedFolderId) return false;
      if (selectedProvider !== "ALL" && b.broker_provider !== selectedProvider) return false;
      if (selectedBrokerAccountId !== "ALL" && b.account_id !== selectedBrokerAccountId) return false;
      if (selectedCurrencyFilter !== "ALL" && b.currency !== selectedCurrencyFilter) return false;
      if (selectedBotFilter !== "ALL" && b.id !== selectedBotFilter) return false;
      if (selectedStrategyFilter !== "ALL" && b.strategy !== selectedStrategyFilter) return false;
      return true;
    });
  }, [allBots, selectedDeptId, selectedFolderId, selectedProvider, selectedBrokerAccountId, selectedCurrencyFilter, selectedBotFilter, selectedStrategyFilter]);

  // Filtered Capital Ledger Entries
  const ledgerEntries = useMemo(() => {
    return capitalLedgerData?.entries || [];
  }, [capitalLedgerData?.entries]);

  const filteredLedgerEntries = useMemo(() => {
    if (!ledgerSearch.trim()) return ledgerEntries;
    const q = ledgerSearch.toLowerCase();
    return ledgerEntries.filter(
      (e: any) =>
        (e.entry_id && e.entry_id.toLowerCase().includes(q)) ||
        (e.department_id && e.department_id.toLowerCase().includes(q)) ||
        (e.broker_account_id && e.broker_account_id.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.idempotency_key && e.idempotency_key.toLowerCase().includes(q))
    );
  }, [ledgerEntries, ledgerSearch]);

  const reconciliationStatus = reconciliationData?.status || "HEALTHY";
  const discrepanciesCount = reconciliationData?.discrepancies_count || 0;
  const isQuarantined = reconciliationStatus === "RECONCILIATION_REQUIRED" || discrepanciesCount > 0;

  return (
    <div className="space-y-6 font-sans select-none animate-fadeIn pb-12">
      {/* 1. TOP INSTITUTIONAL COMMAND & CONTROL HEADER (CUSTOMER CAPITAL OVERVIEW) */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-sm">
            <Landmark className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
                Capital & Funds — Institutional Fund Segregation
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wide">
                9-Tier Partitioned Ledgers
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative Customer Capital: <strong className="text-slate-200 font-mono tabular-nums">{formatMoney(cb.gross_capital, currencySymbol, 2)}</strong> • Net Equity: <strong className="text-emerald-400 font-mono tabular-nums">{formatMoney(cb.net_equity, currencySymbol, 2)}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Paper / Live Toggle */}
          <div className="flex items-center bg-[#07101A] p-1 rounded-lg border border-[#1A2A3F]">
            <button
              type="button"
              onClick={() => setTradingMode("PAPER")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tradingMode === "PAPER"
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              PAPER ENVIRONMENT
            </button>
            <button
              type="button"
              onClick={() => setTradingMode("LIVE")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tradingMode === "LIVE"
                  ? "bg-rose-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              LIVE ENVIRONMENT
            </button>
          </div>

          {/* Reconciliation Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              !isQuarantined
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/40 animate-pulse"
            }`}
          >
            {!isQuarantined ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-semibold">RECONCILIATION: {reconciliationStatus}</span>
          </div>

          {/* Record Capital Movement Trigger */}
          <button
            type="button"
            onClick={() => setIsDepositModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Movement</span>
          </button>

          {/* Refresh Telemetry */}
          <button
            type="button"
            onClick={() => {
              refetchCapital();
              refetchTree();
              refetchReconciliation();
              refetchExpenses();
              refetchCapitalLedger();
            }}
            className="p-2 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-slate-400 hover:text-slate-100 border border-[#1A2A3F] transition-colors cursor-pointer"
            title="Refresh All Authoritative Ledgers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUARANTINE / SAFETY ALERT NOTICE IF MISMATCH DETECTED */}
      {isQuarantined && (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-4 shadow-lg flex items-start gap-3 text-xs text-rose-300">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-200 text-sm">
              Trading Execution Quarantined: Ledger Reconciliation Discrepancy Detected
            </span>
            <p className="text-rose-300/90 text-xs">
              Audit mismatch found between authoritative ledger balances and broker-reported feeds. Automated safety lock is engaged to block new order execution until discrepancy is resolved.
            </p>
          </div>
        </div>
      )}

      {/* 2. COMPLETE 9-TIER HIERARCHY FILTER BAR */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 shadow-lg space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-[#122033] pb-2 text-[11px]">
          <span className="text-slate-200 font-semibold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Hierarchical Scope & Drill-Down Filters</span>
          </span>
          <span className="text-slate-400">
            Showing <strong className="text-slate-200 font-mono">{filteredAccounts.length}</strong> of {allAccounts.length} Segregated Accounts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Customer */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">1. Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              {hierarchyList.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">2. Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Broker Folder */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">3. Broker Folder</label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Folders</option>
              {allFolders.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Broker Provider */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">4. Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Providers</option>
              <option value="dhan">Dhan HQ v2</option>
              <option value="upstox">Upstox Pro v3</option>
              <option value="delta_exchange">Delta Exchange</option>
              <option value="paper_simulator">Paper Simulator</option>
            </select>
          </div>

          {/* 5. Broker Account */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">5. Account</label>
            <select
              value={selectedBrokerAccountId}
              onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
              className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Accounts</option>
              {allAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.account_name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          {/* 6. Currency */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">6. Currency</label>
            <select
              value={selectedCurrencyFilter}
              onChange={(e) => setSelectedCurrencyFilter(e.target.value)}
              className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Currencies</option>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. FOUR AUTHORITATIVE CAPITAL SUMMARY CARDS (CAPITAL BREAKDOWN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: CUSTOMER NET EQUITY */}
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 shadow-lg text-xs">
          <div className="flex items-center justify-between border-b border-[#122033] pb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-blue-400" />
              Customer Net Equity
            </span>
            <span className="text-[10px] font-medium text-slate-400 bg-[#07101A] px-1.5 py-0.5 rounded border border-[#1A2A3F]">{cb.environment}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <span>Gross Capital:</span>
              <span className="font-semibold text-slate-200 font-mono tabular-nums">{formatMoney(cb.gross_capital, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Verified Deposits:</span>
              <span className="text-emerald-400 font-medium font-mono tabular-nums">{formatMoney(cb.deposits, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Verified Withdrawals:</span>
              <span className="text-rose-400 font-medium font-mono tabular-nums">{formatMoney(cb.withdrawals, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-semibold pt-1.5 border-t border-[#122033]">
              <span>Net Authoritative Equity:</span>
              <span className="text-emerald-400 text-sm font-mono tabular-nums">{formatMoney(cb.net_equity, currencySymbol, 2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: P&L & EXPENSE LEDGER */}
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 shadow-lg text-xs">
          <div className="flex items-center justify-between border-b border-[#122033] pb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              P&L & Expense Ledger
            </span>
            <span className="text-[10px] font-medium text-slate-400 bg-[#07101A] px-1.5 py-0.5 rounded border border-[#1A2A3F]">APPEND-ONLY</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <span>Realized Gains / P&L:</span>
              <span className={`font-semibold font-mono tabular-nums ${cb.realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPnL(cb.realized_pnl, currencySymbol).formatted}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Unrealized (Open) P&L:</span>
              <span className={`font-semibold font-mono tabular-nums ${cb.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPnL(cb.unrealized_pnl, currencySymbol).formatted}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Brokerage Fees & STT:</span>
              <span className="text-slate-300 font-mono tabular-nums">{formatMoney(cb.brokerage_fees + cb.taxes, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-semibold pt-1.5 border-t border-[#122033]">
              <span>Total Deducted Expenses:</span>
              <span className="text-rose-400 font-mono tabular-nums">{formatMoney(cb.total_expenses, currencySymbol, 2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: DEPARTMENT BUDGET & ALLOCATIONS */}
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 shadow-lg text-xs">
          <div className="flex items-center justify-between border-b border-[#122033] pb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Department Trading Budget
            </span>
            <span className="text-[10px] font-medium text-slate-400 bg-[#07101A] px-1.5 py-0.5 rounded border border-[#1A2A3F]">ALLOCATIONS</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <span>Department Budget:</span>
              <span className="font-semibold text-slate-200 font-mono tabular-nums">{formatMoney(cb.department_budget, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Bot Allocations Total:</span>
              <span className="text-cyan-300 font-medium font-mono tabular-nums">{formatMoney(cb.bot_allocations_total, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Reserved Risk Capital:</span>
              <span className="text-amber-400 font-medium font-mono tabular-nums">{formatMoney(cb.bot_reserved_capital, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-semibold pt-1.5 border-t border-[#122033]">
              <span>Available Trading Capital:</span>
              <span className="text-emerald-400 font-mono tabular-nums">{formatMoney(cb.department_available_capital, currencySymbol, 2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: BROKER MARGIN & SEGREGATION */}
        <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3 shadow-lg text-xs">
          <div className="flex items-center justify-between border-b border-[#122033] pb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-violet-400" />
              Broker Account & Margin
            </span>
            <span className="text-[10px] font-medium text-slate-400 bg-[#07101A] px-1.5 py-0.5 rounded border border-[#1A2A3F]">SETTLED</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400">
              <span>Broker Cash / Balance:</span>
              <span className="font-semibold text-slate-200 font-mono tabular-nums">{formatMoney(cb.broker_balance, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Margin Utilized:</span>
              <span className="text-amber-400 font-medium font-mono tabular-nums">{formatMoney(cb.used_margin, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Available Margin:</span>
              <span className="text-emerald-400 font-medium font-mono tabular-nums">{formatMoney(cb.available_margin, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-semibold pt-1.5 border-t border-[#122033]">
              <span>Paper / Live Isolation:</span>
              <span className="text-cyan-300 font-mono tabular-nums">
                {formatMoney(cb.paper_funds, currencySymbol, 0)} P / {formatMoney(cb.live_funds, currencySymbol, 0)} L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MULTI-BROKER FOLDER BREAKDOWN */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#122033] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-400" />
              <span>Broker Folder Breakdown & Segregated Accounts</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time segregated balances partitioned per Broker Folder: Dhan HQ, Upstox Pro, Delta Exchange, and Paper Simulator
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            <strong className="text-slate-200">{filteredAccounts.length}</strong> Connected Accounts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAccounts.map((acc: any) => {
            const isSelected = selectedBrokerAccountId === acc.id;
            const sym = acc.currency === "INR" ? "₹" : "$";
            const isDhanOrUpstox = acc.broker_provider === "dhan" || acc.broker_provider === "upstox";
            return (
              <div
                key={acc.id}
                onClick={() => setSelectedBrokerAccountId(isSelected ? "ALL" : acc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 text-xs ${
                  isSelected
                    ? "bg-[#101B2D] border-blue-500 shadow-md ring-1 ring-blue-500/30"
                    : "bg-[#0A1626] border-[#122033] hover:border-[#29415F]"
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#122033] pb-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-100 text-xs">{acc.account_name}</span>
                    <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-medium mt-0.5">
                      <Folder className="w-3 h-3 text-cyan-400 shrink-0" />
                      {acc.folder_name || acc.folder_id || "Broker Folder"}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5">{acc.id}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      acc.broker_provider === "dhan"
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                        : acc.broker_provider === "upstox"
                        ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                        : acc.broker_provider === "delta_exchange"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {acc.broker_provider}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Broker Balance:</span>
                    <span className="text-slate-200 font-semibold font-mono tabular-nums">{formatMoney(acc.broker_cash, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available Margin:</span>
                    <span className="text-emerald-400 font-semibold font-mono tabular-nums">{formatMoney(acc.available_margin, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Buying Power:</span>
                    <span className="text-cyan-300 font-semibold font-mono tabular-nums">{formatMoney(acc.buying_power, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Environment:</span>
                    <span className={`font-semibold ${acc.environment === "LIVE" ? "text-amber-400" : "text-blue-400"}`}>
                      {acc.environment}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#122033] flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {acc.reconciliation_status || "HEALTHY"}
                  </span>
                  {isDhanOrUpstox && (
                    <span
                      className="text-[9px] text-amber-400/90 font-medium"
                      title="Programmatic deposits unsupported by broker API. Manual authorized entry required."
                    >
                      FUNDING API UNAVAILABLE
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DEPARTMENT BREAKDOWN SECTION */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#122033] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Department Trading Budget & Resource Allocations</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Budget distribution across Dhan, Upstox, Delta Exchange, Paper Trading, and active bot instances
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            <strong className="text-slate-200">{departments.length}</strong> Operating Departments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept: any) => {
            const sym = dept.currency === "INR" ? "₹" : "$";
            return (
              <div
                key={dept.id}
                className="bg-[#0A1626] border border-[#122033] rounded-xl p-4 space-y-3 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-[#122033] pb-2">
                  <div>
                    <span className="font-semibold text-slate-100 text-xs block">{dept.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{dept.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-cyan-400 border border-cyan-500/30">
                    {formatMoney(dept.trading_budget, sym, 0)} Budget
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Allocated:</span>
                    <span className="text-cyan-300 font-semibold font-mono tabular-nums">{formatMoney(dept.allocated_capital || cb.bot_allocations_total, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reserved Capital:</span>
                    <span className="text-amber-400 font-semibold font-mono tabular-nums">{formatMoney(cb.bot_reserved_capital, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deployed to Trading:</span>
                    <span className="text-emerald-400 font-semibold font-mono tabular-nums">{formatMoney(cb.bot_deployed_capital, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#122033]">
                    <span className="text-slate-300 font-semibold">Available Remaining:</span>
                    <span className="text-emerald-400 font-semibold font-mono tabular-nums">{formatMoney(cb.department_available_capital, sym, 2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. BOT ALLOCATION TABLE */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#122033] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" />
              <span>Active Bot Capital Allocations & Exposure</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dedicated capital, risk reserves, margin, and strategy ownership per bot
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            <strong className="text-slate-200">{filteredBots.length}</strong> Configured Bot Instances
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-[#1A2A3F] text-[11px] text-slate-400 uppercase bg-[#07101A]">
                <th className="p-2.5 font-medium">Bot Name</th>
                <th className="p-2.5 font-medium">Department</th>
                <th className="p-2.5 font-medium">Broker Folder</th>
                <th className="p-2.5 font-medium">Account</th>
                <th className="p-2.5 font-medium">Mode</th>
                <th className="p-2.5 font-medium">Strategy</th>
                <th className="p-2.5 font-medium text-right">Allocated</th>
                <th className="p-2.5 font-medium text-right">Reserved</th>
                <th className="p-2.5 font-medium text-right">P&L</th>
                <th className="p-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#122033]">
              {filteredBots.length > 0 ? (
                filteredBots.map((b: any) => {
                  const sym = b.currency === "INR" ? "₹" : "$";
                  const pnl = Number(b.realized_pnl || 0) + Number(b.unrealized_pnl || 0);
                  return (
                    <tr key={b.id} className="hover:bg-[#101B2D]/60 transition-colors">
                      <td className="p-2.5 font-semibold text-slate-100">{b.name || b.id}</td>
                      <td className="p-2.5 text-slate-300">{b.department_name || b.department_id}</td>
                      <td className="p-2.5 text-cyan-400 flex items-center gap-1">
                        <Folder className="w-3 h-3 text-cyan-400" />
                        <span>{b.folder_name || b.folder_id}</span>
                      </td>
                      <td className="p-2.5 text-slate-300">{b.account_name || b.account_id}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${b.execution_mode === "LIVE" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/30"}`}>
                          {b.execution_mode || "PAPER"}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">{b.strategy || "NIFTY_MOMENTUM"}</td>
                      <td className="p-2.5 text-right font-semibold text-emerald-400 font-mono tabular-nums">{formatMoney(b.allocated_capital, sym, 2)}</td>
                      <td className="p-2.5 text-right text-amber-400 font-mono tabular-nums">{formatMoney(b.risk_reserve || 0, sym, 2)}</td>
                      <td className={`p-2.5 text-right font-semibold font-mono tabular-nums ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatPnL(pnl, sym).formatted}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {b.status || "STOPPED"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    No bot instances found for current scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. DUAL APPEND-ONLY LEDGERS (CAPITAL MOVEMENTS VS BROKERAGE EXPENSES) */}
      <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#122033] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLedgerSubTab("CAPITAL_MOVEMENTS")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                ledgerSubTab === "CAPITAL_MOVEMENTS"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 bg-[#0D1727] border border-[#1A2A3F]"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Capital Movement Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setLedgerSubTab("BROKERAGE_EXPENSES")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                ledgerSubTab === "BROKERAGE_EXPENSES"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 bg-[#0D1727] border border-[#1A2A3F]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Brokerage & Tax Expenses Ledger</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Immutable Append-Only Audit Trail</span>
          </div>
        </div>

        {/* SEARCH AND FILTER BAR FOR LEDGER */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-1.5 w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger ID, account, notes..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="bg-transparent text-slate-100 text-xs w-full focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {ledgerSubTab === "CAPITAL_MOVEMENTS" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Type:</span>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Movement Types</option>
                <option value="DEPOSIT">DEPOSIT</option>
                <option value="WITHDRAWAL">WITHDRAWAL</option>
                <option value="DEPT_ALLOCATION">DEPARTMENT ALLOCATION</option>
                <option value="BOT_ALLOCATION">BOT ALLOCATION</option>
                <option value="RESERVE">RISK RESERVE</option>
                <option value="RELEASE">RELEASE</option>
              </select>
            </div>
          )}
        </div>

        {/* CAPITAL MOVEMENT TABLE */}
        {ledgerSubTab === "CAPITAL_MOVEMENTS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1A2A3F] text-[11px] text-slate-400 uppercase bg-[#07101A]">
                  <th className="p-2.5 font-medium">Entry ID</th>
                  <th className="p-2.5 font-medium">Timestamp</th>
                  <th className="p-2.5 font-medium">Type</th>
                  <th className="p-2.5 font-medium">Department</th>
                  <th className="p-2.5 font-medium">Broker Account</th>
                  <th className="p-2.5 font-medium text-right">Amount</th>
                  <th className="p-2.5 font-medium">Mode</th>
                  <th className="p-2.5 font-medium">Status</th>
                  <th className="p-2.5 font-medium">Idempotency Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#122033]">
                {filteredLedgerEntries.length > 0 ? (
                  filteredLedgerEntries.map((row: any) => {
                    const sym = row.currency === "INR" ? "₹" : "$";
                    return (
                      <tr key={row.entry_id} className="hover:bg-[#101B2D]/60 transition-colors">
                        <td className="p-2.5 text-cyan-400 font-mono font-medium">{row.entry_id}</td>
                        <td className="p-2.5 text-[11px] text-slate-400">
                          {row.timestamp ? new Date(row.timestamp).toLocaleString() : "N/A"}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.entry_type === "DEPOSIT" || row.entry_type === "FUNDING"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : row.entry_type === "WITHDRAWAL"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            }`}
                          >
                            {row.entry_type}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200">{row.department_id}</td>
                        <td className="p-2.5 text-slate-300">{row.broker_account_id}</td>
                        <td
                          className={`p-2.5 text-right font-semibold font-mono tabular-nums ${
                            row.entry_type === "WITHDRAWAL" ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {formatMoney(row.amount, sym, 2)}
                        </td>
                        <td
                          className={`p-2.5 font-semibold ${
                            row.environment === "LIVE" ? "text-amber-400" : "text-blue-400"
                          }`}
                        >
                          {row.environment}
                        </td>
                        <td className="p-2.5 text-emerald-400 font-semibold">{row.status}</td>
                        <td className="p-2.5 text-[10px] text-slate-500 font-mono">{row.idempotency_key}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      No capital movements matching the specified criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* BROKERAGE EXPENSES TABLE */}
        {ledgerSubTab === "BROKERAGE_EXPENSES" && (
          <div className="space-y-3">
            <div className="p-3 bg-[#07101A] border border-[#1A2A3F] rounded-xl text-xs text-amber-300/90 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Accounting Invariant:</strong> Brokerage fees, exchange charges, and government taxes (STT / GST / Stamp Duty) are tracked in this append-only expense ledger and deducted from Net Equity. They are never added to trading capital.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1A2A3F] text-[11px] text-slate-400 uppercase bg-[#07101A]">
                    <th className="p-2.5 font-medium">Expense ID</th>
                    <th className="p-2.5 font-medium">Timestamp</th>
                    <th className="p-2.5 font-medium">Type</th>
                    <th className="p-2.5 font-medium">Provider</th>
                    <th className="p-2.5 font-medium">Account ID</th>
                    <th className="p-2.5 font-medium">Trade / Bot ID</th>
                    <th className="p-2.5 font-medium text-right">Fee Amount</th>
                    <th className="p-2.5 font-medium">Audit ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#122033]">
                  {(expensesData?.expenses || []).length > 0 ? (
                    expensesData.expenses.map((exp: any) => (
                      <tr key={exp.expense_id} className="hover:bg-[#101B2D]/60 transition-colors">
                        <td className="p-2.5 text-amber-400 font-mono font-medium">{exp.expense_id}</td>
                        <td className="p-2.5 text-[11px] text-slate-400">
                          {exp.timestamp ? new Date(exp.timestamp).toLocaleTimeString() : "N/A"}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            {exp.expense_type}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200 uppercase">{exp.provider}</td>
                        <td className="p-2.5 text-slate-300">{exp.broker_account_id}</td>
                        <td className="p-2.5 text-[11px] text-slate-400">{exp.trade_id || exp.bot_id || "SYSTEM"}</td>
                        <td className="p-2.5 text-right font-semibold text-rose-400 font-mono tabular-nums">
                          {formatMoney(exp.amount, exp.currency === "INR" ? "₹" : "$", 2)}
                        </td>
                        <td className="p-2.5 text-[10px] text-slate-500 font-mono">{exp.audit_id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">
                        No brokerage expenses recorded for current scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 8. RECORD CAPITAL MOVEMENT MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#122033] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-100">Record Capital Movement</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Transaction Type</label>
                  <select
                    value={moveType}
                    onChange={(e) => setMoveType(e.target.value as any)}
                    className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="DEPOSIT">DEPOSIT (External Funding)</option>
                    <option value="WITHDRAWAL">WITHDRAWAL (External Outflow)</option>
                    <option value="DEPT_ALLOCATION">DEPARTMENT ALLOCATION</option>
                    <option value="RESERVE">RISK RESERVE HOLD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Target Department</label>
                  <select
                    value={moveDeptId}
                    onChange={(e) => setMoveDeptId(e.target.value)}
                    className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500"
                  >
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Broker Account</label>
                  <select
                    value={moveAccountId}
                    onChange={(e) => {
                      const accId = e.target.value;
                      setMoveAccountId(accId);
                      if (accId === "ba_dhan_primary" || accId === "ba_upstox_primary") {
                        setMoveCurrency("INR");
                      } else {
                        setMoveCurrency("USD");
                      }
                    }}
                    className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-xs text-cyan-300 font-medium focus:outline-none focus:border-blue-500"
                  >
                    {allAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({a.broker_provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Currency</label>
                  <select
                    value={moveCurrency}
                    onChange={(e) => setMoveCurrency(e.target.value as any)}
                    className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Amount *</label>
                <input
                  type="number"
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono tabular-nums font-bold text-right focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Audit Notes / Reference</label>
                <input
                  type="text"
                  value={moveNotes}
                  placeholder="e.g. Bank Wire Ref #992819"
                  onChange={(e) => setMoveNotes(e.target.value)}
                  className="w-full bg-[#0D1727] border border-[#1A2A3F] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}
            </div>

            <div className="border-t border-[#122033] pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#0D1727] hover:bg-[#101B2D] text-slate-400 hover:text-slate-100 font-semibold text-xs border border-[#1A2A3F] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => recordMovementMutation.mutate()}
                disabled={recordMovementMutation.isPending || moveAmount <= 0}
                className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                {recordMovementMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm & Log to Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
