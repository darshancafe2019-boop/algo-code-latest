import {
  toFiniteNumber,
  isFiniteNumber,
  safeNumber,
  formatDecimal,
  formatPercent,
  formatCurrency,
  formatPrice,
  formatMoney,
  formatInteger,
  formatQuantity,
  formatPnL,
  formatRatio,
  safeArray,
  safeMap,
} from "../lib/formatters";

import {
  normalizePosition,
  normalizePositions,
  normalizeOrder,
  normalizeOrders,
} from "../lib/normalizers/financialNormalizers";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("Starting Quant.OS Financial Formatters & Normalizers Verification...");

// 1. toFiniteNumber tests
assert(toFiniteNumber(42) === 42, "number 42 parsed");
assert(toFiniteNumber(0) === 0, "numeric 0 preserved");
assert(toFiniteNumber("42") === 42, "string '42' parsed");
assert(toFiniteNumber("1,234.56") === 1234.56, "comma-formatted string parsed");
assert(toFiniteNumber("₹50,000") === 50000, "INR symbol stripped and parsed");
assert(toFiniteNumber("$100.25") === 100.25, "USD symbol stripped and parsed");
assert(toFiniteNumber(null) === null, "null returns null");
assert(toFiniteNumber(undefined) === null, "undefined returns null");
assert(toFiniteNumber(NaN) === null, "NaN returns null");
assert(toFiniteNumber(Infinity) === null, "Infinity returns null");
assert(toFiniteNumber(-Infinity) === null, "-Infinity returns null");
assert(toFiniteNumber("") === null, "empty string returns null");
assert(toFiniteNumber("   ") === null, "whitespace returns null");
assert(toFiniteNumber("N/A") === null, "'N/A' returns null");
assert(toFiniteNumber("null") === null, "'null' returns null");
assert(toFiniteNumber("undefined") === null, "'undefined' returns null");
assert(toFiniteNumber("—") === null, "em-dash returns null");

// 2. formatDecimal tests
assert(formatDecimal(12.3456, 2) === "12.35", "formatDecimal round to 2 decimals");
assert(formatDecimal(null, 2) === "—", "formatDecimal null returns fallback");
assert(formatDecimal(undefined, 2) === "—", "formatDecimal undefined returns fallback");
assert(formatDecimal(0, 2) === "0.00", "formatDecimal 0 returns '0.00'");
assert(formatDecimal("42.5", 2) === "42.50", "formatDecimal string parsed");

// 3. formatCurrency tests
assert(formatCurrency(1234.5, "₹", 2) === "₹1,234.50", "formatCurrency INR");
assert(formatCurrency(-1234.5, "₹", 2) === "-₹1,234.50", "formatCurrency negative INR");
assert(formatCurrency(null, "₹", 2) === "—", "formatCurrency null returns fallback");
assert(formatCurrency(undefined, "₹", 2) === "—", "formatCurrency undefined returns fallback");
assert(formatCurrency(0, "₹", 2) === "₹0.00", "formatCurrency 0 returns ₹0.00");

// 4. formatPercent tests
assert(formatPercent(12.34, 2) === "12.34%", "formatPercent standard");
assert(formatPercent(12.34, 2, true) === "+12.34%", "formatPercent with positive sign");
assert(formatPercent(-5.6, 2, true) === "-5.60%", "formatPercent with negative sign");
assert(formatPercent(null, 2) === "—", "formatPercent null returns fallback");
assert(formatPercent(0, 2) === "0.00%", "formatPercent 0 returns 0.00%");

// 5. formatPnL tests
const pnlPos = formatPnL(1500, "₹", 2);
assert(pnlPos.formatted === "+₹1,500.00" && pnlPos.isPositive && !pnlPos.isNA, "formatPnL positive");
const pnlNeg = formatPnL(-500, "₹", 2);
assert(pnlNeg.formatted === "-₹500.00" && pnlNeg.isNegative && !pnlNeg.isNA, "formatPnL negative");
const pnlZero = formatPnL(0, "₹", 2);
assert(pnlZero.formatted === "₹0.00" && pnlZero.isZero && !pnlZero.isNA, "formatPnL zero");
const pnlNull = formatPnL(null, "₹", 2);
assert(pnlNull.formatted === "—" && pnlNull.isNA, "formatPnL null");

