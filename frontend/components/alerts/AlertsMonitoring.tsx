"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  IncidentItem, 
  IncidentSeverity, 
  IncidentStatus, 
  IncidentsListResponse, 
  IncidentSummaryResponse 
} from "@/types/alerts";
import { apiClient } from "@/lib/apiClient";
import { AlertsCenterHeader } from "./AlertsCenterHeader";
import { AlertsKpiStrip } from "./AlertsKpiStrip";
import { LiveOperationsBar } from "./LiveOperationsBar";
import { AlertFiltersToolbar } from "./AlertFiltersToolbar";
import { AlertsIncidentTable } from "./AlertsIncidentTable";
import { IncidentDetailDrawer } from "./IncidentDetailDrawer";
import { AlertRulesModal } from "./AlertRulesModal";
import { TestAlertModal } from "./TestAlertModal";
import { AlertError } from "./AlertError";

export function AlertsMonitoring() {
  const queryClient = useQueryClient();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus>("ACTIVE");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [timeframe, setTimeframe] = useState("ALL");
  
  // Selection & Drawer State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // 1. Fetch Authoritative Incident Metrics Summary (Adaptive Polling)
  const { 
    data: summaryData, 
    isLoading: isSummaryLoading, 
    refetch: refetchSummary 
  } = useQuery<IncidentSummaryResponse>({
    queryKey: ["incidentsSummary"],
    queryFn: async () => {
      const res = await apiClient.get<IncidentSummaryResponse>("/api/incidents/summary", { timeoutMs: 5000 });
      if (!res.ok || !res.data) throw new Error("Failed to fetch incident summary metrics");
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() || isStreaming ? false : 10000),
    staleTime: 5000,
    retry: 1
  });

  // 2. Fetch System Health & Safe Self-Healing Telemetry
  const { data: systemHealthData } = useQuery({
    queryKey: ["systemHealthStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/system/health", { timeoutMs: 5000 });
      if (!res.ok || !res.data) return null;
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() || isStreaming ? false : 15000),
    staleTime: 10000,
    retry: 1
  });

  // 3. Fetch Server-Side Filtered Incidents List (Adaptive Polling)
  const { 
    data: listData, 
    isLoading: isListLoading, 
    error, 
    refetch: refetchList, 
    isFetching 
  } = useQuery<IncidentsListResponse>({
    queryKey: ["incidentsList", statusFilter, severityFilter, categoryFilter, timeframe, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (severityFilter !== "ALL") params.append("severity", severityFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (timeframe !== "ALL") params.append("timeframe", timeframe);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("limit", "100");

      const res = await apiClient.get<IncidentsListResponse>(`/api/incidents?${params.toString()}`, { timeoutMs: 6000 });
      if (!res.ok || !res.data) throw new Error(res.error?.message || "Failed to fetch incidents");
      return res.data;
    },
    refetchInterval: () => (apiClient.isOffline() || isStreaming ? false : 8000),
    staleTime: 5000,
    retry: 1
  });

  // 4. Real-Time Resilient SSE Stream Connection
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const handle = apiClient.createResilientEventSource("/api/stream/alerts", {
      key: "stream_alerts",
      onOpen: () => setIsStreaming(true),
      onStateChange: (state) => setIsStreaming(state === "OPEN"),
      onMessage: (payload) => {
        if (payload?.type === "INCIDENTS_STREAM") {
          if (payload.summary) {
            queryClient.setQueryData(["incidentsSummary"], { status: "success", metrics: payload.summary });
          }
          if (payload.system_health) {
            queryClient.setQueryData(["systemHealthStatus"], { status: "success", health: payload.system_health });
          }
          if (!debounceTimer) {
            debounceTimer = setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
              debounceTimer = null;
            }, 3000);
          }
        }
      },
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      handle.close();
    };
  }, [queryClient]);

  // 4. Mutation: Acknowledge Single Incident
  const acknowledgeMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const res = await fetch(`/api/incidents/${incidentId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator_name: "Operator" })
      });
      if (!res.ok) throw new Error("Failed to acknowledge incident");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
      queryClient.invalidateQueries({ queryKey: ["incidentsSummary"] });
    }
  });

  // 5. Mutation: Resolve Single Incident
  const resolveMutation = useMutation({
    mutationFn: async ({ incidentId, note }: { incidentId: string; note?: string }) => {
      const res = await fetch(`/api/incidents/${incidentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator_name: "Operator", note: note || "Resolved by operator" })
      });
      if (!res.ok) throw new Error("Failed to resolve incident");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
      queryClient.invalidateQueries({ queryKey: ["incidentsSummary"] });
    }
  });

  // 6. Mutation: Archive Single Incident
  const archiveMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const res = await fetch(`/api/incidents/${incidentId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator_name: "Operator" })
      });
      if (!res.ok) throw new Error("Failed to archive incident");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
      queryClient.invalidateQueries({ queryKey: ["incidentsSummary"] });
    }
  });

  // 7. Mutation: Bulk Actions
  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: "ACKNOWLEDGE" | "RESOLVE" | "ARCHIVE"; ids: string[] }) => {
      const res = await fetch("/api/incidents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, incident_ids: ids, operator_name: "Operator" })
      });
      if (!res.ok) throw new Error("Bulk action failed");
      return res.json();
    },
    onSuccess: (data, variables) => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
      queryClient.invalidateQueries({ queryKey: ["incidentsSummary"] });
      setActionFeedback(`Successfully applied ${variables.action} to ${variables.ids.length} incidents.`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  });

  // 8. Mutation: Test Telegram Connection
  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_name: "BTC Trading Bot" })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to trigger telegram test");
      return json;
    },
    onSuccess: () => {
      setActionFeedback("Telegram test notification delivered successfully!");
      setTimeout(() => setActionFeedback(null), 4000);
    },
    onError: (err) => {
      setActionFeedback(`Telegram test failed: ${err.message}`);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  });

  // 9. Mutation: Safe Acknowledge Visible
  const acknowledgeVisibleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts/clear", {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to acknowledge visible alerts");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["incidentsList"] });
      queryClient.invalidateQueries({ queryKey: ["incidentsSummary"] });
      setActionFeedback(`Acknowledged ${data.affected_count || 0} active alerts. History preserved.`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  });

  const incidents = useMemo(() => listData?.incidents || [], [listData?.incidents]);

  // Multi-Selection Handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === incidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(incidents.map((i) => i.incident_id)));
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>(["TRADING", "RISK", "BOT", "WORKER", "ORDER", "POSITION", "BROKER", "MARKET_DATA", "DATABASE", "SYSTEM", "TELEGRAM", "TEST"]);
    for (const inc of incidents) {
      if (inc.category) set.add(inc.category);
    }
    return Array.from(set).sort();
  }, [incidents]);

  const handleRefresh = () => {
    refetchSummary();
    refetchList();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* 1. Master Header */}
      <AlertsCenterHeader
        metrics={summaryData?.metrics}
        isStreaming={isStreaming}
        isFetching={isFetching}
        onRefresh={handleRefresh}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onTestTelegram={() => testTelegramMutation.mutate()}
        onOpenRulesModal={() => setIsRulesModalOpen(true)}
        onAcknowledgeVisible={() => acknowledgeVisibleMutation.mutate()}
        isAcknowledging={acknowledgeVisibleMutation.isPending}
        isTestingTelegram={testTelegramMutation.isPending}
      />

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 px-4 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono flex items-center justify-between shadow-lg animate-fade-in">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 2. Top KPI Strip */}
      <AlertsKpiStrip
        metrics={summaryData?.metrics}
        selectedSeverity={severityFilter}
        onSelectSeverity={(sev) => setSeverityFilter(sev as IncidentSeverity)}
        selectedStatus={statusFilter}
        onSelectStatus={(st) => setStatusFilter(st as IncidentStatus)}
      />

      {/* 3. Live Subsystem Health Observability Bar */}
      <LiveOperationsBar health={systemHealthData?.health} />

      {/* 4. Multi-Criteria Filter Toolbar */}
      <AlertFiltersToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        selectedCount={selectedIds.size}
        onBulkAcknowledge={() => bulkMutation.mutate({ action: "ACKNOWLEDGE", ids: Array.from(selectedIds) })}
        onBulkResolve={() => bulkMutation.mutate({ action: "RESOLVE", ids: Array.from(selectedIds) })}
        onBulkArchive={() => bulkMutation.mutate({ action: "ARCHIVE", ids: Array.from(selectedIds) })}
        onClearSelection={() => setSelectedIds(new Set())}
        categories={categories}
      />

      {/* 5. Incidents Error State or Virtualized Table */}
      {error ? (
        <AlertError message={error.message} onRetry={handleRefresh} />
      ) : (
        <AlertsIncidentTable
          incidents={incidents}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectIncident={(inc) => setSelectedIncident(inc)}
          onAcknowledge={(id, e) => {
            e.stopPropagation();
            acknowledgeMutation.mutate(id);
          }}
          onResolve={(id, e) => {
            e.stopPropagation();
            resolveMutation.mutate({ incidentId: id });
          }}
          onArchive={(id, e) => {
            e.stopPropagation();
            archiveMutation.mutate(id);
          }}
          isLoading={isListLoading}
        />
      )}

      {/* 6. Slide-Out Incident Detail Drawer */}
      {selectedIncident && (
        <IncidentDetailDrawer
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onAcknowledge={(id) => {
            acknowledgeMutation.mutate(id);
            setSelectedIncident((prev) => prev ? { ...prev, status: "ACKNOWLEDGED" } : null);
          }}
          onResolve={(id, note) => {
            resolveMutation.mutate({ incidentId: id, note });
            setSelectedIncident((prev) => prev ? { ...prev, status: "RESOLVED" } : null);
          }}
          onArchive={(id) => {
            archiveMutation.mutate(id);
            setSelectedIncident((prev) => prev ? { ...prev, status: "ARCHIVED" } : null);
          }}
        />
      )}

      {/* 7. Alert Rules Configuration Modal */}
      <AlertRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* 8. Self-Test Alert Dispatcher Modal */}
      <TestAlertModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}
