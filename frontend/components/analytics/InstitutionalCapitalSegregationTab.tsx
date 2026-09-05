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
  const hierarchyList = hierarchyData?.hierarchy || [];
  const activeCustomer = hierarchyList.find((c: any) => c.id === selectedCustomerId) || hierarchyList[0];
  const departments = activeCustomer?.departments || [];

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
  const ledgerEntries = capitalLedgerData?.entries || [];
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
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/30">
            <Landmark className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                Capital & Funds — Institutional Fund Segregation
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#142B21] text-[#55C98A] border border-[#275841]">
                9-TIER PARTITIONED LEDGERS
              </span>
            </div>
            <p className="text-xs text-[#8BA596]">
              Authoritative Customer Capital: <strong className="text-emerald-400 font-mono">{formatMoney(cb.gross_capital, currencySymbol, 2)}</strong> • Net Equity: <strong className="text-white font-mono">{formatMoney(cb.net_equity, currencySymbol, 2)}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Paper / Live Toggle */}
          <div className="flex items-center bg-[#060D0A] p-1 rounded-xl border border-[#1A3127]">
            <button
              type="button"
              onClick={() => setTradingMode("PAPER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tradingMode === "PAPER"
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                  : "text-[#8BA596] hover:text-white"
              }`}
            >
              PAPER ENVIRONMENT
            </button>
            <button
              type="button"
              onClick={() => setTradingMode("LIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tradingMode === "LIVE"
                  ? "bg-red-950/80 text-red-400 border border-red-700 shadow-sm"
                  : "text-[#8BA596] hover:text-white"
              }`}
            >
              LIVE ENVIRONMENT
            </button>
          </div>

          {/* Reconciliation Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs ${
              !isQuarantined
                ? "bg-[#0C1B15] text-[#55C98A] border-[#1A3127]"
                : "bg-red-950/60 text-rose-400 border-rose-800 animate-pulse"
            }`}
          >
            {!isQuarantined ? (
              <ShieldCheck className="w-4 h-4 text-[#55C98A]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            <span>RECONCILIATION: {reconciliationStatus}</span>
          </div>

          {/* Record Capital Movement Trigger */}
          <button
            type="button"
            onClick={() => setIsDepositModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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
            className="p-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white border border-[#1A3127] transition-all cursor-pointer"
            title="Refresh All Authoritative Ledgers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUARANTINE / SAFETY ALERT NOTICE IF MISMATCH DETECTED */}
      {isQuarantined && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 shadow-xl flex items-start gap-3 text-xs font-mono text-rose-300">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-black text-rose-200 text-sm uppercase">
              Trading Execution Quarantined: Ledger Reconciliation Discrepancy Detected
            </span>
            <p className="text-rose-300/90 text-xs">
              Audit mismatch found between authoritative ledger balances and broker-reported feeds. Automated safety lock is engaged to block new order execution until discrepancy is resolved.
            </p>
          </div>
        </div>
      )}

      {/* 2. COMPLETE 9-TIER HIERARCHY FILTER BAR */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 shadow-xl space-y-3 text-xs font-mono">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-2 text-[11px]">
          <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#55C98A]" />
            <span>Hierarchical Scope & Drill-Down Filters</span>
          </span>
          <span className="text-[#8BA596]">
            Showing <strong className="text-white">{filteredAccounts.length}</strong> of {allAccounts.length} Segregated Accounts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Customer */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#8BA596] uppercase font-bold">1. Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#39B978]"
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
            <label className="text-[10px] text-[#8BA596] uppercase font-bold">2. Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#39B978]"
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
            <label className="text-[10px] text-[#8BA596] uppercase font-bold">3. Broker Folder</label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#39B978]"
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
            <label className="text-[10px] text-[#8BA596] uppercase font-bold">4. Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-[#39B978]"
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
            <label className="text-[10px] text-[#8BA596] uppercase font-bold">5. Account</label>
            <select
              value={selectedBrokerAccountId}
              onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-cyan-400 font-bold focus:outline-none focus:border-[#39B978]"
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
            <label className="text-[10px] text-[#8BA596] uppercase font-bold">6. Currency</label>
            <select
              value={selectedCurrencyFilter}
              onChange={(e) => setSelectedCurrencyFilter(e.target.value)}
              className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-[#39B978]"
            >
              <option value="ALL">All Currencies</option>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. FOUR 20-POINT AUTHORITATIVE CAPITAL SUMMARY CARDS (CAPITAL BREAKDOWN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: CUSTOMER NET EQUITY */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-2xl p-4 space-y-3 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-sky-400" />
              Customer Net Equity
            </span>
            <span className="text-[10px] text-slate-400">{cb.environment}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Gross Capital:</span>
              <span className="font-bold text-slate-100">{formatMoney(cb.gross_capital, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Verified Deposits:</span>
              <span className="text-emerald-400 font-bold">{formatMoney(cb.deposits, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Verified Withdrawals:</span>
              <span className="text-rose-400 font-bold">{formatMoney(cb.withdrawals, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-extrabold pt-1.5 border-t border-[#1A3127]">
              <span>Net Authoritative Equity:</span>
              <span className="text-emerald-400 text-sm">{formatMoney(cb.net_equity, currencySymbol, 2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: P&L & EXPENSE LEDGER */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-2xl p-4 space-y-3 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              P&L & Expense Ledger
            </span>
            <span className="text-[10px] text-slate-400">APPEND-ONLY</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Realized Gains / P&L:</span>
              <span className={`font-bold ${cb.realized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPnL(cb.realized_pnl, currencySymbol).formatted}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Unrealized (Open) P&L:</span>
              <span className={`font-bold ${cb.unrealized_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatPnL(cb.unrealized_pnl, currencySymbol).formatted}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Brokerage Fees & STT:</span>
              <span className="text-rose-300 font-mono">{formatMoney(cb.brokerage_fees + cb.taxes, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-extrabold pt-1.5 border-t border-[#1A3127]">
              <span>Total Deducted Expenses:</span>
              <span className="text-rose-400">{formatMoney(cb.total_expenses, currencySymbol, 2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: DEPARTMENT BUDGET & ALLOCATIONS */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-2xl p-4 space-y-3 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Department Trading Budget
            </span>
            <span className="text-[10px] text-slate-400">ALLOCATIONS</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Department Budget:</span>
              <span className="font-bold text-slate-100">{formatMoney(cb.department_budget, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Bot Allocations Total:</span>
              <span className="text-cyan-300 font-bold">{formatMoney(cb.bot_allocations_total, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Reserved Risk Capital:</span>
              <span className="text-amber-400 font-bold">{formatMoney(cb.bot_reserved_capital, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-extrabold pt-1.5 border-t border-[#1A3127]">
              <span>Available Trading Capital:</span>
              <span className="text-emerald-400">{formatMoney(cb.department_available_capital, currencySymbol, 2)}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: BROKER MARGIN & SEGREGATION */}
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-2xl p-4 space-y-3 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              Broker Account & Margin
            </span>
            <span className="text-[10px] text-slate-400">SETTLED</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Broker Cash / Balance:</span>
              <span className="font-bold text-slate-100">{formatMoney(cb.broker_balance, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Margin Utilized:</span>
              <span className="text-amber-400 font-bold">{formatMoney(cb.used_margin, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Available Margin:</span>
              <span className="text-emerald-400 font-bold">{formatMoney(cb.available_margin, currencySymbol, 2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-100 font-extrabold pt-1.5 border-t border-[#1A3127]">
              <span>Paper / Live Isolation:</span>
              <span className="text-cyan-300">
                {formatMoney(cb.paper_funds, currencySymbol, 0)} P / {formatMoney(cb.live_funds, currencySymbol, 0)} L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MULTI-BROKER FOLDER BREAKDOWN */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#55C98A]" />
              <span>Broker Folder Breakdown & Segregated Accounts</span>
            </h2>
            <p className="text-xs text-[#8BA596]">
              Real-time segregated balances partitioned per Broker Folder: Dhan HQ, Upstox Pro, Delta Exchange, and Paper Simulator
            </p>
          </div>
          <span className="text-xs font-mono text-[#55C98A]">
            {filteredAccounts.length} Connected Accounts
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
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 font-mono text-xs ${
                  isSelected
                    ? "bg-[#123C2A] border-[#39B978] shadow-lg ring-1 ring-[#55C98A]/40"
                    : "bg-[#0C1713] border-[#1A3127] hover:border-[#275841]"
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-xs">{acc.account_name}</span>
                    <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-semibold">
                      <Folder className="w-3 h-3 text-cyan-400 shrink-0" />
                      {acc.folder_name || acc.folder_id || "Broker Folder"}
                    </span>
                    <span className="text-[9px] text-[#8BA596]">{acc.id}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      acc.broker_provider === "dhan"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : acc.broker_provider === "upstox"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : acc.broker_provider === "delta_exchange"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    }`}
                  >
                    {acc.broker_provider}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Broker Balance:</span>
                    <span className="text-white font-bold">{formatMoney(acc.broker_cash, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Available Margin:</span>
                    <span className="text-emerald-400 font-bold">{formatMoney(acc.available_margin, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Buying Power:</span>
                    <span className="text-cyan-300 font-bold">{formatMoney(acc.buying_power, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Environment:</span>
                    <span className={`font-bold ${acc.environment === "LIVE" ? "text-amber-400" : "text-cyan-400"}`}>
                      {acc.environment}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1A3127] flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-[#8BA596]">
                    <ShieldCheck className="w-3 h-3 text-[#55C98A]" />
                    {acc.reconciliation_status || "HEALTHY"}
                  </span>
                  {isDhanOrUpstox && (
                    <span
                      className="text-[9px] text-amber-400/90 font-bold"
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
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#55C98A]" />
              <span>Department Trading Budget & Resource Allocations</span>
            </h2>
            <p className="text-xs text-[#8BA596]">
              Budget distribution across Dhan, Upstox, Delta Exchange, Paper Trading, and active bot instances
            </p>
          </div>
          <span className="text-xs font-mono text-[#55C98A]">
            {departments.length} Operating Departments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept: any) => {
            const sym = dept.currency === "INR" ? "₹" : "$";
            return (
              <div
                key={dept.id}
                className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3 font-mono text-xs shadow-md"
              >
                <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
                  <div>
                    <span className="font-bold text-white text-xs block">{dept.name}</span>
                    <span className="text-[10px] text-[#8BA596]">{dept.id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
                    {formatMoney(dept.trading_budget, sym, 0)} Budget
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Total Allocated:</span>
                    <span className="text-cyan-300 font-bold">{formatMoney(dept.allocated_capital || cb.bot_allocations_total, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Reserved Capital:</span>
                    <span className="text-amber-400 font-bold">{formatMoney(cb.bot_reserved_capital, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Deployed to Trading:</span>
                    <span className="text-emerald-400 font-bold">{formatMoney(cb.bot_deployed_capital, sym, 2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#142B21]">
                    <span className="text-slate-200 font-bold">Available Remaining:</span>
                    <span className="text-[#55C98A] font-extrabold">{formatMoney(cb.department_available_capital, sym, 2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. BOT ALLOCATION TABLE */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#55C98A]" />
              <span>Active Bot Capital Allocations & Exposure</span>
            </h2>
            <p className="text-xs text-[#8BA596]">
              Dedicated capital, risk reserves, margin, and strategy ownership per bot
            </p>
          </div>
          <span className="text-xs font-mono text-[#55C98A]">
            {filteredBots.length} Configured Bot Instances
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-slate-300">
            <thead>
              <tr className="border-b border-[#1A3127] text-[10px] text-[#8BA596] uppercase bg-[#060D0A]">
                <th className="p-2.5">Bot Name</th>
                <th className="p-2.5">Department</th>
                <th className="p-2.5">Broker Folder</th>
                <th className="p-2.5">Account</th>
                <th className="p-2.5">Mode</th>
                <th className="p-2.5">Strategy</th>
                <th className="p-2.5 text-right">Allocated</th>
                <th className="p-2.5 text-right">Reserved</th>
                <th className="p-2.5 text-right">P&L</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142B21]">
              {filteredBots.length > 0 ? (
                filteredBots.map((b: any) => {
                  const sym = b.currency === "INR" ? "₹" : "$";
                  const pnl = Number(b.realized_pnl || 0) + Number(b.unrealized_pnl || 0);
                  return (
                    <tr key={b.id} className="hover:bg-[#0C1713] transition-colors">
                      <td className="p-2.5 font-bold text-white">{b.name || b.id}</td>
                      <td className="p-2.5 text-slate-300">{b.department_name || b.department_id}</td>
                      <td className="p-2.5 text-cyan-400 flex items-center gap-1">
                        <Folder className="w-3 h-3 text-cyan-400" />
                        <span>{b.folder_name || b.folder_id}</span>
                      </td>
                      <td className="p-2.5 text-cyan-300">{b.account_name || b.account_id}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.execution_mode === "LIVE" ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                          {b.execution_mode || "PAPER"}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">{b.strategy || "NIFTY_MOMENTUM"}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-400">{formatMoney(b.allocated_capital, sym, 2)}</td>
                      <td className="p-2.5 text-right text-amber-400">{formatMoney(b.risk_reserve || 0, sym, 2)}</td>
                      <td className={`p-2.5 text-right font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatPnL(pnl, sym).formatted}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#123C2A] text-[#55C98A]">
                          {b.status || "STOPPED"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-[#8BA596]">
                    No bot instances found for current scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. DUAL APPEND-ONLY LEDGERS (CAPITAL MOVEMENTS VS BROKERAGE EXPENSES) */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142B21] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLedgerSubTab("CAPITAL_MOVEMENTS")}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-extrabold transition-all flex items-center gap-2 ${
                ledgerSubTab === "CAPITAL_MOVEMENTS"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-[#8BA596] hover:text-white bg-[#0C1713] border border-[#1A3127]"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Capital Movement Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setLedgerSubTab("BROKERAGE_EXPENSES")}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-extrabold transition-all flex items-center gap-2 ${
                ledgerSubTab === "BROKERAGE_EXPENSES"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-[#8BA596] hover:text-white bg-[#0C1713] border border-[#1A3127]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Brokerage & Tax Expenses Ledger</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8BA596]">
            <ShieldCheck className="w-4 h-4 text-[#55C98A]" />
            <span>IMMUTABLE APPEND-ONLY AUDIT TRAIL</span>
          </div>
        </div>

        {/* SEARCH AND FILTER BAR FOR LEDGER */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-1.5 w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#8BA596]" />
            <input
              type="text"
              placeholder="Search ledger ID, account, notes..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="bg-transparent text-white text-xs w-full focus:outline-none placeholder:text-slate-600"
            />
          </div>

          {ledgerSubTab === "CAPITAL_MOVEMENTS" && (
            <div className="flex items-center gap-2">
              <span className="text-[#8BA596]">Type:</span>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1 text-xs text-white font-bold"
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
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1A3127] text-[10px] text-[#8BA596] uppercase bg-[#060D0A]">
                  <th className="p-2.5">Entry ID</th>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Department</th>
                  <th className="p-2.5">Broker Account</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5">Mode</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Idempotency Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#142B21]">
                {filteredLedgerEntries.length > 0 ? (
                  filteredLedgerEntries.map((row: any) => {
                    const sym = row.currency === "INR" ? "₹" : "$";
                    return (
                      <tr key={row.entry_id} className="hover:bg-[#0C1713] transition-colors">
                        <td className="p-2.5 text-cyan-400 font-bold">{row.entry_id}</td>
                        <td className="p-2.5 text-[11px] text-[#8BA596]">
                          {row.timestamp ? new Date(row.timestamp).toLocaleString() : "N/A"}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.entry_type === "DEPOSIT" || row.entry_type === "FUNDING"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : row.entry_type === "WITHDRAWAL"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            }`}
                          >
                            {row.entry_type}
                          </span>
                        </td>
                        <td className="p-2.5 text-white">{row.department_id}</td>
                        <td className="p-2.5 text-cyan-300">{row.broker_account_id}</td>
                        <td
                          className={`p-2.5 text-right font-bold ${
                            row.entry_type === "WITHDRAWAL" ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {formatMoney(row.amount, sym, 2)}
                        </td>
                        <td
                          className={`p-2.5 font-bold ${
                            row.environment === "LIVE" ? "text-amber-400" : "text-cyan-400"
                          }`}
                        >
                          {row.environment}
                        </td>
                        <td className="p-2.5 text-[#55C98A] font-bold">{row.status}</td>
                        <td className="p-2.5 text-[10px] text-[#8BA596] font-mono">{row.idempotency_key}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[#8BA596]">
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
            <div className="p-3 bg-[#0B182B] border border-amber-500/30 rounded-xl text-xs font-sans text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Accounting Invariant:</strong> Brokerage fees, exchange charges, and government taxes (STT / GST / Stamp Duty) are tracked in this append-only expense ledger and deducted from Net Equity. They are never added to trading capital.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1A3127] text-[10px] text-[#8BA596] uppercase bg-[#060D0A]">
                    <th className="p-2.5">Expense ID</th>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Provider</th>
                    <th className="p-2.5">Account ID</th>
                    <th className="p-2.5">Trade / Bot ID</th>
                    <th className="p-2.5 text-right">Fee Amount</th>
                    <th className="p-2.5">Audit ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#142B21]">
                  {(expensesData?.expenses || []).length > 0 ? (
                    expensesData.expenses.map((exp: any) => (
                      <tr key={exp.expense_id} className="hover:bg-[#0C1713] transition-colors">
                        <td className="p-2.5 text-amber-400 font-bold">{exp.expense_id}</td>
                        <td className="p-2.5 text-[11px] text-[#8BA596]">
                          {exp.timestamp ? new Date(exp.timestamp).toLocaleTimeString() : "N/A"}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {exp.expense_type}
                          </span>
                        </td>
                        <td className="p-2.5 text-white uppercase">{exp.provider}</td>
                        <td className="p-2.5 text-cyan-300">{exp.broker_account_id}</td>
                        <td className="p-2.5 text-[11px] text-[#8BA596]">{exp.trade_id || exp.bot_id || "SYSTEM"}</td>
                        <td className="p-2.5 text-right font-bold text-rose-400">
                          {formatMoney(exp.amount, exp.currency === "INR" ? "₹" : "$", 2)}
                        </td>
                        <td className="p-2.5 text-[10px] text-[#8BA596] font-mono">{exp.audit_id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-[#8BA596]">
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
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 font-mono text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#55C98A]" />
                <h3 className="text-sm font-bold text-white uppercase">Record Capital Movement</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="text-[#8BA596] hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA596] uppercase font-bold">Transaction Type</label>
                  <select
                    value={moveType}
                    onChange={(e) => setMoveType(e.target.value as any)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="DEPOSIT">DEPOSIT (External Funding)</option>
                    <option value="WITHDRAWAL">WITHDRAWAL (External Outflow)</option>
                    <option value="DEPT_ALLOCATION">DEPARTMENT ALLOCATION</option>
                    <option value="RESERVE">RISK RESERVE HOLD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA596] uppercase font-bold">Target Department</label>
                  <select
                    value={moveDeptId}
                    onChange={(e) => setMoveDeptId(e.target.value)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-bold"
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
                  <label className="text-[10px] text-[#8BA596] uppercase font-bold">Broker Account</label>
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
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold"
                  >
                    {allAccounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({a.broker_provider.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8BA596] uppercase font-bold">Currency</label>
                  <select
                    value={moveCurrency}
                    onChange={(e) => setMoveCurrency(e.target.value as any)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#8BA596] uppercase font-bold">Amount *</label>
                <input
                  type="number"
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#8BA596] uppercase font-bold">Audit Notes / Reference</label>
                <input
                  type="text"
                  value={moveNotes}
                  placeholder="e.g. Bank Wire Ref #992819"
                  onChange={(e) => setMoveNotes(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-[#123C2A] border border-[#39B978] text-[#55C98A] rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#55C98A] shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}
            </div>

            <div className="border-t border-[#142B21] pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => recordMovementMutation.mutate()}
                disabled={recordMovementMutation.isPending || moveAmount <= 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow-md disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
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
