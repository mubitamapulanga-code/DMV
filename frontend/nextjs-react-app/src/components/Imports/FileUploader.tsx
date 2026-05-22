"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2, Eye, ArrowRight, Columns3, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

function getToken() {
  try {
    const raw = localStorage.getItem('dmv-auth');
    if (!raw) return localStorage.getItem('dmv_access');
    return JSON.parse(raw)?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

/* ── Target fields per import type ─────────────────────────────────────── */
const FIELD_MAPS: Record<string, { key: string; label: string; required?: boolean; isInstitution?: boolean }[]> = {
  STUDENTS: [
    { key: 'student_id',         label: 'Student ID' },
    { key: 'first_name',         label: 'First Name' },
    { key: 'last_name',          label: 'Last Name' },
    { key: 'gender',             label: 'Gender' },
    { key: 'institution',        label: 'Institution',        isInstitution: true },
    { key: 'programme',          label: 'Programme' },
    { key: 'year_of_entry',      label: 'Year of Entry' },
    { key: 'status',             label: 'Status' },
    { key: 'email',              label: 'Email' },
    { key: 'province_of_origin', label: 'Province of Origin' },
  ],
  INSTITUTIONS: [
    { key: 'name',                label: 'Name',                required: true },
    { key: 'code',                label: 'Code' },
    { key: 'type',                label: 'Type' },
    { key: 'province',            label: 'Province' },
    { key: 'registration_number', label: 'Registration Number' },
    { key: 'email',               label: 'Email' },
    { key: 'website',             label: 'Website' },
    { key: 'established_year',    label: 'Established Year' },
  ],
  PROGRAMMES: [
    { key: 'name',                 label: 'Programme Name', required: true },
    { key: 'code',                 label: 'Code' },
    { key: 'institution',          label: 'Institution',    isInstitution: true },
    { key: 'level',                label: 'Level' },
    { key: 'duration_years',       label: 'Duration (Years)' },
    { key: 'status',               label: 'Status' },
    { key: 'accreditation_number', label: 'Accreditation No.' },
  ],
  ENROLLMENTS: [
    { key: 'institution',    label: 'Institution',    isInstitution: true },
    { key: 'academic_year',  label: 'Academic Year' },
    { key: 'total_enrolled', label: 'Total Enrolled' },
    { key: 'male_count',     label: 'Male Count' },
    { key: 'female_count',   label: 'Female Count' },
    { key: 'graduates',      label: 'Graduates' },
  ],
  INDICATORS: [
    { key: 'institution_name', label: 'Institution',      isInstitution: true },
    { key: 'year',             label: 'Year' },
    { key: 'total_students',   label: 'Total Students' },
    { key: 'graduation_rate',  label: 'Graduation Rate' },
    { key: 'type',             label: 'Institution Type' },
    { key: 'province',         label: 'Province' },
  ],
};

/** A custom field row: maps an Excel column → a user-defined target field name */
interface CustomField {
  id: string;
  sourceCol: string; // Excel column name
  targetKey: string; // what to call it in the backend mapping
}

interface FileUploaderProps {
  onUploadSuccess?: () => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [file, setFile]             = useState<File | null>(null);
  const [importType, setImportType] = useState('PROGRAMMES');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'previewing' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress]     = useState(0);
  const [preview, setPreview]       = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  // Standard column mapping: { targetFieldKey → excelColumnName }
  const [mapping, setMapping]       = useState<Record<string, string>>({});
  // Institution selection: one per isInstitution field key
  const [institutionMapping, setInstitutionMapping] = useState<Record<string, string>>({});
  // Custom extra fields added by the user
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const defaultInstitution = Object.values(institutionMapping).find(Boolean) ?? '';
  const [institutions, setInstitutions] = useState<{ id: number; name: string }[]>([]);
  const [flaggedCount, setFlaggedCount] = useState(0);

  /* ── Fetch institutions ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/institutions/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const list: any[] = Array.isArray(data) ? data : data.results ?? [];
          setInstitutions(list.map((i: any) => ({ id: i.id, name: i.name })));
        }
      } catch (e) { console.error('Failed to fetch institutions:', e); }
    })();
  }, []);

  /* ── Preview ──────────────────────────────────────────────────────────── */
  const doPreview = useCallback(async (f: File) => {
    setUploadStatus('previewing');
    setPreviewError('');
    const fd = new FormData();
    fd.append('file', f);
    fd.append('rows', '5');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/imports/preview/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Preview failed (${res.status})`);
      }
      const data = await res.json();
      setPreview(data);
      setUploadStatus('idle');
    } catch (e: any) {
      setPreviewError(e.message || 'Could not preview file');
      setPreview(null);
      setUploadStatus('idle');
    }
  }, []);

  useEffect(() => { if (file) doPreview(file); }, [file, doPreview]);

  /* ── Auto-map standard columns ────────────────────────────────────────── */
  useEffect(() => {
    if (!preview) return;
    const fields = FIELD_MAPS[importType] || [];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newMapping: Record<string, string> = {};
    for (const field of fields) {
      if (field.isInstitution) continue;
      const nk = norm(field.key);
      const nl = norm(field.label);
      const match = preview.columns.find((c) => { const nc = norm(c); return nc === nk || nc === nl; });
      if (match) newMapping[field.key] = match;
    }
    setMapping(newMapping);
    // Pre-populate custom fields with any Excel columns not matched above
    setCustomFields([]);
  }, [preview, importType]);

  /* ── Reset ────────────────────────────────────────────────────────────── */
  const resetState = (newFile: File | null = null) => {
    setFile(newFile);
    setUploadStatus('idle');
    setProgress(0);
    setPreview(null);
    setPreviewError('');
    setErrorMsg('');
    setMapping({});
    setInstitutionMapping({});
    setCustomFields([]);
    setFlaggedCount(0);
  };

  /* ── Drag-and-drop ────────────────────────────────────────────────────── */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const n = f.name.toLowerCase();
    if (n.endsWith('.csv') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.json')) resetState(f);
  }, []);

  /* ── Custom field helpers ─────────────────────────────────────────────── */
  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sourceCol: '', targetKey: '' },
    ]);
  };

  const updateCustomField = (id: string, patch: Partial<CustomField>) => {
    setCustomFields((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  /** Columns from the file that haven't been mapped to any standard field yet */
  const unmappedColumns = preview
    ? preview.columns.filter((col) => !Object.values(mapping).includes(col))
    : [];

  /* ── Upload ───────────────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setProgress(10);
    setErrorMsg('');
    setFlaggedCount(0);

    // Merge standard mapping + custom fields into one mapping object
    const fullMapping: Record<string, string> = { ...mapping };
    for (const cf of customFields) {
      if (cf.sourceCol && cf.targetKey) {
        fullMapping[cf.targetKey] = cf.sourceCol;
      }
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('import_type', importType);
    fd.append('mapping', JSON.stringify(fullMapping));
    if (defaultInstitution) fd.append('default_institution', defaultInstitution);

    try {
      const token = getToken();
      setProgress(40);
      const res = await fetch(`${API_BASE}/imports/upload/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      setProgress(90);

      // Read body once
      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData.error || `Upload failed (${res.status})`);
      }

      // Count flagged records from the response
      const flagged = Array.isArray(resData.flagged_records)
        ? resData.flagged_records.length
        : (resData.failed_records ?? 0);
      setFlaggedCount(flagged);

      setProgress(100);
      setUploadStatus('success');
      onUploadSuccess?.();
    } catch (e: any) {
      setErrorMsg(e.message || 'Upload failed');
      setUploadStatus('error');
    }
  };

  const currentFields = FIELD_MAPS[importType] || [];
  const showMapping = file && uploadStatus === 'idle';

  return (
    <div className="max-w-3xl mx-auto">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'relative border-2 border-dashed rounded-[2.5rem] p-10 transition-all duration-500 flex flex-col items-center justify-center min-h-[280px] glass-card',
          file ? 'border-primary' : 'border-border hover:border-primary/50 animate-pulse-border',
        )}
      >
        <AnimatePresence mode="wait">
          {!file ? (
            /* ── Empty state ── */
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="w-20 h-20 bg-surface-blue text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-primary mb-2">Upload Historical Data</h3>
              <p className="text-sm text-muted-foreground mb-6">Drag and drop your CSV, Excel, or JSON files here</p>
              <label className="px-8 py-3 bg-primary text-white rounded-2xl font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                Browse Files
                <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.json"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) resetState(f); e.target.value = ''; }} />
              </label>
            </motion.div>
          ) : (
            /* ── File selected ── */
            <motion.div key="file-selected" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full">

              {/* File info bar */}
              <motion.div className="flex items-center gap-4 p-5 glass-panel rounded-3xl border border-primary/10 shadow-premium mb-6"
                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <File className="w-7 h-7" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-primary truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{(file.size / 1024).toFixed(1)} KB • Ready to process</p>
                </div>
                {uploadStatus === 'idle' && (
                  <button onClick={() => resetState()} className="p-2 hover:bg-red-50 text-red-400 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </motion.div>

              {/* Previewing spinner */}
              {uploadStatus === 'previewing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 py-8 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-bold">Analyzing file…</span>
                </motion.div>
              )}

              {/* Preview error */}
              {previewError && uploadStatus === 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 mb-4 bg-amber-50 text-amber-700 rounded-2xl text-xs font-bold border border-amber-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Preview unavailable: {previewError}. You can still map columns manually and import.
                </motion.div>
              )}

              {/* ── Mapping panel ── */}
              {showMapping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>

                  {/* Import type */}
                  <div className="mb-5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Import Type</label>
                    <select value={importType} onChange={(e) => setImportType(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-md border border-border rounded-2xl text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                      <option value="STUDENTS">Students</option>
                      <option value="INSTITUTIONS">Institutions</option>
                      <option value="PROGRAMMES">Programmes</option>
                      <option value="ENROLLMENTS">Enrollments</option>
                      <option value="INDICATORS">Indicator Data</option>
                    </select>
                  </div>

                  {/* Preview table */}
                  {preview && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">File Preview</span>
                        <span className="text-[10px] font-medium text-muted-foreground ml-auto">{preview.columns.length} columns detected</span>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-surface-blue/50">
                              {preview.columns.map((col) => (
                                <th key={col} className="px-3 py-2 text-left font-black text-primary uppercase tracking-wider whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {preview.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-surface-blue/20">
                                {preview.columns.map((col) => (
                                  <td key={col} className="px-3 py-2 text-muted-foreground whitespace-nowrap">{String(row[col] ?? '—')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Standard column mapping ── */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Columns3 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Column Mapping</span>
                      {!preview && <span className="text-[10px] text-amber-600 font-bold ml-auto">No preview — type column names manually</span>}
                    </div>
                    <div className="glass-panel rounded-2xl border border-border p-4 space-y-3">
                      {currentFields.map((field) => (
                        <motion.div key={field.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-primary w-40 flex-shrink-0">
                            {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                          {field.isInstitution ? (
                            <select value={institutionMapping[field.key] ?? ''}
                              onChange={(e) => setInstitutionMapping((p) => ({ ...p, [field.key]: e.target.value }))}
                              className="flex-1 px-3 py-2 bg-white/50 backdrop-blur-md border border-border rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                              <option value="">— Select Institution —</option>
                              {institutions.map((inst) => <option key={inst.id} value={inst.name}>{inst.name}</option>)}
                            </select>
                          ) : preview ? (
                            <select value={mapping[field.key] || ''}
                              onChange={(e) => setMapping((p) => ({ ...p, [field.key]: e.target.value }))}
                              className={cn('flex-1 px-3 py-2 bg-white/50 backdrop-blur-md border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all',
                                mapping[field.key] ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground')}>
                              <option value="">(skip)</option>
                              {preview.columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </select>
                          ) : (
                            <input type="text" placeholder={`Column name for "${field.label}"`}
                              value={mapping[field.key] || ''}
                              onChange={(e) => setMapping((p) => ({ ...p, [field.key]: e.target.value }))}
                              className="flex-1 px-3 py-2 bg-white/50 backdrop-blur-md border border-border rounded-xl text-xs font-bold text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                          )}

                          {(field.isInstitution ? institutionMapping[field.key] : mapping[field.key]) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* ── Extra / custom fields ── */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Extra Fields</span>
                        <span className="text-[10px] text-muted-foreground font-medium">— map columns not listed above</span>
                      </div>
                      <button onClick={addCustomField}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-black hover:bg-primary/20 transition-colors">
                        <Plus className="w-3 h-3" /> Add Field
                      </button>
                    </div>

                    {/* Unmapped columns hint */}
                    {preview && unmappedColumns.length > 0 && customFields.length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="p-3 mb-3 bg-surface-blue rounded-2xl border border-border">
                        <p className="text-[10px] font-bold text-primary mb-2 uppercase tracking-widest">
                          {unmappedColumns.length} unmapped column{unmappedColumns.length > 1 ? 's' : ''} in your file:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unmappedColumns.map((col) => (
                            <button key={col} onClick={() => {
                              // Auto-add a custom field row pre-filled with this column
                              setCustomFields((prev) => [
                                ...prev,
                                { id: crypto.randomUUID(), sourceCol: col, targetKey: col.toLowerCase().replace(/[^a-z0-9]/g, '_') },
                              ]);
                            }}
                              className="px-2 py-1 bg-white border border-border rounded-lg text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1">
                              <Plus className="w-2.5 h-2.5" /> {col}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {customFields.length > 0 && (
                      <div className="glass-panel rounded-2xl border border-border p-4 space-y-3">
                        {/* Header row */}
                        <div className="flex items-center gap-3 pb-1 border-b border-border/40">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-40 flex-shrink-0">Target Field Name</span>
                          <span className="w-3 flex-shrink-0" />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex-1">Excel Column</span>
                          <span className="w-7 flex-shrink-0" />
                        </div>

                        <AnimatePresence>
                          {customFields.map((cf) => (
                            <motion.div key={cf.id}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                              className="flex items-center gap-3">
                              {/* Target field name — what the backend will receive */}
                              <input type="text"
                                placeholder="e.g. department"
                                value={cf.targetKey}
                                onChange={(e) => updateCustomField(cf.id, { targetKey: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                className="w-40 flex-shrink-0 px-3 py-2 bg-white/50 backdrop-blur-md border border-border rounded-xl text-xs font-bold text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />

                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                              {/* Source column — from the Excel file */}
                              {preview ? (
                                <select value={cf.sourceCol}
                                  onChange={(e) => updateCustomField(cf.id, { sourceCol: e.target.value })}
                                  className={cn('flex-1 px-3 py-2 bg-white/50 backdrop-blur-md border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all',
                                    cf.sourceCol ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground')}>
                                  <option value="">— Pick column —</option>
                                  {preview.columns.map((col) => <option key={col} value={col}>{col}</option>)}
                                </select>
                              ) : (
                                <input type="text" placeholder="Column name in file"
                                  value={cf.sourceCol}
                                  onChange={(e) => updateCustomField(cf.id, { sourceCol: e.target.value })}
                                  className="flex-1 px-3 py-2 bg-white/50 backdrop-blur-md border border-border rounded-xl text-xs font-bold text-primary placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                              )}

                              {cf.sourceCol && cf.targetKey && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                  className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                </motion.div>
                              )}

                              <button onClick={() => removeCustomField(cf.id)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-red-400 rounded-lg transition-colors flex-shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        <button onClick={addCustomField}
                          className="w-full py-2 border border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5">
                          <Plus className="w-3 h-3" /> Add another field
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button onClick={() => doPreview(file)}
                      className="flex-1 py-3 bg-white border border-border text-primary rounded-2xl font-bold hover:bg-surface-blue transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      {preview ? 'Re-preview' : 'Try Preview'}
                    </button>
                    <button onClick={handleUpload}
                      className="flex-1 py-3 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                      Start Import
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Upload progress */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-xs font-black text-primary uppercase tracking-widest">
                    <span>Processing Data…</span><span>{progress}%</span>
                  </div>
                  <div className="h-3 w-full bg-surface-blue rounded-full overflow-hidden">
                    <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 space-y-2">
                  {/* Main success */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl font-bold border border-green-100">
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                    Import completed successfully! Data has been processed and stored.
                  </div>
                  {/* Flagged warning — only shown for student imports with unmatched programmes */}
                  {flaggedCount > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      className="flex items-center justify-between gap-3 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-black text-sm">{flaggedCount} student{flaggedCount > 1 ? 's' : ''} flagged</p>
                          <p className="text-xs font-medium opacity-80">Programme could not be matched — students saved without a programme</p>
                        </div>
                      </div>
                      <Link href="/reports/unmatched-programmes"
                        className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black hover:bg-amber-700 transition-colors whitespace-nowrap">
                        View Report →
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {uploadStatus === 'error' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl font-bold border border-red-100 mb-4">
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  {errorMsg || 'Import failed. Please check your file format.'}
                </motion.div>
              )}

              {(uploadStatus === 'success' || uploadStatus === 'error') && (
                <button onClick={() => resetState()}
                  className="w-full py-3 bg-white border border-border text-primary rounded-2xl font-bold hover:bg-surface-blue transition-colors">
                  Import Another File
                </button>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8">
        <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Supported Formats</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { ext: 'XLSX', label: 'Microsoft Excel', color: 'bg-green-50 text-green-600' },
            { ext: 'CSV',  label: 'Comma Separated', color: 'bg-blue-50 text-blue-600' },
            { ext: 'JSON', label: 'JSON Data',        color: 'bg-amber-50 text-amber-600' },
          ].map((f) => (
            <div key={f.ext} className="p-3 glass-panel rounded-2xl border border-border flex items-center gap-3">
              <div className={`w-8 h-8 ${f.color} rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0`}>{f.ext}</div>
              <span className="text-xs font-bold text-primary/70">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}