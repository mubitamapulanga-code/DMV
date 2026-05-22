"use client";

import React from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { api } from '@/lib/api';
import { TrendingUp, Building2, Users, GraduationCap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [year, setYear] = React.useState(2024);

  React.useEffect(() => {
    api.get(`/analytics/executive/?year=${year}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HEA_ADMIN', 'ANALYST', 'MINISTRY_USER']}>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Executive Dashboard</h2>
          <p className="text-muted-foreground font-medium">High-level KPI summary for ministry and executive stakeholders</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-4 py-2 bg-white border border-border rounded-xl text-sm font-bold"
        >
          {[2020, 2021, 2022, 2023, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* National Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Total Students', value: Number(data.national_summary.total_students).toLocaleString(), icon: Users, color: 'bg-blue-50 text-blue-600' },
              { label: 'Avg Graduation Rate', value: `${data.national_summary.avg_graduation_rate}%`, icon: GraduationCap, color: 'bg-green-50 text-green-600' },
              { label: 'Total Institutions', value: data.national_summary.total_institutions, icon: Building2, color: 'bg-purple-50 text-purple-600' },
              { label: 'Active Institutions', value: data.national_summary.active_institutions, icon: Building2, color: 'bg-amber-50 text-amber-600' },
            ].map((card, i) => (
              <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border border-border/30">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <p className="text-2xl font-black text-primary">{card.value}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* YoY Growth */}
          {data.national_summary.yoy_enrollment_growth !== null && (
            <div className={`p-6 rounded-2xl mb-10 flex items-center gap-4 ${
              data.national_summary.yoy_enrollment_growth >= 0
                ? 'bg-green-50 border border-green-100'
                : 'bg-red-50 border border-red-100'
            }`}>
              {data.national_summary.yoy_enrollment_growth >= 0
                ? <ArrowUpRight className="w-8 h-8 text-green-600" />
                : <ArrowDownRight className="w-8 h-8 text-red-600" />
              }
              <div>
                <p className="text-2xl font-black text-primary">
                  {data.national_summary.yoy_enrollment_growth > 0 ? '+' : ''}{data.national_summary.yoy_enrollment_growth}%
                </p>
                <p className="text-sm font-medium text-muted-foreground">Year-over-year enrollment growth ({year - 1} → {year})</p>
              </div>
            </div>
          )}

          {/* Top Institutions */}
          {data.top_institutions_by_enrollment?.length > 0 && (
            <div className="bg-white rounded-[2rem] shadow-premium border border-border/20 overflow-hidden">
              <div className="px-8 py-6 border-b border-border/30">
                <h4 className="text-lg font-black text-primary">Top Institutions by Enrollment</h4>
                <p className="text-xs text-muted-foreground">{year}</p>
              </div>
              <div className="divide-y divide-border/30">
                {data.top_institutions_by_enrollment.map((inst: any, i: number) => (
                  <div key={i} className="px-8 py-4 flex items-center justify-between hover:bg-surface-blue/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-primary/20">#{i + 1}</span>
                      <div>
                        <p className="font-bold text-primary">{inst.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">{inst.type}</p>
                      </div>
                    </div>
                    <p className="text-xl font-black text-primary">{Number(inst.students).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground font-bold">Failed to load executive data.</div>
      )}
    </DashboardLayout>
  );
}
