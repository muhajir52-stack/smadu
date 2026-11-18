import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import {
  exportGradesExcel,
  exportGradesPdf,
  exportStudentsExcel,
  exportStudentsPdf,
  parseStudentsFromExcel,
} from '../lib/exportUtils';
import { AcademicYear, ClassRoom, GradeRecord, Student, Subject, TeacherStaff } from '../types/sims';

type SubTab = 'siswa' | 'gtk' | 'kelas' | 'mapel' | 'tahun' | 'nilai';

export const AcademicModule: React.FC = () => {
  const {
    can,
    students,
    teachersStaff,
    classes,
    subjects,
    academicYears,
    grades,
    saveStudent,
    deleteStudent,
    importStudentsBatch,
    saveTeacherStaff,
    deleteTeacherStaff,
    saveClassRoom,
    saveSubject,
    saveAcademicYear,
    saveGrade,
    pushToast,
    firebaseUser,
    usersDirectory,
  } = useSims();

  const [tab, setTab] = useState<SubTab>('siswa');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const canCreate = can('akademik', 'create');
  const canEdit = can('akademik', 'edit');
  const canDelete = can('akademik', 'delete');
  const canExport = can('akademik', 'export');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Student modal state
  const [studentModal, setStudentModal] = useState<Partial<Student> | null>(null);
  const [gtkModal, setGtkModal] = useState<Partial<TeacherStaff> | null>(null);
  const [classModal, setClassModal] = useState<Partial<ClassRoom> | null>(null);
  const [subjectModal, setSubjectModal] = useState<Partial<Subject> | null>(null);
  const [yearModal, setYearModal] = useState<Partial<AcademicYear> | null>(null);
  const [gradeModal, setGradeModal] = useState<Partial<GradeRecord> | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const matchesQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q);
      const matchesClass = classFilter === 'Semua' || s.className === classFilter;
      const matchesStatus = statusFilter === 'Semua' || s.status === statusFilter;
      return matchesQ && matchesClass && matchesStatus;
    });
  }, [students, search, classFilter, statusFilter]);

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      const q = search.toLowerCase();
      const matchesQ =
        !q ||
        g.studentName.toLowerCase().includes(q) ||
        g.subjectName.toLowerCase().includes(q);
      const matchesClass = classFilter === 'Semua' || g.className === classFilter;
      return matchesQ && matchesClass;
    });
  }, [grades, search, classFilter]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseStudentsFromExcel(file);
      if (parsed.length === 0) {
        pushToast('error', 'Berkas Excel tidak memiliki baris siswa yang valid.');
        return;
      }
      await importStudentsBatch(parsed);
    } catch {
      pushToast('error', 'Gagal membaca berkas Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentModal?.fullName || !studentModal.nis || !studentModal.nisn) {
      pushToast('error', 'Nama lengkap, NIS, dan NISN wajib diisi.');
      return;
    }
    const cls = classes.find((c) => c.id === studentModal.classId) || classes[0];
    await saveStudent({
      id: studentModal.id || '',
      nis: studentModal.nis,
      nisn: studentModal.nisn,
      fullName: studentModal.fullName,
      gender: studentModal.gender || 'L',
      classId: cls?.id || 'cls-xa',
      className: cls?.name || studentModal.className || 'X-A',
      status: studentModal.status || 'Aktif',
      parentName: studentModal.parentName || '-',
      parentWhatsapp: studentModal.parentWhatsapp || '-',
      enrollmentYear: studentModal.enrollmentYear || '2026',
      previousSchool: studentModal.previousSchool || '-',
      address: studentModal.address || '',
      ...(studentModal.parentUid ? { parentUid: studentModal.parentUid } : {}),
    });
    setStudentModal(null);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeModal?.studentId || !gradeModal.subjectId) {
      pushToast('error', 'Pilih siswa dan mata pelajaran.');
      return;
    }
    const st = students.find((s) => s.id === gradeModal.studentId);
    const sub = subjects.find((s) => s.id === gradeModal.subjectId);
    const f = Number(gradeModal.formatif || 0);
    const u1 = Number(gradeModal.uts || 0);
    const u2 = Number(gradeModal.uas || 0);
    const finalScore = Number((f * 0.4 + u1 * 0.3 + u2 * 0.3).toFixed(1));
    const predicate = finalScore >= 90 ? 'A' : finalScore >= 83 ? 'B+' : finalScore >= 75 ? 'B' : 'C';

    await saveGrade({
      id: gradeModal.id || '',
      studentId: st?.id || gradeModal.studentId,
      studentName: st?.fullName || gradeModal.studentName || '',
      className: st?.className || gradeModal.className || 'X-A',
      subjectId: sub?.id || gradeModal.subjectId,
      subjectName: sub?.name || gradeModal.subjectName || '',
      academicYear: gradeModal.academicYear || '2026/2027',
      semester: gradeModal.semester || 'Ganjil',
      formatif: f,
      uts: u1,
      uas: u2,
      finalScore,
      predicate,
      teacherUid: firebaseUser?.uid || 'system',
      notes: gradeModal.notes || '',
    });
    setGradeModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto max-w-full">
          {(
            [
              ['siswa', 'Master Siswa'],
              ['gtk', 'Guru & Tendik'],
              ['kelas', 'Rombel & Wali Kelas'],
              ['mapel', 'Mata Pelajaran'],
              ['tahun', 'Tahun Pelajaran'],
              ['nilai', 'Nilai Akademik'],
            ] as Array<[SubTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === key
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* MASTER SISWA */}
      {tab === 'siswa' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Master Data Peserta Didik
              </h2>
              <p className="text-xs text-slate-500">
                Kelola biodata siswa, status keaktifan, riwayat pendidikan asal, dan data wali murid
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canCreate && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportExcel}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Impor Excel
                  </button>
                </>
              )}
              {canExport && (
                <>
                  <button
                    onClick={() => exportStudentsExcel(filteredStudents)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    Ekspor Excel
                  </button>
                  <button
                    onClick={() => exportStudentsPdf(filteredStudents)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-700" />
                    Cetak PDF
                  </button>
                </>
              )}
              {canCreate && (
                <button
                  onClick={() =>
                    setStudentModal({
                      gender: 'L',
                      status: 'Aktif',
                      classId: classes[0]?.id,
                      enrollmentYear: '2026',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Siswa
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama siswa, NIS, NISN, atau nama wali..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="Semua">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Lulus">Lulus</option>
              <option value="Mutasi">Mutasi</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-medium">NIS / NISN</th>
                  <th className="py-2.5 px-3 font-medium">Nama Lengkap</th>
                  <th className="py-2.5 px-3 font-medium">Kelas</th>
                  <th className="py-2.5 px-3 font-medium">Sekolah Asal</th>
                  <th className="py-2.5 px-3 font-medium">Orang Tua & WA</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  {(canEdit || canDelete) && <th className="py-2.5 px-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                      {st.nis} / {st.nisn}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {st.fullName} <span className="font-normal text-slate-500">({st.gender})</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{st.className}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {st.previousSchool} ({st.enrollmentYear})
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {st.parentName} · <span className="font-mono tabular-nums">{st.parentWhatsapp}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-emerald-800">{st.status}</td>
                    {(canEdit || canDelete) && (
                      <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                        {canEdit && (
                          <button
                            onClick={() => setStudentModal(st)}
                            className="text-emerald-700 font-semibold hover:underline"
                          >
                            Ubah
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteStudent(st.id)}
                            className="text-red-700 font-semibold hover:underline"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MASTER GTK */}
      {tab === 'gtk' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Master Guru & Tenaga Kependidikan</h2>
              <p className="text-xs text-slate-500">Daftar pendidik, staf tata usaha, dan pengawas pembina</p>
            </div>
            {canCreate && (
              <button
                onClick={() => setGtkModal({ type: 'Guru', status: 'GTY' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah GTK
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-medium">NIP</th>
                  <th className="py-2.5 px-3 font-medium">Nama Lengkap</th>
                  <th className="py-2.5 px-3 font-medium">Jenis</th>
                  <th className="py-2.5 px-3 font-medium">Jabatan</th>
                  <th className="py-2.5 px-3 font-medium">Bidang / Mapel</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  {(canEdit || canDelete) && <th className="py-2.5 px-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachersStaff.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">{g.nip}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{g.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{g.type}</td>
                    <td className="py-2.5 px-3 text-slate-700">{g.position}</td>
                    <td className="py-2.5 px-3 text-slate-600">{g.subjectSpecialty}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{g.status}</td>
                    {(canEdit || canDelete) && (
                      <td className="py-2.5 px-3 text-right space-x-2">
                        {canEdit && (
                          <button onClick={() => setGtkModal(g)} className="text-emerald-700 font-semibold hover:underline">
                            Ubah
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteTeacherStaff(g.id)} className="text-red-700 font-semibold hover:underline">
                            Hapus
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROMBEL & WALI KELAS */}
      {tab === 'kelas' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Rombongan Belajar & Wali Kelas</h2>
              <p className="text-xs text-slate-500">Pemetaan kelas aktif dan guru wali kelas pembina</p>
            </div>
            {canCreate && (
              <button
                onClick={() => setClassModal({ gradeLevel: 'X', academicYear: '2026/2027', capacity: 32 })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Kelas
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const studentCount = students.filter((s) => s.className === cls.name && s.status === 'Aktif').length;
              return (
                <div key={cls.id} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-base font-bold text-slate-900">Kelas {cls.name}</h3>
                      <span className="font-mono text-xs text-emerald-800 tabular-nums">
                        {studentCount}/{cls.capacity} Siswa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Tingkat {cls.gradeLevel} · TA {cls.academicYear}</p>
                    <p className="text-xs text-slate-700 mt-3">
                      Wali Kelas: <strong className="text-slate-900">{cls.homeroomTeacherName}</strong>
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setClassModal(cls)}
                      className="mt-4 text-xs font-semibold text-emerald-700 hover:underline text-left"
                    >
                      Ubah Wali Kelas / Kapasitas
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MATA PELAJARAN */}
      {tab === 'mapel' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Data Mata Pelajaran & KKM</h2>
              <p className="text-xs text-slate-500">Struktur kurikulum dan pengampu mata pelajaran</p>
            </div>
            {canCreate && (
              <button
                onClick={() => setSubjectModal({ category: 'Wajib', kkm: 75 })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Mapel
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-medium">Kode</th>
                  <th className="py-2.5 px-3 font-medium">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 font-medium">Kelompok</th>
                  <th className="py-2.5 px-3 font-medium">Pengampu</th>
                  <th className="py-2.5 px-3 font-medium text-right">KKM</th>
                  {canEdit && <th className="py-2.5 px-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-600">{sub.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{sub.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{sub.category}</td>
                    <td className="py-2.5 px-3 text-slate-700">{sub.teacherName}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">{sub.kkm}</td>
                    {canEdit && (
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => setSubjectModal(sub)} className="text-emerald-700 font-semibold hover:underline">
                          Ubah
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAHUN PELAJARAN */}
      {tab === 'tahun' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Tahun Pelajaran & Semester</h2>
              <p className="text-xs text-slate-500">Pengaturan periode tahun ajaran aktif</p>
            </div>
            {canCreate && (
              <button
                onClick={() => setYearModal({ semester: 'Ganjil', isActive: false })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Tahun Pelajaran
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {academicYears.map((ay) => (
              <div key={ay.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-bold text-slate-900">
                    Tahun Pelajaran {ay.name} · Semester {ay.semester}
                  </p>
                  <p className="text-xs font-mono text-slate-500 tabular-nums">
                    {ay.startDate} s.d. {ay.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${ay.isActive ? 'text-emerald-800' : 'text-slate-500'}`}>
                    {ay.isActive ? 'Aktif' : 'Arsip'}
                  </span>
                  {canEdit && !ay.isActive && (
                    <button
                      onClick={() => saveAcademicYear({ ...ay, isActive: true })}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                    >
                      Aktifkan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NILAI AKADEMIK */}
      {tab === 'nilai' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Data Nilai & Rekapitulasi Perkembangan Akademik
              </h2>
              <p className="text-xs text-slate-500">
                Perhitungan otomatis Nilai Akhir = (40% Formatif + 30% UTS + 30% UAS)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canExport && (
                <>
                  <button
                    onClick={() => exportGradesExcel(filteredGrades)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    Ekspor Excel
                  </button>
                  <button
                    onClick={() => exportGradesPdf(filteredGrades)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-700" />
                    Cetak PDF
                  </button>
                </>
              )}
              {canCreate && (
                <button
                  onClick={() =>
                    setGradeModal({
                      studentId: students[0]?.id,
                      subjectId: subjects[0]?.id,
                      academicYear: '2026/2027',
                      semester: 'Ganjil',
                      formatif: 85,
                      uts: 85,
                      uas: 85,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Input Nilai
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-medium">Nama Siswa</th>
                  <th className="py-2.5 px-3 font-medium">Kelas</th>
                  <th className="py-2.5 px-3 font-medium">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 font-medium text-right">Formatif</th>
                  <th className="py-2.5 px-3 font-medium text-right">UTS</th>
                  <th className="py-2.5 px-3 font-medium text-right">UAS</th>
                  <th className="py-2.5 px-3 font-medium text-right">Nilai Akhir</th>
                  <th className="py-2.5 px-3 font-medium">Predikat</th>
                  {canEdit && <th className="py-2.5 px-3 font-medium text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrades.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{g.studentName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{g.className}</td>
                    <td className="py-2.5 px-3 text-slate-700">{g.subjectName}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{g.formatif}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{g.uts}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{g.uas}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 tabular-nums">{g.finalScore}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{g.predicate}</td>
                    {canEdit && (
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => setGradeModal(g)} className="text-emerald-700 font-semibold hover:underline">
                          Ubah
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {studentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveStudent} className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-base font-bold text-slate-900">
              {studentModal.id ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">NIS</label>
                <input required value={studentModal.nis || ''} onChange={(e) => setStudentModal({ ...studentModal, nis: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">NISN</label>
                <input required value={studentModal.nisn || ''} onChange={(e) => setStudentModal({ ...studentModal, nisn: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input required value={studentModal.fullName || ''} onChange={(e) => setStudentModal({ ...studentModal, fullName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                <select value={studentModal.gender || 'L'} onChange={(e) => setStudentModal({ ...studentModal, gender: e.target.value as 'L' | 'P' })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kelas</label>
                <select value={studentModal.classId || ''} onChange={(e) => setStudentModal({ ...studentModal, classId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status Siswa</label>
                <select value={studentModal.status || 'Aktif'} onChange={(e) => setStudentModal({ ...studentModal, status: e.target.value as Student['status'] })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
                  <option value="Aktif">Aktif</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Mutasi">Mutasi</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tahun Masuk</label>
                <input value={studentModal.enrollmentYear || '2026'} onChange={(e) => setStudentModal({ ...studentModal, enrollmentYear: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Riwayat Pendidikan (Sekolah Asal SMP/MTs)</label>
                <input value={studentModal.previousSchool || ''} onChange={(e) => setStudentModal({ ...studentModal, previousSchool: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                <input required value={studentModal.parentName || ''} onChange={(e) => setStudentModal({ ...studentModal, parentName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">WhatsApp Orang Tua (628...)</label>
                <input required value={studentModal.parentWhatsapp || ''} onChange={(e) => setStudentModal({ ...studentModal, parentWhatsapp: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Tautkan Akun Portal Orang Tua (Opsional)</label>
                <select
                  value={studentModal.parentUid || ''}
                  onChange={(e) => setStudentModal({ ...studentModal, parentUid: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Belum ditautkan ke akun orang tua --</option>
                  {usersDirectory
                    .filter((u) => u.role === 'orang_tua')
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStudentModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {gtkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveTeacherStaff({
                id: gtkModal.id || '',
                nip: gtkModal.nip || '-',
                fullName: gtkModal.fullName || '',
                type: gtkModal.type || 'Guru',
                position: gtkModal.position || '',
                subjectSpecialty: gtkModal.subjectSpecialty || '',
                status: gtkModal.status || 'GTY',
                phone: gtkModal.phone || '',
                email: gtkModal.email || '',
              });
              setGtkModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Data Guru & Tendik</h3>
            <input required placeholder="Nama Lengkap" value={gtkModal.fullName || ''} onChange={(e) => setGtkModal({ ...gtkModal, fullName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <input required placeholder="NIP / NUPTK" value={gtkModal.nip || ''} onChange={(e) => setGtkModal({ ...gtkModal, nip: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            <div className="grid grid-cols-2 gap-3">
              <select value={gtkModal.type || 'Guru'} onChange={(e) => setGtkModal({ ...gtkModal, type: e.target.value as 'Guru' | 'Tendik' })} className="px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <option value="Guru">Guru</option>
                <option value="Tendik">Tendik</option>
              </select>
              <select value={gtkModal.status || 'GTY'} onChange={(e) => setGtkModal({ ...gtkModal, status: e.target.value as TeacherStaff['status'] })} className="px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <option value="GTY">GTY</option>
                <option value="GTT">GTT</option>
                <option value="PTY">PTY</option>
                <option value="PTT">PTT</option>
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
              </select>
            </div>
            <input required placeholder="Jabatan" value={gtkModal.position || ''} onChange={(e) => setGtkModal({ ...gtkModal, position: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <input required placeholder="Bidang / Mata Pelajaran" value={gtkModal.subjectSpecialty || ''} onChange={(e) => setGtkModal({ ...gtkModal, subjectSpecialty: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setGtkModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {classModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const teacher = teachersStaff.find((t) => t.id === classModal.homeroomTeacherId);
              await saveClassRoom({
                id: classModal.id || '',
                name: classModal.name || '',
                gradeLevel: classModal.gradeLevel || 'X',
                academicYear: classModal.academicYear || '2026/2027',
                homeroomTeacherId: teacher?.id || classModal.homeroomTeacherId || '',
                homeroomTeacherName: teacher?.fullName || classModal.homeroomTeacherName || '',
                capacity: Number(classModal.capacity || 32),
              });
              setClassModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Pengaturan Kelas & Wali Kelas</h3>
            <input required placeholder="Nama Kelas (mis. X-C)" value={classModal.name || ''} onChange={(e) => setClassModal({ ...classModal, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <select value={classModal.gradeLevel || 'X'} onChange={(e) => setClassModal({ ...classModal, gradeLevel: e.target.value as ClassRoom['gradeLevel'] })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
              <option value="X">Tingkat X</option>
              <option value="XI">Tingkat XI</option>
              <option value="XII">Tingkat XII</option>
            </select>
            <select value={classModal.homeroomTeacherId || ''} onChange={(e) => setClassModal({ ...classModal, homeroomTeacherId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
              <option value="">Pilih Wali Kelas</option>
              {teachersStaff.filter((t) => t.type === 'Guru').map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
            <input type="number" placeholder="Kapasitas" value={classModal.capacity || 32} onChange={(e) => setClassModal({ ...classModal, capacity: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setClassModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {subjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveSubject({
                id: subjectModal.id || '',
                code: subjectModal.code || '',
                name: subjectModal.name || '',
                category: subjectModal.category || 'Wajib',
                kkm: Number(subjectModal.kkm || 75),
                teacherName: subjectModal.teacherName || '',
              });
              setSubjectModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Data Mata Pelajaran</h3>
            <input required placeholder="Kode Mapel (mis. BIO-01)" value={subjectModal.code || ''} onChange={(e) => setSubjectModal({ ...subjectModal, code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            <input required placeholder="Nama Mata Pelajaran" value={subjectModal.name || ''} onChange={(e) => setSubjectModal({ ...subjectModal, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <input required placeholder="Nama Guru Pengampu" value={subjectModal.teacherName || ''} onChange={(e) => setSubjectModal({ ...subjectModal, teacherName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <input type="number" placeholder="KKM" value={subjectModal.kkm || 75} onChange={(e) => setSubjectModal({ ...subjectModal, kkm: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSubjectModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {yearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveAcademicYear({
                id: yearModal.id || '',
                name: yearModal.name || '2026/2027',
                semester: yearModal.semester || 'Genap',
                isActive: Boolean(yearModal.isActive),
                startDate: yearModal.startDate || '2027-01-05',
                endDate: yearModal.endDate || '2027-06-20',
              });
              setYearModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Tambah Tahun Pelajaran</h3>
            <input required placeholder="Tahun Pelajaran (mis. 2026/2027)" value={yearModal.name || ''} onChange={(e) => setYearModal({ ...yearModal, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            <select value={yearModal.semester || 'Genap'} onChange={(e) => setYearModal({ ...yearModal, semester: e.target.value as 'Ganjil' | 'Genap' })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={yearModal.startDate || ''} onChange={(e) => setYearModal({ ...yearModal, startDate: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              <input type="date" value={yearModal.endDate || ''} onChange={(e) => setYearModal({ ...yearModal, endDate: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setYearModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {gradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveGrade} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-display text-base font-bold text-slate-900">Input / Perbarui Nilai Akademik</h3>
            <select value={gradeModal.studentId || ''} onChange={(e) => setGradeModal({ ...gradeModal, studentId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.className})</option>
              ))}
            </select>
            <select value={gradeModal.subjectId || ''} onChange={(e) => setGradeModal({ ...gradeModal, subjectId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Formatif</label>
                <input type="number" min={0} max={100} value={gradeModal.formatif ?? 85} onChange={(e) => setGradeModal({ ...gradeModal, formatif: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">UTS</label>
                <input type="number" min={0} max={100} value={gradeModal.uts ?? 85} onChange={(e) => setGradeModal({ ...gradeModal, uts: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">UAS</label>
                <input type="number" min={0} max={100} value={gradeModal.uas ?? 85} onChange={(e) => setGradeModal({ ...gradeModal, uas: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </div>
            </div>
            <input placeholder="Catatan perkembangan belajar..." value={gradeModal.notes || ''} onChange={(e) => setGradeModal({ ...gradeModal, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setGradeModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan Nilai</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
