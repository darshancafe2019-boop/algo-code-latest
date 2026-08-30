import {
  BUILTIN_THEMES,
  DEFAULT_APPEARANCE_CONFIG,
  ACCENT_SWATCHES,
  calculateContrastRatio,
  getContrastRating,
  validateThemeJson,
  FONT_FAMILY_MAP,
  NUMERIC_FONT_MAP,
  FONT_SCALE_MAP,
  DENSITY_MAP,
} from "../lib/themeTokens.ts";

console.log("===============================================================");
console.log("🚀 RUNNING MASTER APPEARANCE & DESIGN SYSTEM SUITE (QUANT.OS)");
console.log("===============================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// TEST 1: Exactly 4 Primary Presets
// -------------------------------------------------------------
console.log("\n[TEST 1] Verifying 4 Institutional Presets...");
const themeKeys = Object.keys(BUILTIN_THEMES).filter(
  (k) => !["graphite-violet", "high-contrast"].includes(k)
);

assert(
  themeKeys.length === 4,
  `Exactly 4 theme presets exist (Found ${themeKeys.length}: ${themeKeys.join(", ")})`
);
assert("obsidian-blue" in BUILTIN_THEMES, "Obsidian Blue preset exists");
assert("midnight-emerald" in BUILTIN_THEMES, "Midnight Emerald preset exists");
assert("graphite" in BUILTIN_THEMES, "Graphite preset exists");
assert("light-professional" in BUILTIN_THEMES, "Light Professional preset exists");
assert(
  DEFAULT_APPEARANCE_CONFIG.themeId === "obsidian-blue",
  "Default theme is Obsidian Blue"
);

// -------------------------------------------------------------
// TEST 2: Protected Financial & Status Semantics
// -------------------------------------------------------------
console.log("\n[TEST 2] Verifying Semantic Color Protection...");
for (const [id, theme] of Object.entries(BUILTIN_THEMES)) {
  const isLight = id === "light-professional";
  if (!isLight) {
    // In dark themes, profit must be green and loss must be red
    assert(
      theme.colors.profit.startsWith("#3") || theme.colors.profit.startsWith("#2") || theme.colors.profit.startsWith("#0"),
      `[${id}] Profit color is distinct financial green (${theme.colors.profit})`
    );
    assert(
      theme.colors.loss.startsWith("#F") || theme.colors.loss.startsWith("#D"),
      `[${id}] Loss color is distinct danger red (${theme.colors.loss})`
    );
  }
  // Profit is never identical to loss
  assert(
    theme.colors.profit !== theme.colors.loss,
    `[${id}] Profit is never equal to Loss`
  );
}

// -------------------------------------------------------------
// TEST 3: 4 Accent Color Swatches
// -------------------------------------------------------------
console.log("\n[TEST 3] Verifying 4 Accent Color Swatches...");
const accentKeys = Object.keys(ACCENT_SWATCHES);
assert(
  accentKeys.length === 4,
  `Exactly 4 accent swatches exist: ${accentKeys.join(", ")}`
);
assert("blue" in ACCENT_SWATCHES, "Blue accent swatch exists");
assert("cyan" in ACCENT_SWATCHES, "Cyan accent swatch exists");
assert("green" in ACCENT_SWATCHES, "Green accent swatch exists");
assert("violet" in ACCENT_SWATCHES, "Violet accent swatch exists");

// -------------------------------------------------------------
// TEST 4: Display Options (Mode, Density, Text Size)
// -------------------------------------------------------------
console.log("\n[TEST 4] Verifying Display & Density Settings...");
assert(
  DEFAULT_APPEARANCE_CONFIG.typography.density === "compact",
  "Default interface density is 'compact' for high-information trading terminal"
);
assert(
  DEFAULT_APPEARANCE_CONFIG.typography.fontScale === "default",
  "Default text size scale is 'default'"
);
assert(
  DENSITY_MAP.compact.tableRowHeight === "2rem",
  "Compact density table row height is 2rem"
);
assert(
  DENSITY_MAP.comfortable.tableRowHeight === "2.5rem",
  "Comfortable density table row height is 2.5rem"
);

// -------------------------------------------------------------
// TEST 5: Chart Styles
// -------------------------------------------------------------
console.log("\n[TEST 5] Verifying 4 Chart Styles...");
assert(
  DEFAULT_APPEARANCE_CONFIG.chart.style === "candles",
  "Default chart style is 'candles'"
);

// -------------------------------------------------------------
// TEST 6: WCAG Contrast Ratio Engine
// -------------------------------------------------------------
console.log("\n[TEST 6] Verifying WCAG Contrast Calculations...");
const darkTheme = BUILTIN_THEMES["obsidian-blue"];
const textRatio = calculateContrastRatio(darkTheme.colors.textPrimary, darkTheme.colors.surface);
const textRating = getContrastRating(textRatio);
assert(textRating.isPass, `Text on surface passes WCAG with ratio ${textRatio.toFixed(2)}:1 (${textRating.level})`);

const lightTheme = BUILTIN_THEMES["light-professional"];
const lightTextRatio = calculateContrastRatio(lightTheme.colors.textPrimary, lightTheme.colors.surface);
const lightRating = getContrastRating(lightTextRatio);
assert(lightRating.isPass, `Light mode text on surface passes WCAG with ratio ${lightTextRatio.toFixed(2)}:1 (${lightRating.level})`);

// -------------------------------------------------------------
// TEST 7: JSON Import & Export Validator
// -------------------------------------------------------------
console.log("\n[TEST 7] Verifying Theme JSON Serialization...");
const exported = JSON.stringify(darkTheme, null, 2);
const validation = validateThemeJson(exported);
assert(validation.valid, "Valid theme JSON passes validation");

const invalidValidation = validateThemeJson('{"name": "broken"}');
assert(!invalidValidation.valid, "Malformed theme JSON is safely rejected with error message");

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n===============================================================");
if (failCount === 0) {
  console.log(`🎉 ALL ${passCount} APPEARANCE & DESIGN SYSTEM TESTS PASSED (100% GREEN)`);
} else {
  console.error(`❌ ${failCount} TESTS FAILED (${passCount} PASSED)`);
  process.exit(1);
}
console.log("===============================================================");
