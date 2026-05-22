"use client";

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  Loader2,
  BarChart3,
  AlertCircle,
  GraduationCap,
  Building2,
  Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const STATS = [
  { icon: Building2,     label: 'Institutions', value: '112+' },
  { icon: GraduationCap, label: 'Students',     value: '184K' },
  { icon: Activity,      label: 'Indicators',   value: '40+'  },
  { icon: BarChart3,     label: 'Provinces',    value: '10'   },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      router.replace('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div
      className="min-h-screen flex items-stretch relative overflow-hidden"
      style={{ background: 'var(--colour-off-white)' }}
    >
      {/* ── Left Brand Panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] p-14 relative overflow-hidden"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'var(--colour-accent-orange)' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'var(--colour-accent-blue)' }}
        />
        {/* Orange accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'var(--colour-accent-orange)' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--colour-accent-orange)' }}
          >
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">HEA DMV</span>
            <p className="text-[9px] text-white/35 uppercase tracking-widest font-semibold">
              Intelligence Layer
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              Zambia's National<br />
              <span style={{ color: 'var(--colour-accent-orange)' }}>Higher Education</span><br />
              Intelligence Platform
            </h1>
            <p className="mt-4 text-white/55 text-sm leading-relaxed max-w-xs">
              Analytics, historical repository, and KPI intelligence for every institution across all 10 provinces.
            </p>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="p-4 rounded-2xl flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(243,115,54,0.15)' }}
                >
                  <s.icon className="w-4 h-4" style={{ color: 'var(--colour-accent-orange)' }} />
                </div>
                <div>
                  <p className="text-xl font-black text-white leading-none">{s.value}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[10px] text-white/25 font-medium uppercase tracking-widest">
            © 2024 Higher Education Authority of Zambia
          </p>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--colour-accent-orange)' }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black" style={{ color: 'var(--colour-primary)' }}>
              HEA DMV
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2
              className="text-3xl font-black tracking-tight"
              style={{ color: 'var(--colour-primary)' }}
            >
              Welcome back
            </h2>
            <p className="font-medium mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label
                className="text-[10px] font-black uppercase tracking-widest ml-1"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Username
              </label>
              <div className="relative group">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                  style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border rounded-xl font-medium placeholder:text-gray-300 transition-all outline-none"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--colour-primary)',
                    fontSize: '14px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--colour-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,53,128,0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  placeholder="e.g. admin"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11px] font-bold hover:underline"
                  style={{ color: 'var(--colour-accent-orange)' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
                  style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border rounded-xl font-medium placeholder:text-gray-300 transition-all outline-none"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--colour-primary)',
                    fontSize: '14px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--colour-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,53,128,0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-1 rounded-xl font-black text-sm flex items-center justify-center gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'var(--colour-primary)',
                color: '#fff',
                boxShadow: '0 6px 20px rgba(0,53,128,0.25)',
                transition: 'filter 0.2s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.filter = '';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div
            className="mt-8 pt-6 border-t flex items-center justify-center gap-2 text-xs font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            <Shield className="w-3.5 h-3.5 text-green-500" />
            Secure JWT authentication · Access is monitored
          </div>

          {/* Demo credentials */}
          <div
            className="mt-4 p-4 rounded-2xl"
            style={{ background: 'var(--colour-surface-blue)' }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: 'var(--colour-primary)' }}
            >
              Demo Credentials
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--colour-primary)', opacity: 0.7 }}>
              Username: <span className="font-bold font-mono">admin</span>
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--colour-primary)', opacity: 0.7 }}>
              Password: <span className="font-bold font-mono">adminpassword123</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
