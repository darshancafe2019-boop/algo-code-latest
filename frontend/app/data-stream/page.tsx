"use client";

import React from "react";
import { LiveStreamObservatory } from "@/components/stream/LiveStreamObservatory";

export default function DataStreamPage() {
  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      <LiveStreamObservatory />
    </div>
  );
}
