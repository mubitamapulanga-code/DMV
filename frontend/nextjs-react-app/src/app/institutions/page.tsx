"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import {
  Plus, Search, MapPin, Building2, CheckCircle, XCircle,
  ExternalLink, Loader2, ChevronLeft, ChevronRight, X, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PROVINCES = [
  { value: 'LUSAKA', label: 'Lusaka' },
  { value: 'COPPERBELT', label: 'Copperbelt' },
  { value: 'CENTRAL', label: 'Central' },
  { value: 'SOUTHERN', label: 'Southern' },
  { value: 'EASTERN', label: 'Eastern' },
  { value: 'WESTERN', label: 'Western' },
  { value: 'NORTHERN', label: 'Northern' },
  { value: 'NORTH_WESTERN', label: 'North Western' },
  { value: 'LUAPULA', label: 'Luapula' },
  { value: 'MUCHINGA', label: 'Muchinga' },
];

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', type: 'PUBLIC', province: 'LUSAKA',
    registration_number: '', address: '', website: '', email: '', phone: '', established_year: '',
  });

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (provinceFilter) params.set('province', provinceFilter);
      params.set('page', String(page));
      const data = await api.get<any>(`/institutions/?${params}`);
      if (Array.isArray(data)) {
        setInstitutions(data);
        setTotalCount(data.length);
      } else {
        setInstitutions(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, provinceFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadInstitutions, 300);
    return () => clearTimeout(t);
  }, [loadInstitutions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/institutions/', {
        ...form,
        established_year: form.established_year ? parseInt(form.established_year) : null,
      });
      setShowModal(false);
      setForm({ name: '', code: '', type: 'PUBLIC', province: 'LUSAKA', registration_number: '', address: '', website: '', email: '', phone: '', established_year: '' });
      loadInstitutions();
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to register institution');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("WARNING: Deleting all institutions will cascade and delete all students, programmes, and enrollments attached to them. This action cannot be undone.\\n\\nAre you sure you want to clear ALL institutions?")) {
      setIsClearing(true);
      try {
        await api.delete('/institutions/clear_all/');
        setPage(1);
        loadInstitutions();
      } catch (e: any) {
        alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to clear institutions');
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
          <h2 className="text-3xl font-black text-primary tracking-tight">Institutional Directory</h2>
          <p className="text-muted-foreground font-medium">Manage and monitor Higher Education Institutions nationwide</p>
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
              Register New HEI
            </button>
          </div>
        </RoleGate>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name, code or registration number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/10 font-medium text-primary transition-all"
          />
        </div>
        <div className="flex gap-4">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-6 py-4 bg-white border-none rounded-2xl shadow-sm font-bold text-primary focus:ring-2 focus:ring-primary/10">
            <option value="">All Types</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
            <option value="COLLEGE">College</option>
            <option value="TECHNICAL">Technical</option>
          </select>
          <select value={provinceFilter} onChange={(e) => { setProvinceFilter(e.target.value); setPage(1); }} className="px-6 py-4 bg-white border-none rounded-2xl shadow-sm font-bold text-primary focus:ring-2 focus:ring-primary/10">
            <option value="">All Provinces</option>
            {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        {loading ? (
          <div className="w-full">
            <div className="bg-surface-blue/50 px-4 py-4 border-b border-border/50 flex gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-4 bg-primary/10 rounded w-full animate-pulse"></div>)}
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-4 border-b border-border/50 flex items-center gap-4">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex-shrink-0 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-primary/10 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-primary/5 rounded w-1/2 animate-pulse" />
                </div>
                {[1, 2, 3, 4].map(j => <div key={j} className="h-4 bg-primary/10 rounded w-full flex-1 animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : institutions.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold text-muted-foreground">No institutions found</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-blue/70 backdrop-blur-sm text-left">
                <th className="px-4 py-4 text-xs font-black text-primary uppercase tracking-widest sticky top-0">Institution</th>
                <th className="px-4 py-4 text-xs font-black text-primary uppercase tracking-widest sticky top-0">Code</th>
                <th className="px-4 py-4 text-xs font-black text-primary uppercase tracking-widest sticky top-0">Type</th>
                <th className="px-4 py-4 text-xs font-black text-primary uppercase tracking-widest sticky top-0">Province</th>
                <th className="px-4 py-4 text-xs font-black text-primary uppercase tracking-widest sticky top-0">Status</th>
                <th className="px-4 py-4 text-xs font-black text-primary uppercase tracking-widest sticky top-0">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {institutions.map((hei: any) => (
                <tr key={hei.id} className="hover:bg-primary/5 transition-colors group cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/5 text-primary rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0">
                        {hei.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-primary group-hover:text-secondary transition-colors">{hei.name}</p>
                        {hei.website && (
                          <a href={hei.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold bg-off-white px-2 py-1 rounded text-primary/70">{hei.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" />
                      <span className="text-sm font-medium text-primary/80">{hei.type_display || hei.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-primary/80">{hei.province_display || hei.province}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${hei.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {hei.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {hei.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-bold text-primary hover:text-secondary transition-colors">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          Showing {institutions.length} of {totalCount} institutions
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Register Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="glass-card rounded-[2rem] p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-primary">Register New HEI</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-off-white rounded-xl"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Institution Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. University of Zambia" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Code *</label>
                    <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-mono font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. UNZA" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Registration No. *</label>
                    <input required value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. HEA/2001/001" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="PUBLIC">Public University</option>
                      <option value="PRIVATE">Private University</option>
                      <option value="COLLEGE">College</option>
                      <option value="TECHNICAL">Technical/Vocational</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Province</label>
                    <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="info@institution.ac.zm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Established Year</label>
                    <input type="number" value={form.established_year} onChange={(e) => setForm({ ...form, established_year: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 1966" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Website</label>
                  <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://www.institution.ac.zm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-off-white transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Register HEI
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
