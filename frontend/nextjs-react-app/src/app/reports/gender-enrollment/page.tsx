"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ChartWrapper from '@/components/Dashboard/ChartWrapper';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { RefreshCw, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Colours ───────────────────────────────────────────────────────────────────
const MALE_COLOUR   = '#003580';
const FEMALE_COLOUR = '#7ab3e0';
const MALE_PRIV     = '#1a4a8a';
const FEMALE_PRIV   = '#a8cce8';
const HEADER_BG     = '#003580';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff', borderRadius: '12px', border: '1px solid #dde4ed',
    boxShadow: '0 8px 24px rgba(0,53,128,0.10)', padding: '10px 14px',
    fontSize: '12px', fontWeight: 700,
  },
};

// ── Student status options ────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: '',           label: 'All Students' },
  { value: 'ENROLLED',   label: 'Enrolled' },
  { value: 'GRADUATED',  label: 'Graduated' },
  { value: 'DEFERRED',   label: 'Deferred' },
  { value: 'WITHDRAWN',  label: 'Withdrawn' },
  { value: 'SUSPENDED',  label: 'Suspended' },
];

// ── Level short labels ────────────────────────────────────────────────────────
const LEVEL_SHORT: Record<string, string> = {
  CERTIFICATE:      'Cert.',
  DIPLOMA:          'Diploma',
  BACHELOR:         "Bachelor's",
  POSTGRAD_DIPLOMA: 'PG-Diploma',
  MASTERS:          "Master's",
  PHD:              'Doctoral',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number | undefined | null) {
  if (!n) return '0';
  return n.toLocaleString();
}

function pct(part: number, total: number) {
  if (!total) return '0.0';
  return ((part / total) * 100).toFixed(1);
}

const TD  = 'px-3 py-2 text-xs text-right tabular-nums';
const TDL = 'px-3 py-2 text-xs text-left font-medium';
const TH  = 'px-3 py-2 text-[10px] font-black uppercase tracking-wider text-center';

