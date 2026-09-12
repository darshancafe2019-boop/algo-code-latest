"use client";

import React from "react";

export function AccountSecuritySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-28 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-6" />

      {/* Grid of Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-44 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-5" />
        <div className="h-44 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-5" />
        <div className="h-44 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-5" />
      </div>

      {/* Credentials & Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-6" />
        <div className="h-64 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-6" />
      </div>

      {/* Audit Log Table Skeleton */}
      <div className="h-72 rounded-2xl bg-[#121824]/60 border border-[#1A2A3F] p-6" />
    </div>
  );
}
