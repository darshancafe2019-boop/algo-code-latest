import { Metadata } from "next";
import { TradingOrchestratorView } from "@/components/trading-orchestrator/TradingOrchestratorView";

export const metadata: Metadata = {
  title: "Trading Orchestrator | Quant.OS",
  description: "AI-Assisted Scheduled Trading Framework with automated daily checkpoints and risk controls.",
};

export default function TradingOrchestratorPage() {
  return (
    <main className="min-h-screen bg-[#07090E] pt-4 pb-12">
      <TradingOrchestratorView />
    </main>
  );
}
