"use client";

import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-50 text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <ShieldOff className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-primary mb-3">Access Denied</h1>
        <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
          You don't have permission to access this page. Contact your system administrator if you believe this is an error.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
