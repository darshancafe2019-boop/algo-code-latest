const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function ensureImport(content, importNames, importPath = '@/lib/formatters') {
  const hasImport = content.includes(`from "${importPath}"`) || content.includes(`from '${importPath}'`);
  if (!hasImport) {
    return `import { ${importNames.join(', ')} } from "${importPath}";\n` + content;
  } else {
    // Check if names are already imported
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

// 1. components/market-universe/SimpleMarketTable.tsx
processFile('components/market-universe/SimpleMarketTable.tsx', content => {
  return content.replace(/\{instrument\.strike\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, '{formatPrice(instrument.strike)}');
});

// 2. components/market-universe/OptionChainModal.tsx
processFile('components/market-universe/OptionChainModal.tsx', content => {
  return content.replace(/Spot:\s*₹\{spotPrice\s*>\s*0\s*\?\s*spotPrice\.toLocaleString\(\)\s*:\s*"\.\.\."\}/g, 'Spot: {formatMoney(spotPrice, "₹")}');
});

// 3. components/market-universe/OptionsCommandCenter.tsx
processFile('components/market-universe/OptionsCommandCenter.tsx', content => {
  return content.replace(/\{call\?\.open_interest\s*\?\s*call\.open_interest\.toLocaleString\(\)\s*:\s*"N\/A"\}/g, '{formatVolume(call?.open_interest)}')
                .replace(/\{put\?\.open_interest\s*\?\s*put\.open_interest\.toLocaleString\(\)\s*:\s*"N\/A"\}/g, '{formatVolume(put?.open_interest)}');
});

// 4. components/market-universe/MarketTable.tsx
processFile('components/market-universe/MarketTable.tsx', content => {
  return content.replace(/\{inst\.last_price\s*!==\s*undefined\s*\?\s*inst\.last_price\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatPrice(inst.last_price)}');
});

// 5. components/market-universe/TopMoversBoard.tsx
processFile('components/market-universe/TopMoversBoard.tsx', content => {
  return content.replace(/\{inst\.last_price\s*\?\s*inst\.last_price\.toLocaleString\(undefined,\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"—"\}/g, '{formatPrice(inst.last_price)}');
});

// 6. components/market-universe/MarketScannerWorkbench.tsx
processFile('components/market-universe/MarketScannerWorkbench.tsx', content => {
  return content.replace(/\{inst\.last_price\s*\?\s*inst\.last_price\.toLocaleString\(undefined,\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"—"\}/g, '{formatPrice(inst.last_price)}');
});

// 7. components/market-universe/ContextualActionBar.tsx
processFile('components/market-universe/ContextualActionBar.tsx', content => {
  return content.replace(/\{instrument\.last_price\s*\?\s*instrument\.last_price\.toLocaleString\(undefined,\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"—"\}/g, '{formatPrice(instrument.last_price)}');
});

// 8. components/market-universe/GlobalMarketHeatmap.tsx
processFile('components/market-universe/GlobalMarketHeatmap.tsx', content => {
  return content.replace(/\{inst\.last_price\s*\?\s*inst\.last_price\.toLocaleString\(undefined,\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"—"\}/g, '{formatPrice(inst.last_price)}');
});

// 9. components/market-universe/InstrumentInspector.tsx
processFile('components/market-universe/InstrumentInspector.tsx', content => {
  return content.replace(/\{instrument\.strike\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, '{formatPrice(instrument.strike)}');
});

// 10. components/market-universe/InstrumentDetailDrawer.tsx
processFile('components/market-universe/InstrumentDetailDrawer.tsx', content => {
  return content.replace(/\{instrument\.volume_24h\s*\?\s*instrument\.volume_24h\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(instrument.volume_24h)}')
                .replace(/\{instrument\.open_interest\s*\?\s*instrument\.open_interest\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatVolume(instrument.open_interest)}');
});

// 11. components/trade-journal/TradeDetailDrawer.tsx
processFile('components/trade-journal/TradeDetailDrawer.tsx', content => {
  return content.replace(/\$\{trade\.exit_price\s*\?\s*Number\(trade\.exit_price\)\.toLocaleString\(\)\s*:\s*"Active"\}/g, '{trade.exit_price ? formatMoney(trade.exit_price, "$") : "Active"}')
                .replace(/\$\{trade\.stop_loss\s*\?\s*Number\(trade\.stop_loss\)\.toLocaleString\(\)\s*:\s*"None"\}/g, '{trade.stop_loss ? formatMoney(trade.stop_loss, "$") : "None"}')
                .replace(/\$\{trade\.take_profit\s*\?\s*Number\(trade\.take_profit\)\.toLocaleString\(\)\s*:\s*"Trailing"\}/g, '{trade.take_profit ? formatMoney(trade.take_profit, "$") : "Trailing"}');
});

// 12. components/terminal/TerminalRightPanel.tsx
processFile('components/terminal/TerminalRightPanel.tsx', content => {
  return content.replace(/\{item\.price\s*>\s*0\s*\?\s*\(item\.price\s*>=\s*1000\s*\?\s*item\.price\.toLocaleString\("en-US",\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\)\s*:\s*item\.price\.toFixed\(2\)\)\s*:\s*"—"\}/g, '{formatPrice(item.price)}');
});

// 13. components/terminal/TerminalTopBar.tsx
processFile('components/terminal/TerminalTopBar.tsx', content => {
  return content.replace(/\{price\s*>\s*0\s*\?\s*\(price\s*>=\s*1000\s*\?\s*price\.toLocaleString\("en-US",\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\)\s*:\s*price\.toFixed\(2\)\)\s*:\s*"—"\}/g, '{formatPrice(price)}');
});

// 14. components/terminal/TerminalSubPanes.tsx
processFile('components/terminal/TerminalSubPanes.tsx', content => {
  return content.replace(/`Vol:\s*\$\{vol\s*\?\s*vol\.toLocaleString\(\)\s*:\s*"—"\}\s*SMA:\s*\$\{sma\s*\?\s*sma\.toLocaleString\(\)\s*:\s*"—"\}`/g, '`Vol: ${formatVolume(vol)} SMA: ${formatNumber(sma, 2)}`')
                .replace(/`CVD:\s*\$\{cvd\s*\?\s*cvd\.toLocaleString\(\)\s*:\s*"—"\}`/g, '`CVD: ${formatVolume(cvd)}`');
});

// 15. components/strategy/StrategyBacktestPanel.tsx
processFile('components/strategy/StrategyBacktestPanel.tsx', content => {
  return content.replace(/\+\$\{backtestData\.total_net_profit\?\.toLocaleString\(\)\s*\|\|\s*"0"\}/g, '+{formatMoney(backtestData.total_net_profit, "$")}');
});

// 16. components/risk-management/RiskDecisionTable.tsx
processFile('components/risk-management/RiskDecisionTable.tsx', content => {
  return content.replace(/\$\{d\.requested_risk_usd\s*\?\s*d\.requested_risk_usd\.toLocaleString\(\)\s*:\s*"50\.00"\}/g, '{formatMoney(d.requested_risk_usd, "$")}');
});

// 17. components/risk-management/RiskSectionOverview.tsx
processFile('components/risk-management/RiskSectionOverview.tsx', content => {
  return content.replace(/\$\{maxOrderSize\s*>\s*0\s*\?\s*maxOrderSize\.toLocaleString\(undefined,\s*\{\s*maximumFractionDigits:\s*0\s*\}\)\s*:\s*"0"\}/g, '{formatMoney(maxOrderSize, "$", 0)}');
});

// 18. components/orders/OrdersLedgerDock.tsx
processFile('components/orders/OrdersLedgerDock.tsx', content => {
  return content.replace(/\$\{ord\.price\s*\?\s*ord\.price\.toLocaleString\(undefined,\s*\{\s*minimumFractionDigits:\s*2\s*\}\)\s*:\s*"MARKET"\}/g, '{ord.price ? formatMoney(ord.price, "$") : "MARKET"}');
});

// 19. components/nse/NseAlgoBotPanel.tsx
processFile('components/nse/NseAlgoBotPanel.tsx', content => {
  return content.replace(/₹\{signal\?\.spot_price\s*\?\s*signal\.spot_price\.toLocaleString\("en-IN"\)\s*:\s*"--"\}/g, '{formatMoney(signal?.spot_price, "₹")}')
                .replace(/₹\{signal\?\.max_pain\s*\?\s*signal\.max_pain\.toLocaleString\("en-IN"\)\s*:\s*"--"\}/g, '{formatMoney(signal?.max_pain, "₹")}');
});

// 20. components/nse/NseComprehensiveIntelligence.tsx
processFile('components/nse/NseComprehensiveIntelligence.tsx', content => {
  return content.replace(/\{item\.finalQuantity\s*\?\s*item\.finalQuantity\.toLocaleString\("en-IN"\)\s*:\s*"15,400"\}/g, '{formatQuantity(item.finalQuantity)}');
});

// 21. components/nse/NseMarketStrip.tsx
processFile('components/nse/NseMarketStrip.tsx', content => {
  return content.replace(/₹\{nifty\?\.LastTradedPrice\s*\?\s*nifty\.LastTradedPrice\.toLocaleString\("en-IN"\)\s*:\s*"24,350\.00"\}/g, '{formatMoney(nifty?.LastTradedPrice, "₹")}')
                .replace(/₹\{bankNifty\?\.LastTradedPrice\s*\?\s*bankNifty\.LastTradedPrice\.toLocaleString\("en-IN"\)\s*:\s*"52,400\.00"\}/g, '{formatMoney(bankNifty?.LastTradedPrice, "₹")}');
});

// 22. components/options/OptionsAdvancedDrawers.tsx
processFile('components/options/OptionsAdvancedDrawers.tsx', content => {
  return content.replace(/Vol:\s*\{opt\.volume\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, 'Vol: {formatVolume(opt.volume)}')
                .replace(/OI:\s*\{opt\.open_interest\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, 'OI: {formatVolume(opt.open_interest)}');
});

// 23. components/options/SimpleOptionOrderTicket.tsx
processFile('components/options/SimpleOptionOrderTicket.tsx', content => {
  return content.replace(/\{strike\s*\?\s*strike\.toLocaleString\(\)\s*:\s*"—"\}/g, '{formatPrice(strike)}');
});

// 24. components/options/terminal/OptionAnalyticsPanel.tsx
processFile('components/options/terminal/OptionAnalyticsPanel.tsx', content => {
  return content.replace(/\{snapshot\.supportZone\?\.strike\.toLocaleString\("en-IN"\)\s*\|\|\s*"—"\}/g, '{formatPrice(snapshot.supportZone?.strike)}')
                .replace(/\{snapshot\.resistanceZone\?\.strike\.toLocaleString\("en-IN"\)\s*\|\|\s*"—"\}/g, '{formatPrice(snapshot.resistanceZone?.strike)}');
});

// 25. components/options/terminal/OptionMarketSummaryCards.tsx
processFile('components/options/terminal/OptionMarketSummaryCards.tsx', content => {
  return content.replace(/\{snapshot\.maxPain\s*!==\s*null\s*\?\s*snapshot\.maxPain\.toLocaleString\("en-IN"\)\s*:\s*"N\/A"\}/g, '{formatPrice(snapshot.maxPain)}');
});

// 26. components/options/terminal/OptionOrderBook.tsx
processFile('components/options/terminal/OptionOrderBook.tsx', content => {
  return content.replace(/\{b\s*\?\s*b\.quantity\.toLocaleString\(\)\s*:\s*"—"\}/g, '{b ? formatQuantity(b.quantity) : "—"}')
                .replace(/\{a\s*\?\s*a\.quantity\.toLocaleString\(\)\s*:\s*"—"\}/g, '{a ? formatQuantity(a.quantity) : "—"}')
                .replace(/Total Bids:\s*\{depthData\?\.totalBidQty\?\.toLocaleString\(\)\s*\|\|\s*0\}/g, 'Total Bids: {formatQuantity(depthData?.totalBidQty)}')
                .replace(/Total Asks:\s*\{depthData\?\.totalAskQty\?\.toLocaleString\(\)\s*\|\|\s*0\}/g, 'Total Asks: {formatQuantity(depthData?.totalAskQty)}')
                .replace(/\{contract\.volume\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, '{formatVolume(contract.volume)}')
                .replace(/\{contract\.oi\?\.toLocaleString\(\)\s*\|\|\s*"—"\}/g, '{formatVolume(contract.oi)}');
});

// 27. src/features/markets/options/components/OptionsFlowView.tsx
processFile('src/features/markets/options/components/OptionsFlowView.tsx', content => {
  return content.replace(/\{snapshot\.resistanceZone\?\.strike\s*\?\s*snapshot\.resistanceZone\.strike\.toLocaleString\("en-IN"\)\s*:\s*"—"\}/g, '{formatPrice(snapshot.resistanceZone?.strike)}')
                .replace(/\{snapshot\.supportZone\?\.strike\s*\?\s*snapshot\.supportZone\.strike\.toLocaleString\("en-IN"\)\s*:\s*"—"\}/g, '{formatPrice(snapshot.supportZone?.strike)}')
                .replace(/\{snapshot\.maxPain\s*!==\s*null\s*&&\s*snapshot\.maxPain\s*!==\s*undefined\s*\?\s*snapshot\.maxPain\.toLocaleString\("en-IN"\)\s*:\s*"—"\}/g, '{formatPrice(snapshot.maxPain)}');
});

// 28. hooks/useMarketGateway.ts
processFile('hooks/useMarketGateway.ts', content => {
  return content.replace(/if\s*\(p\s*>=\s*10000\)\s*return\s*p\.toLocaleString\("en-US",\s*\{\s*minimumFractionDigits:\s*2,\s*maximumFractionDigits:\s*2\s*\}\);/g, 'if (p >= 10000) return formatNumber(p, 2);');
});

console.log('Finished refactoring remaining files.');
