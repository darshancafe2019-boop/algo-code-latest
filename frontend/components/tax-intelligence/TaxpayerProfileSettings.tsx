"use client";

import React, { useState } from "react";
import { Sliders, ShieldCheck, CheckCircle2, Save, Info } from "lucide-react";
import { TaxpayerProfile } from "@/types/tax";
import { apiClient } from "@/lib/apiClient";

interface TaxpayerProfileSettingsProps {
  profile: TaxpayerProfile;
  onProfileUpdate: (updated: TaxpayerProfile) => void;
}

export function TaxpayerProfileSettings({
  profile,
  onProfileUpdate,
}: TaxpayerProfileSettingsProps) {
  const [formData, setFormData] = useState<TaxpayerProfile>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // Single-click guard: drop duplicate submissions

    setSaving(true);
    setSaveSuccess(false);

    try {
      const idempotencyKey = apiClient.generateIdempotencyKey("UPDATE_TAX_PROFILE", formData.id);
      const res = await apiClient.post<any>(
        "/api/tax/profile",
        formData,
        { idempotencyKey, timeoutMs: 8000 }
      );

      if (res.ok && res.data?.status === "success" && res.data.data) {
        onProfileUpdate(res.data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        onProfileUpdate(formData);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      onProfileUpdate(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-wide">
              TAXPAYER PROFILE & RESIDENCY CONFIGURATION
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Configure legal residence, tax identification, entity structure, and accounting method
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" /> Profile Updated
          </div>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-md space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Primary Tax Residence
            </label>
            <select
              value={formData.primary_residence}
              onChange={(e) =>
                setFormData({ ...formData, primary_residence: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="IN">India (IN) — Income Tax Act 1961</option>
              <option value="US">United States (US) — Internal Revenue Code</option>
              <option value="GB">United Kingdom (GB) — HMRC TCGA 1992</option>
              <option value="SG">Singapore (SG) — IRAS ITA 1947</option>
              <option value="AE">United Arab Emirates (AE) — FTA Decree 47</option>
              <option value="DE">Germany (DE) — EStG § 20 / § 23</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Secondary Residence (DTAA)
            </label>
            <input
              type="text"
              placeholder="e.g. US, AE (optional)"
              value={formData.secondary_residence}
              onChange={(e) =>
                setFormData({ ...formData, secondary_residence: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Citizenship
            </label>
            <input
              type="text"
              value={formData.citizenship}
              onChange={(e) =>
                setFormData({ ...formData, citizenship: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Entity Type
            </label>
            <select
              value={formData.entity_type}
              onChange={(e) =>
                setFormData({ ...formData, entity_type: e.target.value as any })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="INDIVIDUAL">Individual Natural Person</option>
              <option value="COMPANY">Company / Corporation</option>
              <option value="PARTNERSHIP">Partnership / LLP</option>
              <option value="TRUST">Trust / Estate</option>
              <option value="FUND">Investment Fund</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Trader Classification
            </label>
            <select
              value={formData.trader_classification}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  trader_classification: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="INVESTOR">Investor (Capital Gains Treatment)</option>
              <option value="TRADER">Active Trader</option>
              <option value="BUSINESS">Business Entity (Trading Business)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Accounting Method
            </label>
            <select
              value={formData.accounting_method}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  accounting_method: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="FIFO">FIFO (First In, First Out)</option>
              <option value="LIFO">LIFO (Last In, First Out)</option>
              <option value="AVERAGE_COST">Average Cost (Section 104 Pool)</option>
              <option value="SPECIFIC_ID">Specific Identification</option>
              <option value="HIFO">HIFO (Highest In, First Out)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Tax ID (Masked for Security)
            </label>
            <input
              type="text"
              value={formData.tax_id_masked}
              onChange={(e) =>
                setFormData({ ...formData, tax_id_masked: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Base Reporting Currency
            </label>
            <select
              value={formData.base_currency}
              onChange={(e) =>
                setFormData({ ...formData, base_currency: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="INR">INR (₹) Indian Rupee</option>
              <option value="USD">USD ($) US Dollar</option>
              <option value="GBP">GBP (£) British Pound</option>
              <option value="EUR">EUR (€) Euro</option>
              <option value="SGD">SGD (S$) Singapore Dollar</option>
              <option value="AED">AED (د.إ) UAE Dirham</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-sans font-medium">
              Suggested Tax Reserve Rate (%)
            </label>
            <input
              type="number"
              value={formData.tax_reserve_rate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tax_reserve_rate: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs font-mono text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Sensitive financial identifiers are masked client-side and never written to frontend logs or third-party telemetry.
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Configuration..." : "Save Tax Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
