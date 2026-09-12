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
        className={`w-full text-left border-collapse font-sans text-xs ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function EcoTableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={`border-b border-[#122033] bg-[#07101A] text-[10px] text-[#52627A] uppercase tracking-wider font-semibold sticky top-0 backdrop-blur-md ${className}`}>
      {children}
    </thead>
  );
}

export function EcoTableBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tbody className={`divide-y divide-[#122033] text-[#F7FAFC] ${className}`}>{children}</tbody>;
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
      className={`hover:bg-[#101B2D] transition-colors duration-100 ${
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
  return <td className={`py-2.5 px-3 ${alignClass} ${className}`}>{children}</td>;
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
  return <th className={`py-2.5 px-3 font-semibold ${alignClass} ${className}`}>{children}</th>;
}
