"use client";

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AccentVariant = 'blue' | 'orange' | 'amber' | 'teal';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendText?: string;
  isPositive?: boolean;
  accent?: AccentVariant;
}

const ACCENT_STYLES: Record<AccentVariant, { border: string; iconBg: string; iconColor: string }> = {
  blue:   { border: '#003580',  iconBg: '#EBF2FB', iconColor: '#003580' },
  orange: { border: '#F37336',  iconBg: '#FEF0E8', iconColor: '#F37336' },
  amber:  { border: '#F7CC3B',  iconBg: '#FEFAE8', iconColor: '#C9A000' },
  teal:   { border: '#17a2b8',  iconBg: '#E6F7FA', iconColor: '#17a2b8' },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendText,
  isPositive,
  accent = 'blue',
}: StatCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl p-6 flex flex-col justify-between card-hover"
      style={{
        borderLeft: `4px solid ${styles.border}`,
        border: `1px solid var(--border)`,
        borderLeftColor: styles.border,
        borderLeftWidth: '4px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Top row: icon + trend badge */}
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: styles.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: styles.iconColor }} />
        </div>

        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full',
              isPositive
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-500'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend}%
          </div>
        )}
      </div>

      {/* Value + label */}
      <div>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3
            className="text-3xl font-black tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            {value}
          </h3>
          {trendText && (
            <span
              className="text-[10px] font-medium"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {trendText}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
