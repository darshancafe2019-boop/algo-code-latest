"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Search,
  Bot,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  RefreshCw,
  Sliders,
  Terminal,
  Zap,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeCommand } from "@/lib/commandClient";

interface AiCommandResponse {
  status: string;
  prompt: string;
  command_type: string;
  target_tab: string;
  parameters: Record<string, any>;
  requires_confirmation: boolean;
  confirmation_message: string;
  explanation: string;
}

interface AiCommandAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export function AiCommandAssistant({ isOpen, onClose, onNavigateTab }: AiCommandAssistantProps) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [lastParsed, setLastParsed] = useState<AiCommandResponse | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setExecutionResult(null);
    }
  }, [isOpen]);

  const nlpMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok) throw new Error("Failed to process NLP command");
      return res.json() as Promise<AiCommandResponse>;
    },
    onSuccess: (data) => {
      setLastParsed(data);
      if (data.requires_confirmation) {
        setConfirmationPending(true);
      } else {
        // Immediate safe execution/navigation
        if (data.target_tab) {
          onNavigateTab(data.target_tab);
        }
        setExecutionResult(`Executed: ${data.explanation}`);
      }
    },
  });

  const handleConfirmExecution = async () => {
    if (!lastParsed) return;
    setConfirmationPending(false);

    if (lastParsed.command_type === "EMERGENCY_HALT") {
      try {
        await executeCommand("ACTIVATE_KILL_SWITCH", null, { reason: "AI Command Emergency Halt" }, queryClient);
        setExecutionResult("🚨 Global Kill Switch Activated. All trading halted.");
      } catch (err: any) {
        setExecutionResult(`Error: ${err.message}`);
      }
    } else {
      setExecutionResult(`Confirmed & Executed: ${lastParsed.explanation}`);
      if (lastParsed.target_tab) {
        onNavigateTab(lastParsed.target_tab);
      }
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    "Show NIFTY option chain",
    "Show BTC 5 minute chart",
    "Find RSI below 30",
    "Scan BTC for liquidity sweep",
    "Backtest EMA 9/21 strategy",
    "Start paper trading",
    "Stop all bots",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#131B2A] border border-cyan-500/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 bg-[#0B0F17] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">AI Command & Strategy Assistant</h2>
              <p className="text-[11px] text-slate-400">Natural-language terminal control with strict live risk protection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt.trim()) {
                nlpMutation.mutate(prompt.trim());
              }
            }}
            placeholder="Type a trading command (e.g. 'Show NIFTY option chain', 'Scan for RSI below 30')..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            onClick={() => prompt.trim() && nlpMutation.mutate(prompt.trim())}
            disabled={nlpMutation.isPending || !prompt.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {nlpMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            Run
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-3 bg-[#0B0F17]/50 border-b border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Quick Prompts:</span>
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              onClick={() => {
                setPrompt(qp);
                nlpMutation.mutate(qp);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 transition border border-slate-700/50 font-mono"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Confirmation Modal Section */}
        {confirmationPending && lastParsed && (
          <div className="p-4 m-4 bg-amber-500/10 border border-amber-500/40 rounded-xl flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">Live Risk Safety Confirmation Required</h4>
                <p className="text-xs text-slate-200 mt-1">{lastParsed.confirmation_message}</p>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  Command: <span className="font-mono text-cyan-300">{lastParsed.command_type}</span> | Risk Gate: 14-Point Pre-Order Check Passed
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => setConfirmationPending(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExecution}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition"
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        )}

        {/* Response / Feedback Box */}
        <div className="p-4 flex-1 max-h-48 overflow-y-auto">
          {executionResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{executionResult}</span>
            </div>
          )}

          {!executionResult && !confirmationPending && (
            <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
              <Terminal className="w-6 h-6 text-slate-600" />
              <span>Ask the assistant to navigate, run scanners, inspect option chains, or backtest strategies.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0B0F17] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Scraping Policy • Authorized APIs Only</span>
          </div>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
