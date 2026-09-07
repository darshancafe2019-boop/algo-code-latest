"use client";

import React from "react";
import {
  InstitutionalDataTable,
  ColumnDef,
} from "./InstitutionalDataTable";

export type { ColumnDef };

export interface InstitutionalTableProps<T extends Record<string, any>> {
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

export function InstitutionalTable<T extends Record<string, any>>(
  props: InstitutionalTableProps<T>
) {
  return <InstitutionalDataTable {...props} />;
}

export { InstitutionalDataTable };
export default InstitutionalTable;
