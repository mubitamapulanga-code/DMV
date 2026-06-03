"use client";

import React, { useEffect, useRef, useState } from 'react';

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

/**
 * Defers chart rendering until the container has real, positive dimensions.
 * Uses a ResizeObserver to detect when the wrapper div has been laid out,
 * preventing the Recharts "width(-1) height(-1)" warning that fires during
 * SSR / hydration or when the container hasn't been painted yet.
 */
export default function ChartWrapper({
  children,
  height = 300,
  className = '',
}: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // If the element already has a positive width, render immediately.
    if (el.getBoundingClientRect().width > 0) {
      setReady(true);
      return;
    }

    // Otherwise wait for the first resize entry with a positive width.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setReady(true);
          observer.disconnect();
          break;
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height, minHeight: height }}
      className={`w-full ${className}`}
    >
      {ready ? (
        children
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
