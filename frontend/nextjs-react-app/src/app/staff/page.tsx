"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import {
  Users, Search, Loader2, ChevronLeft, ChevronRight,
  Trash2, X, Plus, RefreshCw, BarChart3, GraduationCap,
  Building2, Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ── Colour helpers ────────────────────────────────────────────────────────────
const RANK_COLOURS: Record<string, string> = {
  PROFESSOR:           'bg-purple-100 text-purple-700',
  ASSOCIATE_PROFESSOR: 'bg-indigo-100 text-indigo-700',
  ASSISTANT_PROFESSOR: 'bg-blue-100 text-blue-700',
  SENIOR_LECTURER:     'bg-sky-100 text-sky-700',
  LECTURER:            'bg-teal-100 text-teal-700',
  JUNIOR_LECTURER:     'bg-emerald-100 text-emerald-700',
  TUTORIAL_FELLOW:     'bg-green-100 text-green-700',
  TEACHING_ASSISTANT:  'bg-lime-100 text-lime-700',
  RESEARCHER:          'bg-amber-100 text-amber-700',
  OTHER:               'bg-gray-100 text-gray-600',
};

const STATUS_COLOURS: Record<string, string> = {
  ACTIVE:   'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  ON_LEAVE: 'bg-amber-100 text-amber-700',
  RETIRED:  'bg-red-100 text-red-600',
};

const PALETTE = ['#003580','#0056B3','#2E86C1','#5BA4CF','#89C4E1','#F37336','#F7CC3B','#17a2b8'];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff', borderRadius: '12px', border: '1px solid #dde4ed',
    boxShadow: '0 8px 24px rgba(0,53,128,0.10)', padding: '10px 14px',
    fontSize: '12px', fontWeight: 700,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface StaffMember {
  id: number;
  staff_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  gender_display: string;
  institution: number;
  institution_name: string;
  institution_type: string;
  institution_province: string;
  department: string | null;
  rank: string;
  rank_display: string;
  employment_type: string;
  employment_type_display: string;
  status: string;
  status_display: string;
  year_appointed: number | null;
  highest_qualification: string | null;
  qualification_display: string | null;
  specialisation: string | null;
  academic_field: string | null;
  email: string | null;
  phone: string | null;
}

interface StaffSummary {
  total: number;
  by_gender: { gender: string; count: number }[];
  by_rank: { rank: string; count: number }[];
  by_employment_type: { employment_type: string; count: number }[];
  by_qualification: { highest_qualification: string; count: number }[];
  by_institution_type: { 'institution__type': string; count: number }[];
  by_academic_field: { academic_field: string; count: number }[];
}

const RANK_LABELS: Record<string, string> = {
  PROFESSOR: 'Professor', ASSOCIATE_PROFESSOR: 'Assoc. Prof.',
  ASSISTANT_PROFESSOR: 'Asst. Prof.', SENIOR_LECTURER: 'Sr. Lecturer',
  LECTURER: 'Lecturer', JUNIOR_LECTURER: 'Jr. Lecturer',
  TUTORIAL_FELLOW: 'Tutorial Fellow', TEACHING_ASSISTANT: 'Teaching Asst.',
  RESEARCHER: 'Researcher', OTHER: 'Other',
};

