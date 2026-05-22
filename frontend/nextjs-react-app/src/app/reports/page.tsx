"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ChartWrapper from '@/components/Dashboard/ChartWrapper';
import { api } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Settings2, RefreshCw, Download, FileBarChart, AlertTriangle,
  Users, GraduationCap, Building2, BookOpen, TrendingUp, TrendingDown,
  BarChart3, PieChart as PieIcon, Activity, Layers, ChevronDown,
  CheckCircle, Loader2, X, Filter, Eye, Save, RotateCcw,
} from 'lucide-react';

// ── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = ['#003580','#0056B3','#2E86C1','#5BA4CF','#89C4E1','#B8DCF0',
                 '#1a4a8a','#4a90d9','#7ab3e0','#a8cce8'];
const CHART_TOOLTIP = {
  contentStyle: {
    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
    borderRadius: '16px', border: '1px solid rgba(0,53,128,0.1)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '12px 16px',
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type ChartType = 'bar' | 'area' | 'line' | 'pie' | 'radar';
type ReportType = 'ENROLLMENT' | 'GRADUATION' | 'INSTITUTION' | 'PROGRAMME' | 'EXECUTIVE' | 'COMPLIANCE' | 'CUSTOM';

interface ReportConfig {
  reportType:    ReportType;
  year:          number;
  yearsBack:     number;
  institution:   string;
  // per-section chart type overrides
  trendChart:    ChartType;
  distChart:     ChartType;
  breakdownChart:ChartType;
  // visibility toggles
  showKPIs:      boolean;
  showTrend:     boolean;
  showByInst:    boolean;
  showByProvince:boolean;
  showByType:    boolean;
  showGender:    boolean;
  showLevel:     boolean;
  showIndicators:boolean;
  showCohort:    boolean;
}

const DEFAULT_CONFIG: ReportConfig = {
  reportType:    'ENROLLMENT',
  year:          2024,
  yearsBack:     5,
  institution:   '',
  trendChart:    'area',
  distChart:     'bar',
  breakdownChart:'pie',
  showKPIs:      true,
  showTrend:     true,
  showByInst:    true,
  showByProvince:true,
  showByType:    true,
  showGender:    true,
  showLevel:     true,
  showIndicators:true,
  showCohort:    false,
};

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'ENROLLMENT',  label: 'Enrollment',   icon: Users,         color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'GRADUATION',  label: 'Graduation',   icon: GraduationCap, color: 'bg-green-50 text-green-600 border-green-200' },
  { value: 'INSTITUTION', label: 'Institutions', icon: Building2,     color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { value: 'PROGRAMME',   label: 'Programmes',   icon: BookOpen,      color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'EXECUTIVE',   label: 'Executive',    icon: TrendingUp,    color: 'bg-primary/5 text-primary border-primary/20' },
  { value: 'COMPLIANCE',  label: 'Compliance',   icon: CheckCircle,   color: 'bg-teal-50 text-teal-600 border-teal-200' },
  { value: 'CUSTOM',      label: 'Custom',       icon: Layers,        color: 'bg-rose-50 text-rose-600 border-rose-200' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: React.ElementType }[] = [
  { value: 'bar',   label: 'Bar',    icon: BarChart3 },
  { value: 'area',  label: 'Area',   icon: Activity },
  { value: 'line',  label: 'Line',   icon: TrendingUp },
  { value: 'pie',   label: 'Pie',    icon: PieIcon },
  { value: 'radar', label: 'Radar',  icon: Layers },
];

// ── Small reusable components ─────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 glass-card rounded-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 bg-surface-blue text-primary rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-black text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-muted-foreground font-medium">{sub}</p>}
    </motion.div>
  );
}

