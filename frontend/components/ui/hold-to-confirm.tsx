"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

interface HoldToConfirmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onConfirmed: () => void;
  holdDurationMs?: number;
  label: string;
  confirmingLabel?: string;
  variant?: "danger" | "warning" | "live";
}

export function HoldToConfirmButton({
  onConfirmed,
  holdDurationMs = 1500,
  label,
  confirmingLabel = "HOLDING TO CONFIRM...",
  variant = "danger",
  className,
  disabled,
  ...props
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startHold = () => {
    if (disabled) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();

    const update = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / holdDurationMs) * 100);
      setProgress(pct);

      if (pct >= 100) {
        setIsHolding(false);
        setProgress(0);
        startTimeRef.current = null;
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        onConfirmed();
      } else {
        timerRef.current = requestAnimationFrame(update);
      }
    };

    timerRef.current = requestAnimationFrame(update);
  };

  const cancelHold = () => {
    setIsHolding(false);
    setProgress(0);
    startTimeRef.current = null;
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const variantStyles = {
    danger: "border-[var(--theme-loss)]/60 bg-[var(--theme-loss)]/20 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/30",
    warning: "border-amber-500/60 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30",
    live: "border-[var(--theme-loss)] bg-[var(--theme-loss)] text-white font-bold hover:brightness-110",
  };

  const progressBg = {
    danger: "bg-[var(--theme-loss)]",
    warning: "bg-amber-500",
    live: "bg-white/30",
  };

  return (
    <button
      type="button"
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-bold border transition-all select-none active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Progress Bar Background */}
      {progress > 0 && (
        <div
          className={cn("absolute left-0 top-0 bottom-0 opacity-40 transition-none pointer-events-none", progressBg[variant])}
          style={{ width: `${progress}%` }}
        />
      )}

      <ShieldAlert className="h-3.5 w-3.5 relative z-10" />
      <span className="relative z-10">{isHolding ? confirmingLabel : label}</span>
    </button>
  );
}
