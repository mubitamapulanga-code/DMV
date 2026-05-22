"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import { Users, Search, Filter, GraduationCap, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ENROLLED: 'bg-green-100 text-green-700',
  GRADUATED: 'bg-blue-100 text-blue-700',
  DEFERRED: 'bg-amber-100 text-amber-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const PAGE_SIZE = 25;

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (genderFilter) params.set('gender', genderFilter);
      params.set('page', String(page));
      const data = await api.get<any>(`/academic/students/?${params}`);
      if (Array.isArray(data)) {
        setStudents(data);
        setTotalCount(data.length);
      } else {
        setStudents(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, genderFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadStudents, 300);
    return () => clearTimeout(t);
  }, [loadStudents]);

  const handleClearAll = async () => {
    if (window.confirm("WARNING: This will permanently delete ALL students. This action cannot be undone.\\n\\nAre you sure you want to clear ALL students?")) {
      setIsClearing(true);
      try {
        await api.delete('/academic/students/clear_all/');
        setPage(1);
        loadStudents();
      } catch (e: any) {
        alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to clear students');
      } finally {
        setIsClearing(false);
      }
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Student Records</h2>
          <p className="text-muted-foreground font-medium">Manage and track student enrollment data nationwide</p>
        </div>
        <div className="flex items-center gap-3">
          <RoleGate allowedRoles={['SUPER_ADMIN', 'HEA_ADMIN']}>
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Clear All Data
            </button>
          </RoleGate>
          <div className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary">
            {totalCount.toLocaleString()} students
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by name, student ID, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Statuses</option>
          <option value="ENROLLED">Enrolled</option>
          <option value="GRADUATED">Graduated</option>
          <option value="DEFERRED">Deferred</option>
          <option value="WITHDRAWN">Withdrawn</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select
          value={genderFilter}
          onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
          className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-bold text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground mt-1">Import student data using the Data Import module</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-blue/50">
                <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Student</th>
                <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">ID</th>
                <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Institution</th>
                <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Programme</th>
                <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Year</th>
                <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {students.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-blue/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/8 text-primary font-black text-xs flex items-center justify-center flex-shrink-0">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-primary">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-muted-foreground">{s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : 'Other'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-off-white px-2 py-1 rounded text-primary/70 font-bold">{s.student_id}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-primary/80">{s.institution_name || '—'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-primary/80">{s.programme_name || '—'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">{s.year_of_entry}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-medium">
            Page {page} of {totalPages} ({totalCount.toLocaleString()} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary hover:bg-surface-blue transition-all disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
