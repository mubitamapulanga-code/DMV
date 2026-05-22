"use client";

import React from 'react';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Building2,
  FileText,
  Settings,
  Globe,
  BrainCircuit,
  LogOut,
  ChevronRight,
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Activity,
  ClipboardList,
  Layers,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN:   { bg: 'bg-red-500/20',    text: 'text-red-300' },
  HEA_ADMIN:     { bg: 'bg-amber-500/20',  text: 'text-amber-300' },
  DATA_MANAGER:  { bg: 'bg-blue-500/20',   text: 'text-blue-300' },
  ANALYST:       { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  QA_OFFICER:    { bg: 'bg-cyan-500/20',   text: 'text-cyan-300' },
  MINISTRY_USER: { bg: 'bg-green-500/20',  text: 'text-green-300' },
  HEI_USER:      { bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
  PUBLIC_USER:   { bg: 'bg-white/10',      text: 'text-white/40' },
};

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
  roles?: string[];
}

const menuGroups: { label: string; items: MenuItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'National Dashboard', href: '/dashboard' },
      { icon: Activity,        label: 'Executive View',     href: '/dashboard/executive' },
    ],
  },
  {
    label: 'Data Management',
    items: [
      { icon: Building2,     label: 'Institutions', href: '/institutions' },
      { icon: GraduationCap, label: 'Students',     href: '/students' },
      { icon: BookOpen,      label: 'Programmes',   href: '/programmes' },
      { icon: Database,      label: 'Data Import',  href: '/imports' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: BarChart3,    label: 'Indicator Engine', href: '/indicators' },
      { icon: BrainCircuit, label: 'AI Insights',      href: '/ai-insights' },
      { icon: FileText,     label: 'Reports',          href: '/reports' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { icon: ShieldCheck,   label: 'Governance',      href: '/governance' },
      { icon: ClipboardList, label: 'Audit Logs',      href: '/governance/audit' },
      { icon: Layers,        label: 'Admin Dashboard', href: '/admin-dashboard', adminOnly: true },
      { icon: Users,         label: 'User Management', href: '/users',           adminOnly: true },
    ],
  },
  {
    label: 'Public',
    items: [
      { icon: Globe, label: 'Public Portal', href: '/public-portal' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user
    ? (user.first_name && user.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`
        : user.username.slice(0, 2)
      ).toUpperCase()
    : '??';

  const displayName = user
    ? (user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username)
    : 'Guest';

  const isAdmin = ['SUPER_ADMIN', 'HEA_ADMIN'].includes(user?.role || '');
  const badge = ROLE_BADGE[user?.role || 'PUBLIC_USER'];

  return (
    <aside
      className="w-64 h-screen flex flex-col fixed left-0 top-0 z-50"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* ── Logo ── */}
      <div className="px-6 py-5 flex items-center gap-3 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        {/* Orange icon badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'var(--colour-accent-orange)' }}
        >
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-black text-white tracking-tight leading-none">HEA DMV</h1>
          <p className="text-[9px] text-white/35 uppercase tracking-widest font-semibold mt-0.5">
            Intelligence Layer
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto sidebar-scroll">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.roles && !item.roles.includes(user?.role || '')) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold mb-1.5 px-3">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group',
                        isActive
                          ? 'text-white'
                          : 'text-white/50 hover:text-white'
                      )}
                      style={
                        isActive
                          ? { background: 'var(--sidebar-active-bg)' }
                          : undefined
                      }
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            'var(--sidebar-hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background = '';
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Active item gets orange icon dot */}
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150',
                            isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'
                          )}
                          style={
                            isActive
                              ? { background: 'rgba(243,115,54,0.2)' }
                              : undefined
                          }
                        >
                          <item.icon
                            className="w-3.5 h-3.5"
                            style={isActive ? { color: 'var(--colour-accent-orange)' } : undefined}
                          />
                        </div>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      {isActive && (
                        <ChevronRight
                          className="w-3 h-3 opacity-40"
                          style={{ color: 'var(--colour-accent-orange)' }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-4 pt-3 border-t space-y-2" style={{ borderColor: 'var(--sidebar-border)' }}>
        {/* User card */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0"
            style={{ background: 'var(--colour-secondary)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">{displayName}</p>
            <span className={cn('badge mt-0.5', badge.bg, badge.text)}>
              {user?.role_display || 'Guest'}
            </span>
          </div>
          <Link
            href="/settings"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            <Settings className="w-3.5 h-3.5 text-white/30 hover:text-white transition-colors" />
          </Link>
        </div>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 transition-all duration-150 group"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = '')
          }
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
