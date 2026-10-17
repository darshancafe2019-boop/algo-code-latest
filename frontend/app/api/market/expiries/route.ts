import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_URL =
  process.env.MARKET_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_MARKET_GATEWAY_URL ||
  `http://127.0.0.1:${process.env.MARKET_GATEWAY_PORT || "5051"}`;

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

/**
 * Calculates dynamic future expiries starting strictly from today onwards.
 * Prevents past/stale dates under all fallback scenarios.
 */
function getFutureCalendarExpiries(isCrypto: boolean): string[] {
  const result: string[] = [];
  const now = new Date();
  
  if (isCrypto) {
    // Crypto daily and weekly expiries
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      result.push(d.toISOString().slice(0, 10));
    }
    // Add next 3 weekly Fridays
    for (let w = 2; w <= 4; w++) {
      const d = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      result.push(d.toISOString().slice(0, 10));
    }
  } else {
    // Indian Market: Thursdays (or upcoming days)
    const currentDay = now.getDay(); // 0 is Sun, 4 is Thu
    let daysUntilThu = (4 - currentDay + 7) % 7;
    if (daysUntilThu === 0 && now.getHours() >= 15 && now.getMinutes() >= 30) {
      daysUntilThu = 7;
    }
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getTime() + (daysUntilThu + i * 7) * 24 * 60 * 60 * 1000);
      result.push(d.toISOString().slice(0, 10));
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawUnderlying = searchParams.get("underlying") || searchParams.get("symbol") || "NIFTY";
  const underlying = rawUnderlying.trim().toUpperCase();
  const marketType = (searchParams.get("market_type") || searchParams.get("market") || "INDIA_OPTION").toUpperCase();
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying) || marketType.includes("CRYPTO");

  // ── 1. Query Central Market Data Gateway directly (Port 5051) ─────────────
  // Gateway maintains the authoritative in-memory cache for Upstox, Delta, and Indian instruments.
  try {
    const prov = isCrypto ? "DELTA" : "UPSTOX";
    const gwUrl = `${GATEWAY_URL}/api/options/chain?underlying=${encodeURIComponent(underlying)}&provider=${prov}`;
    const gwRes = await fetch(gwUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (gwRes.ok) {
      const gwData = await gwRes.json();
      const rawExpiries: any[] =
        gwData.available_expiries ||
        gwData.availableExpiries ||
        gwData.expiries ||
        [];

      if (Array.isArray(rawExpiries) && rawExpiries.length > 0) {
        const nowMs = Date.now();
        const formatted = rawExpiries.map((expItem: any, idx: number) => {
          let rawStr = typeof expItem === "string" ? expItem : (expItem.expiry || expItem.expiry_iso || expItem.expiry_date || String(expItem));
          let expIso = rawStr;
          let ddmmyyyy = rawStr;

          // Normalize DD-MM-YYYY vs YYYY-MM-DD
          if (typeof rawStr === "string" && rawStr.length === 10) {
            if (rawStr[2] === "-" && rawStr[5] === "-") {
              const parts = rawStr.split("-");
              expIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
              ddmmyyyy = rawStr;
            } else if (rawStr[4] === "-" && rawStr[7] === "-") {
              const parts = rawStr.split("-");
              ddmmyyyy = `${parts[2]}-${parts[1]}-${parts[0]}`;
              expIso = rawStr;
            }
          }

          let daysToExpiry = 0;
          try {
            const expTime = new Date(expIso).getTime();
            daysToExpiry = Math.max(0, (expTime - nowMs) / (1000 * 60 * 60 * 24));
          } catch {
            daysToExpiry = (idx + 1) * 7;
          }

          let suffix = "";
          let expiryType = "MONTHLY";
          if (daysToExpiry <= 0.5) {
            suffix = " (Today)";
            expiryType = "DAILY";
          } else if (daysToExpiry <= 1.5) {
            suffix = " (Tomorrow)";
            expiryType = "DAILY";
          } else if (daysToExpiry <= 2.5) {
            suffix = " (Daily)";
            expiryType = "DAILY";
          } else if (daysToExpiry <= 21) {
            suffix = " (Weekly)";
            expiryType = "WEEKLY";
          } else {
            suffix = " (Monthly)";
            expiryType = "MONTHLY";
          }

          const displayLabel = expItem.display_label || expItem.label || `${ddmmyyyy}${suffix}`;

          return {
            expiry: expIso,
            expiry_iso: expIso,
            expiry_date: ddmmyyyy,
            settlement_time: expItem.settlement_time || `${expIso}T12:00:00Z`,
            display_label: displayLabel,
            label: displayLabel,
            display: ddmmyyyy,
            expiry_type: expItem.expiry_type || expiryType,
            underlying: underlying,
            region: isCrypto ? "INDIA" : "NSE",
            contract_count: expItem.contract_count || 0,
            state: expItem.state || "live",
            source: isCrypto ? "DELTA_INDIA" : "GATEWAY_UPSTOX_LIVE",
            last_synced_at: new Date().toISOString(),
            days_to_expiry: Math.round(daysToExpiry * 100) / 100,
            category: expiryType,
            tradable: true,
          };
        });

        // Ensure chronological ordering by ISO date
        formatted.sort((a: any, b: any) => a.expiry_iso.localeCompare(b.expiry_iso));

        return NextResponse.json({
          success: true,
          data: formatted,
          raw_expiries: rawExpiries,
          expiries: formatted,
          source: isCrypto ? "DELTA_INDIA" : "GATEWAY_UPSTOX_LIVE",
        });
      }
    }
  } catch (gwErr: any) {
    console.warn("[/api/market/expiries] Gateway probe notice:", gwErr?.message);
  }

  // ── 2. Crypto Specialization: Delta Product Service fallback ──────────────
  if (isCrypto) {
    try {
      const { deltaProductService } = await import("@/lib/brokers/delta/delta-product-service");
      const registry = await deltaProductService.getExpiryRegistry(underlying);
      if (registry && registry.expiries && registry.expiries.length > 0) {
        const formattedExpiries = registry.expiries.map((e) => {
          let suffix = "";
          if (e.daysToExpiry <= 0.5) suffix = " (Today)";
          else if (e.daysToExpiry <= 1.5) suffix = " (Tomorrow)";
          else if (e.category === "WEEKLY") suffix = " (Weekly)";
          else if (e.category === "MONTHLY") suffix = " (Monthly)";

          return {
            expiry: e.expiryIso,
            expiry_date: e.expiryApiFormat,
            expiry_iso: e.expiryIso,
            label: `${e.expiryDisplay}${suffix}`,
            display: e.expiryDisplay,
            days_to_expiry: e.daysToExpiry,
            category: e.category,
            tradable: true,
            contract_count: e.contractCount,
          };
        });

        return NextResponse.json({
          success: true,
          data: formattedExpiries,
          raw_expiries: registry.expiries.map((e) => e.expiryIso),
          expiries: formattedExpiries,
          source: "DELTA_PRODUCT_SERVICE",
        });
      }
    } catch (deltaErr: any) {
      console.warn("[/api/market/expiries] deltaProductService discovery note:", deltaErr?.message);
    }
  }

  // ── 3. Query Backend API (Port 5050) ───────────────────────────────────────
  try {
    const upstreamRes = await fetch(
      `${BACKEND_URL}/api/market/expiries?${searchParams.toString()}`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) }
    );
    if (upstreamRes.ok) {
      const body = await upstreamRes.json();
      if (body && (body.data || body.expiries)) {
        return NextResponse.json(body);
      }
    }
  } catch (err: any) {
    console.warn("[/api/market/expiries] Backend query fallback:", err?.message);
  }

  // ── 4. Dynamic Calendar Future Fallback (Guaranteed never in past) ─────────
  const fallback = getFutureCalendarExpiries(isCrypto);
  const nowMs = Date.now();

  const formattedFallback = fallback.map((exp, i) => {
    let daysToExpiry = (i + 1) * 7;
    try {
      daysToExpiry = Math.max(0, Math.ceil((new Date(exp).getTime() - nowMs) / (1000 * 60 * 60 * 24)));
    } catch {}

    return {
      expiry: exp,
      expiry_date: exp,
      expiry_iso: exp,
      label: exp,
      display: exp,
      days_to_expiry: daysToExpiry,
      tradable: true,
    };
  });

  return NextResponse.json({
    success: true,
    data: formattedFallback,
    raw_expiries: fallback,
    expiries: formattedFallback,
    source: "DYNAMIC_CALENDAR_FALLBACK",
  });
}
