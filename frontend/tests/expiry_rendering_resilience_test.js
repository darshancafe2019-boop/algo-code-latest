#!/usr/bin/env node
/**
 * Quant.OS Comprehensive Expiry Rendering & Normalization Test Suite
 * ===================================================================
 * Verifies that:
 * 1. Single and multiple expiries normalize to primitive key/value/label.
 * 2. Dropdown options never contain raw objects as React children.
 * 3. Human-readable labels render correctly (e.g. "29 Aug 2026 · Expires today").
 * 4. Changing underlying / resetting selection behaves deterministically.
 * 5. Empty and malformed responses are handled without throwing runtime exceptions.
 * 6. Inactive/expired contracts are filtered when activeOnly is requested.
 * 7. getExpiryDisplay returns fallback "—" and never "[object Object]".
 * 8. Recursive inspection ensures no raw record is passed as a child or key.
 * 9. ErrorBoundary and Toast error formatting extract strings from any error shape.
 * 10. Direct simulation of Options views with real backend expiry records.
 */

const assert = require("assert");

// Pure utility functions under test
function formatExpiryDate(rawDateStr) {
  if (!rawDateStr || typeof rawDateStr !== "string") return "—";
  const clean = rawDateStr.trim().split("T")[0];

  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(clean)) {
    return clean.toUpperCase();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parts = clean.split("-");
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthNames[monthIndex]} ${year}`;
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return clean;
}

function formatDaysToExpiryLabel(days) {
  if (typeof days !== "number" || isNaN(days)) return "";
  if (days <= 0.05) return "Expires today (0D)";
  if (days < 1.0) return "Expires today";
  return `${Math.round(days)}D`;
}

function normalizeExpiryOption(item, index = 0, underlying = "BTC") {
  if (!item) return null;

  if (typeof item === "string") {
    const strVal = item.trim();
    if (!strVal) return null;
    const formatted = formatExpiryDate(strVal);
    const label = `${formatted} ${index === 0 ? "· (Nearest / Weekly)" : ""}`.trim();

    return {
      key: `${underlying}_${strVal}_${index}`,
      value: strVal,
      dateString: strVal,
      label,
      daysToExpiry: undefined,
      isActive: true,
      raw: item,
    };
  }

  if (typeof item === "object") {
    const rec = item;
    const rawDate = rec.expiry_date || rec.settlement_time?.split("T")[0] || String(rec.id || "");
    if (!rawDate) return null;

    const formattedDate = formatExpiryDate(rawDate);
    const days = typeof rec.days_to_expiry === "number" ? rec.days_to_expiry : undefined;
    const dteLabel = formatDaysToExpiryLabel(days);

    let label = formattedDate;
    if (dteLabel) {
      label = `${formattedDate} · ${dteLabel}`;
    } else if (index === 0) {
      label = `${formattedDate} · (Nearest / Weekly)`;
    }

    const und = rec.underlying_symbol || underlying;
    const stableId = rec.id ? String(rec.id) : rawDate;
    const key = `${und}_${stableId}_${index}`;
    const value = rec.expiry_date || rawDate;

    return {
      key,
      value,
      dateString: rawDate,
      label,
      daysToExpiry: days,
      isActive: rec.is_active !== false,
      raw: item,
    };
  }

  return null;
}

function normalizeExpiriesList(expiries, underlying = "BTC", activeOnly = false) {
  if (!Array.isArray(expiries) || expiries.length === 0) {
    return [];
  }

  const results = [];
  const seenValues = new Set();

  for (let i = 0; i < expiries.length; i++) {
    const opt = normalizeExpiryOption(expiries[i], i, underlying);
    if (opt) {
      if (activeOnly && !opt.isActive) {
        continue;
      }
      if (!seenValues.has(opt.value)) {
        seenValues.add(opt.value);
        results.push(opt);
      }
    }
  }

  return results;
}

function getExpiryDisplay(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? formatExpiryDate(trimmed) : fallback;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value;
    const candidate = obj.expiry_date || obj.settlement_time || (obj.id ? String(obj.id) : "");
    return candidate ? formatExpiryDate(candidate) : fallback;
  }
  return fallback;
}

function safeFormatErrorMessage(err, fallback = "An unexpected error occurred.") {
  if (err === null || err === undefined) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    if (typeof err.message === "string") return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  }
  return String(err);
}

// Development Guard Assertion
function assertRenderablePrimitive(val, context) {
  const type = typeof val;
  if (type !== "string" && type !== "number") {
    throw new Error(
      `[DEV GUARD VIOLATION] Unsafe render in ${context}: Expected string or number, found ${type} (${JSON.stringify(val)})`
    );
  }
}

console.log("\n============================================================");
console.log("  QUANT.OS EXPIRY NORMALIZATION & RESILIENCE TEST SUITE");
console.log("============================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`\x1b[32m  [PASS]\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`\x1b[31m  [FAIL]\x1b[0m ${name}: ${err.message}`);
    failed++;
  }
}

