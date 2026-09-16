const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function ensureImport(content, importNames, importPath = '@/lib/formatters') {
  const hasImport = content.includes(`from "${importPath}"`) || content.includes(`from '${importPath}'`);
  if (!hasImport) {
    return `import { ${importNames.join(', ')} } from "${importPath}";\n` + content;
  } else {
    const importRegex = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*["']${importPath}["']`);
    const match = content.match(importRegex);
    if (match) {
      const existing = match[1].split(',').map(s => s.trim());
      const toAdd = importNames.filter(n => !existing.includes(n));
      if (toAdd.length > 0) {
        const newImport = `import { ${[...existing, ...toAdd].join(', ')} } from "${importPath}"`;
        return content.replace(match[0], newImport);
      }
    }
  }
  return content;
}

function processFile(relPath, transformFn, requiredImports = ['formatNumber', 'formatPrice', 'formatMoney', 'formatQuantity', 'formatVolume']) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('File not found:', relPath);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  content = transformFn(content);
  if (content !== original) {
    if (requiredImports && requiredImports.length > 0) {
      content = ensureImport(content, requiredImports);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated:', relPath);
  }
}

// 1. components/bot-control/BotCardGrid.tsx
processFile('components/bot-control/BotCardGrid.tsx', content => {
  return content.replace(/\{pos\.direction\}\s*\{pos\.size\}\s*@\s*\$\{pos\.entry_price\s*\?\s*pos\.entry_price\.toLocaleString\("en-US",\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"—"\}/g, '{pos.direction} {pos.size} @ {formatMoney(pos.entry_price, "$")}');
});

// 2. components/bot-control/BotDetailDrawer.tsx
processFile('components/bot-control/BotDetailDrawer.tsx', content => {
  return content.replace(/\$\{bot\.allocated_capital\?\.toLocaleString\(\)\s*\|\|\s*"10,000"\}/g, '{formatMoney(bot.allocated_capital, "$")}')
                .replace(/<p className="text-red-400 font-bold">\$\{pos\.stop_loss\?\.toLocaleString\(\)\s*\|\|\s*"63,200"\}<\/p>/g, '<p className="text-red-400 font-bold">{formatMoney(pos.stop_loss, "$")}</p>')
                .replace(/<p className="text-\[#22D3EE\] font-bold">\$\{pos\.take_profit\?\.toLocaleString\(\)\s*\|\|\s*"67,500"\}<\/p>/g, '<p className="text-[#22D3EE] font-bold">{formatMoney(pos.take_profit, "$")}</p>')
                .replace(/<span>Price:\s*\$\{d\.price\?\.toLocaleString\(\)\s*\|\|\s*"65,420"\}<\/span>/g, '<span>Price: {formatMoney(d.price, "$")}</span>');
});

// 3. components/bot-control/SimpleBotTable.tsx
processFile('components/bot-control/SimpleBotTable.tsx', content => {
  return content.replace(/@\s*\$\{pos\.entry_price\s*\?\s*pos\.entry_price\.toLocaleString\("en-US",\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"—"\}/g, '@ {formatMoney(pos.entry_price, "$")}');
});

// 4. components/crypto/CryptoOptionChainTerminal.tsx
processFile('components/crypto/CryptoOptionChainTerminal.tsx', content => {
  return content.replace(/\{c\?\.openInterest\s*!==\s*null\s*&&\s*c\?\.openInterest\s*!==\s*undefined\s*\?\s*c\.openInterest\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(c?.openInterest)}')
                .replace(/\{c\?\.volume\s*!==\s*null\s*&&\s*c\?\.volume\s*!==\s*undefined\s*\?\s*c\.volume\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(c?.volume)}')
                .replace(/\{p\?\.volume\s*!==\s*null\s*&&\s*p\?\.volume\s*!==\s*undefined\s*\?\s*p\.volume\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(p?.volume)}')
                .replace(/\{p\?\.openInterest\s*!==\s*null\s*&&\s*p\?\.openInterest\s*!==\s*undefined\s*\?\s*p\.openInterest\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(p?.openInterest)}');
});

// 5. components/crypto/CryptoOptionsTab.tsx
processFile('components/crypto/CryptoOptionsTab.tsx', content => {
  return content.replace(/\{call\?\.open_interest\s*\?\s*call\.open_interest\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(call?.open_interest)}')
                .replace(/\{put\?\.open_interest\s*\?\s*put\.open_interest\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(put?.open_interest)}');
});

// 6. components/eco/EcoPositionVisualizer.tsx
processFile('components/eco/EcoPositionVisualizer.tsx', content => {
  return content.replace(/\{currency\}\{stopLoss\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, '{formatMoney(stopLoss, currency)}')
                .replace(/\{currency\}\{takeProfit\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, '{formatMoney(takeProfit, currency)}');
});

// 7. components/market-universe/GlobalMarketCommandTable.tsx
processFile('components/market-universe/GlobalMarketCommandTable.tsx', content => {
  return content.replace(/:\s*inst\.volume_24h\.toLocaleString\(\)\}/g, ': formatVolume(inst.volume_24h)}');
});

// 8. components/market-universe/TerminalInspector.tsx
processFile('components/market-universe/TerminalInspector.tsx', content => {
  return content.replace(/\?\s*val\.toLocaleString\("en-IN",\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\)/g, '? formatPrice(val)');
});

// 9. components/market-universe/VirtualizedMarketTable.tsx
processFile('components/market-universe/VirtualizedMarketTable.tsx', content => {
  return content.replace(/\?\s*val\.toLocaleString\("en-IN",\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\)/g, '? formatPrice(val)');
});

// 10. components/options/OptionsGatewayControlBar.tsx
processFile('components/options/OptionsGatewayControlBar.tsx', content => {
  return content.replace(/spotPrice\.toLocaleString\(undefined,\s*\{[^}]+\}\)/g, 'formatPrice(spotPrice)');
});

// 11. components/options/StrikeCenteredOptionLadderTable.tsx
processFile('components/options/StrikeCenteredOptionLadderTable.tsx', content => {
  return content.replace(/\{ceOI\s*>\s*0\s*\?\s*\(ceOI\s*>=\s*1000\s*\?\s*`\$\{\(ceOI\s*\/\s*1000\)\.toFixed\(1\)\}k`\s*:\s*ceOI\.toLocaleString\(\)\)\s*:\s*renderValueOrDash\(null\)\}/g, '{formatVolume(ceOI)}')
                .replace(/\{ceVol\s*>\s*0\s*\?\s*ceVol\.toLocaleString\(\)\s*:\s*renderValueOrDash\(null\)\}/g, '{formatVolume(ceVol)}')
                .replace(/\{peVol\s*>\s*0\s*\?\s*peVol\.toLocaleString\(\)\s*:\s*renderValueOrDash\(null\)\}/g, '{formatVolume(peVol)}')
                .replace(/\{peOI\s*>\s*0\s*\?\s*\(peOI\s*>=\s*1000\s*\?\s*`\$\{\(peOI\s*\/\s*1000\)\.toFixed\(1\)\}k`\s*:\s*peOI\.toLocaleString\(\)\)\s*:\s*renderValueOrDash\(null\)\}/g, '{formatVolume(peOI)}');
});

// 12. components/pnl-journal/desk/AccountingBalanceStrip.tsx
processFile('components/pnl-journal/desk/AccountingBalanceStrip.tsx', content => {
  return content.replace(/return\s*num\.toLocaleString\("en-IN",\s*\{\s*maximumFractionDigits:\s*2,\s*minimumFractionDigits:\s*2\s*\}\);/g, 'return formatNumber(num, 2);');
});

console.log('Batch 2 refactoring completed.');
