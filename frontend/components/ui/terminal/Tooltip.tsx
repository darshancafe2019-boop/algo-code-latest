"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

export interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
  source?: string;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  title,
  source,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children || (
        <button
          type="button"
          className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5"
        >
          <Info className="w-3 h-3" />
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 rounded-lg bg-[#0A1426] border border-[#1F3150] shadow-2xl z-50 text-left text-xs font-sans text-slate-200 pointer-events-none backdrop-blur-md ${className}`}
        >
          {title && (
            <div className="font-mono font-bold text-[11px] text-cyan-300 uppercase tracking-wide border-b border-[#162238] pb-1 mb-1.5">
              {title}
            </div>
          )}
          <div className="text-[11px] text-slate-300 leading-relaxed">{content}</div>
          {source && (
            <div className="mt-1.5 pt-1 border-t border-[#162238] text-[9px] font-mono text-slate-500">
              Source: <span className="text-slate-400">{source}</span>
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#0A1426]" />
        </div>
      )}
    </div>
  );
};