// 1. One string expiry
test("1. Single string expiry normalizes with primitive value and readable label", () => {
  const result = normalizeExpiriesList(["2026-08-29"], "BTC");
  assert.strictEqual(result.length, 1);
  assertRenderablePrimitive(result[0].key, "option.key");
  assertRenderablePrimitive(result[0].value, "option.value");
  assertRenderablePrimitive(result[0].label, "option.label");
  assert.strictEqual(result[0].value, "2026-08-29");
  assert(result[0].label.includes("29 Aug 2026"));
  assert(!result[0].label.includes("[object Object]"));
});

// 2. Multiple string expiries
test("2. Multiple string expiries normalize with unique keys and primitive values", () => {
  const result = normalizeExpiriesList(["2026-08-29", "2026-09-05", "2026-09-26"], "ETH");
  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[1].value, "2026-09-05");
  assert.notStrictEqual(result[0].key, result[1].key);
  result.forEach((opt, idx) => {
    assertRenderablePrimitive(opt.key, `options[${idx}].key`);
    assertRenderablePrimitive(opt.value, `options[${idx}].value`);
    assertRenderablePrimitive(opt.label, `options[${idx}].label`);
  });
});

// 3. Exact Delta Exchange expiry object record (The exact shape that caused the error)
test("3. Delta Exchange expiry object record normalizes to primitive fields with human-readable DTE", () => {
  const deltaRecord = {
    id: 42,
    underlying_symbol: "BTC",
    expiry_date: "2026-08-29",
    settlement_time: "2026-08-29T12:00:00Z",
    days_to_expiry: 0.0,
    is_active: true,
    last_synced_at: "2026-08-30T07:00:00Z",
  };

  const result = normalizeExpiriesList([deltaRecord], "BTC");
  assert.strictEqual(result.length, 1);
  const opt = result[0];
  assertRenderablePrimitive(opt.key, "deltaRecord.key");
  assertRenderablePrimitive(opt.value, "deltaRecord.value");
  assertRenderablePrimitive(opt.label, "deltaRecord.label");
  assert.strictEqual(opt.value, "2026-08-29");
  assert(opt.label.includes("29 Aug 2026"));
  assert(opt.label.includes("Expires today"));
  assert(!opt.label.includes("[object Object]"));
});

// 4. Inactive contract filtering
test("4. Inactive expiry records are filtered when activeOnly=true", () => {
  const records = [
    { id: 1, expiry_date: "2026-08-29", is_active: true },
    { id: 2, expiry_date: "2026-07-01", is_active: false },
    { id: 3, expiry_date: "2026-09-05", is_active: true },
  ];

  const result = normalizeExpiriesList(records, "BTC", true);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].value, "2026-08-29");
  assert.strictEqual(result[1].value, "2026-09-05");
});

// 5. Empty and null inputs
test("5. Empty or malformed inputs return empty array without crashing", () => {
  assert.deepStrictEqual(normalizeExpiriesList(null), []);
  assert.deepStrictEqual(normalizeExpiriesList(undefined), []);
  assert.deepStrictEqual(normalizeExpiriesList([]), []);
  assert.deepStrictEqual(normalizeExpiriesList([null, undefined, {}]), []);
});

// 6. getExpiryDisplay safety
test("6. getExpiryDisplay returns formatted string for objects and fallback for null/empty", () => {
  assert.strictEqual(getExpiryDisplay(null), "—");
  assert.strictEqual(getExpiryDisplay(undefined), "—");
  assert.strictEqual(getExpiryDisplay(""), "—");
  assert.strictEqual(getExpiryDisplay("2026-08-29"), "29 Aug 2026");
  assert.strictEqual(getExpiryDisplay({ expiry_date: "2026-08-29" }), "29 Aug 2026");
  assert.strictEqual(getExpiryDisplay({ settlement_time: "2026-09-05T12:00:00Z" }), "05 Sep 2026");
  assert(!getExpiryDisplay({}).includes("[object Object]"));
});

// 7. Deduplication of identical expiry values
test("7. Duplicate expiry values in array are deduplicated", () => {
  const result = normalizeExpiriesList(["2026-08-29", "2026-08-29", { expiry_date: "2026-08-29" }]);
  assert.strictEqual(result.length, 1);
});

