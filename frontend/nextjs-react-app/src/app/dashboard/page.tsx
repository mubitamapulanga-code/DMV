"use client";

import React from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import StatCard from '@/components/Dashboard/StatCard';
import {
  Users, GraduationCap, School, ShieldCheck,
  ArrowUpRight, Download, RefreshCw, UserCheck,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import ChartWrapper from '@/components/Dashboard/ChartWrapper';
import { motion } from 'framer-motion';

const CHART_COLORS = ['#003580','#0056B3','#2E86C1','#F37336','#F7CC3B','#17a2b8','#1a4a8a','#4a90d9'];

const STATUS_COLORS: Record<string, string> = {
  ENROLLED:  '#003580',
  GRADUATED: '#17a2b8',
  DEFERRED:  '#F7CC3B',
  WITHDRAWN: '#9ca3af',
  SUSPENDED: '#F37336',
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff', borderRadius: '12px', border: '1px solid #dde4ed',
    boxShadow: '0 8px 24px rgba(0,53,128,0.1)', padding: '10px 14px',
    fontSize: '12px', fontWeight: 700,
  },
};

export default function DashboardPage() {
  const [data, setData]           = React.useState<any>(null);
  const [breakdown, setBreakdown] = React.useState<any>(null);
  const [loading, setLoading]     = React.useState(true);
  const [year, setYear]           = React.useState(2024);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [main, enroll] = await Promise.all([
        api.get(`/analytics/dashboard/?year=${year}`),
        api.get(`/analytics/enrollment-breakdown/?year_to=${year}&year_from=${year - 9}`),
      ]);
      setData(main);
      setBreakdown(enroll);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, [year]);

  React.useEffect(() => { loadData(); }, [loadData]);

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--colour-primary)' }}>
            National Overview
          </h2>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Higher Education Intelligence Summary &nbsp;·&nbsp; {year} Cycle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 bg-white border rounded-xl text-sm font-bold shadow-sm cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--colour-primary)' }}>
            {[2020,2021,2022,2023,2024].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--colour-primary)' }}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button className="btn-orange flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: 'var(--colour-surface-blue)', borderTopColor: 'var(--colour-primary)' }} />
            <p className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--colour-primary)', opacity: 0.5 }}>Loading data…</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Stat Cards */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard title="Total Students"
              value={Number(data.stats.total_students).toLocaleString()}
              icon={Users} trend={12.5} isPositive trendText="vs last year" accent="blue" />
            <StatCard title="Currently Enrolled"
              value={(breakdown?.enrolled_count ?? 0).toLocaleString()}
              icon={UserCheck} accent="orange" trendText="active students" />
            <StatCard title="Registered HEIs"
              value={data.stats.registered_heis.toString()}
              icon={School} trend={2} isPositive trendText="new institutions" accent="amber" />
            <StatCard title="Compliance Score"
              value={`${data.stats.compliance_score}%`}
              icon={ShieldCheck} trend={1.5} isPositive={false} trendText="audit delta" accent="teal" />
          </motion.div>

          {/* Row 1: Enrollment Trend + Regional Share */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Enrollment Trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-7 card-hover"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-black tracking-tight" style={{ color: 'var(--colour-primary)' }}>
                    National Enrollment Trend
                  </h4>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5"
                    style={{ color: 'var(--muted-foreground)' }}>Historical Growth Analysis</p>
                </div>
                <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-3 py-1.5 rounded-full">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +24% Growth
                </div>
              </div>
              <ChartWrapper height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chart_data}>
                    <defs>
                      <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#003580" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#003580" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: '#5a6a7a', fontSize: 11, fontWeight: 600 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: '#5a6a7a', fontSize: 11, fontWeight: 600 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="value" stroke="#003580" strokeWidth={3}
                      fillOpacity={1} fill="url(#gradBlue)" animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>

            {/* Regional Share */}
            <div className="bg-white rounded-2xl p-7 card-hover"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <h4 className="text-lg font-black tracking-tight" style={{ color: 'var(--colour-primary)' }}>
                Regional Share
              </h4>
              <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5 mb-5"
                style={{ color: 'var(--muted-foreground)' }}>HEI Distribution by Province</p>
              <ChartWrapper height={220} className="mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.province_data} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                      tick={{ fill: '#0D1B2A', fontSize: 10, fontWeight: 700 }} width={85} />
                    <Tooltip cursor={{ fill: 'rgba(0,53,128,0.04)' }} {...TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0,6,6,0]} barSize={12} animationDuration={1200}>
                      {data.province_data.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
              <div className="space-y-1.5">
                {data.province_data.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="font-semibold" style={{ color: 'var(--colour-primary)', opacity: 0.8 }}>
                        {item.name}
                      </span>
                    </div>
                    <span className="font-black" style={{ color: 'var(--colour-primary)' }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Row 2: Student Status Pie + Cohort Stacked Bar */}
          {breakdown && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Student Status Donut */}
              <div className="bg-white rounded-2xl p-7 card-hover"
                style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <h4 className="text-lg font-black tracking-tight mb-1" style={{ color: 'var(--colour-primary)' }}>
                  Student Status
                </h4>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-4"
                  style={{ color: 'var(--muted-foreground)' }}>Current breakdown</p>
                <ChartWrapper height={190}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdown.by_status.filter((s: any) => s.count > 0)}
                        dataKey="count" nameKey="name"
                        cx="50%" cy="50%" innerRadius={48} outerRadius={78}
                        paddingAngle={3} animationDuration={1000}>
                        {breakdown.by_status.map((s: any) => (
                          <Cell key={s.code} fill={STATUS_COLORS[s.code] ?? '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <div className="space-y-1.5 mt-3">
                  {breakdown.by_status.filter((s: any) => s.count > 0).map((s: any) => (
                    <div key={s.code} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: STATUS_COLORS[s.code] ?? '#9ca3af' }} />
                        <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{s.name}</span>
                      </div>
                      <span className="font-black" style={{ color: 'var(--colour-primary)' }}>
                        {s.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cohort by Year of Entry — stacked bar */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-7 card-hover"
                style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <h4 className="text-lg font-black tracking-tight mb-1" style={{ color: 'var(--colour-primary)' }}>
                  Enrollment by Year of Entry
                </h4>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-5"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Student cohorts · status breakdown per intake year
                </p>
                <ChartWrapper height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown.by_year} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false}
                        tick={{ fill: '#5a6a7a', fontSize: 11, fontWeight: 600 }} />
                      <YAxis axisLine={false} tickLine={false}
                        tick={{ fill: '#5a6a7a', fontSize: 11, fontWeight: 600 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '8px' }} />
                      <Bar dataKey="enrolled"  name="Enrolled"  stackId="a" fill={STATUS_COLORS.ENROLLED}  animationDuration={1000} />
                      <Bar dataKey="graduated" name="Graduated" stackId="a" fill={STATUS_COLORS.GRADUATED} animationDuration={1000} />
                      <Bar dataKey="deferred"  name="Deferred"  stackId="a" fill={STATUS_COLORS.DEFERRED}  animationDuration={1000} />
                      <Bar dataKey="withdrawn" name="Withdrawn" stackId="a" fill={STATUS_COLORS.WITHDRAWN} animationDuration={1000} />
                      <Bar dataKey="suspended" name="Suspended" stackId="a" fill={STATUS_COLORS.SUSPENDED} radius={[6,6,0,0]} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
            </motion.div>
          )}

          {/* Institution Type Breakdown */}
          {data.type_breakdown && data.type_breakdown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {data.type_breakdown.map((t: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-6 card-hover"
                  style={{ border: '1px solid var(--border)', borderLeftWidth: '4px',
                    borderLeftColor: CHART_COLORS[i % CHART_COLORS.length], boxShadow: 'var(--shadow-card)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                    style={{ color: 'var(--muted-foreground)' }}>{t.type}</p>
                  <p className="text-4xl font-black tracking-tight" style={{ color: 'var(--colour-primary)' }}>
                    {t.count}
                  </p>
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--muted-foreground)' }}>Institutions</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* KPI Table */}
          {data.recent_indicators && data.recent_indicators.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="px-7 py-5 flex items-center justify-between border-b"
                style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h4 className="text-base font-black tracking-tight" style={{ color: 'var(--colour-primary)' }}>
                    Key Performance Indicators
                  </h4>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    National averages for {year}
                  </p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--colour-accent-orange)' }} />
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {data.recent_indicators.map((ind: any, i: number) => (
                  <div key={i} className="px-7 py-4 flex items-center justify-between transition-colors"
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--colour-off-white)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 rounded-full flex-shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--colour-primary)' }}>{ind.name}</p>
                        <p className="text-[10px] font-mono font-medium" style={{ color: 'var(--muted-foreground)' }}>
                          {ind.code}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black" style={{ color: 'var(--colour-primary)' }}>
                        {ind.value}{' '}
                        <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{ind.unit}</span>
                      </p>
                      {ind.target && (
                        <p className="text-[10px] font-medium" style={{ color: 'var(--muted-foreground)' }}>
                          Target: {ind.target}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <div className="text-center py-24" style={{ color: 'var(--muted-foreground)' }}>
          <p className="font-bold">Failed to load dashboard data. Make sure the backend is running.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
