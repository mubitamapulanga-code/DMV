"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { api } from '@/lib/api';
import {
  AlertTriangle, RefreshCw, Loader2, Search, Filter,
  ChevronLeft, ChevronRight, Download, FileWarning, Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface FlaggedRow {
  source: 'database' | 'import';
  student_id: string;
  name: string;
  institution: string;
  programme: string;
  reason: string;
  year?: number;
  status?: string;
  import_file?: string;
  imported_at?: string;
  row?: number | string;
}

interface UnmatchedResponse {
  unmatched_in_db: { total: number; page: number; results: FlaggedRow[] };
  flagged_from_imports: { total: number; results: FlaggedRow[] };
}

const REASON_COLOR: Record<string, string> = {
  'No programme assigned':  'bg-amber-50 text-amber-700 border-amber-200',
  'Missing programme name': 'bg-red-50 text-red-700 border-red-200',
  'Missing institution name':'bg-red-50 text-red-700 border-red-200',
};
function reasonStyle(reason: string) {
  for (const [key, cls] of Object.entries(REASON_COLOR)) {
    if (reason.startsWith(key)) return cls;
  }
  return 'bg-red-50 text-red-700 border-red-200';
}

export default function UnmatchedProgrammesPage() {
  const [data, setData]         = useState<UnmatchedResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState<'db' | 'imports'>('imports');
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 50;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get<UnmatchedResponse>(
        `/reports/unmatched-programmes/?page=${p}&page_size=${PAGE_SIZE}`
      );
      setData(res);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dbRows     = data?.unmatched_in_db.results     ?? [];
  const importRows = data?.flagged_from_imports.results ?? [];
  const dbTotal    = data?.unmatched_in_db.total        ?? 0;
  const importTotal= data?.flagged_from_imports.total   ?? 0;

  const filterRows = (rows: FlaggedRow[]) =>
    search
      ? rows.filter((r) =>
          [r.student_id, r.name, r.institution, r.programme, r.reason]
            .join(' ').toLowerCase().includes(search.toLowerCase())
        )
      : rows;

  const activeRows  = filterRows(tab === 'db' ? dbRows : importRows);
  const activeTotal = tab === 'db' ? dbTotal : importTotal;

  const exportCSV = () => {
    const rows = tab === 'db' ? dbRows : importRows;
    const headers = ['Student ID', 'Name', 'Institution', 'Programme (in file)', 'Reason', 'Source'];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [r.student_id, r.name, r.institution, r.programme, r.reason, r.source]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'unmatched_programmes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/reports" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Reports
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-bold text-primary">Unmatched Programmes</span>
          </div>
          <h2 className="text-3xl font-black text-primary tracking-tight flex items-center gap-3">
            <FileWarning className="w-8 h-8 text-amber-500" />
            Unmatched Programme Report
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Students whose programme could not be matched during import
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-2xl text-sm font-bold text-primary hover:bg-surface-blue transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => load(page)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 glass-card rounded-3xl border border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-amber-700 uppercase tracking-widest">In Database</span>
          </div>
          <p className="text-3xl font-black text-amber-700">{dbTotal.toLocaleString()}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Students saved with no programme linked</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="p-6 glass-card rounded-3xl border border-red-200 bg-red-50/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-red-700 uppercase tracking-widest">Flagged in Imports</span>
          </div>
          <p className="text-3xl font-black text-red-700">{importTotal.toLocaleString()}</p>
          <p className="text-xs text-red-600 font-medium mt-1">Rows flagged across recent import files</p>
        </motion.div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex gap-2">
          {(['imports', 'db'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-border text-muted-foreground hover:text-primary'
              }`}>
              {t === 'imports' ? `Import Flags (${importTotal})` : `DB Unmatched (${dbTotal})`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search student, programme, reason…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-border rounded-2xl text-sm font-medium text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-72" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-bold">No flagged records found</p>
            <p className="text-sm mt-1">All students have been matched to programmes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-blue/50 border-b border-border">
                  {tab === 'imports' && <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Row</th>}
                  <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Institution</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Programme (in file)</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Issue</th>
                  {tab === 'imports' && <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Import File</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {activeRows.map((row, i) => (
                  <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                    className="hover:bg-surface-blue/20 transition-colors">
                    {tab === 'imports' && (
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{row.row ?? '—'}</td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{row.student_id || '—'}</td>
                    <td className="px-4 py-3 font-medium text-primary">{row.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{row.institution || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {row.programme
                        ? <span className="px-2 py-0.5 bg-surface-blue text-primary rounded-lg font-medium">{row.programme}</span>
                        : <span className="text-muted-foreground italic">not provided</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${reasonStyle(row.reason)}`}>
                        {row.reason}
                      </span>
                    </td>
                    {tab === 'imports' && (
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[160px]" title={row.import_file}>
                        {row.import_file || '—'}
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination (DB tab only) */}
        {tab === 'db' && activeTotal > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-muted-foreground font-medium">
              Page {page} of {Math.ceil(activeTotal / PAGE_SIZE)} · {activeTotal} total
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => load(page - 1)}
                className="p-2 rounded-xl border border-border hover:bg-surface-blue disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page * PAGE_SIZE >= activeTotal} onClick={() => load(page + 1)}
                className="p-2 rounded-xl border border-border hover:bg-surface-blue disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