// 6. safeArray & safeMap tests
assert(safeArray([1, 2, 3]).length === 3, "safeArray on valid array");
assert(safeArray(null).length === 0, "safeArray on null returns []");
assert(safeArray(undefined).length === 0, "safeArray on undefined returns []");
assert(safeArray({ a: 1 }).length === 0, "safeArray on object returns []");
assert(safeArray("string").length === 0, "safeArray on string returns []");

const mapped = safeMap([10, null, undefined, 20], (x: number) => x * 2);
assert(mapped.length === 2 && mapped[0] === 20 && mapped[1] === 40, "safeMap filters null/undefined");

// 7. normalizePosition tests
const realApiPos = {
  id: 101,
  symbol: "NIFTY24SEP24200CE",
  direction: "LONG",
  entry_price: 124.50,
  current_price: 148.20,
  quantity: 150,
  unrealized_pnl: 3555.00,
  unrealized_pnl_pct: 19.03,
  status: "OPEN"
};
const normPos1 = normalizePosition(realApiPos);
assert(normPos1 !== null, "normalizePosition parsed real API item");
assert(normPos1?.entryPrice === 124.50, "entryPrice mapped correctly");
assert(normPos1?.currentPrice === 148.20, "currentPrice mapped correctly");
assert(normPos1?.pnl === 3555.00, "pnl mapped correctly");
assert(normPos1?.quantity === 150, "quantity mapped correctly");

const legacyMockPos = {
  id: "POS-1",
  symbol: "RELIANCE",
  type: "SHORT",
  avgPrice: 2940.00,
  ltp: 2900.00,
  qty: 50,
  pnl: 2000.00,
  pnlPct: 1.36,
  status: "OPEN"
};
const normPos2 = normalizePosition(legacyMockPos);
assert(normPos2 !== null, "normalizePosition parsed legacy mock item");
assert(normPos2?.direction === "SHORT", "direction normalized to SHORT");
assert(normPos2?.entryPrice === 2940.00, "avgPrice mapped to entryPrice");
assert(normPos2?.currentPrice === 2900.00, "ltp mapped to currentPrice");
assert(normPos2?.quantity === 50, "qty mapped to quantity");

const brokenPos = { symbol: "BROKEN", entry_price: "invalid", current_price: null };
const normPos3 = normalizePosition(brokenPos);
assert(normPos3 !== null, "broken position normalized without crash");
assert(normPos3?.entryPrice === null, "invalid entryPrice normalized to null");
assert(normPos3?.currentPrice === null, "null currentPrice normalized to null");
assert(normPos3?.pnl === null, "missing pnl normalized to null");

const positionsList = normalizePositions([realApiPos, legacyMockPos, null, brokenPos]);
assert(positionsList.length === 3, "normalizePositions filtered null");

// 8. normalizeOrder tests
const realApiOrder = {
  id: "ORD-123",
  symbol: "BANKNIFTY",
  direction: "BUY",
  price: 51200.00,
  requested_quantity: 60,
  status: "FILLED"
};
const normOrd1 = normalizeOrder(realApiOrder);
assert(normOrd1 !== null, "normalizeOrder parsed real order");
assert(normOrd1?.side === "BUY", "direction BUY normalized to side BUY");
assert(normOrd1?.price === 51200.00, "price mapped");
assert(normOrd1?.quantity === 60, "requested_quantity mapped");

const ordersList = normalizeOrders([realApiOrder, null, undefined]);
assert(ordersList.length === 1, "normalizeOrders filtered invalid items");

console.log("ALL TESTS PASSED SUCCESSFULLY! ZERO RUNTIME CRASHES.");
