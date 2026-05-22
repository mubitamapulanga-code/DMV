"use client";

import React from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { ShieldCheck, CheckCircle, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const complianceData = [
  { institution: 'University of Zambia', status: 'COMPLIANT', score: 98, lastAudit: '2026-03-15', nextAudit: '2027-03-15', issues: 0 },
  { institution: 'Copperbelt University', status: 'COMPLIANT', score: 94, lastAudit: '2026-02-10', nextAudit: '2027-02-10', issues: 1 },
  { institution: 'Mulungushi University', status: 'PENDING', score: 72, lastAudit: '2025-11-20', nextAudit: '2026-11-20', issues: 3 },
  { institution: 'Cavendish University', status: 'COMPLIANT', score: 91, lastAudit: '2026-04-01', nextAudit: '2027-04-01', issues: 0 },
  { institution: 'Northrise University', status: 'NON_COMPLIANT', score: 55, lastAudit: '2025-09-05', nextAudit: '2026-09-05', issues: 7 },
  { institution: 'Zambia Open University', status: 'COMPLIANT', score: 88, lastAudit: '2026-01-22', nextAudit: '2027-01-22', issues: 2 },
];

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  COMPLIANT: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Compliant' },
  PENDING: { color: 'bg-amber-100 text-amber-700', icon: AlertTriangle, label: 'Pending Review' },
  NON_COMPLIANT: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Non-Compliant' },
};

export default function CompliancePage() {
  const compliant = complianceData.filter(d => d.status === 'COMPLIANT').length;
  const pending = complianceData.filter(d => d.status === 'PENDING').length;
  const nonCompliant = complianceData.filter(d => d.status === 'NON_COMPLIANT').length;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/governance" className="p-2 hover:bg-white rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Compliance Tracking</h2>
          <p className="text-muted-foreground font-medium">Institutional compliance status and accreditation monitoring</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Compliant', value: compliant, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending Review', value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Non-Compliant', value: nonCompliant, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`p-6 ${s.bg} rounded-2xl border border-white`}>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-sm font-bold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-blue/50">
              <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Institution</th>
              <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Score</th>
              <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Last Audit</th>
              <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Next Audit</th>
              <th className="px-6 py-5 text-left text-xs font-black text-primary uppercase tracking-widest">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {complianceData.map((row, i) => {
              const cfg = STATUS_CONFIG[row.status];
              const StatusIcon = cfg.icon;
              return (
                <tr key={i} className="hover:bg-surface-blue/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary text-sm">{row.institution}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-off-white rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.score >= 90 ? 'bg-green-500' : row.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${row.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-primary">{row.score}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{row.lastAudit}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{row.nextAudit}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${row.issues === 0 ? 'text-green-600' : row.issues <= 2 ? 'text-amber-600' : 'text-red-600'}`}>
                      {row.issues}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