// ── Summary Cards ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, colour }: {
  label: string; value: string | number; icon: React.ElementType; colour: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colour}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, nameKey, valueKey, title }: {
  data: any[]; nameKey: string; valueKey: string; title: string;
}) {
  if (!data?.length) return null;
  return (
    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
      <p className="text-xs font-black text-primary uppercase tracking-widest mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 2, right: 4, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey={nameKey} axisLine={false} tickLine={false}
            tick={{ fill: '#5a6a7a', fontSize: 9, fontWeight: 700 }}
            angle={-30} textAnchor="end" interval={0} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5a6a7a', fontSize: 10 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey={valueKey} radius={[4,4,0,0]} animationDuration={800}>
            {data.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AcademicStaffPage() {
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [summary, setSummary]       = useState<StaffSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [empFilter, setEmpFilter]   = useState('');
  const [genderFilter, setGender]   = useState('');
  const [page, setPage]             = useState(1);
  const [totalCount, setTotal]      = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [tab, setTab]               = useState<'list' | 'charts'>('list');
  const PAGE_SIZE = 25;

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search',          search);
      if (rankFilter)   params.set('rank',             rankFilter);
      if (statusFilter) params.set('status',           statusFilter);
      if (empFilter)    params.set('employment_type',  empFilter);
      if (genderFilter) params.set('gender',           genderFilter);
      params.set('page', String(page));

      const [listData, summaryData] = await Promise.all([
        api.get<any>(`/academic/staff/?${params}`),
        api.get<StaffSummary>('/academic/staff/summary/'),
      ]);

      if (Array.isArray(listData)) {
        setStaff(listData); setTotal(listData.length);
      } else {
        setStaff(listData.results ?? []); setTotal(listData.count ?? 0);
      }
      setSummary(summaryData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, rankFilter, statusFilter, empFilter, genderFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadStaff, 300);
    return () => clearTimeout(t);
  }, [loadStaff]);

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL academic staff records. This action cannot be undone.')) return;
    setIsClearing(true);
    try {
      await api.delete('/academic/staff/clear_all/');
      setPage(1); loadStaff();
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to clear staff');
    } finally { setIsClearing(false); }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Derived chart data ──────────────────────────────────────────────────────
  const rankChartData = (summary?.by_rank ?? []).map(r => ({
    name: RANK_LABELS[r.rank] ?? r.rank, count: r.count,
  }));
  const genderChartData = (summary?.by_gender ?? []).map(g => ({
    name: g.gender === 'M' ? 'Male' : g.gender === 'F' ? 'Female' : 'Other', count: g.count,
  }));
  const qualChartData = (summary?.by_qualification ?? []).filter(q => q.highest_qualification).map(q => ({
    name: q.highest_qualification, count: q.count,
  }));

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Academic Staff</h2>
          <p className="text-muted-foreground font-medium">
            HEI academic staff records — {(summary?.total ?? totalCount).toLocaleString()} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={['SUPER_ADMIN', 'HEA_ADMIN']}>
            <button onClick={handleClearAll} disabled={isClearing}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50">
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Clear All
            </button>
          </RoleGate>
          <button onClick={() => loadStaff()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      {/* KPI row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard label="Total Staff"  value={summary.total} icon={Users}       colour="bg-blue-50 text-blue-600" />
          <SummaryCard label="Full-time"    icon={Briefcase}      colour="bg-teal-50 text-teal-600"
            value={(summary.by_employment_type.find(e => e.employment_type === 'FULL_TIME')?.count ?? 0)} />
          <SummaryCard label="Doctorates"   icon={GraduationCap}  colour="bg-purple-50 text-purple-600"
            value={(summary.by_qualification.find(q => q.highest_qualification === 'PHD')?.count ?? 0)} />
          <SummaryCard label="Institutions" icon={Building2}       colour="bg-amber-50 text-amber-600"
            value={(summary.by_institution_type.length)} />
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        {(['list', 'charts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              tab === t ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-primary'
            }`}>
            {t === 'list' ? 'Staff List' : 'Analytics'}
          </button>
        ))}
      </div>

      {/* ── Charts tab ── */}
      {tab === 'charts' && summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <MiniBarChart data={rankChartData}   nameKey="name" valueKey="count" title="By Rank" />
          <MiniBarChart data={genderChartData} nameKey="name" valueKey="count" title="By Gender" />
          <MiniBarChart data={qualChartData}   nameKey="name" valueKey="count" title="By Qualification" />
          <MiniBarChart
            data={(summary.by_employment_type ?? []).map(e => ({ name: e.employment_type, count: e.count }))}
            nameKey="name" valueKey="count" title="By Employment Type" />
          <MiniBarChart
            data={(summary.by_institution_type ?? []).map(e => ({ name: e['institution__type'], count: e.count }))}
            nameKey="name" valueKey="count" title="By Institution Type" />
          {summary.by_academic_field?.length > 0 && (
            <MiniBarChart
              data={summary.by_academic_field.map(f => ({ name: f.academic_field, count: f.count }))}
              nameKey="name" valueKey="count" title="By Academic Field" />
          )}
        </motion.div>
      )}

      {/* ── List tab ── */}
      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[200px] relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="text" placeholder="Search by name, staff ID, department…"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-border rounded-2xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            {[
              { label: 'All Ranks', value: rankFilter, set: (v: string) => { setRankFilter(v); setPage(1); },
                options: [['PROFESSOR','Professor'],['ASSOCIATE_PROFESSOR','Assoc. Prof.'],['ASSISTANT_PROFESSOR','Asst. Prof.'],
                          ['SENIOR_LECTURER','Senior Lecturer'],['LECTURER','Lecturer'],['JUNIOR_LECTURER','Jr. Lecturer'],
                          ['TUTORIAL_FELLOW','Tutorial Fellow'],['TEACHING_ASSISTANT','Teaching Asst.'],['RESEARCHER','Researcher']] },
              { label: 'All Statuses', value: statusFilter, set: (v: string) => { setStatus(v); setPage(1); },
                options: [['ACTIVE','Active'],['INACTIVE','Inactive'],['ON_LEAVE','On Leave'],['RETIRED','Retired']] },
              { label: 'All Employment', value: empFilter, set: (v: string) => { setEmpFilter(v); setPage(1); },
                options: [['FULL_TIME','Full-time'],['PART_TIME','Part-time'],['CONTRACT','Contract'],['ADJUNCT','Adjunct'],['VISITING','Visiting']] },
              { label: 'All Genders', value: genderFilter, set: (v: string) => { setGender(v); setPage(1); },
                options: [['M','Male'],['F','Female']] },
            ].map(f => (
              <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
                className="px-4 py-2.5 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">{f.label}</option>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-border/20 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : staff.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-bold text-muted-foreground">No academic staff found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Import staff data via Data Import → Academic Staff
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-surface-blue/50">
                      {['Staff Member','Staff ID','Institution','Department','Rank','Employment','Qualification','Status'].map(h => (
                        <th key={h} className="px-5 py-4 text-left text-[10px] font-black text-primary uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {staff.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-blue/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/8 text-primary font-black text-xs flex items-center justify-center flex-shrink-0">
                              {s.first_name?.[0]}{s.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-primary">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-muted-foreground">{s.gender_display}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs bg-off-white px-2 py-1 rounded text-primary/70 font-bold">{s.staff_id}</span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-primary/80 max-w-[160px] truncate">{s.institution_name}</p>
                          <p className="text-xs text-muted-foreground">{s.institution_type} · {s.institution_province}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-primary/70 max-w-[140px] truncate">{s.department || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap ${RANK_COLOURS[s.rank] ?? 'bg-gray-100 text-gray-600'}`}>
                            {RANK_LABELS[s.rank] ?? s.rank_display}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs font-medium text-primary/70">{s.employment_type_display}</td>
                        <td className="px-5 py-3 text-xs font-medium text-primary/70">{s.qualification_display || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLOURS[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {s.status_display}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-medium">
                Page {page} of {totalPages} ({totalCount.toLocaleString()} total)
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
