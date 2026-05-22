"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { User, Lock, Bell, Shield, Save, Loader2, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: '',
  });
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/me/', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (passwords.new_password !== passwords.new_password_confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/me/change-password/', passwords);
      setPwSuccess('Password changed successfully.');
      setPasswords({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (e: any) {
      setPwError(e?.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h2 className="text-3xl font-black text-primary tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground font-medium">Manage your profile, security, and preferences</p>
      </header>

      <div className="flex gap-8">
        {/* Sidebar tabs */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-white hover:text-primary'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Role badge */}
          <div className="mt-6 p-4 bg-white rounded-2xl border border-border/30">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Your Role</p>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">{user?.role_display}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 p-8">
              <h3 className="text-xl font-black text-primary mb-6">Profile Information</h3>
              <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">First Name</label>
                    <input
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Last Name</label>
                    <input
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Username</label>
                  <input
                    value={user?.username || ''}
                    disabled
                    className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-mono font-bold text-primary/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-70"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? 'Saved!' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 p-8">
              <h3 className="text-xl font-black text-primary mb-6">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.old_password}
                    onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                    className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.new_password_confirm}
                    onChange={(e) => setPasswords({ ...passwords, new_password_confirm: e.target.value })}
                    className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="••••••••"
                  />
                </div>
                {pwError && <p className="text-sm text-red-600 font-medium">{pwError}</p>}
                {pwSuccess && <p className="text-sm text-green-600 font-medium">{pwSuccess}</p>}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-70"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 p-8">
              <h3 className="text-xl font-black text-primary mb-6">Notification Preferences</h3>
              <div className="space-y-4 max-w-lg">
                {[
                  { label: 'Import completion alerts', desc: 'Get notified when a data import finishes processing' },
                  { label: 'Report generation', desc: 'Notify when a report is ready to download' },
                  { label: 'System announcements', desc: 'Platform updates and maintenance notices' },
                  { label: 'Compliance alerts', desc: 'Institutional compliance status changes' },
                ].map((n, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-off-white rounded-2xl">
                    <div>
                      <p className="font-bold text-primary text-sm">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={i < 2} className="sr-only peer" />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
                <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all mt-2">
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
