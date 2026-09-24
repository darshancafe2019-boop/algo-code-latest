"use client";

import React, { memo } from "react";
import { MultiDimAllocation } from "@/types/portfolio-intelligence";
import { AnalyticsCard } from "./AnalyticsCard";

interface AssetStrategySectorRiskGridProps {
  items: MultiDimAllocation[];
  onItemClick?: (item: MultiDimAllocation) => void;
}

export const AssetStrategySectorRiskGrid = memo(function AssetStrategySectorRiskGrid({
  items,
  onItemClick,
}: AssetStrategySectorRiskGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {items.map((item) => (
          <AnalyticsCard
            key={item.id}
            item={item}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
});
