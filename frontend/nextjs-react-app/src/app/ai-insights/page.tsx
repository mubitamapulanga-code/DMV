"use client";

import React from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Activity,
} from 'lucide-react';

export default function AIInsightsPage() {
  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight flex items-center gap-3">
            AI Insights <Sparkles className="w-6 h-6 text-amber-500" />
          </h2>
          <p className="text-muted-foreground font-medium">Predictive analytics and automated anomaly detection</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-border text-primary rounded-2xl font-bold shadow-sm hover:bg-surface-blue transition-all">
          <MessageSquare className="w-5 h-5" />
          Ask AI Assistant
        </button>
      </header>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-br from-primary to-[#0056B3] rounded-[2.5rem] p-10 text-white shadow-premium mb-10 flex items-center justify-between relative overflow-hidden">
        <div className="absolute -right-20 -top-20 opacity-10">
          <BrainCircuit className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <Activity className="w-3 h-3" />
            AI Module — Coming Soon
          </div>
          <h3 className="text-2xl font-black mb-3">Intelligent Analytics Engine</h3>
          <p className="text-white/80 font-medium leading-relaxed">
            The AI Intelligence module will provide predictive enrollment forecasting, anomaly detection, resource allocation recommendations, and natural language querying of the national education database.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Insights Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-red-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-red-400"></div>
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-primary mb-2">Graduation Rate Anomaly Detected</h4>
                <p className="text-muted-foreground font-medium mb-4 leading-relaxed">
                  A statistically significant drop (14.2%) in graduation rates for Science and Technology programs at <span className="font-bold text-primary">Copperbelt University</span> compared to the 5-year moving average.
                </p>
                <button className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors">Investigate Metric →</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-400"></div>
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-primary mb-2">Enrollment Forecast for 2025</h4>
                <p className="text-muted-foreground font-medium mb-4 leading-relaxed">
                  Based on current demographic trends and historical intake data, national enrollment in Private Institutions is projected to grow by <span className="text-green-600 font-bold">8.5%</span> next academic year.
                </p>
                <button className="text-sm font-bold text-blue-500 hover:text-blue-700 transition-colors">View Forecast Model →</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-primary mb-2">Resource Allocation Recommendation</h4>
                <p className="text-muted-foreground font-medium mb-4 leading-relaxed">
                  Student-to-Faculty ratios in the Northern Province have exceeded the recommended maximum of 35:1. Consider prioritizing staffing grants for public institutions in this region.
                </p>
                <button className="text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors">View Policy Brief →</button>
              </div>
            </div>
          </div>
        </div>

        {/* Model Status */}
        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-[2rem] text-white shadow-premium">
            <h4 className="font-black text-xl mb-6">Model Health</h4>
            <div className="space-y-5">
              {[
                { label: 'Data Freshness', value: 98, color: 'bg-green-400' },
                { label: 'Prediction Accuracy', value: 94, color: 'bg-blue-400' },
                { label: 'Anomaly Confidence', value: 100, color: 'bg-amber-400' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 opacity-80">
                    <span>{m.label}</span>
                    <span>{m.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color}`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-xs font-medium text-white/60 mb-1">Last Retrained</p>
              <p className="font-bold text-sm">Today, 02:00 AM CAT</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
