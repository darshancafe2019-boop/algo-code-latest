"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Bot,
  Terminal,
  Send,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Square,
  AlertOctagon,
  Wrench,
  Activity,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowRight,
  Zap,
  Layers,
  Database,
  Cpu,
} from "lucide-react";
import { executeCommand } from "@/lib/commandClient";

interface BotAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageItem {
  id: string;
  sender: "user" | "copilot";
  text: string;
  action?: string;
  success?: boolean;
  details?: any;
  timestamp: string;
}

export function BotAssistantModal({ isOpen, onClose }: BotAssistantModalProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "msg-init",
      sender: "copilot",
      text: "👋 Hello! I am your Quant.OS Next.js Bot Copilot. I can execute commands across your fleet, diagnose operational anomalies, and autonomously self-heal errors.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener (Cmd+J / Ctrl+J or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleExecuteQuery = async (inputQuery: string) => {
    const trimmed = inputQuery.trim();
    if (!trimmed) return;

    const timeStr = new Date().toLocaleTimeString();
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: trimmed, timestamp: timeStr },
    ]);
    setQuery("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/bot-copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();

      const copilotMsgId = `copilot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: copilotMsgId,
          sender: "copilot",
          text: data.explanation || "Command executed successfully.",
          action: data.action,
          success: data.success,
          details: data.command_result,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // Invalidate relevant cache queries
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
      queryClient.invalidateQueries({ queryKey: ["selfHealingTelemetry"] });
      queryClient.invalidateQueries({ queryKey: ["systemHealthStatus"] });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `copilot-err-${Date.now()}`,
          sender: "copilot",
          text: `Command execution encountered an error: ${err.message}`,
          success: false,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickActionPrompts = [
    { label: "🚀 Start All Bots", prompt: "start all bots" },
    { label: "✨ Self-Heal Fleet", prompt: "self heal fleet and resolve errors" },
    { label: "⏸️ Pause Active Bots", prompt: "pause all bots" },
    { label: "🔄 Reconcile Ledger", prompt: "reconcile account and open trades" },
    { label: "🛡️ Conservative Risk", prompt: "apply conservative risk profile" },
    { label: "🧹 Clear Cache", prompt: "purge cache and refresh market" },
    { label: "📊 Run Diagnostics", prompt: "run platform diagnostics" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans select-none">
      <div className="bg-[#0B131E] border border-cyan-800/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[640px]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#1E293B] bg-[#070D14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-700 text-white shadow-md shadow-cyan-950/50">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Quant.OS Bot Copilot & Autonomous Controller
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  AI ORCHESTRATOR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Execute natural language commands, diagnose platform issues, and trigger autonomous error self-healing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 bg-[#0B131E] px-2 py-1 rounded border border-[#1E293B] hidden sm:inline">
              Ctrl+J / Cmd+J
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "copilot" && (
                <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 space-y-2 shadow-md ${
                  msg.sender === "user"
                    ? "bg-cyan-600 text-white rounded-tr-none font-medium"
                    : "bg-[#070D14] border border-[#1E293B] text-slate-200 rounded-tl-none font-sans"
                }`}
              >
                <div className="leading-relaxed text-xs">{msg.text}</div>

                {msg.action && (
                  <div className="p-2 rounded-xl bg-[#0B131E] border border-cyan-900/50 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">Action: {msg.action}</span>
                      <span
                        className={`text-[9px] px-2 py-0.2 rounded font-bold ${
                          msg.success
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {msg.success ? "SUCCEEDED" : "FAILED"}
                      </span>
                    </div>
                    {msg.details?.message && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {msg.details.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[9px] text-slate-400/80 text-right font-mono">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono p-2 bg-[#070D14] rounded-xl border border-[#1E293B] w-max animate-pulse">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing intent & dispatching via CommandBus...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Prompt Chips */}
        <div className="p-2.5 bg-[#070D14] border-t border-[#1E293B] flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-mono uppercase font-bold mr-1">Quick:</span>
          {quickActionPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleExecuteQuery(q.prompt)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-[#0B131E] hover:bg-slate-800 border border-[#1E293B] hover:border-cyan-500/40 text-slate-300 hover:text-white text-[11px] font-medium transition flex items-center gap-1"
            >
              <span>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteQuery(query);
          }}
          className="p-3 bg-[#05090F] border-t border-[#1E293B] flex items-center gap-2"
        >
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command (e.g. 'start all bots', 'self heal', 'apply conservative risk', 'reconcile ledger')..."
            className="flex-1 bg-[#0B131E] border border-[#1E293B] focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
          />
          <button
            type="submit"
            disabled={isProcessing || !query.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Execute</span>
          </button>
        </form>
      </div>
    </div>
  );
}
