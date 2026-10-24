"use client";

import React, { memo } from "react";
import { TaxBrokerCard, TaxBrokerAccountData } from "./TaxBrokerCard";

interface TaxBrokerAnalyticsGridProps {
  brokers: TaxBrokerAccountData[];
  selectedBrokerId?: string;
  onSelectBroker?: (broker: TaxBrokerAccountData) => void;
}

export const TaxBrokerAnalyticsGrid = memo(function TaxBrokerAnalyticsGrid({
  brokers,
  selectedBrokerId,
  onSelectBroker,
}: TaxBrokerAnalyticsGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {brokers.map((broker) => (
          <TaxBrokerCard
            key={broker.id}
            broker={broker}
            isSelected={selectedBrokerId === broker.id || (selectedBrokerId === "ALL" && false)}
            onClick={onSelectBroker}
          />
        ))}
      </div>
    </div>
  );
});
