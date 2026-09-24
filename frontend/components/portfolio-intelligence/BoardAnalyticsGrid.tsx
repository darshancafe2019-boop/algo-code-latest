"use client";

import React, { memo } from "react";
import { BoardPortfolio } from "@/types/portfolio-intelligence";
import { BoardCard } from "./BoardCard";

interface BoardAnalyticsGridProps {
  boards: BoardPortfolio[];
  onBoardClick?: (board: BoardPortfolio) => void;
}

export const BoardAnalyticsGrid = memo(function BoardAnalyticsGrid({
  boards,
  onBoardClick,
}: BoardAnalyticsGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onClick={onBoardClick}
          />
        ))}
      </div>
    </div>
  );
});
