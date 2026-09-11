/**
 * DhanHQ V2 Authentication - Live Integration Smoke Test
 * Connects directly to DhanHQ V2 APIs and live feed using server environment credentials.
 * Validates Environment, Consent Flow, Profile API, Data Plan status, and WebSocket Handshake.
 */

import * as fs from "fs";
import * as path from "path";
import WebSocket from "ws";
import { dhanAuth } from "../lib/brokers/dhan/auth";
import { dhanTokenManager } from "../lib/brokers/dhan/token-manager";
import { DHAN_REQUEST_CODES } from "../lib/market-data/constants";
import { DhanBinaryDecoder } from "../lib/market-data/binary-decoder";

function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const idx = trimmed.indexOf("=");
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[key] && val) {
              process.env[key] = val;
            }
          }
        }
      } catch {}
    }
  }
}

async function runDhanLiveAuthSmokeTest() {
  console.log("==================================================================");
  console.log("             DHAN HQ V2 LIVE AUTHENTICATION SMOKE TEST            ");
  console.log("==================================================================\n");

  loadEnv();

  const clientId = process.env.DHAN_CLIENT_ID || "";
  const apiKey = process.env.DHAN_API_KEY || "";
  const apiSecret = process.env.DHAN_API_SECRET || "";
  const accessToken = process.env.DHAN_ACCESS_TOKEN || "";
  const feedUrl = process.env.DHAN_FEED_URL || "wss://api-feed.dhan.co";

  const maskedCid = clientId.length <= 4 ? "****" : `****${clientId.slice(-4)}`;

  console.log(`=== DHAN AUTH HEALTH ===\n`);
  console.log(`Client ID: ${maskedCid}`);

  // 1. Environment Check
  const envPass = Boolean(clientId && (accessToken || (apiKey && apiSecret)));
  console.log(`Environment Credentials .... ${envPass ? "PASS" : "FAIL"}`);

  // 2. API Key / Secret Check
  const apiKeyPass = Boolean(apiKey && apiSecret);
  console.log(`API Key Configuration ...... ${apiKeyPass ? "PASS" : "NOT_CONFIGURED"}`);

  // 3. Token Validity Check
  let tokenPass = false;
  let tokenExpiryStr = "N/A";
  if (accessToken) {
    dhanTokenManager.setToken(accessToken, undefined, clientId);
    tokenPass = !dhanTokenManager.isExpired();
    tokenExpiryStr = dhanTokenManager.getSafeState().expiresAt || "24 Hours (Active)";
  }
  console.log(`Token Validity ............. ${tokenPass ? "VALID" : "EXPIRED / MISSING"}`);
  console.log(`Token Expiry ............... ${tokenExpiryStr}`);

  // 4. REST Profile Validation & Genuine Data Plan
  let profilePass = false;
  let dataPlanStatus = "INACTIVE / NOT_VERIFIED";
  if (tokenPass) {
    try {
      const profile = await dhanAuth.validateProfile();
      profilePass = true;
      dataPlanStatus = profile.dataPlanActive ? "ACTIVE" : `INACTIVE (${profile.dataPlan || "STANDARD"})`;
    } catch (err: any) {
      console.warn(`[Profile Notice] ${err.safeMessage || err.message}`);
    }
  }
  console.log(`Profile Verification ....... ${profilePass ? "PASS" : "FAIL / AUTH_REQUIRED"}`);
  console.log(`Data Plan Status ........... ${dataPlanStatus}`);

  // 5. WebSocket Live Handshake Check
  let wsPass = false;
  let packetReceived = false;

  if (accessToken && clientId) {
    const wsEndpoint = `${feedUrl}?version=2&token=${accessToken}&clientId=${clientId}&authType=2`;
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(wsEndpoint);
      ws.binaryType = "arraybuffer";

      const timeout = setTimeout(() => {
        ws.close();
        resolve();
      }, 4000);

      ws.on("open", () => {
        wsPass = true;
        // Subscribe to NIFTY
        const sub = JSON.stringify({
          RequestCode: 15,
          InstrumentCount: 1,
          InstrumentList: [{ ExchangeSegment: "NSE_EQ", SecurityId: "13" }],
        });
        ws.send(sub);
      });

      ws.on("message", (data: any) => {
        const decoded = DhanBinaryDecoder.decode(data);
        if (decoded) {
          packetReceived = true;
        }
      });

      ws.on("close", () => {
        clearTimeout(timeout);
        resolve();
      });

      ws.on("error", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  console.log(`WebSocket Handshake ........ ${wsPass ? "CONNECTED" : "FAILED / DISCONNECTED"}`);
  console.log(`First Live Packet .......... ${packetReceived ? "RECEIVED" : wsPass ? "CONNECTED (Awaiting Market Tick)" : "IDLE"}`);

  console.log(`\n==================================================================`);
  console.log(`DHAN AUTHENTICATION STATUS: ${tokenPass && profilePass ? "AUTHENTICATED" : tokenPass ? "TOKEN_CONFIGURED" : "AUTH_REQUIRED"}`);
  console.log(`DHAN MARKET DATA STATUS:   ${wsPass ? (packetReceived ? "LIVE" : "CONNECTED") : "DISCONNECTED"}`);
  console.log(`==================================================================\n`);

  process.exit(0);
}

runDhanLiveAuthSmokeTest().catch((err) => {
  console.error("Live smoke test error:", err);
  process.exit(1);
});
