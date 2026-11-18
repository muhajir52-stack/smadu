import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceRecord,
  GradeRecord,
  Student,
  SupervisionAssessment,
  SupervisionInstrument,
} from '../types/sims';

function addPdfHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SMA DARUL ULUM KEPOHBARU', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Jl. Raya Kepohbaru No. 45, Kec. Kepohbaru, Kab. Bojonegoro, Jawa Timur 62194', 14, 20);
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.6);
  doc.line(14, 23, 196, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 14, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, 14, 35);
}

export function exportStudentsExcel(students: Student[]) {
  const rows = students.map((s, idx) => ({
    No: idx + 1,
    NIS: s.nis,
    NISN: s.nisn,
    'Nama Lengkap': s.fullName,
    JK: s.gender,
    Kelas: s.className,
    Status: s.status,
    'Tahun Masuk': s.enrollmentYear,
    'Asal Sekolah': s.previousSchool,
    'Nama Orang Tua/Wali': s.parentName,
    'WhatsApp Orang Tua': s.parentWhatsapp,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, `Data_Siswa_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportStudentsPdf(students: Student[]) {
  const doc = new jsPDF();
  addPdfHeader(
    doc,
    'LAPORAN MASTER DATA PESERTA DIDIK',
    `Dicetak pada ${new Date().toLocaleDateString('id-ID')} · Total ${students.length} siswa`
  );
  autoTable(doc, {
    startY: 40,
    head: [['No', 'NIS', 'NISN', 'Nama Lengkap', 'L/P', 'Kelas', 'Status', 'Wali Murid']],
    body: students.map((s, i) => [
      i + 1,
      s.nis,
      s.nisn,
      s.fullName,
      s.gender,
      s.className,
      s.status,
      s.parentName,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [4, 120, 87] },
  });
  doc.save(`Laporan_Siswa_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportGradesExcel(grades: GradeRecord[]) {
  const rows = grades.map((g, idx) => ({
    No: idx + 1,
    Siswa: g.studentName,
    Kelas: g.className,
    'Mata Pelajaran': g.subjectName,
    'Tahun Pelajaran': g.academicYear,
    Semester: g.semester,
    Formatif: g.formatif,
    UTS: g.uts,
    UAS: g.uas,
    'Nilai Akhir': g.finalScore,
    Predikat: g.predicate,
    Catatan: g.notes || '-',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai Akademik');
  XLSX.writeFile(wb, `Rekap_Nilai_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportGradesPdf(grades: GradeRecord[]) {
  const doc = new jsPDF();
  addPdfHeader(
    doc,
    'REKAPITULASI NILAI AKADEMIK PESERTA DIDIK',
    `Dicetak pada ${new Date().toLocaleDateString('id-ID')} · ${grades.length} entri nilai`
  );
  autoTable(doc, {
    startY: 40,
    head: [['No', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Formatif', 'UTS', 'UAS', 'Akhir', 'Predikat']],
    body: grades.map((g, i) => [
      i + 1,
      g.studentName,
      g.className,
      g.subjectName,
      g.formatif,
      g.uts,
      g.uas,
      g.finalScore,
      g.predicate,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [4, 120, 87] },
  });
  doc.save(`Rekap_Nilai_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportAttendanceExcel(records: AttendanceRecord[]) {
  const rows = records.map((r, idx) => ({
    No: idx + 1,
    Tanggal: r.date,
    'Nama Siswa': r.studentName,
    Kelas: r.className,
    'Mata Pelajaran': r.subjectName,
    Status: r.status,
    Terverifikasi: r.verified ? 'Ya' : 'Belum',
    Pencatat: r.recordedByName,
    Catatan: r.notes || '-',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Absensi Siswa');
  XLSX.writeFile(wb, `Laporan_Absensi_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAttendancePdf(records: AttendanceRecord[]) {
  const doc = new jsPDF();
  addPdfHeader(
    doc,
    'LAPORAN KEHADIRAN SISWA TERVERIFIKASI',
    `Dicetak pada ${new Date().toLocaleDateString('id-ID')} · ${records.length} catatan kehadiran`
  );
  autoTable(doc, {
    startY: 40,
    head: [['No', 'Tanggal', 'Nama Siswa', 'Kelas', 'Mapel', 'Status', 'Pencatat']],
    body: records.map((r, i) => [
      i + 1,
      r.date,
      r.studentName,
      r.className,
      r.subjectName,
      r.status,
      r.recordedByName,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [4, 120, 87] },
  });
  doc.save(`Laporan_Absensi_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportSupervisionExcel(
  assessment: SupervisionAssessment,
  instrument: SupervisionInstrument
) {
  const headerRows = [
    ['INSTRUMEN SUPERVISI DIGITAL — SMA DARUL ULUM KEPOHBARU'],
    [instrument.title],
    ['Nama Sekolah', 'SMA Darul Ulum Kepohbaru, Bojonegoro'],
    ['Pihak yang Dinilai', `${assessment.assesseeName} (${assessment.assesseeRole})`],
    ['Supervisor / Penilai', assessment.supervisorName],
    ['Tahun Pelajaran / Periode', `${assessment.academicYear} · ${assessment.period}`],
    ['Tanggal Pelaksanaan', assessment.scheduledDate],
    ['Status Validasi', assessment.status],
    [],
    ['No', 'Bagian', 'Indikator / Rincian Tugas', 'Cara Periksa', 'Kaitan Butir Umum', 'Skala 1', 'Skala 2', 'Skala 3', 'Skala 4', 'Skor', 'Bukti Fisik Tercentang', 'Catatan'],
  ];

  const indicatorRows = instrument.indicators.map((ind) => {
    const entry = assessment.scoresMap[ind.id];
    const s = entry?.scale;
    return [
      ind.itemNumber,
      ind.sectionTitle,
      ind.indicatorText,
      ind.inspectionMethod,
      ind.generalItemRef,
      s === 1 ? 'v' : '',
      s === 2 ? 'v' : '',
      s === 3 ? 'v' : '',
      s === 4 ? 'v' : '',
      s ?? '',
      (entry?.checkedEvidences || []).join('; '),
      entry?.notes || '',
    ];
  });

  const summaryRows = [
    [],
    ['Jumlah Skor', assessment.totalScore],
    ['Skor Maksimal (jumlah butir x 4)', assessment.maxScore],
    ['Nilai = Jumlah skor / Skor maksimal x 100', assessment.finalScore],
    ['Predikat', assessment.predicate],
    ['Butir belum diisi (harus 0)', assessment.unfilledCount],
    ['Butir bertanda ganda (harus 0)', assessment.duplicateCount],
    [],
    ['Catatan Pemeriksa - Temuan', assessment.examinerFindings],
    ['Catatan Pemeriksa - Kekuatan', assessment.examinerStrengths],
    ['Catatan Pemeriksa - Saran', assessment.examinerSuggestions],
    ['Rencana Tindak Lanjut (RTL)', assessment.followUpPlan],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...indicatorRows, ...summaryRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, instrument.code);
  XLSX.writeFile(
    wb,
    `Laporan_Supervisi_${instrument.code}_${assessment.assesseeName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
  );
}

export function exportSupervisionPdf(
  assessment: SupervisionAssessment,
  instrument: SupervisionInstrument
) {
  const doc = new jsPDF();
  addPdfHeader(
    doc,
    `LAPORAN HASIL SUPERVISI DIGITAL (${instrument.code})`,
    `${instrument.title}`
  );

  doc.setFontSize(8.5);
  doc.text(`Dinilai: ${assessment.assesseeName} (${assessment.assesseeRole})`, 14, 42);
  doc.text(`Supervisor: ${assessment.supervisorName} · Tanggal: ${assessment.scheduledDate}`, 14, 47);
  doc.text(
    `Skor: ${assessment.totalScore}/${assessment.maxScore} · Nilai: ${assessment.finalScore} · Predikat: ${assessment.predicate} · Status: ${assessment.status}`,
    14,
    52
  );

  autoTable(doc, {
    startY: 57,
    head: [['No', 'Indikator yang Diperiksa', 'Cara Periksa', 'Kaitan', 'Skor', 'Catatan']],
    body: instrument.indicators.map((ind) => {
      const entry = assessment.scoresMap[ind.id];
      return [
        ind.itemNumber,
        ind.indicatorText,
        ind.inspectionMethod,
        ind.generalItemRef,
        entry?.scale ?? '-',
        entry?.notes || '-',
      ];
    }),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [4, 120, 87] },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 220;
  doc.setFontSize(8.5);
  doc.text(`Temuan: ${assessment.examinerFindings || '-'}`, 14, Math.min(finalY + 8, 270), { maxWidth: 180 });
  doc.text(`Rencana Tindak Lanjut: ${assessment.followUpPlan || '-'}`, 14, Math.min(finalY + 18, 282), { maxWidth: 180 });

  doc.save(`Laporan_Supervisi_${instrument.code}_${assessment.assesseeName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export async function parseStudentsFromExcel(file: File): Promise<Partial<Student>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
  return rows.map((row) => ({
    nis: String(row['NIS'] || row['nis'] || '').trim(),
    nisn: String(row['NISN'] || row['nisn'] || '').trim(),
    fullName: String(row['Nama Lengkap'] || row['Nama'] || row['fullName'] || '').trim(),
    gender: (String(row['JK'] || row['gender'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P',
    className: String(row['Kelas'] || row['className'] || 'X-A').trim(),
    status: (String(row['Status'] || 'Aktif').trim() as Student['status']) || 'Aktif',
    parentName: String(row['Nama Orang Tua/Wali'] || row['Orang Tua'] || row['parentName'] || 'Wali Murid').trim(),
    parentWhatsapp: String(row['WhatsApp Orang Tua'] || row['WA'] || row['parentWhatsapp'] || '6281200000000').trim(),
    enrollmentYear: String(row['Tahun Masuk'] || '2026').trim(),
    previousSchool: String(row['Asal Sekolah'] || '-').trim(),
  })).filter((s) => Boolean(s.fullName));
}
