import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import { AttendanceStatus } from '../types/sims';
import { exportAttendanceExcel, exportAttendancePdf } from '../lib/exportUtils';

type AttendanceTab = 'catat' | 'rekap' | 'notifikasi' | 'riwayat_siswa';

export const AttendanceModule: React.FC = () => {
  const {
    can,
    classes,
    subjects,
    students,
    attendance,
    notifications,
    recordVerifiedAttendance,
    pushToast,
  } = useSims();

  const canRecord = can('absensi', 'create');
  const canExport = can('absensi', 'export');

  const [tab, setTab] = useState<AttendanceTab>(canRecord ? 'catat' : 'rekap');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || 'cls-xa');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name || 'Matematika');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [recapPeriod, setRecapPeriod] = useState<'harian' | 'mingguan' | 'bulanan' | 'semester'>('harian');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');

  const [notifyParents, setNotifyParents] = useState(true);
  const [notifyAllStatuses, setNotifyAllStatuses] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classStudents = useMemo(
    () => students.filter((s) => s.status === 'Aktif' && s.className === selectedClass?.name),
    [students, selectedClass]
  );

  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});

  useEffect(() => {
    const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
    classStudents.forEach((st) => {
      const existing = attendance.find(
        (a) =>
          a.studentId === st.id &&
          a.date === selectedDate &&
          a.subjectName === selectedSubject
      );
      initial[st.id] = {
        status: existing?.status || 'Hadir',
        notes: existing?.notes || '',
      };
    });
    setDraftStatuses(initial);
  }, [classStudents, selectedDate, selectedSubject, attendance]);

  const handleSubmitVerified = async () => {
    if (!selectedClass || classStudents.length === 0) {
      pushToast('error', 'Tidak ada siswa aktif pada kelas terpilih.');
      return;
    }
    setSubmitting(true);
    try {
      const entries = classStudents.map((st) => ({
        student: st,
        status: draftStatuses[st.id]?.status || 'Hadir',
        notes: draftStatuses[st.id]?.notes || '',
      }));
      await recordVerifiedAttendance({
        entries,
        classRoom: selectedClass,
        subjectName: selectedSubject,
        date: selectedDate,
        notifyParents,
        notifyAllStatuses,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const recapRecords = useMemo(() => {
    const now = new Date();
    return attendance.filter((rec) => {
      const d = new Date(rec.date);
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (recapPeriod === 'harian') return rec.date === selectedDate;
      if (recapPeriod === 'mingguan') return diffDays <= 7;
      if (recapPeriod === 'bulanan') return diffDays <= 31;
      return true;
    });
  }, [attendance, recapPeriod, selectedDate]);

  const recapStats = useMemo(() => {
    const counts = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    recapRecords.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [recapRecords]);

  const studentHistory = useMemo(
    () => attendance.filter((a) => a.studentId === selectedStudentId),
    [attendance, selectedStudentId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {canRecord && (
            <button
              onClick={() => setTab('catat')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                tab === 'catat' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
              }`}
            >
              Catat Absensi Kelas
            </button>
          )}
          <button
            onClick={() => setTab('rekap')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'rekap' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Monitoring & Rekapitulasi
          </button>
          <button
            onClick={() => setTab('riwayat_siswa')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'riwayat_siswa' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Riwayat Per Siswa
          </button>
          <button
            onClick={() => setTab('notifikasi')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'notifikasi' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Log Notifikasi Orang Tua
          </button>
        </div>

        {canExport && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAttendanceExcel(recapRecords)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Unduh Excel
            </button>
            <button
              onClick={() => exportAttendancePdf(recapRecords)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <FileText className="w-3.5 h-3.5 text-red-700" />
              Unduh PDF
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: CATAT ABSENSI TERVERIFIKASI */}
      {tab === 'catat' && canRecord && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Absensi Online & Notifikasi WhatsApp Terverifikasi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Notifikasi WhatsApp orang tua hanya dipicu setelah status kehadiran tersimpan dan terverifikasi di basis data.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
              Mekanisme Verifikasi Aktif
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Kelas / Rombel</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name} (Wali: {c.homeroomTeacherName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Jadwal Mata Pelajaran</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tanggal Pertemuan</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-medium">NIS</th>
                  <th className="py-2.5 px-3 font-medium">Nama Siswa</th>
                  <th className="py-2.5 px-3 font-medium">Orang Tua & WA</th>
                  <th className="py-2.5 px-3 font-medium">Status Kehadiran</th>
                  <th className="py-2.5 px-3 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Belum ada siswa aktif terdaftar di kelas {selectedClass?.name}.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((st) => {
                    const current = draftStatuses[st.id] || { status: 'Hadir', notes: '' };
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{st.nis}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{st.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {st.parentName} · <span className="font-mono tabular-nums">{st.parentWhatsapp}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            {(['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'] as AttendanceStatus[]).map((statusOption) => (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={() =>
                                  setDraftStatuses((prev) => ({
                                    ...prev,
                                    [st.id]: { ...current, status: statusOption },
                                  }))
                                }
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                                  current.status === statusOption
                                    ? statusOption === 'Hadir'
                                      ? 'bg-emerald-700 text-white'
                                      : statusOption === 'Alpa'
                                      ? 'bg-red-700 text-white'
                                      : 'bg-amber-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {statusOption}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={current.notes}
                            onChange={(e) =>
                              setDraftStatuses((prev) => ({
                                ...prev,
                                [st.id]: { ...current, notes: e.target.value },
                              }))
                            }
                            placeholder="Keterangan..."
                            className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyParents}
                  onChange={(e) => setNotifyParents(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                <span>Kirim notifikasi WhatsApp otomatis ke orang tua setelah data absensi terverifikasi</span>
              </label>
              {notifyParents && (
                <label className="flex items-center gap-2 cursor-pointer pl-5 text-slate-500">
                  <input
                    type="checkbox"
                    checked={notifyAllStatuses}
                    onChange={(e) => setNotifyAllStatuses(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  <span>Kirim juga untuk status Hadir (jika tidak dicentang, dikirim untuk Terlambat/Izin/Sakit/Alpa)</span>
                </label>
              )}
            </div>

            <button
              onClick={handleSubmitVerified}
              disabled={submitting || classStudents.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Memverifikasi & Mengirim...' : 'Verifikasi, Simpan & Kirim Notifikasi WA'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MONITORING & REKAP */}
      {tab === 'rekap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {(['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'] as AttendanceStatus[]).map((st) => (
              <div key={st} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">{st}</p>
                <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                  {recapStats[st]}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Rekapitulasi Kehadiran ({recapPeriod})
              </h2>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['harian', 'mingguan', 'bulanan', 'semester'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRecapPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                      recapPeriod === p ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3 font-medium">Tanggal</th>
                    <th className="py-2.5 px-3 font-medium">Siswa</th>
                    <th className="py-2.5 px-3 font-medium">Kelas</th>
                    <th className="py-2.5 px-3 font-medium">Mapel</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Verifikasi</th>
                    <th className="py-2.5 px-3 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recapRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{r.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{r.className}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.subjectName}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.status}</td>
                      <td className="py-2.5 px-3 text-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Terverifikasi
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{r.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT PER SISWA */}
      {tab === 'riwayat_siswa' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-base font-bold text-slate-900">Riwayat Absensi Individual Siswa</h2>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.className})
                </option>
              ))}
            </select>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {studentHistory.length === 0 ? (
              <p className="py-6 text-slate-500">Belum ada riwayat absensi untuk siswa terpilih.</p>
            ) : (
              studentHistory.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{h.subjectName}</p>
                    <p className="text-slate-500 font-mono tabular-nums">{h.date} · Dicatat oleh {h.recordedByName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{h.status}</p>
                    <p className="text-slate-500">{h.notes || '-'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: LOG NOTIFIKASI WHATSAPP ORANG TUA */}
      {tab === 'notifikasi' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
            <h2 className="font-display text-base font-bold text-slate-900">
              Riwayat Pemberitahuan WhatsApp kepada Orang Tua
            </h2>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {notifications.map((n) => (
              <div key={n.id} className="py-3.5 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {n.studentName} ({n.attendanceStatus}) → {n.parentName} ·{' '}
                    <span className="font-mono tabular-nums">{n.recipientPhone}</span>
                  </p>
                  <span
                    className={`font-semibold ${
                      n.deliveryStatus === 'sent' ? 'text-emerald-800' : 'text-red-700'
                    }`}
                  >
                    {n.deliveryStatus === 'sent' ? 'Terkirim' : 'Gagal'} ·{' '}
                    <span className="font-mono font-normal text-slate-500">{n.sentAt.slice(0, 16).replace('T', ' ')}</span>
                  </span>
                </div>
                <p className="text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5">{n.messageBody}</p>
                <p className="text-slate-500">{n.gatewayNote}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
