import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Archive,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import { SimsPage } from './SimsLayout';

interface Props {
  onNavigate: (page: SimsPage) => void;
}

export const DashboardOverview: React.FC<Props> = ({ onNavigate }) => {
  const {
    activeRole,
    currentUser,
    students,
    teachersStaff,
    classes,
    grades,
    attendance,
    notifications,
    announcements,
    archives,
    supervisions,
    activityLogs,
  } = useSims();

  const activeStudents = students.filter((s) => s.status === 'Aktif');
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.filter((a) => a.date === today);

  const attendanceSummary = useMemo(() => {
    const counts = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    attendance.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    const total = attendance.length || 1;
    return {
      ...counts,
      rate: Math.round(((counts.Hadir + counts.Terlambat) / total) * 100),
    };
  }, [attendance]);

  const academicChartData = useMemo(() => {
    const bySubject: Record<string, { subject: string; total: number; count: number }> = {};
    grades.forEach((g) => {
      if (!bySubject[g.subjectName]) {
        bySubject[g.subjectName] = { subject: g.subjectName.split(' ').slice(0, 2).join(' '), total: 0, count: 0 };
      }
      bySubject[g.subjectName].total += g.finalScore;
      bySubject[g.subjectName].count += 1;
    });
    return Object.values(bySubject).map((item) => ({
      subject: item.subject,
      rataRata: Number((item.total / item.count).toFixed(1)),
    }));
  }, [grades]);

  const archiveCounts = useMemo(() => {
    return {
      Manajerial: archives.filter((a) => a.rootCategory === 'Manajerial').length,
      Kewirausahaan: archives.filter((a) => a.rootCategory === 'Kewirausahaan').length,
      'Supervisi Tendik': archives.filter((a) => a.rootCategory === 'Supervisi Tendik').length,
    };
  }, [archives]);

  // ORANG TUA DASHBOARD
  if (activeRole === 'orang_tua') {
    const child = students[0];
    const childAttendance = child ? attendance.filter((a) => a.studentId === child.id) : [];
    const childGrades = child ? grades.filter((g) => g.studentId === child.id) : [];
    const childNotifs = child ? notifications.filter((n) => n.studentId === child.id) : [];
    const todayChild = childAttendance.find((a) => a.date === today);

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-emerald-800 mb-1">Portal Orang Tua / Wali Siswa</p>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {child ? child.fullName : 'Belum Ada Data Anak Tertaut'}
            </h2>
            {child && (
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                NIS {child.nis} · NISN {child.nisn} · Kelas {child.className} · Wali Murid: {child.parentName}
              </p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">Status Kehadiran Hari Ini ({today})</p>
            <p className="font-display text-lg font-bold text-emerald-800 mt-0.5">
              {todayChild ? `${todayChild.status} (Terverifikasi)` : 'Belum Dicatat Hari Ini'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              Perkembangan Nilai Akademik Anak
            </h3>
            {childGrades.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data nilai yang dipublikasikan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-3 font-medium">Mata Pelajaran</th>
                      <th className="py-2 px-3 font-medium text-right">Formatif</th>
                      <th className="py-2 px-3 font-medium text-right">UTS</th>
                      <th className="py-2 px-3 font-medium text-right">UAS</th>
                      <th className="py-2 pl-3 font-medium text-right">Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {childGrades.map((g) => (
                      <tr key={g.id}>
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{g.subjectName}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{g.formatif}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{g.uts}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{g.uas}</td>
                        <td className="py-2.5 pl-3 text-right font-mono font-bold text-emerald-800 tabular-nums">
                          {g.finalScore} ({g.predicate})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Riwayat Absensi & Notifikasi WhatsApp
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {childAttendance.map((att) => (
                <div key={att.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{att.subjectName}</p>
                    <p className="text-slate-500 font-mono tabular-nums">{att.date}</p>
                  </div>
                  <span className="font-semibold text-slate-900">{att.status}</span>
                </div>
              ))}
              {childNotifs.map((n) => (
                <div key={n.id} className="py-2.5 text-slate-600">
                  <p className="font-medium text-emerald-800">Notifikasi WA ({n.deliveryStatus})</p>
                  <p className="mt-0.5">{n.messageBody}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-bold text-slate-900 mb-3">Pengumuman Sekolah Terbaru</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.slice(0, 4).map((a) => (
              <div key={a.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                <p className="text-xs text-slate-500 font-mono tabular-nums mb-1">{a.category} · {a.publishedAt}</p>
                <p className="text-sm font-bold text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-600 mt-1">{a.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // GURU & WALI KELAS DASHBOARD
  if (activeRole === 'guru' || activeRole === 'wali_kelas') {
    const myClasses = classes.slice(0, 3);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Kelas Ampuan / Binaan</p>
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{myClasses.length}</p>
            <p className="text-xs text-slate-500 mt-1">{myClasses.map((c) => c.name).join(' · ')}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Siswa Aktif Terpantau</p>
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{activeStudents.length}</p>
            <p className="text-xs text-slate-500 mt-1">Tingkat kehadiran {attendanceSummary.rate}%</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Notifikasi WA Terkirim</p>
            <p className="font-mono text-2xl font-bold text-emerald-800 tabular-nums">
              {notifications.filter((n) => n.deliveryStatus === 'sent').length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Dari absensi terverifikasi</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Jadwal Supervisi</p>
            <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{supervisions.length}</p>
            <p className="text-xs text-slate-500 mt-1">Instrumen PKKS & Observasi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                Jadwal Mengajar & Akses Cepat Absensi Kelas
              </h3>
              <button
                onClick={() => onNavigate('absensi')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                Buka Absensi Online
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {classes.map((cls, idx) => (
                <div key={cls.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Kelas {cls.name} · Wali Kelas: {cls.homeroomTeacherName}
                    </p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      Sesi {idx + 1} · 07.{idx * 15 + 15} – 08.{idx * 15 + 45} WIB
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('absensi')}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 whitespace-nowrap shrink-0"
                  >
                    Catat Absensi
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-display text-base font-bold text-slate-900 mb-4">
              Pengumuman & Informasi Supervisi
            </h3>
            <div className="space-y-3 text-xs">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <p className="font-mono text-slate-500 tabular-nums">{a.category} · {a.publishedAt}</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{a.title}</p>
                </div>
              ))}
              {supervisions.slice(0, 2).map((s) => (
                <div key={s.id} className="p-3 border border-slate-200 rounded-lg">
                  <p className="text-emerald-800 font-semibold">{s.instrumentCode} · {s.status}</p>
                  <p className="text-slate-700 mt-0.5">Nilai: <span className="font-mono font-bold tabular-nums">{s.finalScore}</span> ({s.predicate})</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMINISTRATOR, KEPALA SEKOLAH, SUPERVISOR & TENDIK DASHBOARD
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Selamat datang, <strong className="text-slate-800">{currentUser?.fullName || 'Administrator'}</strong>
          </p>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Ringkasan Eksekutif SMA Darul Ulum Kepohbaru
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('absensi')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            Monitor Absensi
          </button>
          <button
            onClick={() => onNavigate('supervisi')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 whitespace-nowrap"
          >
            Buka Supervisi Digital
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Siswa Aktif</span>
            <GraduationCap className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{activeStudents.length}</p>
          <p className="text-xs text-slate-500 mt-1">Tersebar di {classes.length} rombongan belajar</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Guru & Tenaga Kependidikan</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{teachersStaff.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            {teachersStaff.filter((t) => t.type === 'Guru').length} Guru · {teachersStaff.filter((t) => t.type === 'Tendik').length} Tendik
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tingkat Kehadiran</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-mono text-2xl font-bold text-emerald-800 tabular-nums">{attendanceSummary.rate}%</p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Hadir {attendanceSummary.Hadir} · Izin {attendanceSummary.Izin} · Sakit {attendanceSummary.Sakit} · Alpa {attendanceSummary.Alpa}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Supervisi & Arsip Digital</span>
            <FileCheck2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {supervisions.filter((s) => s.status === 'Disetujui').length}/{supervisions.length}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Supervisi Disetujui · {archives.length} Dokumen Arsip
          </p>
        </div>
      </div>

      {/* Charts + Supervision & Archive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Grafik Perkembangan Rata-Rata Nilai Akademik
              </h3>
              <p className="text-xs text-slate-500">Perbandingan capaian rata-rata nilai akhir per mata pelajaran</p>
            </div>
            <button
              onClick={() => onNavigate('akademik')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Kelola Nilai →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={academicChartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="rataRata" name="Rata-rata Nilai" fill="#047857" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                Statistik Arsip Digital Sekolah
              </h3>
              <button
                onClick={() => onNavigate('arsip')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Buka Arsip →
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {Object.entries(archiveCounts).map(([cat, count]) => (
                <div key={cat} className="py-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700">
                    <Archive className="w-4 h-4 text-slate-400" />
                    {cat}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">{count} Dokumen</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                Status Pelaksanaan Supervisi
              </h3>
              <button
                onClick={() => onNavigate('supervisi')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Detail →
              </button>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {supervisions.slice(0, 4).map((sup) => (
                <div key={sup.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{sup.instrumentCode} · {sup.assesseeName}</p>
                    <p className="text-slate-500">{sup.status}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 tabular-nums shrink-0">
                    {sup.finalScore} ({sup.predicate})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Announcements, WA Logs & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              Notifikasi Absensi Orang Tua & Pengumuman
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="py-2.5">
                <p className="font-semibold text-slate-900">
                  {n.studentName} ({n.attendanceStatus}) → {n.parentName}
                </p>
                <p className="text-slate-500 mt-0.5">{n.gatewayNote}</p>
              </div>
            ))}
            {announcements.slice(0, 2).map((a) => (
              <div key={a.id} className="py-2.5">
                <p className="font-semibold text-slate-900">{a.category}: {a.title}</p>
                <p className="text-slate-500 font-mono tabular-nums mt-0.5">{a.publishedAt}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Aktivitas Administrasi & Jejak Audit Terbaru
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{log.summary}</p>
                  <p className="text-slate-500 mt-0.5">
                    {log.actorName} · {log.module}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                  {log.timestamp.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
