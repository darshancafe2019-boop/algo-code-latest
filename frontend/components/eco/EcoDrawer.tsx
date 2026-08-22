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
    right: "right-0 top-0 bottom-0 w-full max-w-md border-l",
    left: "left-0 top-0 bottom-0 w-full max-w-md border-r",
    bottom: "left-0 right-0 bottom-0 max-h-[80vh] border-t rounded-t-3xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#07110D]/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className={`fixed bg-[#0D1914] border-[#294238] shadow-2xl flex flex-col z-50 text-[#E8F3EC] animate-in slide-in-from-right duration-200 ${sideClasses[side]} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1B3328] flex items-center justify-between bg-[#0B1F17]/60">
          <div>
            <h3 className="text-sm font-bold text-[#E8F3EC]">{title}</h3>
            {subtitle && <p className="text-xs text-[#A8BDB0]/80 mt-0.5">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#70877A] hover:text-[#E8F3EC] hover:bg-[#12221B] border border-transparent hover:border-[#294238] transition-all"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}