// ── Table: Institution type × Level × Gender ──────────────────────────────────
function TypeLevelTable({ rows, subtotals, grand }: { rows: any[]; subtotals: any[]; grand: any }) {
  const TYPES = ['PUBLIC', 'PRIVATE'];

  return (
    <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
      <table className="w-full text-sm border-collapse min-w-[780px]">
        <thead>
          <tr style={{ background: HEADER_BG, color: '#fff' }}>
            <th className={`${TH} text-left`} rowSpan={2}>Institution Type</th>
            <th className={`${TH} text-left`} rowSpan={2}>Level of Qualification</th>
            <th className={TH} colSpan={2}>Count</th>
            <th className={TH} rowSpan={2}>Total</th>
            <th className={TH} colSpan={3}>Percentage</th>
          </tr>
          <tr style={{ background: HEADER_BG, color: '#fff' }}>
            <th className={TH}>Male</th>
            <th className={TH}>Female</th>
            <th className={TH}>%Male</th>
            <th className={TH}>%Female</th>
            <th className={TH}>%Total</th>
          </tr>
        </thead>
        <tbody>
          {TYPES.map((it) => {
            const typeRows  = rows.filter(r => r.institution_type === it);
            const sub       = subtotals.find(s => s.institution_type === it) ?? { male: 0, female: 0, total: 0 };
            const typeLabel = typeRows[0]?.institution_type_label ?? it;
            return (
              <React.Fragment key={it}>
                {typeRows.map((row, idx) => (
                  <tr key={row.level}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    style={{ borderBottom: '1px solid #e8edf5' }}>
                    {idx === 0 && (
                      <td className={`${TDL} font-bold`} rowSpan={typeRows.length}
                        style={{ borderRight: '2px solid #e8edf5' }}>
                        {typeLabel}
                      </td>
                    )}
                    <td className={TDL}>{LEVEL_SHORT[row.level] ?? row.level_label}</td>
                    <td className={TD} style={{ color: MALE_COLOUR }}>{fmt(row.male)}</td>
                    <td className={TD} style={{ color: FEMALE_COLOUR }}>{fmt(row.female)}</td>
                    <td className={`${TD} font-bold`}>{fmt(row.total)}</td>
                    <td className={TD}>{pct(row.male, grand.total)}</td>
                    <td className={TD}>{pct(row.female, grand.total)}</td>
                    <td className={TD}>{pct(row.total, grand.total)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#e8f0fb', borderBottom: '2px solid #c8d8ef' }}>
                  <td className={`${TDL} font-black text-primary`} colSpan={2}>Sub-total</td>
                  <td className={`${TD} font-bold`} style={{ color: MALE_COLOUR }}>{fmt(sub.male)}</td>
                  <td className={`${TD} font-bold`} style={{ color: FEMALE_COLOUR }}>{fmt(sub.female)}</td>
                  <td className={`${TD} font-black`}>{fmt(sub.total)}</td>
                  <td className={TD}>{pct(sub.male, grand.total)}</td>
                  <td className={TD}>{pct(sub.female, grand.total)}</td>
                  <td className={TD}>{pct(sub.total, grand.total)}</td>
                </tr>
              </React.Fragment>
            );
          })}
          <tr style={{ background: HEADER_BG, color: '#fff' }}>
            <td className="px-3 py-2 text-xs font-black" colSpan={2}>TOTAL</td>
            <td className={`${TD} font-black text-white`}>{fmt(grand.male)}</td>
            <td className={`${TD} font-black text-white`}>{fmt(grand.female)}</td>
            <td className={`${TD} font-black text-white`}>{fmt(grand.total)}</td>
            <td className={`${TD} text-white`}>{pct(grand.male, grand.total)}</td>
            <td className={`${TD} text-white`}>{pct(grand.female, grand.total)}</td>
            <td className={`${TD} text-white`}>100.0</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Table: Academic Field × Level × Gender ────────────────────────────────────
function FieldLevelTable({ rows }: { rows: any[] }) {
  const LEVELS_SHOW = ['DIPLOMA', 'BACHELOR', 'POSTGRAD_DIPLOMA', 'MASTERS', 'PHD'];
  return (
    <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
      <table className="w-full text-sm border-collapse" style={{ minWidth: 1000 }}>
        <thead>
          <tr style={{ background: HEADER_BG, color: '#fff' }}>
            <th className={`${TH} text-left`} rowSpan={2}>Academic Field</th>
            {LEVELS_SHOW.map(lv => (
              <th key={lv} className={TH} colSpan={2}>{LEVEL_SHORT[lv]}</th>
            ))}
            <th className={TH} colSpan={2}>Sub-total</th>
            <th className={TH} rowSpan={2}>Total</th>
          </tr>
          <tr style={{ background: '#1a4a8a', color: '#d0e4ff' }}>
            {LEVELS_SHOW.map(lv => (
              <React.Fragment key={lv}>
                <th className={TH}>M</th>
                <th className={TH}>F</th>
              </React.Fragment>
            ))}
            <th className={TH}>M</th>
            <th className={TH}>F</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal = row.academic_field === 'TOTAL';
            const subM = LEVELS_SHOW.reduce((s, lv) => s + (row[`${lv}_M`] ?? 0), 0);
            const subF = LEVELS_SHOW.reduce((s, lv) => s + (row[`${lv}_F`] ?? 0), 0);
            return (
              <tr key={row.academic_field}
                style={{
                  background: isTotal ? HEADER_BG : idx % 2 === 0 ? '#fff' : '#f5f8fe',
                  color: isTotal ? '#fff' : undefined,
                  borderBottom: '1px solid #e8edf5',
                  fontWeight: isTotal ? 900 : undefined,
                }}>
                <td className={`${TDL} ${isTotal ? 'text-white font-black' : ''}`}>
                  {row.academic_field_label}
                </td>
                {LEVELS_SHOW.map(lv => (
                  <React.Fragment key={lv}>
                    <td className={`${TD}`} style={{ color: isTotal ? '#fff' : MALE_COLOUR }}>
                      {fmt(row[`${lv}_M`])}
                    </td>
                    <td className={`${TD}`} style={{ color: isTotal ? '#fff' : FEMALE_COLOUR }}>
                      {fmt(row[`${lv}_F`])}
                    </td>
                  </React.Fragment>
                ))}
                <td className={`${TD} font-bold`} style={{ color: isTotal ? '#fff' : MALE_COLOUR }}>
                  {fmt(subM)}
                </td>
                <td className={`${TD} font-bold`} style={{ color: isTotal ? '#fff' : FEMALE_COLOUR }}>
                  {fmt(subF)}
                </td>
                <td className={`${TD} font-black`} style={{ color: isTotal ? '#fff' : undefined }}>
                  {fmt(row.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Bar chart: by level × gender × Public vs Private ─────────────────────────
function LevelGenderChart({ data }: { data: any[] }) {
  const publicData  = data.map(d => ({ level: d.level, Male: d.public_male,  Female: d.public_female }));
  const privateData = data.map(d => ({ level: d.level, Male: d.private_male, Female: d.private_female }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[
        { label: 'Public University',  chartData: publicData,  maleCol: MALE_COLOUR,  femaleCol: FEMALE_COLOUR },
        { label: 'Private University', chartData: privateData, maleCol: MALE_PRIV,    femaleCol: FEMALE_PRIV },
      ].map(({ label, chartData, maleCol, femaleCol }) => (
        <div key={label} className="bg-white rounded-2xl p-6 border border-border"
          style={{ boxShadow: '0 2px 12px rgba(0,53,128,0.07)' }}>
          <h5 className="text-sm font-black text-primary mb-4">{label}</h5>
          <ChartWrapper height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="level" axisLine={false} tickLine={false}
                  tick={{ fill: '#5a6a7a', fontSize: 10, fontWeight: 700 }}
                  angle={-25} textAnchor="end" interval={0} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#5a6a7a', fontSize: 11, fontWeight: 600 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '8px' }} />
                <Bar dataKey="Male"   fill={maleCol}   radius={[4,4,0,0]} animationDuration={900} />
                <Bar dataKey="Female" fill={femaleCol} radius={[4,4,0,0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GenderEnrollmentReportPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]               = useState(currentYear);
  const [studentStatus, setStudentStatus] = useState('');
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'type-level' | 'chart' | 'field-all' | 'field-private'>('type-level');
  const [privateData, setPrivateData] = useState<any>(null);

  const YEAR_OPTIONS = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => 2015 + i).reverse();

  const buildUrl = useCallback((y: number, s: string, instType = '') => {
    const params = new URLSearchParams({ year: String(y) });
    if (s) params.set('student_status', s);
    if (instType) params.set('institution_type', instType);
    return `/reports/enrollment-matrix/?${params}`;
  }, []);

  const loadData = useCallback(async (y: number, s: string) => {
    setLoading(true);
    try {
      const [main, priv] = await Promise.all([
        api.get<any>(buildUrl(y, s)),
        api.get<any>(buildUrl(y, s, 'PRIVATE')),
      ]);
      setData(main);
      setPrivateData(priv);
    } catch (e) {
      console.error('Failed to load enrollment matrix', e);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => { loadData(year, studentStatus); }, [year, studentStatus, loadData]);

  const grand = data?.grand_total ?? { male: 0, female: 0, total: 0 };
  const statusLabel = STATUS_OPTIONS.find(s => s.value === studentStatus)?.label ?? 'All Students';

  const TABS = [
    { id: 'type-level',    label: 'By Type & Level' },
    { id: 'chart',         label: 'Chart' },
    { id: 'field-all',     label: 'By Academic Field (All)' },
    { id: 'field-private', label: 'By Academic Field (Private)' },
  ] as const;

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports"
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-primary" />
          </Link>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--colour-primary)' }}>
              Gender Report
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {statusLabel} · by level of qualification, academic field and gender · {year} Cycle
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Student status */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              Status
            </label>
            <select value={studentStatus} onChange={e => setStudentStatus(e.target.value)}
              className="px-3 py-2 bg-white border rounded-xl text-sm font-bold shadow-sm cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--colour-primary)' }}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-2 bg-white border rounded-xl text-sm font-bold shadow-sm cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--colour-primary)' }}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <button onClick={() => loadData(year, studentStatus)}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--colour-primary)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      {/* KPI cards */}
      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total',   value: grand.total,  colour: MALE_COLOUR   },
            { label: 'Male',    value: grand.male,   colour: MALE_COLOUR   },
            { label: 'Female',  value: grand.female, colour: FEMALE_COLOUR },
            {
              label: 'Gender Split',
              value: grand.total > 0
                ? `${pct(grand.male, grand.total)}% M · ${pct(grand.female, grand.total)}% F`
                : '—',
              colour: '#F37336',
            },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-border shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                style={{ color: 'var(--muted-foreground)' }}>{k.label}</p>
              <p className="text-xl font-black" style={{ color: k.colour }}>
                {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t.id ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: '#7ab3e0', borderTopColor: MALE_COLOUR }} />
            <p className="text-xs font-bold uppercase tracking-widest"
              style={{ color: MALE_COLOUR, opacity: 0.6 }}>Loading…</p>
          </div>
        </div>
      )}

      {!loading && data && (
        <motion.div key={`${tab}-${year}-${studentStatus}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {tab === 'type-level' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-primary">
                  {statusLabel} by Level of Qualification and Gender
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Public and private universities · {year}
                </p>
              </div>
              <TypeLevelTable
                rows={data.type_level_table}
                subtotals={data.subtotals_by_type}
                grand={grand}
              />
            </div>
          )}

          {tab === 'chart' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-primary">
                  {statusLabel} by Level of Qualification
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Grouped by gender — Public vs Private · {year}
                </p>
              </div>
              <LevelGenderChart data={data.chart_data_by_level} />
              <div className="flex items-center gap-4 mt-2">
                {[
                  { col: MALE_COLOUR, label: 'Male' },
                  { col: FEMALE_COLOUR, label: 'Female' },
                ].map(({ col, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: col }} />
                    <span className="text-xs font-bold text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'field-all' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-primary">
                  {statusLabel} by Academic Field, Level and Gender
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  All institutions · {year}
                </p>
              </div>
              <FieldLevelTable rows={data.field_level_table} />
            </div>
          )}

          {tab === 'field-private' && privateData && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-primary">
                  {statusLabel} by Academic Field, Level and Gender — Private Universities
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Private universities only · {year}
                </p>
              </div>
              <FieldLevelTable rows={privateData.field_level_table} />
            </div>
          )}

        </motion.div>
      )}
    </DashboardLayout>
  );
}
