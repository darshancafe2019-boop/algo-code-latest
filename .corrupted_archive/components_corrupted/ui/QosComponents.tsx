"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Trash2, Edit2, Plus, ShieldCheck } from "lucide-react";

/* ----------------------------------------------------------------------
 * 1. QOS CARD & PANEL (Dark Navy #0A1422 with #12304A border)
 * ---------------------------------------------------------------------- */
export interface QosCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
  active?: boolean;
  greenTint?: boolean;
}

export const QosCard = forwardRef<HTMLDivElement, QosCardProps>(
  ({ className, elevated = false, interactive = false, active = false, greenTint = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border transition-all duration-150 select-none",
          elevated
            ? "bg-[#0C1727] border-[#12304A]"
            : "bg-[#0A1422] border-[#12304A]",
          interactive && "hover:border-[#1A3E61] hover:bg-[#0F1C2F] cursor-pointer",
          active && "border-[#0EA5E9] shadow-[0_0_12px_rgba(14,165,233,0.15)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
QosCard.displayName = "QosCard";

export const QosPanel = QosCard;

/* ----------------------------------------------------------------------
 * 2. QOS STRATEGY SECTION (Quant.OS Dark Navy Section Card)
 * ---------------------------------------------------------------------- */
export interface QosStrategySectionProps extends React.HTMLAttributes<HTMLDivElement> {
  stepNumber: number | string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function QosStrategySection({
  stepNumber,
  title,
  subtitle,
  badge,
  rightAction,
  children,
  className,
  ...props
}: QosStrategySectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[#0A1422] border border-[#12304A] p-3.5 sm:p-4 space-y-3 select-none transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[#12304A]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-md bg-[#168BFF] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm shrink-0">
            {stepNumber}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold font-sans text-[#F8FAFC] uppercase tracking-wider">{title}</h3>
              {badge}
            </div>
            {subtitle && <p className="text-[11px] text-[#7D8EA5] font-sans mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------
 * 3. QOS RULE ROW (46-54px Compact Height)
 * ---------------------------------------------------------------------- */
export interface QosRuleRowProps {
  timeframe?: string;
  expression: string;
  category?: string;
  description?: string;
  relationship?: string;
  status?: "PASS" | "FAIL" | "PENDING";
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function QosRuleRow({
  timeframe = "15m",
  expression,
  category,
  description,
  relationship = "AND",
  status,
  onEdit,
  onDelete,
  className,
}: QosRuleRowProps) {
  return (
    <div
      className={cn(
        "min-h-[46px] p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] hover:border-[#1A3E61] flex flex-wrap items-center justify-between gap-2.5 transition-colors font-sans text-xs",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {timeframe && (
          <span className="px-1.5 py-0.5 rounded bg-[#07111F] text-[#22D3EE] border border-[#22D3EE]/30 font-mono font-bold text-[10px] uppercase shrink-0">
            {timeframe}
          </span>
        )}
        <span className="font-mono font-semibold text-[#F8FAFC] text-[11px] sm:text-xs tracking-tight tabular-nums truncate">
          {expression}
        </span>
        {description && (
          <span className="text-[10px] text-[#7D8EA5] font-sans truncate hidden sm:inline">
            ({description})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
        {status && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded font-bold border",
              status === "PASS" && "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/30",
              status === "FAIL" && "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/30",
              status === "PENDING" && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
            )}
          >
            {status}
          </span>
        )}
        {relationship && (
          <span className="px-1.5 py-0.5 rounded bg-[#0A1422] border border-[#12304A] text-[#7D8EA5] font-bold">
            {relationship}
          </span>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded hover:bg-[#0F1C2F] text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            title="Edit rule"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-[#FF3B5C]/15 text-[#7D8EA5] hover:text-[#FF3B5C] transition-colors cursor-pointer"
            title="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
 * 4. QOS METRIC / KPI CARD
 * ---------------------------------------------------------------------- */
export interface QosMetricCardProps {
  label: string;
  value: string | number;
  subtext?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  isPositive?: boolean;
  isNegative?: boolean;
  onClick?: () => void;
  className?: string;
}

export function QosMetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  isPositive,
  isNegative,
  onClick,
  className,
}: QosMetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl bg-[#0A1422] border border-[#12304A] flex flex-col justify-between transition-colors min-h-[88px] max-h-[110px]",
        onClick && "hover:border-[#1A3E61] hover:bg-[#0C1727] cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between text-[#7D8EA5]">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-[#22D3EE]" />}
      </div>
      <div className="my-1">
        <span
          className={cn(
            "text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums",
            isPositive ? "text-[#00E89A]" : isNegative ? "text-[#FF3B5C]" : "text-[#F8FAFC]"
          )}
        >
          {value}
        </span>
      </div>
      {subtext && (
        <div className="text-[10px] sm:text-[11px] text-[#7D8EA5] flex items-center gap-1 font-mono">
          {subtext}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------
 * 5. QOS PAGE HEADER & SECTION HEADER
 * ---------------------------------------------------------------------- */
export interface QosPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function QosPageHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: QosPageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#12304A]", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold font-sans text-[#F8FAFC] tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-[#7D8EA5] mt-0.5 font-sans">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export interface QosSectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export function QosSectionHeader({
  title,
  subtitle,
  rightAction,
  className,
}: QosSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between pb-2 mb-2.5 border-b border-[#12304A]", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">{title}</h2>
        {subtitle && <span className="text-[11px] font-mono text-[#7D8EA5]">{subtitle}</span>}
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------------
 * 6. QOS BUTTON
 * ---------------------------------------------------------------------- */
export interface QosButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger" | "warning" | "cyan" | "violet" | "addRule" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const QosButton = forwardRef<HTMLButtonElement, QosButtonProps>(
  ({ className, variant = "secondary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-sans font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
          // Sizes
          size === "sm" && "h-7 px-2.5 text-[11px] gap-1.5",
          size === "md" && "h-8 px-3 text-xs gap-2",
          size === "lg" && "h-9 px-4 text-xs gap-2.5",
          size === "icon" && "h-8 w-8 p-0",
          // Variants
          variant === "primary" && "bg-[#168BFF] hover:bg-[#0F6FD9] text-white border border-[#168BFF]/50 shadow-sm",
          variant === "secondary" && "bg-[#0A1422] hover:bg-[#0C1727] text-[#F8FAFC] border border-[#12304A] hover:border-[#1A3E61]",
          variant === "addRule" && "bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/40 rounded-lg h-7 text-[11px] font-mono font-bold",
          variant === "cyan" && "bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/40",
          variant === "success" && "bg-[#00E89A]/15 hover:bg-[#00E89A]/25 text-[#00E89A] border border-[#00E89A]/40",
          variant === "danger" && "bg-[#FF3B5C]/15 hover:bg-[#FF3B5C]/25 text-[#FF3B5C] border border-[#FF3B5C]/40",
          variant === "warning" && "bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/40",
          variant === "violet" && "bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 text-[#A78BFA] border border-[#7C3AED]/40",
          variant === "ghost" && "bg-transparent hover:bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC]",
          variant === "outline" && "bg-transparent border border-[#12304A] hover:border-[#1A3E61] text-[#7D8EA5] hover:text-[#F8FAFC]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
QosButton.displayName = "QosButton";

/* ----------------------------------------------------------------------
 * 7. QOS BADGE & STATUS DOT
 * ---------------------------------------------------------------------- */
export interface QosBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?:
    | "LIVE"
    | "CONNECTED"
    | "HEALTHY"
    | "PAPER"
    | "SHADOW"
    | "LIVE_LOCKED"
    | "AUTH_FAILED"
    | "STALE"
    | "DISCONNECTED"
    | "DISABLED"
    | "LONG"
    | "SHORT"
    | "SUCCESS"
    | "PASS"
    | "ERROR"
    | "FAIL"
    | "WARNING"
    | "INFO"
    | "READY"
    | "DRAFT"
    | "ACTIVE"
    | "VALIDATED"
    | "PUBLISHED"
    | "DEPLOYED";
  dot?: boolean;
}

export function QosBadge({
  status = "INFO",
  dot = true,
  children,
  className,
  ...props
}: QosBadgeProps) {
  const s = status.toUpperCase();

  const isGreen = s === "LIVE" || s === "CONNECTED" || s === "HEALTHY" || s === "LONG" || s === "SUCCESS" || s === "PASS" || s === "READY" || s === "ACTIVE" || s === "VALIDATED" || s === "PUBLISHED" || s === "DEPLOYED";
  const isRed = s === "DISCONNECTED" || s === "AUTH_FAILED" || s === "SHORT" || s === "ERROR" || s === "FAIL";
  const isAmber = s === "LIVE_LOCKED" || s === "STALE" || s === "WARNING";
  const isCyan = s === "PAPER" || s === "INFO" || s === "DRAFT";
  const isViolet = s === "SHADOW";
  const isGray = s === "DISABLED" || s === "NOT_CONFIGURED";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border select-none",
        isGreen && "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/30",
        isRed && "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/30",
        isAmber && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
        isCyan && "bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/30",
        isViolet && "bg-[#7C3AED]/10 text-[#A78BFA] border-[#7C3AED]/30",
        isGray && "bg-[#475569]/10 text-[#7D8EA5] border-[#475569]/30",
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            isGreen && "bg-[#00E89A]",
            isRed && "bg-[#FF3B5C]",
            isAmber && "bg-[#F59E0B]",
            isCyan && "bg-[#22D3EE]",
            isViolet && "bg-[#7C3AED]",
            isGray && "bg-[#7D8EA5]"
          )}
        />
      )}
      {children || status.replace("_", " ")}
    </span>
  );
}

/* ----------------------------------------------------------------------
 * 8. QOS TABS
 * ---------------------------------------------------------------------- */
export interface QosTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

export interface QosTabsProps {
  tabs: QosTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function QosTabs({ tabs, activeTab, onTabChange, className, size = "md" }: QosTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-[#07111F] border border-[#12304A] overflow-x-auto scrollbar-none", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-lg text-xs font-sans font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap select-none",
              size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs",
              isActive
                ? "bg-[#168BFF] text-white border border-[#168BFF] shadow-sm font-bold"
                : "bg-[#0A1422] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A] hover:border-[#1A3E61]"
            )}
          >
            {Icon && <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-[#7D8EA5]")} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded font-mono", isActive ? "bg-white/20 text-white" : "bg-[#12304A] text-[#7D8EA5]")}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------
 * 9. QOS INPUT & SELECT
 * ---------------------------------------------------------------------- */
export interface QosInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType<{ className?: string }>;
}

export const QosInput = forwardRef<HTMLInputElement, QosInputProps>(
  ({ className, icon: Icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-[#7D8EA5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-8 bg-[#0A1422] border border-[#12304A] rounded-lg px-3 text-xs text-[#F8FAFC] font-sans placeholder:text-[#7D8EA5] focus:outline-none focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE]/20 transition-colors",
            Icon && "pl-8",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
QosInput.displayName = "QosInput";

export interface QosSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const QosSelect = forwardRef<HTMLSelectElement, QosSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-8 bg-[#0A1422] border border-[#12304A] rounded-lg px-2.5 text-xs text-[#F8FAFC] font-sans focus:outline-none focus:border-[#22D3EE] transition-colors cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
QosSelect.displayName = "QosSelect";

/* ----------------------------------------------------------------------
 * 10. QOS TABLE SUITE
 * ---------------------------------------------------------------------- */
export function QosTable({ children, className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto w-full scrollbar-none">
      <table className={cn("w-full text-left border-collapse font-sans text-xs", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function QosTableHead({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("border-b border-[#12304A] bg-[#07111F] text-[10px] text-[#7D8EA5] uppercase tracking-wider font-semibold sticky top-0 backdrop-blur-md", className)} {...props}>
      {children}
    </thead>
  );
}

export function QosTableBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-[#12304A] text-[#F8FAFC]", className)} {...props}>{children}</tbody>;
}

export function QosTableRow({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "h-8 hover:bg-[#0C1727] transition-colors duration-100",
        onClick && "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function QosTableCell({ children, className, align = "left", ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "center" | "right" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={cn("py-2 px-3", alignClass, className)} {...props}>{children}</td>;
}

export function QosTableHeadCell({ children, className, align = "left", ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "center" | "right" }) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={cn("py-2 px-3 font-semibold", alignClass, className)} {...props}>{children}</th>;
}

/* ----------------------------------------------------------------------
 * 11. QOS BROKER ROW
 * ---------------------------------------------------------------------- */
export interface QosBrokerRowProps {
  name: string;
  status: string;
  latency?: string;
  isOnline?: boolean;
}

export function QosBrokerRow({ name, status, latency = "42ms", isOnline = true }: QosBrokerRowProps) {
  return (
    <div className="p-2.5 rounded-lg bg-[#0C1727] border border-[#12304A] flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-[#00E89A]" : "bg-[#FF3B5C]")} />
        <span className="font-semibold text-[#F8FAFC]">{name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold border",
            isOnline ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/30" : "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/30"
          )}
        >
          ● {status}
        </span>
        <span className="text-[#7D8EA5] tabular-nums">{latency}</span>
      </div>
    </div>
  );
}
