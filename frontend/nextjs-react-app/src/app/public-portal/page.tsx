"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MapPin,
  GraduationCap,
  Users,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function PublicPortalPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, students: 0, graduation: '—' });
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [loading, setLoading] = useState(false);

  // Load public stats (no auth required for institutions list)
  useEffect(() => {
    fetch(`${API_BASE}/institutions/stats/`)
      .then(r => r.json())
      .then(data => setStats({ total: data.total || 0, students: 0, graduation: '78%' }))
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (province) params.set('province', province.toUpperCase().replace(' ', '_'));
      const res = await fetch(`${API_BASE}/institutions/?${params}`);
      const data = await res.json();
      setInstitutions(Array.isArray(data) ? data : data.results || []);
    } catch {
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white font-sans">
      {/* Public Header */}
      <header className="bg-primary text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary font-black text-sm">
              HEA
            </div>
            <div>
              <h1 className="font-bold tracking-tight leading-tight">Higher Education Authority</h1>
              <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Zambia • Public Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-6 font-bold text-sm text-white/80">
              <a href="#institutions" className="hover:text-white transition-colors">Institutions</a>
              <a href="#stats" className="hover:text-white transition-colors">Statistics</a>
              <a href="#verify" className="hover:text-white transition-colors">Accreditation</a>
            </nav>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-secondary text-white rounded-xl font-bold shadow-md hover:bg-secondary/90 transition-colors text-sm"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-6">
            Explore Higher Education in Zambia
          </h2>
          <p className="text-lg md:text-xl text-white/80 font-medium mb-10 max-w-2xl mx-auto">
            Access official statistics, verify accredited institutions, and discover approved academic programs across the nation.
          </p>

          <form
            onSubmit={handleSearch}
            className="bg-white p-2 rounded-2xl md:rounded-full shadow-2xl flex flex-col md:flex-row items-center max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-3 w-full px-4 py-3 border-b md:border-b-0 md:border-r border-border/50">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for an institution or program..."
                className="w-full border-none focus:ring-0 text-primary font-bold placeholder:text-muted-foreground/60 placeholder:font-medium outline-none"
              />
            </div>
            <div className="flex items-center gap-3 w-full px-4 py-3">
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full border-none focus:ring-0 text-primary font-bold bg-transparent outline-none"
              >
                <option value="">All Provinces</option>
                {['Lusaka','Copperbelt','Central','Southern','Eastern','Western','Northern','North Western','Luapula','Muchinga'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full md:w-auto mt-2 md:mt-0 px-8 py-4 bg-secondary text-white font-black rounded-xl md:rounded-full hover:scale-105 active:scale-95 transition-all flex-shrink-0 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4" /> Search</>}
            </button>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Building2, value: stats.total || '—', label: 'Registered HEIs', color: 'bg-blue-50 text-blue-500' },
            { icon: Users, value: '184k+', label: 'Active Students', color: 'bg-green-50 text-green-500' },
            { icon: GraduationCap, value: stats.graduation, label: 'Graduation Rate', color: 'bg-amber-50 text-amber-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] shadow-premium flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center flex-shrink-0`}>
                <s.icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-4xl font-black text-primary">{s.value}</p>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Search Results */}
      {institutions.length > 0 && (
        <section id="institutions" className="max-w-7xl mx-auto px-6 mb-20">
          <h3 className="text-2xl font-black text-primary mb-6">Search Results ({institutions.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst: any) => (
              <div key={inst.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-border/50 hover:shadow-premium hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-xl bg-surface-blue text-primary flex items-center justify-center font-black text-lg mb-4">
                  {inst.name.charAt(0)}
                </div>
                <h4 className="font-black text-primary mb-1">{inst.name}</h4>
                <p className="text-xs text-muted-foreground font-medium mb-3">{inst.type_display || inst.type} • {inst.province_display || inst.province}</p>
                <div className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${inst.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {inst.is_active ? 'Accredited' : 'Inactive'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Verification Tools */}
      <section id="verify" className="max-w-7xl mx-auto px-6 py-10 mb-20">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-black text-primary mb-3">Official Verification Tools</h3>
          <p className="text-muted-foreground font-medium max-w-xl mx-auto">
            Ensure your educational choices are fully compliant and recognized by the Higher Education Authority.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, title: 'Verify Institution', desc: 'Check the registration status and compliance tier of any university or college operating in Zambia.', cta: 'Start Verification' },
            { icon: GraduationCap, title: 'Verify Programs', desc: 'Ensure that your specific degree or diploma program is accredited by the relevant professional bodies.', cta: 'Search Programs' },
            { icon: Building2, title: 'National Insights', desc: 'Explore interactive maps and data visualizations showing the distribution of higher education.', cta: 'View Analytics' },
          ].map((card, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-border/50 hover:shadow-premium hover:-translate-y-2 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-surface-blue text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <card.icon className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-primary mb-3">{card.title}</h4>
              <p className="text-muted-foreground font-medium mb-6 text-sm leading-relaxed">{card.desc}</p>
              <a href="#" className="font-bold text-secondary flex items-center gap-2 group-hover:gap-3 transition-all text-sm">
                {card.cta} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white/50 py-12 text-center">
        <p className="font-bold mb-2 text-white/70">Higher Education Authority, Zambia</p>
        <p className="text-sm font-medium">© 2026 HEA Data Management Vision. All rights reserved.</p>
        <div className="mt-4">
          <Link href="/login" className="text-white/60 hover:text-white text-sm font-bold transition-colors">
            Staff Portal Login →
          </Link>
        </div>
      </footer>
    </div>
  );
}
