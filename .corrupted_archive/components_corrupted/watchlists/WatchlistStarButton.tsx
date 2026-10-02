"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { MarketInstrument } from "@/types/market-universe";

interface WatchlistStarButtonProps {
  instrument: Partial<MarketInstrument> | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  onToggled?: (isWatched: boolean) => void;
}

export function WatchlistStarButton({
  instrument,
  size = "md",
  showLabel = false,
  className = "",
  onToggled,
}: WatchlistStarButtonProps) {
  const { isWatched, toggleWatchlist } = useWatchlist();
  const [isAnimating, setIsAnimating] = useState(false);

  const watched = isWatched(instrument);

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  const paddingClasses = {
    sm: "p-1 rounded-md",
    md: "p-1.5 rounded-lg",
    lg: "p-2 rounded-xl",
  }[size];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimating(true);
    toggleWatchlist(instrument);
    if (onToggled) onToggled(!watched);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const titleText = watched ? "Remove from Watchlist" : "Add to Watchlist";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={titleText}
      aria-label={titleText}
      className={`inline-flex items-center gap-1.5 transition-all select-none group/star ${paddingClasses} ${
        watched
          ? "text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30"
          : "text-[var(--theme-text-muted)] hover:text-amber-400 hover:bg-[var(--theme-elevated)] border border-transparent hover:border-[var(--theme-border)]"
      } ${className}`}
    >
      <Star
        className={`${sizeClasses} transition-transform ${
          isAnimating ? "scale-125 duration-150" : "scale-100"
        } ${watched ? "fill-amber-400 text-amber-400" : "text-current group-hover/star:text-amber-400"}`}
      />
      {showLabel && (
        <span className="text-xs font-mono font-bold">
          {watched ? "Watched" : "Watch"}
        </span>
      )}
    </button>
  );
}
