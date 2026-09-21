"use client";

import { useRef, useState } from "react";

const THRESHOLD_PX = 70;
const MAX_PULL_PX = 100;
const INDICATOR_HEIGHT_PX = 48;

/**
 * Wraps page content with a touch-driven pull-down-to-refresh gesture.
 * Only arms when the page is already scrolled to the top (window.scrollY
 * === 0), so it never fights with scrolling the subject list.
 */
export default function PullToRefresh({
  onRefresh,
  refreshing,
  children,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  children: React.ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (refreshing || window.scrollY > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    setPull(delta > 0 ? Math.min(MAX_PULL_PX, delta * 0.5) : 0);
  }

  function onTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD_PX) onRefresh();
    setPull(0);
  }

  const indicatorHeight = refreshing ? INDICATOR_HEIGHT_PX : pull;
  const label = refreshing
    ? "Refreshing…"
    : pull >= THRESHOLD_PX
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-xs text-neutral-400 transition-[height] duration-150 dark:text-neutral-600"
        style={{ height: indicatorHeight }}
      >
        {indicatorHeight > 4 && label}
      </div>
      {children}
    </div>
  );
}
