import { ModuleKey, PermissionAction, RoleCode, RoleDefinition } from '../types/sims';

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard Utama',
  profil_cms: 'CMS Web Profil Sekolah',
  akademik: 'Akademik & Data Siswa',
  absensi: 'Absensi & Notifikasi WA',
  arsip: 'Arsip Digital Sekolah',
  supervisi: 'Supervisi Digital',
  pengguna_rbac: 'Multi-Akun & Hak Akses',
  audit_backup: 'Audit Log & Backup Data',
};

export const ROLE_DEFINITIONS: Record<RoleCode, RoleDefinition> = {
  super_admin: {
    code: 'super_admin',
    label: 'Super Administrator',
    description: 'Akses penuh seluruh modul, manajemen akun, RBAC, konfigurasi sistem, serta backup & pemulihan data.',
    permissions: {
      dashboard: ['view', 'export'],
      profil_cms: ['view', 'create', 'edit', 'delete', 'approve'],
      akademik: ['view', 'create', 'edit', 'delete', 'export'],
      absensi: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
      arsip: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
      supervisi: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
      pengguna_rbac: ['view', 'create', 'edit', 'delete'],
      audit_backup: ['view', 'create', 'export'],
    },
  },
  kepala_sekolah: {
    code: 'kepala_sekolah',
    label: 'Kepala Sekolah',
    description: 'Memantau kinerja akademik, kehadiran, arsip digital, serta memberikan validasi dan persetujuan hasil supervisi.',
    permissions: {
      dashboard: ['view', 'export'],
      profil_cms: ['view', 'approve'],
      akademik: ['view', 'export'],
      absensi: ['view', 'export'],
      arsip: ['view', 'approve', 'export'],
      supervisi: ['view', 'approve', 'export'],
      pengguna_rbac: ['view'],
      audit_backup: ['view', 'export'],
    },
  },
  guru: {
    code: 'guru',
    label: 'Guru Mata Pelajaran',
    description: 'Mengelola absensi kelas sesuai jadwal mengajar, menginput nilai mata pelajaran, mengakses arsip sesuai hak akses, dan melihat supervisi.',
    permissions: {
      dashboard: ['view'],
      profil_cms: ['view'],
      akademik: ['view', 'create', 'edit', 'export'],
      absensi: ['view', 'create', 'edit', 'export'],
      arsip: ['view', 'create'],
      supervisi: ['view'],
      pengguna_rbac: [],
      audit_backup: [],
    },
  },
  tendik: {
    code: 'tendik',
    label: 'Staf Administrasi / Tendik',
    description: 'Mengelola master data administrasi sekolah, konten profil website, arsip digital 3 direktori, serta mencetak laporan.',
    permissions: {
      dashboard: ['view', 'export'],
      profil_cms: ['view', 'create', 'edit'],
      akademik: ['view', 'create', 'edit', 'export'],
      absensi: ['view', 'export'],
      arsip: ['view', 'create', 'edit', 'delete', 'export'],
      supervisi: ['view', 'export'],
      pengguna_rbac: [],
      audit_backup: ['view'],
    },
  },
  supervisor: {
    code: 'supervisor',
    label: 'Supervisor',
    description: 'Menyusun jadwal supervisi, melakukan penilaian digital 8 instrumen PKKS/guru, mengisi catatan & RTL, serta mengekspor laporan.',
    permissions: {
      dashboard: ['view', 'export'],
      profil_cms: ['view'],
      akademik: ['view'],
      absensi: ['view'],
      arsip: ['view', 'create'],
      supervisi: ['view', 'create', 'edit', 'approve', 'export'],
      pengguna_rbac: [],
      audit_backup: [],
    },
  },
  wali_kelas: {
    code: 'wali_kelas',
    label: 'Wali Kelas',
    description: 'Memantau kehadiran siswa kelas binaan, mengirim verifikasi notifikasi orang tua, serta memantau perkembangan nilai kelas binaan.',
    permissions: {
      dashboard: ['view', 'export'],
      profil_cms: ['view'],
      akademik: ['view', 'edit', 'export'],
      absensi: ['view', 'create', 'edit', 'export'],
      arsip: ['view', 'create'],
      supervisi: ['view'],
      pengguna_rbac: [],
      audit_backup: [],
    },
  },
  orang_tua: {
    code: 'orang_tua',
    label: 'Orang Tua / Wali Siswa',
    description: 'Memantau profil anak, kehadiran harian & riwayat absensi, notifikasi WhatsApp, pengumuman sekolah, serta nilai akademik anak.',
    permissions: {
      dashboard: ['view'],
      profil_cms: ['view'],
      akademik: ['view'],
      absensi: ['view'],
      arsip: [],
      supervisi: [],
      pengguna_rbac: [],
      audit_backup: [],
    },
  },
};

export function checkPermission(
  role: RoleCode,
  module: ModuleKey,
  action: PermissionAction,
  customMatrix?: Record<RoleCode, Record<ModuleKey, PermissionAction[]>>
): boolean {
  const matrix = customMatrix || (Object.fromEntries(
    Object.values(ROLE_DEFINITIONS).map((r) => [r.code, r.permissions])
  ) as Record<RoleCode, Record<ModuleKey, PermissionAction[]>>);
  const actions = matrix[role]?.[module] || [];
  return actions.includes(action);
}
