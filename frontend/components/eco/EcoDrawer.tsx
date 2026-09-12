"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface EcoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
}

export function EcoDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  side = "right",
  className = "",
}: EcoDrawerProps) {
  // Close on Escape key
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

  const sideClasses = {
    right: "right-0 top-0 bottom-0 w-full max-w-md border-l border-[#1A2A3F]",
    left: "left-0 top-0 bottom-0 w-full max-w-md border-r border-[#1A2A3F]",
    bottom: "left-0 right-0 bottom-0 max-h-[80vh] border-t border-[#1A2A3F] rounded-t-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`fixed bg-[#0A1422] shadow-2xl flex flex-col z-50 text-[#F7FAFC] animate-in slide-in-from-right duration-200 ${sideClasses[side]} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#122033] flex items-center justify-between bg-[#07101A]">
          <div>
            <h3 className="text-sm font-bold text-[#F7FAFC] uppercase tracking-wide">{title}</h3>
            {subtitle && <p className="text-xs text-[#7C8CA3] mt-0.5">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D] border border-transparent hover:border-[#1A2A3F] transition-all cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}
