"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import RoleGate from '@/components/Auth/RoleGate';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Users, Plus, Search, Shield, CheckCircle, XCircle,
  Edit3, Trash2, Mail, Key, Loader2, X, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SUPER_ADMIN:   { bg: 'bg-red-100',    text: 'text-red-700' },
  HEA_ADMIN:     { bg: 'bg-amber-100',  text: 'text-amber-700' },
  DATA_MANAGER:  { bg: 'bg-blue-100',   text: 'text-blue-700' },
  ANALYST:       { bg: 'bg-purple-100', text: 'text-purple-700' },
  QA_OFFICER:    { bg: 'bg-cyan-100',   text: 'text-cyan-700' },
  MINISTRY_USER: { bg: 'bg-green-100',  text: 'text-green-700' },
  HEI_USER:      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  PUBLIC_USER:   { bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const ROLES = ['SUPER_ADMIN','HEA_ADMIN','DATA_MANAGER','ANALYST','QA_OFFICER','MINISTRY_USER','HEI_USER','PUBLIC_USER'];
const ROLE_LABELS: Record<string,string> = {
  SUPER_ADMIN:'Super Admin', HEA_ADMIN:'HEA Admin', DATA_MANAGER:'Data Manager',
  ANALYST:'Analyst', QA_OFFICER:'QA Officer', MINISTRY_USER:'Ministry User',
  HEI_USER:'HEI User', PUBLIC_USER:'Public User',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', username: '', role: 'DATA_MANAGER', password: '', password_confirm: '' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const [usersData, statsData] = await Promise.all([
        api.get<any>(`/auth/users/?${params}`),
        api.get<any>('/auth/users/stats/'),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : usersData.results || []);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/auth/users/', form);
      setShowAddModal(false);
      setForm({ first_name: '', last_name: '', email: '', username: '', role: 'DATA_MANAGER', password: '', password_confirm: '' });
      loadUsers();
    } catch (e: any) {
      const errors = e?.response?.data;
      alert(errors ? JSON.stringify(errors) : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await api.delete(`/auth/users/${userId}/`);
      loadUsers();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to deactivate user');
    }
  };

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
            <p className="text-muted-foreground max-w-sm">You don't have permission to manage users. Contact a Super Admin.</p>
          </div>
        }
      >
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-primary tracking-tight">User Management</h2>
            <p className="text-muted-foreground font-medium">Manage platform users and their role assignments</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadUsers} className="p-3 bg-white border border-border rounded-xl hover:bg-surface-blue transition-colors">
              <RefreshCw className="w-4 h-4 text-primary" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>
        </header>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.total },
              { label: 'Active', value: stats.active },
              { label: 'Inactive', value: stats.inactive },
              { label: 'Roles', value: stats.by_role?.length || 0 },
            ].map((s) => (
              <div key={s.label} className="p-5 bg-white rounded-2xl shadow-sm border border-border/30 text-center">
                <p className="text-2xl font-black text-primary">{s.value}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by name, email or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-5 py-3 bg-white border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-blue/50">
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">User</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Username</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Role</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Last Login</th>
                  <th className="px-6 py-5 text-xs font-black text-primary uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map((u: any) => {
                  const colors = ROLE_COLORS[u.role] || ROLE_COLORS.PUBLIC_USER;
                  const initials = `${(u.first_name || u.username)[0]}${(u.last_name || u.username)[1] || ''}`.toUpperCase();
                  const isSelf = currentUser?.username === u.username;
                  return (
                    <tr key={u.id} className="hover:bg-surface-blue/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/8 text-primary font-black text-sm flex items-center justify-center flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-primary">
                              {u.first_name} {u.last_name}
                              {isSelf && <span className="ml-2 text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full font-black uppercase">You</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Mail className="w-3 h-3" /> {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-off-white px-2 py-1 rounded text-primary/70 font-bold">{u.username}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                          <Shield className="w-3 h-3" />
                          {u.role_display}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-2 hover:bg-primary/8 text-primary/40 hover:text-primary rounded-xl transition-colors" title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-primary/8 text-primary/40 hover:text-primary rounded-xl transition-colors" title="Reset Password">
                            <Key className="w-4 h-4" />
                          </button>
                          {!isSelf && u.is_active && (
                            <button
                              onClick={() => handleDeactivate(u.id)}
                              className="p-2 hover:bg-red-50 text-primary/40 hover:text-red-500 rounded-xl transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && users.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-bold text-muted-foreground">No users match your search</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground font-medium">Showing {users.length} users</p>

        {/* Add User Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-primary">Add New User</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-off-white rounded-xl">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <form className="space-y-4" onSubmit={handleCreate}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">First Name</label>
                      <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. James" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Last Name</label>
                      <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Mwale" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Email Address</label>
                    <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="user@hea.gov.zm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Username</label>
                    <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. jmwale" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Assign Role</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Password</label>
                      <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 block">Confirm Password</label>
                      <input required type="password" value={form.password_confirm} onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:bg-off-white transition-colors">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create User
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </RoleGate>
    </DashboardLayout>
  );
}
