"use client";

import React from "react";

interface EcoTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  className?: string;
}

export function EcoTable({ children, className = "", ...props }: EcoTableProps) {
  return (
    <div className="overflow-x-auto w-full">
      <table
        className={`w-full text-left border-collapse font-mono text-xs ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function EcoTableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={`border-b border-[#1B3328] bg-[#0B1F17]/60 text-[10px] text-[#70877A] uppercase tracking-wider sticky top-0 backdrop-blur-md ${className}`}>
      {children}
    </thead>
  );
}

export function EcoTableBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tbody className={`divide-y divide-[#12221B] text-[#E8F3EC] ${className}`}>{children}</tbody>;
}

export function EcoTableRow({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-[#12221B]/70 transition-colors duration-100 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function EcoTableCell({
  children,
  className = "",
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${alignClass} ${className}`}>{children}</td>;
}

export function EcoTableHeadCell({
  children,
  className = "",
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 font-bold ${alignClass} ${className}`}>{children}</th>;
}
