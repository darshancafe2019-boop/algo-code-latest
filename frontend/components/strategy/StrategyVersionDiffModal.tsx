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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#0B131E] border border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden font-sans select-none flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#070D14] border-b border-[#172234]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Strategy Version Lineage & Visual Diff
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                  Immutable Snapshots
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Track modifications, publish frozen versions, and inspect parameter diffs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#111C2E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Publish New Version Section */}
          <div className="p-4 rounded-2xl bg-[#070D14] border border-[#172234] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Publish & Lock Immutable Version</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                Current: {strategy.active_version || "v1.0.0"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Version SemVer</label>
                <input
                  type="text"
                  value={newVersionInput}
                  onChange={(e) => setNewVersionInput(e.target.value)}
                  placeholder="e.g. 1.1.0"
                  className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Change Summary</label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="Describe modifications made in this version..."
                  className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending || !newVersionInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{publishMutation.isPending ? "Publishing..." : "Publish & Lock Version"}</span>
              </button>
            </div>

            {publishMutation.isSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Version successfully published and frozen in database.</span>
              </div>
            )}

            {publishMutation.isError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{(publishMutation.error as Error)?.message}</span>
              </div>
            )}
          </div>

          {/* Version Diff Comparison Section */}
          <div className="p-4 rounded-2xl bg-[#070D14] border border-[#172234] space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-purple-400" />
              <span>Version Comparison & Diff Inspector</span>
            </h4>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Compare Base:</span>
                <select
                  value={vOld}
                  onChange={(e) => setVOld(e.target.value)}
                  className="bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-200 font-mono font-bold focus:outline-none"
                >
                  <option value="1.0.0">v1.0.0 (Seed)</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.version_semver}>
                      v{v.version_semver}
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">Target Version:</span>
                <select
                  value={vNew}
                  onChange={(e) => setVNew(e.target.value)}
                  className="bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-200 font-mono font-bold focus:outline-none"
                >
                  <option value="1.1.0">v1.1.0</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.version_semver}>
                      v{v.version_semver}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diff Results List */}
            {diffData?.differences && diffData.differences.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#172234]">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  {diffData.differences.length} Structural Modifications Detected
                </h5>
                <div className="space-y-1.5">
                  {diffData.differences.map((diff, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0B131E] border border-[#1E293B] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                          {diff.category}
                        </span>
                        <span className="text-slate-200 font-bold">{diff.field}:</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-rose-400 line-through">{String(diff.old)}</span>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        <span className="text-emerald-400 font-bold">{String(diff.new)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diffData && diffData.differences?.length === 0 && (
              <div className="p-3 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Versions {vOld} and {vNew} have identical rule logic and parameters.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#070D14] border-t border-[#172234] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#111C2E] hover:bg-[#18263E] text-slate-300 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
