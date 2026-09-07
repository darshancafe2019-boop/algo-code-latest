"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ArrowUpDown, Search } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  groupHeader?: string;
  align?: "left" | "center" | "right";
  width?: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface InstitutionalDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  selectedRowKey?: string | null;
  isLoading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  className?: string;
  tableClassName?: string;
  maxHeight?: string;
  compact?: boolean;
  toolbarRight?: React.ReactNode;
}

export function InstitutionalDataTable<T extends Record<string, any>>({
  data = [],
  columns,
  keyExtractor = (row, idx) => (row.id ? String(row.id) : String(idx)),
  onRowClick,
  selectedRowKey,
  isLoading = false,
  emptyMessage = "No data records available.",
  searchable = false,
  searchPlaceholder = "Search table...",
  searchFilter,
  className,
  tableClassName,
  maxHeight = "calc(100vh - 280px)",
  compact = true,
  toolbarRight,
}: InstitutionalDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const hasGroupHeaders = useMemo(
    () => columns.some((c) => Boolean(c.groupHeader)),
    [columns]
  );

  // Grouped headers calculation
  const headerGroups = useMemo(() => {
    if (!hasGroupHeaders) return null;
    const groups: { title: string; colSpan: number }[] = [];
    let currentGroup: string | null = null;
    let count = 0;

    columns.forEach((col) => {
      const g = col.groupHeader || "";
      if (g === currentGroup) {
        count++;
      } else {
        if (currentGroup !== null) {
          groups.push({ title: currentGroup, colSpan: count });
        }
        currentGroup = g;
        count = 1;
      }
    });
    if (currentGroup !== null) {
      groups.push({ title: currentGroup, colSpan: count });
    }
    return groups;
  }, [columns, hasGroupHeaders]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else {
        setSortKey(null);
        setSortDir("desc");
      }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const processedData = useMemo(() => {
    let list = Array.isArray(data) ? [...data] : [];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (searchFilter) {
        list = list.filter((item) => searchFilter(item, q));
      } else {
        list = list.filter((item) =>
          Object.values(item).some((val) =>
            String(val || "")
              .toLowerCase()
              .includes(q)
          )
        );
      }
    }

    // Sorting
    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        return sortDir === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [data, searchQuery, searchFilter, sortKey, sortDir]);

  return (
    <div className={cn("flex flex-col w-full bg-[#0A101C] rounded-lg border border-[#213047] overflow-hidden", className)}>
      {/* Optional Search / Controls Bar */}
      {(searchable || toolbarRight) && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#0E1624] border-b border-[#213047]">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-[#101827] border border-[#213047] rounded-md pl-8 pr-3 py-1 text-xs text-[#F4F7FA] placeholder-[#64748B] focus:outline-none focus:border-[#22C7E8] font-mono transition-colors"
              />
            </div>
          )}
          {toolbarRight && <div className="flex items-center gap-2 ml-auto shrink-0">{toolbarRight}</div>}
        </div>
      )}

      {/* Main Table Scroll Container */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
        <table className={cn("w-full border-collapse text-left select-text", tableClassName)}>
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10 bg-[#0E1624] border-b border-[#213047] text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] select-none">
            {/* Group headers row if present */}
            {hasGroupHeaders && headerGroups && (
              <tr className="border-b border-[#213047]/60">
                {headerGroups.map((g, idx) => (
                  <th
                    key={idx}
                    colSpan={g.colSpan}
                    className={cn(
                      "px-3 py-1.5 font-mono text-[10px] text-center tracking-widest uppercase border-r border-[#213047]/40 last:border-none",
                      g.title ? "bg-[#121C2C]/70 text-[#22C7E8]" : "bg-transparent text-transparent"
                    )}
                  >
                    {g.title}
                  </th>
                ))}
              </tr>
            )}

            {/* Main Columns Header */}
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      "px-3 font-mono font-medium tracking-tight whitespace-nowrap",
                      compact ? "py-2 text-[11px]" : "py-2.5 text-xs",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.sortable && "cursor-pointer hover:text-[#F4F7FA] hover:bg-[#121C2C]/50 transition-colors",
                      col.headerClassName
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex items-center gap-1",
                        col.align === "right" && "justify-end",
                        col.align === "center" && "justify-center"
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-[#64748B]">
                          {isSorted ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[#22C7E8]" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-[#22C7E8]" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
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
          <tbody className="divide-y divide-[#213047]/40 text-xs text-[#F4F7FA]">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 font-mono text-xs">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-[#22C7E8] border-t-transparent animate-spin" />
                    <span>Streaming institutional table data...</span>
                  </div>
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              processedData.map((row, rowIdx) => {
                const rowKey = keyExtractor(row, rowIdx);
                const isSelected = selectedRowKey === rowKey;

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row, rowIdx)}
                    className={cn(
                      "transition-colors duration-100 font-mono",
                      rowIdx % 2 === 0 ? "bg-[#070B14]/40" : "bg-[#0A101C]",
                      onRowClick && "cursor-pointer hover:bg-[#121C2C]/90",
                      isSelected && "bg-[#22C7E8]/10 border-l-2 border-l-[#22C7E8]"
                    )}
                  >
                    {columns.map((col) => {
                      const cellValue = col.render
                        ? col.render(row, rowIdx)
                        : row[col.key] !== undefined && row[col.key] !== null
                        ? String(row[col.key])
                        : "—";

                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-3 whitespace-nowrap",
                            compact ? "py-1.5 text-[11px]" : "py-2 text-xs",
                            col.align === "right"
                              ? "text-right tabular-nums"
                              : col.align === "center"
                              ? "text-center"
                              : "text-left",
                            col.className
                          )}
                        >
                          {cellValue}
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
    </div>
  );
}
