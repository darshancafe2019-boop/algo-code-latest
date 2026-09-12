"use client";

import React from "react";
import { ProductionSecurityControlCenter, SecurityTelemetry } from "@/components/security/ProductionSecurityControlCenter";

interface SimpleSecuritySectionProps {
  telemetry?: SecurityTelemetry;
  onRefresh?: () => void;
}

export function SimpleSecuritySection({ telemetry, onRefresh }: SimpleSecuritySectionProps) {
  return <ProductionSecurityControlCenter />;
}