function SectionHeader({ title, sub, chartKey, config, setConfig, allowedCharts }:
  { title: string; sub?: string; chartKey: keyof ReportConfig; config: ReportConfig;
    setConfig: (c: ReportConfig) => void; allowedCharts?: ChartType[] }) {
  const allowed = allowedCharts ?? ['bar', 'area', 'line', 'pie'];
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h4 className="text-base font-black text-primary">{title}</h4>
        {sub && <p className="text-xs text-muted-foreground font-medium">{sub}</p>}
      </div>
      <div className="flex gap-1">
        {CHART_TYPES.filter(ct => allowed.includes(ct.value)).map(ct => {
          const Icon = ct.icon;
          const active = config[chartKey] === ct.value;
          return (
            <button key={ct.value} title={ct.label}
              onClick={() => setConfig({ ...config, [chartKey]: ct.value })}
              className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:text-primary'}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DynamicChart({ type, data, dataKey, nameKey = 'name', height = 280, secondKey }:
  { type: ChartType; data: any[]; dataKey: string; nameKey?: string; height?: number; secondKey?: string }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-medium">No data available</div>
  );
  return (
    <ChartWrapper height={height}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAF0F6" />
            <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
            <Tooltip {...CHART_TOOLTIP} />
            {secondKey && <Legend />}
            <Bar dataKey={dataKey} fill={PALETTE[0]} radius={[6,6,0,0]} animationDuration={800}>
              {data.map((_,i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
            {secondKey && <Bar dataKey={secondKey} fill={PALETTE[2]} radius={[6,6,0,0]} animationDuration={800} />}
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.15} />
                <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0} />
              </linearGradient>
              {secondKey && <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PALETTE[2]} stopOpacity={0.15} />
                <stop offset="95%" stopColor={PALETTE[2]} stopOpacity={0} />
              </linearGradient>}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAF0F6" />
            <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
            <Tooltip {...CHART_TOOLTIP} />
            {secondKey && <Legend />}
            <Area type="monotone" dataKey={dataKey} stroke={PALETTE[0]} strokeWidth={3} fill="url(#grad1)" animationDuration={800} />
            {secondKey && <Area type="monotone" dataKey={secondKey} stroke={PALETTE[2]} strokeWidth={3} fill="url(#grad2)" animationDuration={800} />}
          </AreaChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAF0F6" />
            <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
            <Tooltip {...CHART_TOOLTIP} />
            {secondKey && <Legend />}
            <Line type="monotone" dataKey={dataKey} stroke={PALETTE[0]} strokeWidth={3} dot={{ r: 4, fill: PALETTE[0] }} animationDuration={800} />
            {secondKey && <Line type="monotone" dataKey={secondKey} stroke={PALETTE[2]} strokeWidth={3} dot={{ r: 4, fill: PALETTE[2] }} animationDuration={800} />}
          </LineChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={100}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false} animationDuration={800}>
              {data.map((_,i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip {...CHART_TOOLTIP} />
          </PieChart>
        ) : (
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={100}>
            <PolarGrid stroke="#EAF0F6" />
            <PolarAngleAxis dataKey={nameKey} tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} />
            <Radar dataKey={dataKey} stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.2} animationDuration={800} />
            <Tooltip {...CHART_TOOLTIP} />
          </RadarChart>
        )}
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ config, setConfig, institutions, onReset }:
  { config: ReportConfig; setConfig: (c: ReportConfig) => void;
    institutions: any[]; onReset: () => void }) {

  const toggle = (key: keyof ReportConfig) =>
    setConfig({ ...config, [key]: !config[key] });

  const TOGGLES: { key: keyof ReportConfig; label: string }[] = [
    { key: 'showKPIs',       label: 'KPI Summary Cards' },
    { key: 'showTrend',      label: 'Enrollment Trend' },
    { key: 'showByInst',     label: 'By Institution' },
    { key: 'showByProvince', label: 'By Province' },
    { key: 'showByType',     label: 'By Institution Type' },
    { key: 'showGender',     label: 'Gender Breakdown' },
    { key: 'showLevel',      label: 'Programme Levels' },
    { key: 'showIndicators', label: 'Indicators Table' },
    { key: 'showCohort',     label: 'Cohort Trend' },
  ];

  return (
    <div className="space-y-6">
      {/* Report type */}
      <div>
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Report Type</label>
        <div className="grid grid-cols-1 gap-1.5">
          {REPORT_TYPES.map(rt => {
            const Icon = rt.icon;
            const active = config.reportType === rt.value;
            return (
              <button key={rt.value} onClick={() => setConfig({ ...config, reportType: rt.value })}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all text-xs font-bold ${
                  active ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : `${rt.color} hover:opacity-80`
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {rt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div>
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Filters</label>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Year</label>
            <select value={config.year} onChange={e => setConfig({ ...config, year: +e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              {[2020,2021,2022,2023,2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Years of Trend</label>
            <select value={config.yearsBack} onChange={e => setConfig({ ...config, yearsBack: +e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              {[3,4,5,6,7,10].map(n => <option key={n} value={n}>{n} years</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold mb-1 block">Institution</label>
            <select value={config.institution} onChange={e => setConfig({ ...config, institution: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Institutions</option>
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Chart type defaults */}
      <div>
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Default Chart Types</label>
        <div className="space-y-2">
          {([
            { key: 'trendChart',    label: 'Trend charts',     allowed: ['area','line','bar'] },
            { key: 'distChart',     label: 'Distribution',     allowed: ['bar','pie','radar'] },
            { key: 'breakdownChart',label: 'Breakdowns',       allowed: ['pie','bar','radar'] },
          ] as { key: keyof ReportConfig; label: string; allowed: ChartType[] }[]).map(({ key, label, allowed }) => (
            <div key={key}>
              <label className="text-[10px] text-muted-foreground font-bold mb-1 block">{label}</label>
              <div className="flex gap-1">
                {CHART_TYPES.filter(ct => allowed.includes(ct.value)).map(ct => {
                  const Icon = ct.icon;
                  const active = config[key] === ct.value;
                  return (
                    <button key={ct.value} title={ct.label}
                      onClick={() => setConfig({ ...config, [key]: ct.value })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-colors ${
                        active ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:text-primary'
                      }`}>
                      <Icon className="w-3 h-3" />{ct.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section visibility */}
      <div>
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Visible Sections</label>
        <div className="space-y-1.5">
          {TOGGLES.map(({ key, label }) => (
            <button key={key} onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-blue transition-colors">
              <span className="text-xs font-bold text-primary">{label}</span>
              <div className={`w-8 h-4 rounded-full transition-colors relative ${config[key] ? 'bg-primary' : 'bg-border'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${config[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary transition-colors">
        <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [config, setConfig]           = useState<ReportConfig>(DEFAULT_CONFIG);
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load institutions for filter dropdown
  useEffect(() => {
    api.get<any>('/institutions/').then(d => {
      const list = Array.isArray(d) ? d : d.results ?? [];
      setInstitutions(list);
    }).catch(() => {});
  }, []);

  // Debounced data fetch whenever config changes
  const fetchData = useCallback(async (cfg: ReportConfig) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        report_type: cfg.reportType,
        year:        String(cfg.year),
        years_back:  String(cfg.yearsBack),
        ...(cfg.institution ? { institution: cfg.institution } : {}),
      });
      const result = await api.get<any>(`/reports/data/?${params}`);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(config), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [config, fetchData]);

  const activeType = REPORT_TYPES.find(r => r.value === config.reportType)!;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* Top bar */}
      <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${activeType.color}`}>
            <activeType.icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">{activeType.label} Report</h2>
            <p className="text-xs text-muted-foreground font-medium">
              {config.year} · {config.institution ? institutions.find(i => String(i.id) === config.institution)?.name ?? 'Filtered' : 'All Institutions'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reports/unmatched-programmes"
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-3.5 h-3.5" /> Unmatched
          </Link>
          <button onClick={() => fetchData(config)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold text-primary hover:bg-surface-blue transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setSettingsOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              settingsOpen ? 'bg-primary text-white border-primary' : 'bg-white border-border text-primary hover:bg-surface-blue'
            }`}>
            <Settings2 className="w-3.5 h-3.5" />
            {settingsOpen ? 'Hide' : 'Settings'}
          </button>
        </div>
      </header>

      <div className="flex gap-6 items-start">
        {/* ── Settings sidebar ── */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 260 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0 overflow-hidden"
              style={{ width: 260 }}>
              <div className="w-[260px] p-5 glass-card rounded-3xl border border-border sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" /> Report Settings
                  </span>
                  <button onClick={() => setSettingsOpen(false)} className="p-1 hover:bg-surface-blue rounded-lg">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <SettingsPanel config={config} setConfig={setConfig}
                  institutions={institutions} onReset={() => setConfig(DEFAULT_CONFIG)} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Report content ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {loading && !data && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Loading report…</p>
              </div>
            </div>
          )}

          {data && (
            <motion.div key={`${config.reportType}-${config.year}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

              {/* KPIs */}
              {config.showKPIs && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Total Students"    value={data.kpis.total_students}    icon={Users}         sub={`${config.year} academic year`} />
                  <KpiCard label="Avg Graduation"    value={`${data.kpis.avg_graduation_rate}%`} icon={GraduationCap} sub="national average" />
                  <KpiCard label="Institutions"      value={data.kpis.total_institutions} icon={Building2}     sub="active HEIs" />
                  <KpiCard label="Active Programmes" value={data.kpis.total_programmes}   icon={BookOpen}      sub="accredited" />
                </div>
              )}

              {/* Enrollment trend */}
              {config.showTrend && (
                <div className="p-6 glass-card rounded-3xl">
                  <SectionHeader title="Enrollment & Graduation Trend" sub={`${config.yearsBack}-year national view`}
                    chartKey="trendChart" config={config} setConfig={setConfig}
                    allowedCharts={['area','line','bar']} />
                  <DynamicChart type={config.trendChart} data={data.enrollment_trend}
                    dataKey="enrolled" nameKey="year" secondKey="graduation_rate" height={280} />
                </div>
              )}

              {/* By institution + by province side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {config.showByInst && (
                  <div className="p-6 glass-card rounded-3xl">
                    <SectionHeader title="By Institution" sub="Top 20 by enrollment"
                      chartKey="distChart" config={config} setConfig={setConfig}
                      allowedCharts={['bar','area','line']} />
                    <DynamicChart type={config.distChart === 'pie' ? 'bar' : config.distChart}
                      data={data.by_institution.slice(0,10)} dataKey="enrolled" nameKey="short_name" height={260} />
                  </div>
                )}
                {config.showByProvince && (
                  <div className="p-6 glass-card rounded-3xl">
                    <SectionHeader title="By Province" sub="Enrollment distribution"
                      chartKey="breakdownChart" config={config} setConfig={setConfig}
                      allowedCharts={['bar','pie','radar']} />
                    <DynamicChart type={config.breakdownChart} data={data.by_province}
                      dataKey="enrolled" nameKey="name" height={260} />
                  </div>
                )}
              </div>

              {/* By type + gender side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {config.showByType && (
                  <div className="p-6 glass-card rounded-3xl">
                    <SectionHeader title="By Institution Type" sub="HEI category breakdown"
                      chartKey="breakdownChart" config={config} setConfig={setConfig}
                      allowedCharts={['bar','pie','radar']} />
                    <DynamicChart type={config.breakdownChart} data={data.by_type}
                      dataKey="enrolled" nameKey="name" height={240} />
                  </div>
                )}
                {config.showGender && (
                  <div className="p-6 glass-card rounded-3xl">
                    <SectionHeader title="Gender Breakdown" sub="Male vs Female enrollment"
                      chartKey="breakdownChart" config={config} setConfig={setConfig}
                      allowedCharts={['pie','bar','radar']} />
                    <DynamicChart type={config.breakdownChart} data={data.gender_data}
                      dataKey="value" nameKey="name" height={240} />
                  </div>
                )}
              </div>

              {/* Programme levels + student status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {config.showLevel && (
                  <div className="p-6 glass-card rounded-3xl">
                    <SectionHeader title="Programme Levels" sub="Active programmes by level"
                      chartKey="distChart" config={config} setConfig={setConfig}
                      allowedCharts={['bar','pie','radar']} />
                    <DynamicChart type={config.distChart} data={data.by_level}
                      dataKey="count" nameKey="name" height={240} />
                  </div>
                )}
                {config.showCohort && (
                  <div className="p-6 glass-card rounded-3xl">
                    <SectionHeader title="Student Cohort Trend" sub="New students by year of entry"
                      chartKey="trendChart" config={config} setConfig={setConfig}
                      allowedCharts={['area','line','bar']} />
                    <DynamicChart type={config.trendChart} data={data.cohort_trend}
                      dataKey="students" nameKey="year" height={240} />
                  </div>
                )}
              </div>

              {/* Indicators table */}
              {config.showIndicators && data.indicators_summary?.length > 0 && (
                <div className="glass-card rounded-3xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-primary">Key Performance Indicators</h4>
                      <p className="text-xs text-muted-foreground font-medium">All active indicators · {config.year}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-blue/50 border-b border-border">
                          {['Code','Indicator','Category','Value','Unit','Target','Trend'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {data.indicators_summary.map((ind: any) => {
                          const trend = ind.sparkline?.length >= 2
                            ? ind.sparkline[ind.sparkline.length-1].value - ind.sparkline[0].value
                            : 0;
                          return (
                            <tr key={ind.id} className="hover:bg-surface-blue/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{ind.code}</td>
                              <td className="px-4 py-3 font-medium text-primary">{ind.name}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-surface-blue text-primary rounded-lg text-[10px] font-bold">{ind.category}</span>
                              </td>
                              <td className="px-4 py-3 font-black text-primary text-base">{ind.value.toLocaleString()}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{ind.unit}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{ind.target ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top institutions table */}
              {data.top_institutions?.length > 0 && (
                <div className="glass-card rounded-3xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border/30">
                    <h4 className="font-black text-primary">Top Institutions by Enrollment</h4>
                    <p className="text-xs text-muted-foreground font-medium">{config.year}</p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {data.top_institutions.map((inst: any, i: number) => (
                      <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-surface-blue/20 transition-colors">
                        <span className="w-7 h-7 rounded-xl bg-surface-blue text-primary text-xs font-black flex items-center justify-center flex-shrink-0">{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-primary text-sm truncate">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">{inst.type} · {inst.province}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-primary">{inst.enrolled.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">students</p>
                        </div>
                        <div className="w-24 h-2 bg-surface-blue rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full bg-primary rounded-full"
                            style={{ width: `${data.top_institutions[0].enrolled > 0 ? (inst.enrolled / data.top_institutions[0].enrolled) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
