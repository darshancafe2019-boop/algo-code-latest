"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeVersion,
  StrategyIdeDiffResult,
} from "@/types/strategy-ide";
import { QosButton, QosBadge } from "@/components/ui/QosComponents";

interface StrategyVersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition;
  onVersionPublished: (newVersion: string) => void;
}

export function StrategyVersionDiffModal({
  isOpen,
  onClose,
  strategy,
  onVersionPublished,
}: StrategyVersionDiffModalProps) {
  const queryClient = useQueryClient();
  const [newVersionInput, setNewVersionInput] = useState("1.1.0");
  const [changeSummary, setChangeSummary] = useState("Refined EMA rules and stop loss buffer");
  const [vOld, setVOld] = useState<string>("1.0.0");
  const [vNew, setVNew] = useState<string>("1.1.0");

  const stratId = strategy.strategy_id || strategy.id || "default";

  // Fetch Versions
  const { data: versionsData, isLoading: isLoadingVersions } = useQuery<{
    versions: StrategyIdeVersion[];
  }>({
    queryKey: ["strategyVersions", stratId],
    queryFn: async () => {
      const res = await fetch(`/api/strategy/ide/versions?strategy_id=${stratId}`);
      if (!res.ok) return { versions: [] };
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch Diff between vOld and vNew
  const { data: diffData, isLoading: isLoadingDiff } = useQuery<StrategyIdeDiffResult>({
    queryKey: ["versionDiff", stratId, vOld, vNew],
    queryFn: async () => {
      if (!vOld || !vNew || vOld === vNew) return { status: "success", differences: [], diff_count: 0 } as any;
      const res = await fetch(
        `/api/strategy/ide/version-diff?strategy_id=${stratId}&v_old=${vOld}&v_new=${vNew}`
      );
      if (!res.ok) return { status: "error", differences: [], diff_count: 0 } as any;
      return res.json();
    },
    enabled: isOpen && Boolean(vOld) && Boolean(vNew) && vOld !== vNew,
  });

  // Publish Version Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/strategy/ide/publish-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          version: newVersionInput,
          change_summary: changeSummary,
          author: "Trader",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to publish version");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["strategyVersions", stratId] });
      onVersionPublished(data.version);
    },
  });

  if (!isOpen) return null;

  const versions = versionsData?.versions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none font-sans text-xs">
      <div className="bg-[#0A1422] border border-[#12304A] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#12304A] flex items-center justify-between bg-[#07111F]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                STRATEGY VERSION CONTROL & DIFF LAB
              </h3>
              <p className="text-[11px] text-[#7D8EA5]">
                Semantic versions, immutable snapshots, and parameter change diffing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Create New Version Snapshot Card */}
          <div className="p-3.5 rounded-xl bg-[#0C1727] border border-[#12304A] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F8FAFC] uppercase text-[11px] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" />
                <span>Publish New Immutable Version</span>
              </span>
              <span className="text-[10px] text-[#7D8EA5]">
                Current Active: {strategy.active_version || "v1.0.0"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-[#7D8EA5] block mb-1">New Version (SemVer)</label>
                <input
                  type="text"
                  value={newVersionInput}
                  onChange={(e) => setNewVersionInput(e.target.value)}
                  className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2.5 text-xs text-[#22D3EE] font-bold focus:outline-none"
                  placeholder="e.g. 1.1.0"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] text-[#7D8EA5] block mb-1">Change Notes / Rationale</label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  className="w-full h-8 bg-[#0A1422] border border-[#12304A] rounded px-2.5 text-xs text-[#F8FAFC] focus:outline-none"
                  placeholder="Describe strategy rule or risk adjustments..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <QosButton
                variant="primary"
                size="sm"
                onClick={() => publishMutation.mutate()}
                isLoading={publishMutation.isPending}
                className="gap-1.5 font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save Version Snapshot</span>
              </QosButton>
            </div>
          </div>

          {/* Diff Viewer Card */}
          <div className="p-3.5 rounded-xl bg-[#0C1727] border border-[#12304A] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F8FAFC] uppercase text-[11px]">
                Visual Version Diff
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={vOld}
                  onChange={(e) => setVOld(e.target.value)}
                  className="h-7 bg-[#0A1422] border border-[#12304A] rounded px-2 text-[11px] text-[#7D8EA5]"
                >
                  <option value="1.0.0">v1.0.0</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.version_semver}>
                      {v.version_semver}
                    </option>
                  ))}
                </select>
                <span className="text-[#7D8EA5]">vs</span>
                <select
                  value={vNew}
                  onChange={(e) => setVNew(e.target.value)}
                  className="h-7 bg-[#0A1422] border border-[#12304A] rounded px-2 text-[11px] text-[#22D3EE] font-bold"
                >
                  <option value="1.1.0">v1.1.0</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.version_semver}>
                      {v.version_semver}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              {diffData?.differences && diffData.differences.length > 0 ? (
                diffData.differences.map((diff, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-[#0A1422] border border-[#12304A] flex items-center justify-between text-[11px]"
                  >
                    <span className="text-[#7D8EA5]">{diff.field}:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#FF3B5C] line-through">{String(diff.old)}</span>
                      <ArrowRight className="h-3 w-3 text-[#7D8EA5]" />
                      <span className="text-[#00E89A] font-bold">{String(diff.new)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-[#0A1422] border border-dashed border-[#12304A] text-center text-[#7D8EA5] text-[11px]">
                  No breaking differences between selected versions.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
