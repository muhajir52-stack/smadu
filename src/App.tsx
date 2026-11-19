import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Lock,
  LogIn,
  ShieldCheck,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
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
  const {
    authReady,
    currentUser,
    manualLogout,
    loginWithCredentials,
    loginAutoAdmin,
    loadingData,
  } = useSims();
  const [viewMode, setViewMode] = useState<'public' | 'portal'>('public');
  const [activePage, setActivePage] = useState<SimsPage>('dashboard');

  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('Admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  const autoLoginAttemptedRef = useRef(false);

  // Automatic login into the Admin account when entering Portal SIMS (unless user explicitly logged out)
  useEffect(() => {
    if (
      viewMode === 'portal' &&
      authReady &&
      !currentUser &&
      !manualLogout &&
      !autoLoginAttemptedRef.current
    ) {
      autoLoginAttemptedRef.current = true;
      setAutoLoggingIn(true);
      loginWithCredentials('Admin', 'Admin123', { silent: true }).finally(() => {
        setAutoLoggingIn(false);
      });
    }
    if (manualLogout) {
      autoLoginAttemptedRef.current = true;
    }
  }, [authReady, currentUser, loginWithCredentials, manualLogout, viewMode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password) {
      setLoginError('Username dan password wajib diisi.');
      return;
    }
    const res = await loginWithCredentials(username, password);
    if (!res.ok) {
      setLoginError(res.error || 'Username atau password salah.');
    } else {
      setPassword('');
      setActivePage('dashboard');
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setLoginError('');
    setUsername(user);
    setPassword(pass);
    const res = await loginWithCredentials(user, pass);
    if (!res.ok) {
      setLoginError(res.error || 'Gagal melakukan login otomatis.');
    } else {
      setPassword('');
      setActivePage('dashboard');
    }
  };

  if (!authReady || (viewMode === 'portal' && autoLoggingIn && !currentUser)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-base font-bold text-slate-900">
            SMA Darul Ulum Kepohbaru
          </p>
          <p className="text-xs text-slate-500">
            {autoLoggingIn
              ? 'Masuk otomatis dengan akun Admin...'
              : 'Mempersiapkan sistem dan basis data sekolah...'}
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'public') {
    return (
      <SchoolProfilePublic
        onEnterPortal={() => {
          setViewMode('portal');
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-sm">
          <div>
            <p className="text-xs font-medium text-emerald-800 mb-1">Portal Terpadu SIMS</p>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Login SIMS SMA Darul Ulum Kepohbaru
            </h1>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Masuk menggunakan <span className="font-semibold text-slate-800">Username</span> dan{' '}
              <span className="font-semibold text-slate-800">Password</span> tanpa email, atau gunakan akun login otomatis di bawah ini.
            </p>
          </div>

          {/* 1-Click Auto-Login Developer / Quick Access Box */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-700" />
                Akses Cepat & Login Otomatis
              </p>
              <span className="text-[11px] font-mono text-emerald-800">Tanpa Email</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loadingData}
                onClick={() => loginAutoAdmin()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                Login Otomatis Admin
              </button>
              <button
                type="button"
                disabled={loadingData}
                onClick={() => handleQuickLogin('kepsek', 'Kepsek123')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100/60 transition-colors disabled:opacity-50"
              >
                Login Kepala Sekolah
              </button>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="sims-username"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="sims-username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sims-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="sims-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {loginError}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Kredensial Bawaan
              </p>
              <p className="font-mono text-[11px] text-slate-700">
                Admin: <span className="font-bold">Admin</span> / <span className="font-bold">Admin123</span>
              </p>
              <p className="font-mono text-[11px] text-slate-700">
                Kepala Sekolah: <span className="font-bold">kepsek</span> / <span className="font-bold">Kepsek123</span>
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="submit"
                disabled={loadingData}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {loadingData ? 'Memverifikasi Akun...' : 'Masuk Portal SIMS'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('public')}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Kembali ke Website Profil Sekolah
              </button>
            </div>
          </form>
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
