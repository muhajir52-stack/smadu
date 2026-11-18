import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'Terjadi kesalahan sistem.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-bold text-slate-900">Kendala Memuat Halaman</h1>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Sistem mendeteksi kesalahan saat memproses data. Silakan muat ulang aplikasi untuk melanjutkan.
            </p>
            <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 overflow-x-auto mb-6">
              {this.state.errorMessage.slice(0, 260)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
