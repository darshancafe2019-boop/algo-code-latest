const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('H:/New folder/algo-code-main/frontend');
let fixedFiles = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Fix formatMoney(x?, ...) or formatNumber(x?, ...)
  content = content.replace(/formatMoney\(([^,\)]+?)\?\s*,/g, 'formatMoney($1,');
  content = content.replace(/formatNumber\(([^,\)]+?)\?\s*,/g, 'formatNumber($1,');
  content = content.replace(/formatMoney\(([^,\)]+?)\?\s*\)/g, 'formatMoney($1)');
  content = content.replace(/formatNumber\(([^,\)]+?)\?\s*\)/g, 'formatNumber($1)');
  content = content.replace(/formatPrice\(([^,\)]+?)\?\s*,/g, 'formatPrice($1,');
  content = content.replace(/formatPrice\(([^,\)]+?)\?\s*\)/g, 'formatPrice($1)');

  // Fix RiskStatusPanel malformed line if present
  content = content.replace(
    /formatMoney\(dailyPnl\s*>=\s*0\s*\?\s*`\+\$\{dailyPnl,\s*"₹"\)\}`\s*:\s*dailyPnl\.toLocaleString\(\)/g,
    'dailyPnl !== null && dailyPnl !== undefined ? (dailyPnl >= 0 ? `+${formatMoney(dailyPnl, "₹")}` : formatMoney(dailyPnl, "₹")) : "—"'
  );

  // Fix OptionStrategyBuilder and FuturesCommandCenter and other files if any
  content = content.replace(/formatNumber\(([^,\)]+?)\?\s*/g, 'formatNumber($1');
  content = content.replace(/formatMoney\(([^,\)]+?)\?\s*/g, 'formatMoney($1');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    fixedFiles++;
  }
});

console.log('Fixed syntax anomalies in ' + fixedFiles + ' files.');
