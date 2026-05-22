"use client";

import React from 'react';
import Sidebar from './Sidebar';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <Sidebar />
        {/* Main content — offset by sidebar width (w-64 = 16rem) */}
        <main className="flex-1 min-h-screen overflow-x-hidden" style={{ marginLeft: '16rem' }}>
          {/* Top bar */}
          <div
            className="sticky top-0 z-40 h-14 flex items-center px-8 border-b"
            style={{
              background: 'rgba(240,244,248,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderColor: 'var(--border)',
            }}
          >
            {/* Breadcrumb / page title placeholder — pages can override via portal if needed */}
            <div className="flex-1" />
            {/* Right side: subtle HEA badge */}
            <span
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--colour-surface-blue)', color: 'var(--colour-primary)' }}
            >
              HEA · Zambia
            </span>
          </div>

          {/* Page content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
