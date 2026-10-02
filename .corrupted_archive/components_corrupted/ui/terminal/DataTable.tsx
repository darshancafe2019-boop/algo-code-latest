"use client";

import React from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  stickyHeader?: boolean;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = "No records found.",
  className = "",
  compact = true,
  stickyHeader = true,
  sortKey,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-[#162238] bg-[#07101F] ${className}`}>
      <table className="w-full text-left border-collapse font-sans text-xs">
        {/* Table Header */}
        <thead
          className={`bg-[#050B18] text-slate-400 font-mono uppercase text-[11px] tracking-wider border-b border-[#162238] ${
            stickyHeader ? "sticky top-0 z-10 backdrop-blur-md" : ""
          }`}
        >
          <tr>
            {columns.map((col) => {
              const alignClass =
                col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
              const isSorted = sortKey === col.key;

              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  className={`${compact ? "py-2 px-3" : "py-2.5 px-4"} font-bold select-none ${alignClass} ${
                    col.sortable ? "cursor-pointer hover:text-cyan-400 transition-colors" : ""
                  } ${col.className || ""}`}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 ${
                      col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-500">
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-cyan-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[#162238]/60 text-slate-200">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-slate-400 font-mono">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Loading market records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-slate-500 font-mono">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key = keyExtractor(row, index);
              const isClickable = Boolean(onRowClick);

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors duration-100 ${
                    index % 2 === 0 ? "bg-[#07101F]" : "bg-[#050B18]/40"
                  } ${
                    isClickable
                      ? "cursor-pointer hover:bg-[#0A1426] hover:text-white"
                      : "hover:bg-[#0A1426]/50"
                  }`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";

                    return (
                      <td
                        key={col.key}
                        className={`${compact ? "py-1.5 px-3" : "py-2 px-4"} ${alignClass} ${col.className || ""}`}
                      >
                        {col.render ? col.render(row, index) : (row as any)[col.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
