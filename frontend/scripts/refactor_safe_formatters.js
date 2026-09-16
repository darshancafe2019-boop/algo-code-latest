const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Skip files that are formatters themselves or tests
  if (
    filePath.includes('formatters') ||
    filePath.includes('financial.ts') ||
    filePath.includes('numbers.ts') ||
    filePath.includes('refactor_safe_formatters')
  ) {
    return false;
  }

  // 1. ₹{val.toLocaleString(...)} -> {formatMoney(val, "₹")}
  content = content.replace(/₹\{([^}]+?)\.toLocaleString\([^)]*?\)\}/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return `{formatMoney(${cleanExpr}, "₹")}`;
  });

  // 2. ${val.toLocaleString(...)} where $ is in text: e.g. <span ...>${val.toLocaleString()}</span>
  content = content.replace(/\$\{([^}]+?)\.toLocaleString\([^)]*?\)\}/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return `{formatMoney(${cleanExpr}, "$")}`;
  });

  // 3. {currencySymbol}{val.toLocaleString(...)} -> {formatMoney(val, currencySymbol)}
  content = content.replace(/\{currencySymbol\}\{([^}]+?)\.toLocaleString\([^)]*?\)\}/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return `{formatMoney(${cleanExpr}, currencySymbol)}`;
  });

  // 4. {currency}{val.toLocaleString(...)} -> {formatMoney(val, currency)}
  content = content.replace(/\{currency\}\{([^}]+?)\.toLocaleString\([^)]*?\)\}/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return `{formatMoney(${cleanExpr}, currency)}`;
  });

  // 5. {currSymbol}{val.toLocaleString(...)} -> {formatMoney(val, currSymbol)}
  content = content.replace(/\{currSymbol\}\{([^}]+?)\.toLocaleString\([^)]*?\)\}/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return `{formatMoney(${cleanExpr}, currSymbol)}`;
  });

  // 6. Template literals: `₹${val.toLocaleString(...)}` -> `${formatMoney(val, "₹")}`
  content = content.replace(/`₹\$\{([^}]+?)\.toLocaleString\([^)]*?\)\}`/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return '`${formatMoney(' + cleanExpr + ', "₹")}`';
  });

  // 7. Template literals: `$${val.toLocaleString(...)}` -> `${formatMoney(val, "$")}`
  content = content.replace(/`\$\$\{([^}]+?)\.toLocaleString\([^)]*?\)\}`/g, (match, expr) => {
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    return '`${formatMoney(' + cleanExpr + ', "$")}`';
  });

  // 8. General remaining JSX: {val.toLocaleString(...)} -> {formatNumber(val)}
  content = content.replace(/\{([^{}]+?)\.toLocaleString\(([^)]*?)\)\}/g, (match, expr, args) => {
    if (expr.includes('Date') || expr.includes('toLocaleDateString') || expr.includes('toLocaleTimeString')) {
      return match;
    }
    const cleanExpr = expr.replace(/^\((.*)\)$/, '$1').replace(/\s*\|\|\s*0\s*$/, '').trim();
    if (args.includes('minimumFractionDigits: 2') || args.includes('maximumFractionDigits: 2')) {
      return `{formatNumber(${cleanExpr}, 2)}`;
    }
    return `{formatNumber(${cleanExpr})}`;
  });

  if (content !== original) {
    // Add import if needed
    const needed = [];
    if (content.includes('formatNumber')) needed.push('formatNumber');
    if (content.includes('formatMoney')) needed.push('formatMoney');
    if (content.includes('formatQuantity')) needed.push('formatQuantity');
    if (content.includes('formatPrice')) needed.push('formatPrice');

    if (content.includes('@/lib/formatters')) {
      // expand import
      content = content.replace(
        /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/formatters["'];?/,
        (m, imports) => {
          const names = imports.split(',').map(s => s.trim()).filter(Boolean);
          needed.forEach(n => {
            if (!names.includes(n)) names.push(n);
          });
          return `import { ${Array.from(new Set(names)).join(', ')} } from "@/lib/formatters";`;
        }
      );
    } else if (needed.length > 0) {
      // Calculate relative path to @/lib/formatters or use @/lib/formatters
      const importStmt = `import { ${needed.join(', ')} } from "@/lib/formatters";\n`;
      if (content.startsWith('"use client";') || content.startsWith("'use client';")) {
        content = content.replace(/^((?:["']use client["'];?\s*\n)+)/, `$1${importStmt}`);
      } else {
        content = importStmt + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

const calls = JSON.parse(fs.readFileSync('H:/New folder/algo-code-main/frontend/all_tolocalestring_calls.json', 'utf8'));
const files = Array.from(new Set(calls.map(c => c.file)));

let modifiedCount = 0;
files.forEach(f => {
  if (processFile(f)) {
    modifiedCount++;
    console.log('Modified:', f);
  }
});

console.log('Total files modified:', modifiedCount);
