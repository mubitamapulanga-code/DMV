"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import FileUploader from '@/components/Imports/FileUploader';
import { api } from '@/lib/api';
import { History, Info, ChevronRight, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  PROCESSING: 'bg-blue-500 animate-pulse',
  PENDING: 'bg-amber-500',
  FAILED: 'bg-red-500',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle,
  PROCESSING: Loader2,
  PENDING: Clock,
  FAILED: XCircle,
};

export default function ImportsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.get<any>('/imports/history/');
      setHistory(Array.isArray(data) ? data.slice(0, 10) : (data.results || []).slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h2 className="text-3xl font-black text-primary tracking-tight">Historical Data Import</h2>
        <p className="text-muted-foreground font-medium">Ingest national higher education datasets into the intelligence layer</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2">
          <FileUploader onUploadSuccess={loadHistory} />

          <div className="mt-10 p-8 bg-primary rounded-[2.5rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xl font-bold mb-2">Automated Cleaning Engine</h4>
              <p className="text-white/70 text-sm mb-5 max-w-md">Our rule-based engine automatically normalizes institution names, programme levels, and validates student records during the import process.</p>
              <a href="/governance" className="flex items-center gap-2 text-sm font-bold bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors w-fit">
                View Cleaning Rules
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Info className="w-48 h-48" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Import History */}
          <div className="p-8 glass-card rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h4 className="text-lg font-black text-primary uppercase tracking-tight">Recent Activity</h4>
              </div>
              <button onClick={loadHistory} className="p-1.5 hover:bg-off-white rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 font-medium">No imports yet</p>
            ) : (
              <motion.div 
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {history.map((item: any) => {
                  const StatusIcon = STATUS_ICONS[item.status] || Clock;
                  return (
                    <motion.div 
                      key={item.id} 
                      className="flex gap-4 group cursor-pointer"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      whileHover={{ x: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={`w-1 h-14 rounded-full flex-shrink-0 ${STATUS_COLORS[item.status] || 'bg-gray-400'}`} />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm text-primary truncate group-hover:text-secondary transition-colors">{item.filename}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                          <StatusIcon className={`w-3 h-3 ${item.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                          <span>{item.status}</span>
                          <span>•</span>
                          <span>{item.processed_records}/{item.total_records} records</span>
                          {item.data_year && <><span>•</span><span>{item.data_year}</span></>}
                          {item.district && <><span>•</span><span>{item.district}</span></>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            <a href="/imports/history" className="block w-full mt-6 py-3 text-xs font-black text-primary bg-surface-blue rounded-xl hover:bg-primary hover:text-white transition-all text-center">
              VIEW ALL HISTORY
            </a>
          </div>

          {/* Import Types */}
          <div className="p-8 glass-card rounded-[2.5rem]">
            <h4 className="text-lg font-black text-primary mb-4">Supported Import Types</h4>
            <div className="space-y-3">
              {[
                { label: 'Institutions', desc: 'Register new HEIs in bulk' },
                { label: 'Students', desc: 'Student enrollment records' },
                { label: 'Programmes', desc: 'Academic programme catalogue' },
                { label: 'Enrollments', desc: 'Aggregate enrollment data' },
                { label: 'Indicator Data', desc: 'KPI values by institution' },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3 p-3 bg-off-white rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-primary">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 gradient-blue rounded-[2.5rem] text-white shadow-xl shadow-primary/20">
            <h4 className="text-lg font-bold mb-2">Pro Tip</h4>
            <p className="text-white/70 text-sm leading-relaxed">Ensure your columns match the national schema for faster processing. Download the template below.</p>
            <button className="mt-4 text-xs font-black underline hover:text-white/90">DOWNLOAD TEMPLATE</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
