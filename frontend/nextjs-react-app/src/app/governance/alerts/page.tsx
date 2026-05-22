"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { AlertTriangle, ArrowLeft, CheckCircle, XCircle, Info, Filter } from 'lucide-react';
import Link from 'next/link';

const alerts = [
  { id: 1, severity: 'HIGH', type: 'Missing Data', institution: 'Mulungushi University', message: 'Enrollment data for 2024 Q3 has not been submitted.', date: '2026-05-20', resolved: false },
  { id: 2, severity: 'MEDIUM', type: 'Validation Error', institution: 'Northrise University', message: 'Student count exceeds registered capacity by 12%.', date: '2026-05-19', resolved: false },
  { id: 3, severity: 'LOW', type: 'Data Quality', institution: 'Cavendish University', message: 'Duplicate student IDs detected in the 2023 import batch.', date: '2026-05-18', resolved: true },
  { id: 4, severity: 'HIGH', type: 'Compliance', institution: 'Zambia Open University', message: 'Annual compliance report overdue by 30 days.', date: '2026-05-17', resolved: false },
  { id: 5, severity: 'MEDIUM', type: 'Anomaly', institution: 'Copperbelt University', message: 'Graduation rate dropped 14% below 5-year average.', date: '2026-05-15', resolved: false },
  { id: 6, severity: 'LOW', type: 'Data Quality', institution: 'University of Zambia', message: 'Programme codes contain non-standard formatting.', date: '2026-05-14', resolved: true },
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  HIGH: { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertTriangle },
  LOW: { color: 'text-blue-700', bg: 'bg-blue-100', icon: Info },
};

export default function AlertsPage() {
  const [filter, setFilter] = useState('ALL');
  const [showResolved, setShowResolved] = useState(false);

  const filtered = alerts.filter(a => {
    if (!showResolved && a.resolved) return false;
    if (filter !== 'ALL' && a.severity !== filter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/governance" className="p-2 hover:bg-white rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Data Quality Alerts</h2>
          <p className="text-muted-foreground font-medium">Automated alerts for anomalies, missing data, and validation failures</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'High Priority', value: alerts.filter(a => a.severity === 'HIGH' && !a.resolved).length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Medium Priority', value: alerts.filter(a => a.severity === 'MEDIUM' && !a.resolved).length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Resolved', value: alerts.filter(a => a.resolved).length, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={`p-5 ${s.bg} rounded-2xl`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Show resolved
        </label>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-border/30">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="font-bold text-muted-foreground">No active alerts</p>
          </div>
        ) : filtered.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          const SeverityIcon = cfg.icon;
          return (
            <div
              key={alert.id}
              className={`bg-white p-6 rounded-2xl border ${alert.resolved ? 'border-border/30 opacity-60' : 'border-border/50'} shadow-sm flex items-start gap-5`}
            >
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                <SeverityIcon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-off-white px-2 py-0.5 rounded-full">
                    {alert.type}
                  </span>
                  {alert.resolved && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Resolved
                    </span>
                  )}
                </div>
                <p className="font-bold text-primary text-sm">{alert.institution}</p>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">{alert.message}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{alert.date}</p>
                {!alert.resolved && (
                  <button className="mt-2 text-xs font-bold text-primary hover:text-secondary transition-colors">
                    Resolve →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
