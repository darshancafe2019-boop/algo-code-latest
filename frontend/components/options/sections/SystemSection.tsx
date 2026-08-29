"use client";

import React, { useState } from "react";
import { ProviderStatusTab } from "../tabs/ProviderStatusTab";
import { AuditLogsTab } from "../tabs/AuditLogsTab";
import { Server, FileText } from "lucide-react";

export function SystemSection() {
  const [systemSubTab, setSystemSubTab] = useState<"providers" | "audit">("providers");

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Sub-Navigation Bar for System */}
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSystemSubTab("providers")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              systemSubTab === "providers"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Provider Capability Matrix</span>
          </button>

          <button
            onClick={() => setSystemSubTab("audit")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition ${
              systemSubTab === "audit"
                ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Event Audit Ledger (32-Field)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 px-2">
          Server-Side Signing &amp; Credentials Isolated
        </div>
      </div>

      {/* SUB-VIEW 1: PROVIDER CAPABILITY MATRIX */}
      {systemSubTab === "providers" && <ProviderStatusTab />}

      {/* SUB-VIEW 2: AUDIT LOGS */}
      {systemSubTab === "audit" && <AuditLogsTab />}
    </div>
  );
}
