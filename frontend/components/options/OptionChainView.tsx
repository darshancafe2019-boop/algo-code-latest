"use client";

import React from "react";
import { OptionSource } from "@/types/option-chain";
import { OptionChainTerminal } from "./terminal/OptionChainTerminal";

interface OptionChainViewProps {
  initialSource?: OptionSource;
  initialUnderlying?: string;
  isSourceLocked?: boolean;
}

export function OptionChainView({
  initialSource = "DHAN",
  initialUnderlying,
  isSourceLocked = false,
}: OptionChainViewProps = {}) {
  const defaultUnderlying =
    initialUnderlying ||
    (initialSource === "DELTA_INDIA" || initialSource === "DELTA" || initialSource === "BINANCE" ? "BTC" : "NIFTY");

  return (
    <OptionChainTerminal
      initialUnderlying={defaultUnderlying}
      initialSource={initialSource}
      isSourceLocked={isSourceLocked}
    />
  );
}
