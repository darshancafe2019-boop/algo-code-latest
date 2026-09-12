"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProviderBadge } from "@/components/ui/ProviderBadge";

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  category?: string;
  status?: string;
  provider?: string;
  children?: React.ReactNode;
  metadata?: Record<string, any>;
  rawJson?: any;
  actions?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

export function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  category,
  status,
  provider,
  children,
  metadata,
  rawJson,
  actions,
  width = "md",
}: DetailDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyJson = () => {
    if (!rawJson) return;
    navigator.clipboard.writeText(JSON.stringify(rawJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const widthClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div
          className={cn(
            "w-screen bg-[#0E1624] border-l border-[#213047] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200",
            widthClasses[width]
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#0A101C] border-b border-[#213047] flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                {category && (
                  <span className="text-[10px] font-mono font-bold text-[#22C7E8] uppercase tracking-wider bg-[#22C7E8]/10 px-1.5 py-0.2 rounded border border-[#22C7E8]/30">
                    {category}
                  </span>
                )}
                {provider && <ProviderBadge provider={provider} size="sm" />}
                {status && <StatusBadge status={status} size="sm" />}
              </div>
              <h3 className="text-sm font-bold font-mono text-[#F4F7FA] truncate mt-1">
                {title}
              </h3>
              {subtitle && <p className="text-[11px] font-mono text-[#7C8CA3] truncate">{subtitle}</p>}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#7C8CA3] hover:text-white hover:bg-[#121C2C] transition-colors cursor-pointer shrink-0"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4 font-mono text-xs select-text">
            {children}

            {/* Structured Metadata Grid if provided */}
            {metadata && Object.keys(metadata).length > 0 && (
              <div className="rounded-lg bg-[#0A101C] border border-[#213047] p-3 space-y-2">
                <h5 className="text-[11px] font-bold text-[#7C8CA3] uppercase tracking-wider">
                  Telemetry & Attributes
                </h5>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(metadata).map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[#52627A] text-[10px] uppercase truncate">{k}</span>
                      <span className="text-[#F4F7FA] font-medium truncate tabular-nums">
                        {v !== undefined && v !== null ? String(v) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Inspector */}
            {rawJson && (
              <div className="rounded-lg bg-[#070B14] border border-[#213047] overflow-hidden">
                <div className="px-3 py-1.5 bg-[#0A101C] border-b border-[#213047] flex items-center justify-between">
                  <span className="text-[10px] text-[#52627A] font-bold uppercase tracking-wider">
                    Raw Payload
                  </span>
                  <button
                    type="button"
                    onClick={copyJson}
                    className="flex items-center gap-1 text-[10px] text-[#22C7E8] hover:text-[#22C7E8]/80 cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-[#22C983]" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy JSON"}</span>
                  </button>
                </div>
                <pre className="p-3 text-[11px] text-[#7C8CA3] overflow-x-auto max-h-60 leading-relaxed font-mono">
                  {JSON.stringify(rawJson, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {actions && (
            <div className="p-3 bg-[#0A101C] border-t border-[#213047] flex items-center justify-end gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
