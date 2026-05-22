"use client";

import React, { useEffect, useState } from 'react';

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

/**
 * Defers chart rendering until the client has mounted and the container
 * has real dimensions. Prevents the Recharts "width(-1) height(-1)" warning
 * that fires during SSR / hydration when ResponsiveContainer can't measure yet.
 */
export default function ChartWrapper({
  children,
  height = 300,
  className = '',
}: ChartWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder keeps layout stable while JS hydrates
    return (
      <div
        style={{ height }}
        className={`w-full flex items-center justify-center ${className}`}
      >
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height, minHeight: height }} className={`w-full ${className}`}>
      {children}
    </div>
  );
}
