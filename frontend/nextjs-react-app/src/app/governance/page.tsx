"use client";

import React from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import Link from 'next/link';
import { ShieldCheck, ClipboardList, AlertTriangle, CheckCircle, FileText, ArrowRight } from 'lucide-react';

const governanceModules = [
  {
    icon: ClipboardList,
    title: 'Audit Logs',
    description: 'Full activity trail of all user actions, data changes, and system events.',
    href: '/governance/audit',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Tracking',
    description: 'Monitor institutional compliance status and accreditation requirements.',
    href: '/governance/compliance',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: AlertTriangle,
    title: 'Data Quality Alerts',
    description: 'Automated alerts for data anomalies, missing records, and validation failures.',
    href: '/governance/alerts',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: FileText,
    title: 'Policy Documents',
    description: 'Access HEA regulatory frameworks, guidelines, and policy documents.',
    href: '/governance/policies',
    color: 'bg-purple-50 text-purple-600',
  },
];

const complianceStats = [
  { label: 'Compliant Institutions', value: '89%', color: 'text-green-600' },
  { label: 'Pending Reviews', value: '12', color: 'text-amber-600' },
  { label: 'Non-Compliant', value: '3', color: 'text-red-600' },
  { label: 'Audit Score', value: '94.5', color: 'text-primary' },
];

export default function GovernancePage() {
  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Governance & Compliance</h2>
          <p className="text-muted-foreground font-medium">Oversight, accountability, and regulatory compliance management</p>
        </div>
      </header>

      {/* Compliance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {complianceStats.map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded-2xl shadow-sm border border-border/30 text-center">
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Governance Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {governanceModules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="p-8 bg-white rounded-[2rem] border border-border/50 hover:shadow-premium hover:border-primary/20 transition-all group"
          >
            <div className="flex items-start gap-5">
              <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <mod.icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-black text-primary group-hover:text-secondary transition-colors mb-2">{mod.title}</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{mod.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Compliance Activity */}
      <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
        <div className="px-8 py-6 border-b border-border/30">
          <h4 className="text-lg font-black text-primary">Recent Compliance Activity</h4>
        </div>
        <div className="divide-y divide-border/30">
          {[
            { institution: 'University of Zambia', action: 'Annual compliance report submitted', status: 'COMPLIANT', date: '2026-05-20' },
            { institution: 'Copperbelt University', action: 'Accreditation renewal pending', status: 'PENDING', date: '2026-05-18' },
            { institution: 'Mulungushi University', action: 'Data submission overdue', status: 'NON_COMPLIANT', date: '2026-05-15' },
            { institution: 'Cavendish University', action: 'Programme accreditation approved', status: 'COMPLIANT', date: '2026-05-12' },
          ].map((item, i) => (
            <div key={i} className="px-8 py-4 flex items-center justify-between hover:bg-surface-blue/20 transition-colors">
              <div>
                <p className="font-bold text-primary text-sm">{item.institution}</p>
                <p className="text-xs text-muted-foreground font-medium">{item.action}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  item.status === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                  item.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
