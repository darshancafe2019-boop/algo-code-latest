"use client";

import React from "react";
import { useSharedTradingState } from "./useSharedTradingState";
import { TopCommandBar } from "./TopCommandBar";
import { SystemStatusBar } from "./SystemStatusBar";
import { WorkflowStepper } from "./WorkflowStepper";
import { TradeDecisionCard } from "./TradeDecisionCard";
import { AiStatusCard } from "./AiStatusCard";
import { RiskSummaryCard } from "./RiskSummaryCard";
import { ExecutionCard } from "./ExecutionCard";
import { CurrentPositionPanel } from "./CurrentPositionPanel";
import { MarketContextCard } from "./MarketContextCard";
import { PerformanceSummaryCard } from "./PerformanceSummaryCard";
import { QuickAccessBar } from "./QuickAccessBar";
import { UniversalDetailsDrawer } from "./UniversalDetailsDrawer";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { LiveTradingSafetyModal } from "./LiveTradingSafetyModal";
import { EmergencyKillSwitchModal } from "./EmergencyKillSwitchModal";
import { AiTradingFrameworkDiagram } from "./AiTradingFrameworkDiagram";

export const TradingOrchestratorView: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    complexityMode,
    setComplexityMode,

    systemStatus,
    providers,
    healthyProvidersCount,
    checkpoints,
    currentStage,
    activeDecision,
    riskRules,
    riskOverallStatus,
    activePosition,
    performanceSummary,
    marketContext,
    isLoading,

    drawerOpen,
    drawerContent,
    drawerTitle,
    drawerData,
    openDrawer,
    closeDrawer,

    commandPaletteOpen,
    setCommandPaletteOpen,
    killConfirmOpen,
    setKillConfirmOpen,
    liveConfirmOpen,
    setLiveConfirmOpen,

    handleTriggerCheckpoint,
    handleApproveDecision,
    handleRejectDecision,
    handleExecutePaperTrade,
    handleKillSwitch,
    handleResetKillSwitch,
    handleTogglePause,
    handleArmLiveTrading,
    fetchState,
  } = useSharedTradingState();

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 text-slate-100 space-y-4 font-sans select-none">
      {/* 1. Persistent Top Command Bar */}
      <TopCommandBar
        system={systemStatus}
        viewMode={viewMode}
        complexityMode={complexityMode}
        healthyProvidersCount={healthyProvidersCount}
        totalProvidersCount={providers.length}
        onSelectViewMode={setViewMode}
        onToggleComplexity={() =>
          setComplexityMode((prev) => (prev === "simple" ? "advanced" : "simple"))
        }
        onOpenKillModal={() => setKillConfirmOpen(true)}
        onResetKill={handleResetKillSwitch}
        onStart={fetchState}
        onPauseToggle={handleTogglePause}
        isLoading={isLoading}
      />

      {/* 2. MODE: LIVE OPERATIONS (Default!) */}
      {viewMode === "operations" && (
        <div className="space-y-4">
          {/* AREA 1: SYSTEM STATUS STRIP */}
          <SystemStatusBar
            system={systemStatus}
            providers={providers}
            healthyCount={healthyProvidersCount}
            riskStatus={riskOverallStatus}
            onOpenDrawer={openDrawer}
          />

          {/* AREA 2: TODAY'S WORKFLOW STEPPER */}
          <WorkflowStepper
            checkpoints={checkpoints}
            currentStage={currentStage}
            onTriggerStage={handleTriggerCheckpoint}
            onOpenDrawer={openDrawer}
            isLoading={isLoading}
          />

          {/* AREA 3 & 4: 2-COLUMN OPERATIONAL CORE (DECISION + AI vs RISK + EXECUTION) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Decision + AI */}
            <div className="space-y-4 flex flex-col">
              <TradeDecisionCard
                decision={activeDecision}
                onApprove={handleApproveDecision}
                onReject={handleRejectDecision}
                onOpenDrawer={openDrawer}
                isLoading={isLoading}
              />

              <AiStatusCard
                decision={activeDecision}
                onOpenDrawer={openDrawer}
                onReanalyze={fetchState}
                isLoading={isLoading}
              />
            </div>

            {/* Right Column: Risk + Execution */}
            <div className="space-y-4 flex flex-col">
              <RiskSummaryCard
                rules={riskRules}
                overallStatus={riskOverallStatus}
                onOpenDrawer={openDrawer}
              />

              <ExecutionCard
                tradingMode={systemStatus.tradingMode}
                liveTradingEnabled={systemStatus.liveTradingEnabled}
                onExecutePaper={handleExecutePaperTrade}
                onOpenLiveModal={() => setLiveConfirmOpen(true)}
                onOpenDrawer={openDrawer}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Current Position Panel */}
          <CurrentPositionPanel position={activePosition} onOpenDrawer={openDrawer} />

          {/* ADVANCED ON DEMAND SECTIONS */}
          {complexityMode === "advanced" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <MarketContextCard context={marketContext} onOpenDrawer={openDrawer} />
              <PerformanceSummaryCard
                performance={performanceSummary}
                onOpenDrawer={openDrawer}
              />
            </div>
          )}

          {/* AREA 5: QUICK ACCESS BAR */}
          <QuickAccessBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        </div>
      )}

      {/* 3. MODE: AI FRAMEWORK DIAGRAM */}
      {viewMode === "diagram" && (
        <AiTradingFrameworkDiagram
          onTriggerCheckpoint={handleTriggerCheckpoint}
          onKillSwitch={() => setKillConfirmOpen(true)}
          isKilled={systemStatus.isKilled}
          tradingMode={systemStatus.tradingMode}
          liveTradingEnabled={systemStatus.liveTradingEnabled}
          activeCheckpointId={currentStage?.id}
          latestDecision={activeDecision}
        />
      )}

      {/* 4. MODE: COMBINED WORKSPACE (Advanced 3-Column Layout) */}
      {viewMode === "combined" && (
        <div className="space-y-4">
          <SystemStatusBar
            system={systemStatus}
            providers={providers}
            healthyCount={healthyProvidersCount}
            riskStatus={riskOverallStatus}
            onOpenDrawer={openDrawer}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Schedule & Stages */}
            <div className="space-y-4">
              <WorkflowStepper
                checkpoints={checkpoints}
                currentStage={currentStage}
                onTriggerStage={handleTriggerCheckpoint}
                onOpenDrawer={openDrawer}
                isLoading={isLoading}
              />
              <MarketContextCard context={marketContext} onOpenDrawer={openDrawer} />
            </div>

            {/* Center: Decision & AI */}
            <div className="space-y-4">
              <TradeDecisionCard
                decision={activeDecision}
                onApprove={handleApproveDecision}
                onReject={handleRejectDecision}
                onOpenDrawer={openDrawer}
                isLoading={isLoading}
              />
              <AiStatusCard
                decision={activeDecision}
                onOpenDrawer={openDrawer}
                onReanalyze={fetchState}
                isLoading={isLoading}
              />
            </div>

            {/* Right: Risk & Execution */}
            <div className="space-y-4">
              <RiskSummaryCard
                rules={riskRules}
                overallStatus={riskOverallStatus}
                onOpenDrawer={openDrawer}
              />
              <ExecutionCard
                tradingMode={systemStatus.tradingMode}
                liveTradingEnabled={systemStatus.liveTradingEnabled}
                onExecutePaper={handleExecutePaperTrade}
                onOpenLiveModal={() => setLiveConfirmOpen(true)}
                onOpenDrawer={openDrawer}
                isLoading={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrentPositionPanel position={activePosition} onOpenDrawer={openDrawer} />
            <PerformanceSummaryCard
              performance={performanceSummary}
              onOpenDrawer={openDrawer}
            />
          </div>

          <QuickAccessBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        </div>
      )}

      {/* 5. UNIVERSAL DETAILS DRAWER */}
      <UniversalDetailsDrawer
        isOpen={drawerOpen}
        contentType={drawerContent}
        title={drawerTitle}
        data={drawerData}
        onClose={closeDrawer}
        onTriggerCheckpoint={handleTriggerCheckpoint}
      />

      {/* 6. COMMAND PALETTE MODAL (CTRL+K) */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenDrawer={openDrawer}
        onEmergencyStop={() => setKillConfirmOpen(true)}
      />

      {/* 7. LIVE TRADING SAFETY MODAL */}
      <LiveTradingSafetyModal
        isOpen={liveConfirmOpen}
        onClose={() => setLiveConfirmOpen(false)}
        onConfirmLive={handleArmLiveTrading}
      />

      {/* 8. EMERGENCY KILL SWITCH MODAL */}
      <EmergencyKillSwitchModal
        isOpen={killConfirmOpen}
        isKilled={systemStatus.isKilled}
        onClose={() => setKillConfirmOpen(false)}
        onConfirmKill={handleKillSwitch}
        onResetKill={handleResetKillSwitch}
      />
    </div>
  );
};
