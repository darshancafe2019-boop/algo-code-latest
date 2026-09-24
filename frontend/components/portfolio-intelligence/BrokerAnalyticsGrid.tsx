"use client";

import React, { memo } from "react";
import { BrokerPortfolio } from "@/types/portfolio-intelligence";
import { BrokerCard } from "./BrokerCard";

interface BrokerAnalyticsGridProps {
  brokers: BrokerPortfolio[];
  onBrokerClick?: (broker: BrokerPortfolio) => void;
}

export const BrokerAnalyticsGrid = memo(function BrokerAnalyticsGrid({
  brokers,
  onBrokerClick,
}: BrokerAnalyticsGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {brokers.map((broker) => (
          <BrokerCard
            key={broker.id}
            broker={broker}
            onClick={onBrokerClick}
          />
        ))}
      </div>
    </div>
  );
});
