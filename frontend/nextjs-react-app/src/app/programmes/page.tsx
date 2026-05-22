"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import { BookOpen, Search, Plus, Loader2, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LEVEL_COLORS: Record<string, string> = {
  CERTIFICATE: 'bg-gray-100 text-gray-700',
  DIPLOMA: 'bg-blue-100 text-blue-700',
  BACHELOR: 'bg-green-100 text-green-700',
  POSTGRAD_DIPLOMA: 'bg-purple-100 text-purple-700',
  MASTERS: 'bg-amber-100 text-amber-700',
  PHD: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  DISCONTINUED: 'bg-red-100 text-red-700',
};

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', institution: '', level: 'BACHELOR', duration_years: '3', status: 'ACTIVE', description: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (levelFilter) params.set('level', levelFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      const [progs, insts] = await Promise.all([
        api.get<any>(`/academic/programmes/?${params}`),
        api.get<any>('/institutions/?page_size=100'),
      ]);
      setProgrammes(Array.isArray(progs) ? progs : progs.results || []);
      setTotalCount(Array.isArray(progs) ? progs.length : progs.count || 0);
      setInstitutions(Array.isArray(insts) ? insts : insts.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/academic/programmes/', { ...form, duration_years: parseFloat(form.duration_years) });
      setShowModal(false);
      setForm({ name: '', code: '', institution: '', level: 'BACHELOR', duration_years: '3', status: 'ACTIVE', description: '' });
      loadData();
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to create programme');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("WARNING: Deleting all programmes will cascade and delete all students and enrollments attached to them. This action cannot be undone.\\n\\nAre you sure you want to clear ALL programmes?")) {
      setIsClearing(true);
      try {
        await api.delete('/academic/programmes/clear_all/');
        setPage(1);
        loadData();
      } catch (e: any) {
        alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to clear programmes');
      } finally {
        setIsClearing(false);
      }
    }
  };

  const totalPages = Math.ceil(totalCount / 25);

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Programme Management</h2>
          <p className="text-muted-foreground font-medium">Manage accredited academic programmes across all institutions</p>
        </div>
        <RoleGate allowedRoles={['SUPER_ADMIN', 'HEA_ADMIN']}>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-bold hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isClearing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Clear All
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Programme
            </button>
          </div>
        </RoleGate>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name, code, or institution..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Levels</option>
          <option value="CERTIFICATE">Certificate</option>
          <option value="DIPLOMA">Diploma</option>
          <option value="BACHELOR">Bachelor's</option>
          <option value="POSTGRAD_DIPLOMA">Postgrad Diploma</option>
          <option value="MASTERS">Master's</option>
          <option value="PHD">PhD</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : programmes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border/30">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-bold text-muted-foreground">No programmes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programmes.map((prog: any) => (
            <div key={prog.id} className="bg-white p-6 rounded-2xl border border-border/50 hover:shadow-premium hover:border-primary/20 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-muted-foreground bg-off-white px-2 py-0.5 rounded">{prog.code}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${LEVEL_COLORS[prog.level] || 'bg-gray-100 text-gray-600'}`}>{prog.level?.replace('_', ' ')}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_COLORS[prog.status] || 'bg-gray-100 text-gray-600'}`}>{prog.status}</span>
                </div>
              </div>
              <h4 className="font-bold text-primary group-hover:text-secondary transition-colors mb-1">{prog.name}</h4>
              <p className="text-xs text-muted-foreground font-medium">{prog.institution_name}</p>
              {prog.duration_years && (
                <p className="text-xs text-muted-foreground mt-1">{prog.duration_years} year{prog.duration_years !== 1 ? 's' : ''}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-primary">Add Programme</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-off-white rounded-xl"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Bachelor of Science" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Code *</label>
                    <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-mono font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. BSC-CS" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Institution *</label>
                  <select required value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Select institution...</option>
                    {institutions.map((inst: any) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Level</label>
                    <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="CERTIFICATE">Certificate</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="BACHELOR">Bachelor's</option>
                      <option value="POSTGRAD_DIPLOMA">Postgrad Diploma</option>
                      <option value="MASTERS">Master's</option>
                      <option value="PHD">PhD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Duration (years)</label>
                    <input type="number" step="0.5" min="0.5" value={form.duration_years} onChange={(e) => setForm({ ...form, duration_years: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-off-white transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add Programme
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
