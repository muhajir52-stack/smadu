import React, { useState } from 'react';
import {
  Archive,
  Bell,
  BookOpen,
  Camera,
  ClipboardCheck,
  FileCheck2,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import { ROLE_DEFINITIONS } from '../data/rbacMatrix';
import { ModuleKey, RoleCode } from '../types/sims';

export type SimsPage =
  | 'dashboard'
  | 'akademik'
  | 'absensi'
  | 'arsip'
  | 'supervisi'
  | 'profil_cms'
  | 'kelola_foto'
  | 'pengguna_rbac'
  | 'audit_backup';

interface Props {
  activePage: SimsPage;
  onSelectPage: (page: SimsPage) => void;
  onBackToPublic: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: SimsPage;
  module: ModuleKey;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', module: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
  { id: 'akademik', module: 'akademik', label: 'Akademik & Siswa', icon: BookOpen },
  { id: 'absensi', module: 'absensi', label: 'Absensi & Notif WA', icon: ClipboardCheck },
  { id: 'arsip', module: 'arsip', label: 'Arsip Digital', icon: Archive },
  { id: 'supervisi', module: 'supervisi', label: 'Supervisi Digital', icon: FileCheck2 },
  { id: 'profil_cms', module: 'profil_cms', label: 'CMS Profil Sekolah', icon: Globe },
  { id: 'kelola_foto', module: 'dashboard', label: 'Kelola Foto', icon: Camera },
  { id: 'pengguna_rbac', module: 'pengguna_rbac', label: 'Akun & Hak Akses', icon: Users },
  { id: 'audit_backup', module: 'audit_backup', label: 'Audit & Backup', icon: Shield },
];

export const SimsLayout: React.FC<Props> = ({
  activePage,
  onSelectPage,
  onBackToPublic,
  children,
}) => {
  const {
    currentUser,
    activeRole,
    previewRole,
    setPreviewRole,
    can,
    logout,
    notifications,
    announcements,
    supervisions,
  } = useSims();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => can(item.module, 'view'));
  const currentNav = NAV_ITEMS.find((n) => n.id === activePage);
  const roleDef = ROLE_DEFINITIONS[activeRole];

  const recentAlertsCount = notifications.length + supervisions.filter((s) => s.status === 'Menunggu Validasi').length;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div>
          <p className="font-display text-sm font-bold text-slate-900 leading-tight">
            SIMS Darul Ulum
          </p>
          <p className="text-[11px] text-slate-500">Kepohbaru · Bojonegoro</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
          aria-label="Tutup menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectPage(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${
                active
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/70">
        {currentUser?.role === 'super_admin' && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Pratinjau Peran (Audit RBAC)
            </label>
            <select
              value={previewRole || currentUser.role}
              onChange={(e) => {
                const val = e.target.value as RoleCode;
                setPreviewRole(val === currentUser.role ? null : val);
                onSelectPage('dashboard');
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-700"
            >
              {Object.values(ROLE_DEFINITIONS).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={onBackToPublic}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            Web Sekolah
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
            title="Keluar dari SIMS"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[260px] h-full">
            {renderSidebarContent()}
          </div>
          <div
            className="flex-1 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">
                SIMS SMA Darul Ulum Kepohbaru / {roleDef.label}
              </p>
              <h1 className="font-display text-base font-bold text-slate-900 truncate">
                {currentNav?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white"
                aria-label="Notifikasi sistem"
              >
                <Bell className="w-4 h-4" />
                {recentAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 text-[10px] font-mono font-semibold bg-emerald-700 text-white rounded flex items-center justify-center tabular-nums">
                    {recentAlertsCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-40">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Aktivitas & Notifikasi Terbaru</span>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
                    {notifications.slice(0, 3).map((n) => (
                      <div key={n.id} className="pb-2 border-b border-slate-100 last:border-0">
                        <p className="font-semibold text-slate-800">
                          WA Orang Tua · {n.studentName} ({n.attendanceStatus})
                        </p>
                        <p className="text-slate-500 mt-0.5">{n.gatewayNote}</p>
                      </div>
                    ))}
                    {announcements.slice(0, 2).map((a) => (
                      <div key={a.id} className="pb-2 border-b border-slate-100 last:border-0">
                        <p className="font-semibold text-slate-800">{a.category}: {a.title}</p>
                        <p className="text-slate-500 font-mono tabular-nums mt-0.5">{a.publishedAt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectPage('kelola_foto')}
              className="hidden sm:flex items-center gap-2.5 text-left border-l border-slate-200 pl-3 hover:opacity-85 transition-opacity"
              title="Ubah Foto Profil"
            >
              {currentUser?.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-display font-bold text-xs flex items-center justify-center shrink-0">
                  {(currentUser?.fullName || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900 truncate max-w-[160px]">
                  {currentUser?.fullName || 'Pengguna'}
                </p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {roleDef.label}
                </p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
