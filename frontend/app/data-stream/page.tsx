"use client";

import React from "react";
import { LiveStreamObservatory } from "@/components/stream/LiveStreamObservatory";

export default function DataStreamPage() {
  return (
    <div className="w-full space-y-6 pb-12">
      <LiveStreamObservatory />
    </div>
  );
}
