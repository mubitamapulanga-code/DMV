"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import { Shield, Users, Building2, Database, BarChart3, Activity, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [health, setHealth] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [instStats, setInstStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/health/').then(r => r.json()).catch(() => null),
      api.get('/auth/users/stats/').catch(() => null),
      api.get('/institutions/stats/').catch(() => null),
    ]).then(([h, u, i]) => {
      setHealth(h);
      setUserStats(u);
      setInstStats(i);
    }).finally(() => setLoading(false));
  }, []);

  const adminCards = [
    { icon: Users, label: 'User Management', href: '/users', value: userStats?.total || '—', sub: `${userStats?.active || 0} active`, color: 'bg-blue-50 text-blue-600' },
    { icon: Building2, label: 'Institutions', href: '/institutions', value: instStats?.total || '—', sub: `${instStats?.active || 0} active`, color: 'bg-green-50 text-green-600' },
    { icon: Database, label: 'Data Imports', href: '/imports', value: '—', sub: 'Import history', color: 'bg-amber-50 text-amber-600' },
    { icon: BarChart3, label: 'Indicators', href: '/indicators', value: '—', sub: 'KPI management', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <DashboardLayout>
      <RoleGate
        allowedRoles={['SUPER_ADMIN', 'HEA_ADMIN']}
        fallback={
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
            <div className="w-20 h-20 bg-red-50 text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-primary mb-2">Access Restricted</h2>
            <p className="text-muted-foreground max-w-sm">Administrative dashboard is only accessible to Super Admins and HEA Admins.</p>
          </div>
        }
      >
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-primary tracking-tight">Administrative Dashboard</h2>
            <p className="text-muted-foreground font-medium">System health, configuration, and administrative controls</p>
          </div>
        </header>

        {/* System Health */}
        <div className={`p-6 rounded-2xl mb-8 flex items-center gap-4 ${health?.status === 'healthy' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
          {health?.status === 'healthy'
            ? <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            : <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
          }
          <div>
            <p className="font-black text-primary text-lg">
              System Status: {health?.status === 'healthy' ? 'All Systems Operational' : 'Checking...'}
            </p>
            <p className="text-sm text-muted-foreground font-medium">
              {health?.service} {health?.version} • {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Admin Quick Access */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {adminCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="p-6 bg-white rounded-2xl shadow-sm border border-border/30 hover:shadow-premium hover:border-primary/20 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <p className="text-2xl font-black text-primary">{card.value}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </Link>
            ))}
          </div>
        )}

        {/* User Role Breakdown */}
        {userStats?.by_role && (
          <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-border/30">
              <h4 className="text-lg font-black text-primary">Users by Role</h4>
            </div>
            <div className="divide-y divide-border/30">
              {userStats.by_role.map((r: any) => (
                <div key={r.role} className="px-8 py-4 flex items-center justify-between hover:bg-surface-blue/20 transition-colors">
                  <p className="font-bold text-primary text-sm">{r.role.replace('_', ' ')}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-off-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (r.count / (userStats.total || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-primary w-8 text-right">{r.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Institution Type Breakdown */}
        {instStats?.by_type && (
          <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-border/30">
              <h4 className="text-lg font-black text-primary">Institutions by Type</h4>
            </div>
            <div className="divide-y divide-border/30">
              {instStats.by_type.map((t: any) => (
                <div key={t.type} className="px-8 py-4 flex items-center justify-between hover:bg-surface-blue/20 transition-colors">
                  <p className="font-bold text-primary text-sm">{t.type}</p>
                  <span className="text-xl font-black text-primary">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </RoleGate>
    </DashboardLayout>
  );
}
