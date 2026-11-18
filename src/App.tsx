import React, { useState } from 'react';
import { CheckCircle2, Info, LogIn, ShieldCheck, X, XCircle } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SimsProvider, useSims } from './services/simsStore';
import { SchoolProfilePublic } from './components/SchoolProfilePublic';
import { SimsLayout, SimsPage } from './components/SimsLayout';
import { DashboardOverview } from './components/DashboardOverview';
import { AcademicModule } from './components/AcademicModule';
import { AttendanceModule } from './components/AttendanceModule';
import { ArchiveModule } from './components/ArchiveModule';
import { SupervisionModule } from './components/SupervisionModule';
import {
  AuditBackupView,
  CmsManagementView,
  UsersRbacView,
} from './components/AdminCmsRbacModule';
import { PhotoManagementModule } from './components/PhotoManagementModule';

const ToastStack: React.FC = () => {
  const { toasts, dismissToast } = useSims();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-md bg-white text-xs ${
            t.type === 'error'
              ? 'border-red-200 text-red-900'
              : t.type === 'success'
              ? 'border-emerald-200 text-emerald-950'
              : 'border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {t.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{t.text}</span>
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const MainRouter: React.FC = () => {
  const { authReady, firebaseUser, currentUser, loginWithGoogle, loadingData } = useSims();
  const [viewMode, setViewMode] = useState<'public' | 'portal'>('public');
  const [activePage, setActivePage] = useState<SimsPage>('dashboard');

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-base font-bold text-slate-900">
            SMA Darul Ulum Kepohbaru
          </p>
          <p className="text-xs text-slate-500">Mempersiapkan sistem dan koneksi basis data...</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'public') {
    return <SchoolProfilePublic onEnterPortal={() => setViewMode('portal')} />;
  }

  if (!firebaseUser || !currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-emerald-800 mb-1">Portal Terpadu SIMS</p>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Masuk ke SIMS SMA Darul Ulum Kepohbaru
            </h1>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Autentikasi aman berbasis peran untuk Kepala Sekolah, Guru, Tenaga Kependidikan, Supervisor, Wali Kelas, dan Orang Tua / Wali Siswa.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Keamanan Akses Terverifikasi
            </p>
            <p>
              Gunakan akun Google resmi sekolah atau akun Google yang telah didaftarkan oleh Administrator Sekolah.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={loginWithGoogle}
              disabled={loadingData}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loadingData ? 'Memuat Profil Akun...' : 'Masuk dengan Akun Google'}
            </button>
            <button
              onClick={() => setViewMode('public')}
              className="w-full px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Kembali ke Website Profil Sekolah
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SimsLayout
      activePage={activePage}
      onSelectPage={setActivePage}
      onBackToPublic={() => setViewMode('public')}
    >
      {activePage === 'dashboard' && <DashboardOverview onNavigate={setActivePage} />}
      {activePage === 'akademik' && <AcademicModule />}
      {activePage === 'absensi' && <AttendanceModule />}
      {activePage === 'arsip' && <ArchiveModule />}
      {activePage === 'supervisi' && <SupervisionModule />}
      {activePage === 'profil_cms' && <CmsManagementView />}
      {activePage === 'kelola_foto' && <PhotoManagementModule />}
      {activePage === 'pengguna_rbac' && <UsersRbacView />}
      {activePage === 'audit_backup' && <AuditBackupView />}
    </SimsLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SimsProvider>
        <MainRouter />
        <ToastStack />
      </SimsProvider>
    </ErrorBoundary>
  );
}
