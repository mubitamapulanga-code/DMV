"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { api } from '@/lib/api';
import { ClipboardList, Search, Shield, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  IMPORT: 'bg-amber-100 text-amber-700',
  EXPORT: 'bg-cyan-100 text-cyan-700',
  VIEW: 'bg-indigo-100 text-indigo-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      params.set('page', String(page));
      const data = await api.get<any>(`/audit/?${params}`);
      setLogs(Array.isArray(data) ? data : data.results || []);
      setTotalCount(Array.isArray(data) ? data.length : data.count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadLogs, 300);
    return () => clearTimeout(t);
  }, [loadLogs]);

  const totalPages = Math.ceil(totalCount / 25);

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
            <p className="text-muted-foreground max-w-sm">Audit logs are only accessible to administrators.</p>
          </div>
        }
      >
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-primary tracking-tight">Audit Logs</h2>
            <p className="text-muted-foreground font-medium">Complete activity trail for accountability and compliance</p>
          </div>
          <div className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold text-primary">
            {totalCount.toLocaleString()} entries
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by user, description, or resource..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Actions</option>
            {Object.keys(ACTION_COLORS).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-blue/50">
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">User</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Action</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Resource</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Description</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-surface-blue/20 transition-colors">
                    <td className="px-6 py-4 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-primary">{log.username || 'System'}</p>
                      {log.user_role && <p className="text-xs text-muted-foreground">{log.user_role}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary/80">{log.resource_type}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">{log.description}</td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
      </RoleGate>
    </DashboardLayout>
  );
}
