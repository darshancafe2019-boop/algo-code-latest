"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useUIStore } from "@/lib/store/useUIStore";

const TIMEFRAMES = [
  { value: "1m", label: "1m", group: "Scalp" },
  { value: "3m", label: "3m", group: "Scalp" },
  { value: "5m", label: "5m", group: "Intraday" },
  { value: "15m", label: "15m", group: "Intraday" },
  { value: "30m", label: "30m", group: "Intraday" },
  { value: "1h", label: "1H", group: "Swing" },
  { value: "4h", label: "4H", group: "Swing" },
  { value: "1d", label: "1D", group: "Macro" },
];

export const HeaderTimeframeSelector = memo(function HeaderTimeframeSelector() {
  const { activeTimeframe, setActiveTimeframe } = useActiveBot();
  const { setActiveTimeframe: setUIStoreTimeframe } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTimeframe = (activeTimeframe || "5m").toLowerCase();

  const handleSelect = (tf: string) => {
    setActiveTimeframe(tf);
    setUIStoreTimeframe(tf);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentDisplay = TIMEFRAMES.find((t) => t.value === currentTimeframe)?.label || currentTimeframe.toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Select chart timeframe, current: ${currentDisplay}`}
        aria-expanded={isOpen}
        className="flex items-center gap-1 bg-[var(--theme-elevated)]/70 hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] hover:border-slate-500/40 rounded-lg px-2 py-1 text-xs font-mono transition-all cursor-pointer group shadow-xs active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500"
        title="Select Candlestick Timeframe"
      >
        <span className="text-slate-200 font-bold group-hover:text-white transition-colors">
          {currentDisplay}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-200 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-1.5 shadow-2xl w-36 flex flex-col gap-0.5 text-xs font-mono backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-[var(--theme-border-subtle)] mb-0.5">
            Timeframes
          </div>
          {TIMEFRAMES.map((tf) => {
            const isSelected = tf.value === currentTimeframe;
            return (
              <button
                key={tf.value}
                type="button"
                onClick={() => handleSelect(tf.value)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30"
                    : "text-slate-300 hover:text-white hover:bg-[var(--theme-elevated)]"
                }`}
              >
                <span>{tf.label}</span>
                <span className="text-[10px] text-slate-400">{tf.group}</span>
                {isSelected && <Check className="h-3 w-3 text-sky-400 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
