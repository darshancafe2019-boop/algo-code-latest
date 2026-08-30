/**
 * Stock Filter URL Serialization & Deserialization
 * ================================================
 * Enables bookmarkable, shareable screener URLs and maintains filter state across reloads.
 */

import { StockFilterState } from "../types/stocks";

export const DEFAULT_STOCK_FILTERS: StockFilterState = {
  search: "",
  country: undefined,
  exchange: "ALL",
  sector: "ALL",
  market_cap_category: "ALL",
  index: "ALL",
  price_direction: undefined,
  min_price: undefined,
  max_price: undefined,
  min_change_pct: undefined,
  max_change_pct: undefined,
  min_volume: undefined,
  min_relative_volume: undefined,
  min_rsi: undefined,
  max_rsi: undefined,
  min_pe: undefined,
  max_pe: undefined,
  directional_bias: undefined,
  min_score: undefined,
  sort_by: "volume_shares",
  sort_direction: "desc",
  page: 1,
  page_size: 50,
};

export function serializeStockFilters(filters: StockFilterState): string {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.country && filters.country !== "ALL") params.set("country", filters.country);
  if (filters.exchange && filters.exchange !== "ALL") params.set("exchange", filters.exchange);
  if (filters.sector && filters.sector !== "ALL") params.set("sector", filters.sector);
  if (filters.market_cap_category && filters.market_cap_category !== "ALL") {
    params.set("market_cap_category", filters.market_cap_category);
  }
  if (filters.index && filters.index !== "ALL") params.set("index", filters.index);
  if (filters.price_direction) params.set("price_direction", filters.price_direction);
  if (filters.min_price !== undefined) params.set("min_price", String(filters.min_price));
  if (filters.max_price !== undefined) params.set("max_price", String(filters.max_price));
  if (filters.min_change_pct !== undefined) params.set("min_change_pct", String(filters.min_change_pct));
  if (filters.max_change_pct !== undefined) params.set("max_change_pct", String(filters.max_change_pct));
  if (filters.min_volume !== undefined) params.set("min_volume", String(filters.min_volume));
  if (filters.min_relative_volume !== undefined) params.set("min_relative_volume", String(filters.min_relative_volume));
  if (filters.min_rsi !== undefined) params.set("min_rsi", String(filters.min_rsi));
  if (filters.max_rsi !== undefined) params.set("max_rsi", String(filters.max_rsi));
  if (filters.min_pe !== undefined) params.set("min_pe", String(filters.min_pe));
  if (filters.max_pe !== undefined) params.set("max_pe", String(filters.max_pe));
  if (filters.directional_bias) params.set("directional_bias", filters.directional_bias);
  if (filters.min_score !== undefined) params.set("min_score", String(filters.min_score));

  params.set("sort_by", filters.sort_by);
  params.set("sort_direction", filters.sort_direction);
  params.set("page", String(filters.page));
  params.set("page_size", String(filters.page_size));

  return params.toString();
}

export function deserializeStockFilters(searchString: string): Partial<StockFilterState> {
  const params = new URLSearchParams(searchString);
  const result: Partial<StockFilterState> = {};

  if (params.get("search")) result.search = params.get("search")!;
  if (params.get("country")) result.country = params.get("country")!;
  if (params.get("exchange")) result.exchange = params.get("exchange")!;
  if (params.get("sector")) result.sector = params.get("sector")!;
  if (params.get("market_cap_category")) result.market_cap_category = params.get("market_cap_category")!;
  if (params.get("index")) result.index = params.get("index")!;
  if (params.get("price_direction")) result.price_direction = params.get("price_direction") as any;

  const toNum = (k: string) => {
    const val = params.get(k);
    return val ? parseFloat(val) : undefined;
  };

  result.min_price = toNum("min_price");
  result.max_price = toNum("max_price");
  result.min_change_pct = toNum("min_change_pct");
  result.max_change_pct = toNum("max_change_pct");
  result.min_volume = toNum("min_volume");
  result.min_relative_volume = toNum("min_relative_volume");
  result.min_rsi = toNum("min_rsi");
  result.max_rsi = toNum("max_rsi");
  result.min_pe = toNum("min_pe");
  result.max_pe = toNum("max_pe");
  result.min_score = toNum("min_score");

  if (params.get("directional_bias")) result.directional_bias = params.get("directional_bias")!;
  if (params.get("sort_by")) result.sort_by = params.get("sort_by")!;
  if (params.get("sort_direction")) result.sort_direction = params.get("sort_direction") as any;
  if (params.get("page")) result.page = parseInt(params.get("page")!, 10);
  if (params.get("page_size")) result.page_size = parseInt(params.get("page_size")!, 10);

  return result;
}
