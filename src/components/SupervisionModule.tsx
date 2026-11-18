import React, { useMemo, useState } from 'react';
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
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Link as LinkIcon,
  Plus,
  Search,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import {
  SUPERVISION_INSTRUMENTS,
  calculateSupervisionMetrics,
} from '../data/supervisionMaster';
import { exportSupervisionExcel, exportSupervisionPdf } from '../lib/exportUtils';
import { IndicatorScoreEntry, SupervisionAssessment } from '../types/sims';

type SupTab = 'daftar' | 'penilaian' | 'instrumen' | 'grafik';

export const SupervisionModule: React.FC = () => {
  const {
    can,
    supervisions,
    archives,
    teachersStaff,
    academicYears,
    currentUser,
    firebaseUser,
    saveSupervision,
    approveSupervision,
    pushToast,
  } = useSims();

  const canEdit = can('supervisi', 'edit') || can('supervisi', 'create');
  const canApprove = can('supervisi', 'approve');
  const canExport = can('supervisi', 'export');

  const [tab, setTab] = useState<SupTab>('daftar');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(supervisions[0]?.id || '');
  const [activeInstrumentCode, setActiveInstrumentCode] = useState<string>('PKKS-UMUM');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('Semua');
  const [filterInstrument, setFilterInstrument] = useState('Semua');

  const [newScheduleModal, setNewScheduleModal] = useState<{
    instrumentCode: string;
    assesseeName: string;
    assesseeRole: string;
    supervisorName: string;
    academicYear: string;
    period: string;
    scheduledDate: string;
  } | null>(null);

  const filteredSupervisions = useMemo(() => {
    return supervisions.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchQ =
        !q ||
        s.assesseeName.toLowerCase().includes(q) ||
        s.supervisorName.toLowerCase().includes(q) ||
        s.instrumentTitle.toLowerCase().includes(q) ||
        s.instrumentCode.toLowerCase().includes(q);
      const matchYear = filterYear === 'Semua' || s.academicYear === filterYear;
      const matchInst = filterInstrument === 'Semua' || s.instrumentCode === filterInstrument;
      return matchQ && matchYear && matchInst;
    });
  }, [supervisions, searchQuery, filterYear, filterInstrument]);

  const activeAssessment = useMemo(
    () => supervisions.find((s) => s.id === selectedAssessmentId) || supervisions[0],
    [supervisions, selectedAssessmentId]
  );

  // Local editable draft when inside penilaian tab
  const [draft, setDraft] = useState<SupervisionAssessment | null>(null);

  const openAssessmentForm = (assessment: SupervisionAssessment) => {
    setSelectedAssessmentId(assessment.id);
    setDraft(JSON.parse(JSON.stringify(assessment)));
    setTab('penilaian');
  };

  const currentDraft = draft && draft.id === activeAssessment?.id ? draft : activeAssessment;
  const currentInstrument = useMemo(
    () =>
      SUPERVISION_INSTRUMENTS.find((i) => i.code === currentDraft?.instrumentCode) ||
      SUPERVISION_INSTRUMENTS[0],
    [currentDraft]
  );

  const liveMetrics = useMemo(() => {
    if (!currentDraft) return null;
    return calculateSupervisionMetrics(currentInstrument, currentDraft.scoresMap || {});
  }, [currentInstrument, currentDraft]);

  const updateIndicatorEntry = (
    indicatorId: string,
    patch: Partial<IndicatorScoreEntry>
  ) => {
    if (!currentDraft || !canEdit) return;
    const prevEntry: IndicatorScoreEntry = currentDraft.scoresMap[indicatorId] || {
      scale: null,
      checkedEvidences: [],
      notes: '',
    };
    const nextScoresMap = {
      ...currentDraft.scoresMap,
      [indicatorId]: { ...prevEntry, ...patch },
    };
    const calc = calculateSupervisionMetrics(currentInstrument, nextScoresMap);
    setDraft({
      ...currentDraft,
      scoresMap: nextScoresMap,
      totalScore: calc.totalScore,
      maxScore: calc.maxScore,
      finalScore: calc.finalScore,
      predicate: calc.predicate,
      unfilledCount: calc.unfilledCount,
      duplicateCount: calc.duplicateCount,
      status: currentDraft.status === 'Terjadwal' ? 'Berlangsung' : currentDraft.status,
    });
  };

  const handleSaveDraft = async (submitForValidation: boolean) => {
    if (!currentDraft || !liveMetrics) return;
    if (submitForValidation && liveMetrics.unfilledCount > 0) {
      pushToast(
        'error',
        `Masih ada ${liveMetrics.unfilledCount} butir belum diisi. Lengkapi seluruh butir skala 1–4 sebelum mengajukan validasi.`
      );
      return;
    }
    const payload: SupervisionAssessment = {
      ...currentDraft,
      totalScore: liveMetrics.totalScore,
      maxScore: liveMetrics.maxScore,
      finalScore: liveMetrics.finalScore,
      predicate: liveMetrics.predicate,
      unfilledCount: liveMetrics.unfilledCount,
      duplicateCount: liveMetrics.duplicateCount,
      status: submitForValidation ? 'Menunggu Validasi' : currentDraft.status,
    };
    await saveSupervision(payload);
    setDraft(payload);
  };

  const chartData = useMemo(() => {
    return supervisions.map((s) => ({
      kode: s.instrumentCode,
      nilai: s.finalScore,
      assessee: s.assesseeName.split(',')[0],
    }));
  }, [supervisions]);

  // Group indicators by sectionTitle
  const groupedIndicators = useMemo(() => {
    const groups: Array<{ sectionTitle: string; items: typeof currentInstrument.indicators }> = [];
    currentInstrument.indicators.forEach((ind) => {
      let grp = groups.find((g) => g.sectionTitle === ind.sectionTitle);
      if (!grp) {
        grp = { sectionTitle: ind.sectionTitle, items: [] };
        groups.push(grp);
      }
      grp.items.push(ind);
    });
    return groups;
  }, [currentInstrument]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          <button
            onClick={() => setTab('daftar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'daftar' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Jadwal & Hasil Supervisi
          </button>
          <button
            onClick={() => {
              if (activeAssessment && !draft) setDraft(JSON.parse(JSON.stringify(activeAssessment)));
              setTab('penilaian');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'penilaian' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Formulir Penilaian Digital
          </button>
          <button
            onClick={() => setTab('instrumen')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'instrumen' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Master 8 Instrumen (88 Butir)
          </button>
          <button
            onClick={() => setTab('grafik')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'grafik' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Grafik Perkembangan
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() =>
              setNewScheduleModal({
                instrumentCode: 'PKKS-UMUM',
                assesseeName: teachersStaff[0]?.fullName || 'H. Ahmad Muhajir, S.Pd., M.Pd.',
                assesseeRole: 'Kepala Sekolah',
                supervisorName: currentUser?.fullName || 'Dr. H. Supriyadi, M.Pd.',
                academicYear: academicYears.find((y) => y.isActive)?.name || '2026/2027',
                period: 'Semester Ganjil 2026',
                scheduledDate: new Date().toISOString().slice(0, 10),
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Jadwalkan Supervisi
          </button>
        )}
      </div>

      {/* TAB 1: JADWAL & REKAP */}
      {tab === 'daftar' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Telusuri nama guru/kepala sekolah, supervisor, atau instrumen..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
            <select
              value={filterInstrument}
              onChange={(e) => setFilterInstrument(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="Semua">Semua Instrumen</option>
              {SUPERVISION_INSTRUMENTS.map((inst) => (
                <option key={inst.code} value={inst.code}>{inst.code}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="Semua">Semua Tahun Pelajaran</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-medium">Instrumen</th>
                  <th className="py-2.5 px-3 font-medium">Pihak Dinilai</th>
                  <th className="py-2.5 px-3 font-medium">Supervisor</th>
                  <th className="py-2.5 px-3 font-medium">Tanggal / Periode</th>
                  <th className="py-2.5 px-3 font-medium text-right">Skor</th>
                  <th className="py-2.5 px-3 font-medium text-right">Nilai</th>
                  <th className="py-2.5 px-3 font-medium">Predikat & Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupervisions.map((sup) => {
                  const inst = SUPERVISION_INSTRUMENTS.find((i) => i.code === sup.instrumentCode);
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-mono font-bold text-emerald-800">{sup.instrumentCode}</p>
                        <p className="text-slate-600 max-w-[240px] truncate">{sup.instrumentTitle}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{sup.assesseeName}</p>
                        <p className="text-slate-500">{sup.assesseeRole}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{sup.supervisorName}</td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-600">
                        {sup.scheduledDate}
                        <p className="font-sans text-[11px] text-slate-500">{sup.period}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {sup.totalScore}/{sup.maxScore}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {sup.finalScore.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{sup.predicate}</p>
                        <p className="text-[11px] text-slate-500">{sup.status}</p>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openAssessmentForm(sup)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                        >
                          {canEdit ? 'Buka / Nilai' : 'Lihat Detail'}
                        </button>
                        {canExport && inst && (
                          <>
                            <button
                              onClick={() => exportSupervisionExcel(sup, inst)}
                              className="p-1.5 text-slate-600 hover:text-emerald-800"
                              title="Ekspor Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => exportSupervisionPdf(sup, inst)}
                              className="p-1.5 text-slate-600 hover:text-red-700"
                              title="Cetak PDF"
                            >
                              <FileText className="w-4 h-4 inline" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FORMULIR PENILAIAN DIGITAL (EXCEL PARITY) */}
      {tab === 'penilaian' && currentDraft && liveMetrics && (
        <div className="space-y-6">
          {/* Header & Live Calculation Ribbon */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-mono font-semibold text-emerald-800">
                  {currentInstrument.code} · {currentInstrument.subtitle}
                </p>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {currentInstrument.title}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Nama Sekolah: <strong>SMA Darul Ulum Kepohbaru</strong> · Dinilai: <strong>{currentDraft.assesseeName}</strong> ({currentDraft.assesseeRole}) · Supervisor: <strong>{currentDraft.supervisorName}</strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canExport && (
                  <>
                    <button
                      onClick={() => exportSupervisionExcel({ ...currentDraft, ...liveMetrics }, currentInstrument)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      Ekspor Excel
                    </button>
                    <button
                      onClick={() => exportSupervisionPdf({ ...currentDraft, ...liveMetrics }, currentInstrument)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-700" />
                      Ekspor PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Excel Formula Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <p className="text-[11px] text-slate-500">Jumlah Skor</p>
                <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {liveMetrics.totalScore}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Skor Maksimal (Butir × 4)</p>
                <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {liveMetrics.maxScore}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Nilai (Skor ÷ Maks × 100)</p>
                <p className="font-mono text-lg font-bold text-emerald-800 tabular-nums">
                  {liveMetrics.finalScore.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Predikat Otomatis</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{liveMetrics.predicate}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Butir Belum Diisi (Harus 0)</p>
                <p
                  className={`font-mono text-lg font-bold tabular-nums ${
                    liveMetrics.unfilledCount === 0 ? 'text-emerald-800' : 'text-red-700'
                  }`}
                >
                  {liveMetrics.unfilledCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Status Validasi</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{currentDraft.status}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Keterangan Predikat: 91–100 Sangat Baik · 76–90 Baik (Syarat minimal lanjut Pengelolaan Kinerja di Ruang GTK) · 61–75 Cukup · 51–60 Kurang · ≤ 50 Sangat Kurang.
            </p>
          </div>

          {/* Indicators Table Grouped by Section */}
          {groupedIndicators.map((group) => (
            <div key={group.sectionTitle} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200">
                <h3 className="font-display text-sm font-bold text-slate-900">{group.sectionTitle}</h3>
              </div>

              <div className="divide-y divide-slate-200">
                {group.items.map((ind) => {
                  const entry: IndicatorScoreEntry = currentDraft.scoresMap[ind.id] || {
                    scale: null,
                    checkedEvidences: [],
                    notes: '',
                  };
                  return (
                    <div key={ind.id} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded shrink-0">
                            {ind.itemNumber}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 leading-snug">
                              {ind.indicatorText}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Cara Periksa: {ind.inspectionMethod} · Kaitan Butir Umum: <span className="font-mono">{ind.generalItemRef}</span>
                            </p>
                          </div>
                        </div>

                        <div className="pl-9 space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-600">
                            Daftar Periksa Bukti Fisik / Hal yang Diperiksa:
                          </p>
                          {ind.physicalEvidences.map((ev, idx) => {
                            const checked = entry.checkedEvidences.includes(ev);
                            return (
                              <label key={idx} className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={!canEdit}
                                  checked={checked}
                                  onChange={() => {
                                    const next = checked
                                      ? entry.checkedEvidences.filter((x) => x !== ev)
                                      : [...entry.checkedEvidences, ev];
                                    updateIndicatorEntry(ind.id, { checkedEvidences: next });
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-emerald-700"
                                />
                                <span>{ev}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="lg:col-span-5 space-y-3 bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Skala Penilaian (1–4)</span>
                          <span className="font-mono text-sm font-bold text-emerald-800 tabular-nums">
                            Skor: {entry.scale ?? '-'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {([1, 2, 3, 4] as const).map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => updateIndicatorEntry(ind.id, { scale: val })}
                              className={`py-2 text-xs font-mono font-bold rounded-lg border transition-colors ${
                                entry.scale === val
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Tautan Bukti dari Arsip Digital
                          </label>
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <select
                              disabled={!canEdit}
                              value={entry.linkedArchiveId || ''}
                              onChange={(e) => {
                                const arc = archives.find((a) => a.id === e.target.value);
                                updateIndicatorEntry(ind.id, {
                                  linkedArchiveId: arc?.id || undefined,
                                  linkedArchiveTitle: arc?.title || undefined,
                                });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                            >
                              <option value="">-- Pilih dokumen arsip pendukung --</option>
                              {archives.map((a) => (
                                <option key={a.id} value={a.id}>
                                  [{a.rootCategory}] {a.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Catatan Penilai
                          </label>
                          <textarea
                            rows={2}
                            disabled={!canEdit}
                            value={entry.notes || ''}
                            onChange={(e) => updateIndicatorEntry(ind.id, { notes: e.target.value })}
                            placeholder="Catatan observasi atau bukti pendukung..."
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Examiner Notes, Recommendations, RTL & Approval */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Catatan Pemeriksa, Rekomendasi, dan Rencana Tindak Lanjut (RTL)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Temuan Pemeriksa</label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={currentDraft.examinerFindings}
                  onChange={(e) => setDraft({ ...currentDraft, examinerFindings: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kekuatan</label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={currentDraft.examinerStrengths}
                  onChange={(e) => setDraft({ ...currentDraft, examinerStrengths: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Saran & Rekomendasi Perbaikan</label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={currentDraft.examinerSuggestions}
                  onChange={(e) => setDraft({ ...currentDraft, examinerSuggestions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Rencana Tindak Lanjut (RTL)</label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={currentDraft.followUpPlan}
                  onChange={(e) => setDraft({ ...currentDraft, followUpPlan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                {currentDraft.validatedByName ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Disetujui oleh {currentDraft.validatedByName} pada {currentDraft.validatedAt}
                  </span>
                ) : (
                  <span>Belum divalidasi oleh Kepala Sekolah / Penilai Utama.</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <>
                    <button
                      onClick={() => handleSaveDraft(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Simpan Draf
                    </button>
                    <button
                      onClick={() => handleSaveDraft(true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                    >
                      Ajukan Validasi
                    </button>
                  </>
                )}
                {canApprove && currentDraft.status !== 'Disetujui' && (
                  <button
                    onClick={() => approveSupervision({ ...currentDraft, ...liveMetrics })}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                  >
                    Validasi & Setujui Hasil
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER 8 INSTRUMEN (88 BUTIR) */}
      {tab === 'instrumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <h2 className="font-display text-sm font-bold text-slate-900 px-2 pb-2 border-b border-slate-100 mb-2">
              8 Lembar Instrumen Master PKKS 2026
            </h2>
            {SUPERVISION_INSTRUMENTS.map((inst) => (
              <button
                key={inst.code}
                onClick={() => setActiveInstrumentCode(inst.code)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  activeInstrumentCode === inst.code
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <p className="font-mono text-[11px] text-emerald-800">{inst.code} · {inst.indicators.length} Butir (Maks {inst.indicators.length * 4})</p>
                <p className="mt-0.5 leading-snug">{inst.title}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            {(() => {
              const inst = SUPERVISION_INSTRUMENTS.find((i) => i.code === activeInstrumentCode)!;
              return (
                <>
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-xs font-mono text-emerald-800">{inst.code} · Sasaran: {inst.targetRole}</p>
                    <h3 className="font-display text-lg font-bold text-slate-900 mt-1">{inst.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">{inst.description}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {inst.indicators.map((ind) => (
                      <div key={ind.id} className="py-3.5 text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-slate-900">
                            <span className="font-mono text-emerald-800 mr-2">{ind.itemNumber}</span>
                            {ind.indicatorText}
                          </p>
                          <span className="font-mono text-[11px] text-slate-500 shrink-0">
                            Kaitan: {ind.generalItemRef}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {ind.sectionTitle} · Cara Periksa: {ind.inspectionMethod}
                        </p>
                        <ul className="list-disc list-inside text-slate-600 pl-2 space-y-0.5">
                          {ind.physicalEvidences.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: GRAFIK PERKEMBANGAN */}
      {tab === 'grafik' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Grafik Perkembangan & Perbandingan Skor Supervisi
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi capaian nilai akhir (skala 0–100) lintas instrumen PKKS Umum dan Spesifikasi
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="kode" tick={{ fontSize: 12, fill: '#334155' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#334155' }} />
                <Tooltip />
                <Bar dataKey="nilai" name="Nilai Akhir" fill="#047857" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Modal: Jadwal Supervisi Baru */}
      {newScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const inst = SUPERVISION_INSTRUMENTS.find((i) => i.code === newScheduleModal.instrumentCode)!;
              const scoresMap: Record<string, IndicatorScoreEntry> = {};
              inst.indicators.forEach((ind) => {
                scoresMap[ind.id] = { scale: null, checkedEvidences: [], notes: '' };
              });
              const calc = calculateSupervisionMetrics(inst, scoresMap);
              const newItem: SupervisionAssessment = {
                id: `sup-${Date.now()}`,
                instrumentCode: inst.code,
                instrumentTitle: inst.title,
                academicYear: newScheduleModal.academicYear,
                period: newScheduleModal.period,
                assesseeName: newScheduleModal.assesseeName,
                assesseeRole: newScheduleModal.assesseeRole,
                supervisorUid: firebaseUser?.uid || 'system',
                supervisorName: newScheduleModal.supervisorName,
                scheduledDate: newScheduleModal.scheduledDate,
                status: 'Terjadwal',
                totalScore: calc.totalScore,
                maxScore: calc.maxScore,
                finalScore: calc.finalScore,
                predicate: calc.predicate,
                unfilledCount: calc.unfilledCount,
                duplicateCount: 0,
                scoresMap,
                examinerFindings: '',
                examinerStrengths: '',
                examinerSuggestions: '',
                followUpPlan: '',
                followUpStatus: 'Belum Dimulai',
              };
              await saveSupervision(newItem);
              setNewScheduleModal(null);
              openAssessmentForm(newItem);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-700" />
              Buat Jadwal Supervisi Digital Baru
            </h3>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Instrumen Penilaian</label>
              <select
                value={newScheduleModal.instrumentCode}
                onChange={(e) => setNewScheduleModal({ ...newScheduleModal, instrumentCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {SUPERVISION_INSTRUMENTS.map((inst) => (
                  <option key={inst.code} value={inst.code}>
                    [{inst.code}] {inst.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GTK / Kepala Sekolah yang Dinilai</label>
              <select
                value={newScheduleModal.assesseeName}
                onChange={(e) => {
                  const found = teachersStaff.find((t) => t.fullName === e.target.value);
                  setNewScheduleModal({
                    ...newScheduleModal,
                    assesseeName: e.target.value,
                    assesseeRole: found?.position || 'Guru',
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {teachersStaff.map((t) => (
                  <option key={t.id} value={t.fullName}>
                    {t.fullName} ({t.position})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tahun Pelajaran</label>
                <input
                  value={newScheduleModal.academicYear}
                  onChange={(e) => setNewScheduleModal({ ...newScheduleModal, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Supervisi</label>
                <input
                  type="date"
                  value={newScheduleModal.scheduledDate}
                  onChange={(e) => setNewScheduleModal({ ...newScheduleModal, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Supervisor</label>
              <input
                value={newScheduleModal.supervisorName}
                onChange={(e) => setNewScheduleModal({ ...newScheduleModal, supervisorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNewScheduleModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Buat & Mulai Nilai</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
