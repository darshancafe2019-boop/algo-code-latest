"use client";

import React, { useState } from "react";
import {
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export interface CheckpointData {
  checkpoint_id: string;
  name: string;
  description: string;
  scheduled_time: string;
  timezone: string;
  is_enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  last_status: string;
  last_duration_sec: number;
  last_result_summary: string;
}

interface DailyWorkflowCardsProps {
  checkpoints: CheckpointData[];
  onTriggerCheckpoint: (checkpointId: string) => void;
  onToggleCheckpoint: (checkpointId: string, enabled: boolean) => void;
  onUpdateTime: (checkpointId: string, time: string) => void;
  isLoading: boolean;
}

export const DailyWorkflowCards: React.FC<DailyWorkflowCardsProps> = ({
  checkpoints,
  onTriggerCheckpoint,
  onToggleCheckpoint,
  onUpdateTime,
  isLoading,
}) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<CheckpointData | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [timeInput, setTimeInput] = useState<string>("");

  const formatTimeDisplay = (isoStr: string | null) => {
    if (!isoStr) return "—";
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          Daily Automated Trading Checkpoints
        </h2>
        <span className="text-xs font-mono text-slate-400">
          Timezone: <span className="text-cyan-400 font-semibold">Asia/Kolkata (IST)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {checkpoints.map((cp) => {
          const isSuccess = cp.last_status === "SUCCESS";
          const isFailed = cp.last_status === "FAILED";
          const isRunning = cp.last_status === "RUNNING";

          return (
            <div
              key={cp.checkpoint_id}
              className={`bg-[#0B0E17]/90 border rounded-xl p-3 flex flex-col justify-between transition-all hover:border-cyan-500/40 relative group ${
                !cp.is_enabled
                  ? "border-slate-800/60 opacity-60"
                  : isSuccess
                  ? "border-emerald-500/30"
                  : isFailed
                  ? "border-rose-500/40"
                  : "border-[#1A2A3F]"
              }`}
            >
              {/* Header: Title and Toggle */}
              <div>
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-slate-100 tracking-tight leading-snug line-clamp-1">
                    {cp.name}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cp.is_enabled}
                      onChange={(e) => onToggleCheckpoint(cp.checkpoint_id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {/* Scheduled Time & Status */}
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  {editingTimeId === cp.checkpoint_id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={timeInput}
                        onChange={(e) => setTimeInput(e.target.value)}
                        placeholder="HH:MM"
                        className="w-14 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-[11px] text-white"
                      />
                      <button
                        onClick={() => {
                          onUpdateTime(cp.checkpoint_id, timeInput);
                          setEditingTimeId(null);
                        }}
                        className="text-[10px] bg-cyan-600 px-1.5 py-0.5 rounded text-white"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => {
                        setEditingTimeId(cp.checkpoint_id);
                        setTimeInput(cp.scheduled_time);
                      }}
                      className="text-cyan-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      title="Click to edit scheduled time"
                    >
                      <Clock className="h-3 w-3" />
                      {cp.scheduled_time} IST
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                      isSuccess
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : isFailed
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : isRunning
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse"
                        : "bg-slate-800/60 border-slate-700 text-slate-400"
                    }`}
                  >
                    {cp.last_status}
                  </span>
                </div>

                {/* Telemetry info */}
                <div className="space-y-1 text-[11px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Run:</span>
                    <span className="text-slate-200">{formatTimeDisplay(cp.last_run)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Next Run:</span>
                    <span className="text-slate-300">{formatTimeDisplay(cp.next_run)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setSelectedCheckpoint(cp)}
                  className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-0.5 font-semibold"
                >
                  Inspect
                  <ChevronRight className="h-3 w-3" />
                </button>

                <button
                  onClick={() => onTriggerCheckpoint(cp.checkpoint_id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 bg-cyan-600/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded text-[11px] font-bold transition-all"
                  title="Run now"
                >
                  <Play className="h-3 w-3" />
                  Run
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill-down Modal */}
      {selectedCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0D121F] border border-[#1A2A3F] rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Layers className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedCheckpoint.name}</h3>
                  <span className="text-xs font-mono text-cyan-400">
                    {selectedCheckpoint.scheduled_time} ({selectedCheckpoint.timezone})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCheckpoint(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="font-semibold text-slate-400 block mb-1">Description:</span>
                <p className="bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed">
                  {selectedCheckpoint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">LAST EXECUTION</span>
                  <span className="text-slate-200 font-bold">{selectedCheckpoint.last_run || "Never"}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">DURATION</span>
                  <span className="text-slate-200 font-bold">{selectedCheckpoint.last_duration_sec}s</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-400 block mb-1">Latest Result Summary:</span>
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-slate-300">
                  {selectedCheckpoint.last_result_summary || "No recent execution recorded."}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  onTriggerCheckpoint(selectedCheckpoint.checkpoint_id);
                  setSelectedCheckpoint(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                <Play className="h-3.5 w-3.5" />
                Trigger Checkpoint Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
