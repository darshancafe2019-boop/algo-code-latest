"use client";

import React from "react";
import {
  CheckCircle2,
  Circle,
  Play,
  ChevronRight,
  Clock,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { CheckpointItem, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface WorkflowStepperProps {
  checkpoints: CheckpointItem[];
  currentStage: CheckpointItem;
  onTriggerStage: (stageId: string) => void;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
  isLoading: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  checkpoints,
  currentStage,
  onTriggerStage,
  onOpenDrawer,
  isLoading,
}) => {
  const currentIndex = checkpoints.findIndex((c) => c.id === currentStage?.id);
  const safeIndex = currentIndex >= 0 ? currentIndex : 3;

  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl p-3 sm:p-4 shadow-lg select-none backdrop-blur">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#00D4FF]" />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            TODAY&apos;S AUTOMATED WORKFLOW
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[11px] font-mono text-slate-400">
            Current Stage:{" "}
            <span className="text-[#00D4FF] font-bold uppercase">{currentStage?.name}</span>
          </span>
          <button
            onClick={() => onOpenDrawer("workflow_schedule", "Automated 6-Checkpoint Schedule & Controls")}
            className="flex items-center gap-1 text-[11px] font-bold text-[#00D4FF] hover:text-white px-2.5 py-1 rounded bg-[#07192f] border border-[#143e69] hover:bg-[#0c284a] transition-all cursor-pointer"
          >
            <Layers className="h-3 w-3" />
            VIEW SCHEDULE DETAILS
          </button>
        </div>
      </div>

      {/* 6-Stage Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {checkpoints.map((cp, idx) => {
          const isDone = idx < safeIndex || cp.lastStatus === "SUCCESS";
          const isActive = idx === safeIndex || cp.lastStatus === "RUNNING";
          const isPending = idx > safeIndex;

          return (
            <div
              key={cp.id}
              onClick={() => onTriggerStage(cp.id)}
              className={cn(
                "relative rounded-lg p-2.5 border transition-all cursor-pointer flex flex-col justify-between group",
                isActive
                  ? "bg-[#092547] border-[#00D4FF] shadow-md shadow-[#00D4FF]/20"
                  : isDone
                  ? "bg-[#07192e] border-emerald-500/40 hover:border-emerald-400"
                  : "bg-[#040f1f] border-[#103050] opacity-75 hover:opacity-100 hover:border-[#1a4a7a]"
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  0{idx + 1}
                </span>
                {isActive ? (
                  <span className="h-2 w-2 rounded-full bg-[#00D4FF] animate-ping" />
                ) : isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Circle className="h-3 w-3 text-slate-600" />
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-100 group-hover:text-[#00D4FF] transition-colors line-clamp-1">
                  {cp.stage}
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-[#00D4FF]" />
                  <span>{cp.timeRange}</span>
                </div>
              </div>

              {isActive && (
                <div className="mt-2 text-[9px] font-mono font-bold uppercase text-[#00D4FF] bg-[#00D4FF]/10 py-0.5 px-1 rounded text-center">
                  ● ACTIVE NOW
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
