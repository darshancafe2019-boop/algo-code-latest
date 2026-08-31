/**
 * Hook for Stock Filters & URL Synchronization
 * ============================================
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useStocksStore } from "../state/stocks-store";
import { deserializeStockFilters, serializeStockFilters } from "../utils/filter-serialization";

export function useStockFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filters, setFilters, resetFilters } = useStocksStore();

  // Load from URL on initial mount
  useEffect(() => {
    if (searchParams) {
      const parsed = deserializeStockFilters(searchParams.toString());
      if (Object.keys(parsed).length > 0) {
        setFilters(parsed);
      }
    }
  }, [searchParams, setFilters]);

  // Update URL on filter changes (shallow)
  const applyFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(newFilters);
    const updated = { ...filters, ...newFilters, page: 1 };
    const qs = serializeStockFilters(updated);
    router.replace(`/markets?${qs}`, { scroll: false });
  };

  return {
    filters,
    setFilters,
    applyFilters,
    resetFilters,
  };
}
