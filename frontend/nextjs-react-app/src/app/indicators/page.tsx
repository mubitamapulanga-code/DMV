"use client";

import React from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import {
  BarChart3,
  Plus,
  Search,
  Settings2,
  Database,
  ArrowRight,
  Activity,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_COLORS: Record<string, string> = {
  SDG4: 'bg-green-100 text-green-700',
  CESA: 'bg-blue-100 text-blue-700',
  HEA_KPI: 'bg-purple-100 text-purple-700',
  INSTITUTIONAL: 'bg-amber-100 text-amber-700',
};

export default function IndicatorEnginePage() {
  const [indicators, setIndicators] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<any | null>(null);  // null = create, obj = edit
  const [saving, setSaving] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '', code: '', description: '', category: 'HEA_KPI',
    formula: '', unit: 'Percentage', target_value: '', is_active: true,
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', code: '', description: '', category: 'HEA_KPI', formula: '', unit: 'Percentage', target_value: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (ind: any) => {
    setEditTarget(ind);
    setForm({
      name: ind.name,
      code: ind.code,
      description: ind.description || '',
      category: ind.category,
      formula: ind.formula || '',
      unit: ind.unit || 'Percentage',
      target_value: ind.target_value != null ? String(ind.target_value) : '',
      is_active: ind.is_active,
    });
    setShowModal(true);
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const [inds, sum] = await Promise.all([
        api.get<any>(`/indicators/?${params}`),
        api.get<any[]>('/indicators/summary/'),
      ]);
      setIndicators(Array.isArray(inds) ? inds : inds.results || []);
      setSummary(Array.isArray(sum) ? sum : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  React.useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_value: form.target_value ? parseFloat(form.target_value) : null,
        is_active: form.is_active,
      };
      if (editTarget) {
        await api.patch(`/indicators/${editTarget.id}/`, payload);
      } else {
        await api.post('/indicators/', payload);
      }
      setShowModal(false);
      setForm({ name: '', code: '', description: '', category: 'HEA_KPI', formula: '', unit: 'Percentage', target_value: '', is_active: true });
      loadData();
    } catch (e: any) {
      alert(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Failed to save indicator');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ind: any) => {
    if (!window.confirm(`Delete indicator "${ind.name}" (${ind.code})? This cannot be undone.`)) return;
    try {
      await api.delete(`/indicators/${ind.id}/`);
      loadData();
    } catch (e: any) {
      alert('Failed to delete indicator');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("WARNING: This will permanently delete ALL imported indicator data values (the definitions will remain). This action cannot be undone.\\n\\nAre you sure you want to clear ALL indicator data?")) {
      setIsClearing(true);
      try {
        await api.delete('/indicators/values/clear_all/');
        loadData();
      } catch (e: any) {
        alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to clear indicator data');
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Indicator Engine</h2>
          <p className="text-muted-foreground font-medium">Design, manage, and compute national education metrics</p>
        </div>
        <RoleGate allowedRoles={['SUPER_ADMIN', 'HEA_ADMIN']}>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-bold hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isClearing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Clear All Data
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Indicator
            </button>
          </div>
        </RoleGate>
      </header>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summary.slice(0, 4).map((ind: any) => (
            <div key={ind.code} className="p-5 bg-white rounded-2xl shadow-sm border border-border/30">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{ind.name}</p>
              <p className="text-2xl font-black text-primary">{ind.average} <span className="text-xs font-medium">{ind.unit}</span></p>
              {ind.target_value && (
                <p className="text-xs text-muted-foreground mt-1">Target: {ind.target_value}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feature Banner */}
      <div className="bg-gradient-to-br from-primary to-[#0056B3] rounded-[2.5rem] p-8 text-white shadow-premium mb-8 flex items-center justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 opacity-10">
          <Activity className="w-80 h-80" />
        </div>
        <div className="relative z-10 max-w-xl">
          <h3 className="text-xl font-black mb-2">Dynamic Metric Computation</h3>
          <p className="text-white/80 font-medium mb-4 leading-relaxed text-sm">
            Define custom formulas and link them to your raw data imports. The Indicator Engine automatically recalculates national KPIs across all registered institutions.
          </p>
          <button className="px-5 py-2.5 bg-white text-primary rounded-xl font-bold hover:bg-surface-blue transition-colors flex items-center gap-2 text-sm">
            <Database className="w-4 h-4" />
            Manage Data Sources
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search indicators by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Categories</option>
          <option value="SDG4">SDG 4</option>
          <option value="CESA">CESA</option>
          <option value="HEA_KPI">HEA KPI</option>
          <option value="INSTITUTIONAL">Institutional</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {indicators.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-border/30">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-muted-foreground">No indicators found. Create your first one.</p>
            </div>
          ) : indicators.map((ind: any) => (
            <div key={ind.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-border/50 flex items-center justify-between group hover:shadow-premium hover:border-primary/20 transition-all cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-surface-blue flex items-center justify-center text-primary font-black">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-muted-foreground bg-off-white px-2 py-0.5 rounded">{ind.code}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ind.category] || 'bg-gray-100 text-gray-600'}`}>
                      {ind.category}
                    </span>
                    {!ind.is_active && (
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-primary group-hover:text-secondary transition-colors">{ind.name}</h4>
                  {ind.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ind.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Unit</p>
                  <p className="font-bold text-primary text-sm">{ind.unit}</p>
                </div>
                {ind.target_value && (
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Target</p>
                    <p className="font-bold text-primary text-sm">{ind.target_value}</p>
                  </div>
                )}
                <div className="w-9 h-9 rounded-full bg-off-white flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-primary">Create Indicator</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-off-white rounded-xl">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Total Enrollment" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Code *</label>
                    <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-mono font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. ENROLL_TOTAL" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Description *</label>
                  <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Describe what this indicator measures" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="HEA_KPI">HEA KPI</option>
                      <option value="SDG4">SDG 4</option>
                      <option value="CESA">CESA</option>
                      <option value="INSTITUTIONAL">Institutional</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Unit</label>
                    <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Percentage, Count" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Formula *</label>
                    <input required value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Graduates / Enrolled * 100" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Target Value</label>
                    <input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} className="w-full px-3 py-2.5 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 80" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-off-white transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Indicator
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