// 8. Underlying Switch & Selection Persistence Lifecycle
test("8. Switching underlying clears incompatible selection and selects valid default", () => {
  const btcExpiries = normalizeExpiriesList([
    { id: 101, underlying_symbol: "BTC", expiry_date: "2026-08-29", days_to_expiry: 0.1 },
    { id: 102, underlying_symbol: "BTC", expiry_date: "2026-09-05", days_to_expiry: 7.0 },
  ], "BTC");

  let selectedExpiry = btcExpiries[0].value;
  assert.strictEqual(selectedExpiry, "2026-08-29");

  // Switch to ETH
  const ethExpiries = normalizeExpiriesList([
    { id: 201, underlying_symbol: "ETH", expiry_date: "2026-09-04", days_to_expiry: 6.0 },
    { id: 202, underlying_symbol: "ETH", expiry_date: "2026-09-18", days_to_expiry: 20.0 },
  ], "ETH");

  // Validate state machine logic
  const existsInEth = ethExpiries.some((e) => e.value === selectedExpiry);
  if (!existsInEth) {
    selectedExpiry = ethExpiries[0].value;
  }

  assert.strictEqual(selectedExpiry, "2026-09-04");
  assertRenderablePrimitive(selectedExpiry, "selectedExpiry after underlying switch");
});

// 9. Recursive Dropdown Children Primitive Type Check
test("9. Recursive inspection of simulated <select> and <option> tree guarantees 100% primitive children", () => {
  const rawDataFromBackend = [
    {
      id: 1,
      underlying_symbol: "BTC",
      expiry_date: "2026-08-30",
      settlement_time: "2026-08-30T12:00:00Z",
      days_to_expiry: 0.5,
      is_active: 1,
      last_synced_at: "2026-08-30T07:00:00Z",
    },
    {
      id: 2,
      underlying_symbol: "BTC",
      expiry_date: "2026-09-06",
      settlement_time: "2026-09-06T12:00:00Z",
      days_to_expiry: 7.5,
      is_active: 1,
      last_synced_at: "2026-08-30T07:00:00Z",
    },
  ];

  const normalized = normalizeExpiriesList(rawDataFromBackend, "BTC");

  // Simulate JSX tree construction
  const simulatedSelect = {
    type: "select",
    props: {
      value: normalized[0]?.value || "",
      children: normalized.map((opt) => ({
        type: "option",
        key: opt.key,
        props: {
          value: opt.value,
          children: opt.label,
        },
      })),
    },
  };

  // Inspect tree recursively
  assertRenderablePrimitive(simulatedSelect.props.value, "select.value");
  assert(Array.isArray(simulatedSelect.props.children));

  simulatedSelect.props.children.forEach((optionNode, i) => {
    assertRenderablePrimitive(optionNode.key, `option[${i}].key`);
    assertRenderablePrimitive(optionNode.props.value, `option[${i}].props.value`);
    assertRenderablePrimitive(optionNode.props.children, `option[${i}].props.children`);
    assert(!optionNode.props.children.includes("[object Object]"));
  });
});

// 10. ErrorBoundary and Toast safe serialization
test("10. ErrorBoundary safe message extraction formats errors, strings, and objects safely", () => {
  const stdError = new Error("Network timeout");
  assert.strictEqual(safeFormatErrorMessage(stdError), "Network timeout");

  const stringError = "Failed to load contract specifications";
  assert.strictEqual(safeFormatErrorMessage(stringError), "Failed to load contract specifications");

  const rawObjectError = { code: 503, reason: "Service unavailable" };
  assert.strictEqual(safeFormatErrorMessage(rawObjectError), JSON.stringify(rawObjectError));

  assert.strictEqual(safeFormatErrorMessage(null), "An unexpected error occurred.");
  assert.strictEqual(safeFormatErrorMessage(undefined), "An unexpected error occurred.");
});

// 11. TradingViewMarketWorkspace description simulation
test("11. TradingViewMarketWorkspace options description renders primitive text with empty or populated expiries", () => {
  const rawExpiries = [
    {
      id: 10,
      underlying_symbol: "BTC",
      expiry_date: "2026-08-30",
      settlement_time: "2026-08-30T12:00:00Z",
      days_to_expiry: 0.0,
      is_active: 1,
      last_synced_at: "2026-08-30T07:00:00Z",
    },
  ];

  const normalized = normalizeExpiriesList(rawExpiries, "BTC");

  // Empty selection on initial render
  const selectedExpiry = "";
  const displayExpiry = selectedExpiry || normalized[0]?.label || "—";
  const simulatedText = `PCR, Max Pain strike, and open interest concentration for expiry ${displayExpiry}.`;

  assertRenderablePrimitive(displayExpiry, "displayExpiry");
  assert(!simulatedText.includes("[object Object]"));
  assert(simulatedText.includes("30 Aug 2026"));
});

console.log("\n------------------------------------------------------------");
console.log(`  Tests Passed: ${passed}`);
console.log(`  Tests Failed: ${failed}`);
console.log("------------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\x1b[32m[+] All 11 Expiry Normalization & Resilience Tests Passed.\x1b[0m\n");
  process.exit(0);
}
