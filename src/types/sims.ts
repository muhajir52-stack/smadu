export type RoleCode =
  | 'super_admin'
  | 'kepala_sekolah'
  | 'guru'
  | 'tendik'
  | 'supervisor'
  | 'wali_kelas'
  | 'orang_tua';

export type ModuleKey =
  | 'dashboard'
  | 'profil_cms'
  | 'akademik'
  | 'absensi'
  | 'arsip'
  | 'supervisi'
  | 'pengguna_rbac'
  | 'audit_backup';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface RoleDefinition {
  code: RoleCode;
  label: string;
  description: string;
  permissions: Record<ModuleKey, PermissionAction[]>;
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  role: RoleCode;
  nip?: string;
  phone?: string;
  linkedStudentIds?: string[];
  linkedClassIds?: string[];
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolContentSection {
  id: string;
  sectionKey:
    | 'identity'
    | 'history'
    | 'vision_mission'
    | 'org_structure'
    | 'academic_info'
    | 'ppdb_info'
    | 'contact';
  title: string;
  subtitle?: string;
  body: string;
  metadata?: Record<string, string | string[]>;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  category: 'Berita' | 'Pengumuman' | 'Prestasi' | 'PPDB';
  summary: string;
  content: string;
  audience: 'Publik' | 'Internal' | 'Orang Tua';
  publishedAt: string;
  isPublished: boolean;
  authorUid: string;
  authorName: string;
  imageUrl?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  endDate?: string;
  category: 'Akademik' | 'Ujian' | 'Kegiatan' | 'Libur';
  description: string;
}

export interface GalleryMediaItem {
  id: string;
  title: string;
  mediaType: 'Foto' | 'Video';
  url: string;
  caption: string;
  date: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  semester: 'Ganjil' | 'Genap';
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: 'X' | 'XI' | 'XII';
  academicYear: string;
  homeroomTeacherId: string;
  homeroomTeacherName: string;
  capacity: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  category: 'Wajib' | 'Peminatan' | 'Keagamaan & Muatan Lokal';
  kkm: number;
  teacherName: string;
}

export interface TeacherStaff {
  id: string;
  nip: string;
  fullName: string;
  type: 'Guru' | 'Tendik';
  position: string;
  subjectSpecialty: string;
  status: 'GTY' | 'GTT' | 'PTY' | 'PTT' | 'PNS' | 'PPPK';
  phone: string;
  email: string;
  photoUrl?: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  fullName: string;
  gender: 'L' | 'P';
  classId: string;
  className: string;
  status: 'Aktif' | 'Lulus' | 'Mutasi' | 'Nonaktif';
  parentName: string;
  parentWhatsapp: string;
  parentUid?: string;
  enrollmentYear: string;
  previousSchool: string;
  address?: string;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  formatif: number;
  uts: number;
  uas: number;
  finalScore: number;
  predicate: string;
  teacherUid: string;
  notes?: string;
}

export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectName: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  verified: boolean;
  recordedByUid: string;
  recordedByName: string;
  verifiedAt: string;
  parentUid?: string;
}

export interface AttendanceNotification {
  id: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  recipientPhone: string;
  attendanceStatus: AttendanceStatus;
  messageBody: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  gatewayNote: string;
  sentAt: string;
  parentUid?: string;
}

export type ArchiveRootCategory = 'Manajerial' | 'Kewirausahaan' | 'Supervisi Tendik';
export type ArchiveFileType = 'PDF' | 'DOCX' | 'XLSX' | 'PPTX' | 'JPG' | 'PNG';

export interface ArchiveFolder {
  id: string;
  rootCategory: ArchiveRootCategory;
  parentId: string;
  name: string;
  description: string;
  allowedRoles: RoleCode[];
  createdByUid: string;
}

export interface ArchiveVersionEntry {
  version: number;
  fileName: string;
  updatedAt: string;
  updatedByName: string;
  changeNotes: string;
}

export interface DigitalArchive {
  id: string;
  folderId: string;
  rootCategory: ArchiveRootCategory;
  title: string;
  documentNumber: string;
  documentDate: string;
  documentYear: string;
  fileName: string;
  fileType: ArchiveFileType;
  fileSizeLabel: string;
  version: number;
  previewContent: string;
  versionHistory: ArchiveVersionEntry[];
  uploadedByUid: string;
  uploadedByName: string;
}

export interface SupervisionIndicator {
  id: string;
  sectionCode: string;
  sectionTitle: string;
  itemNumber: string;
  indicatorText: string;
  physicalEvidences: string[];
  inspectionMethod: string;
  generalItemRef: string;
}

export interface SupervisionInstrument {
  code: string;
  title: string;
  subtitle: string;
  description: string;
  targetRole: string;
  indicators: SupervisionIndicator[];
}

export interface IndicatorScoreEntry {
  scale: 1 | 2 | 3 | 4 | null;
  checkedEvidences: string[];
  linkedArchiveId?: string;
  linkedArchiveTitle?: string;
  notes: string;
}

export interface SupervisionAssessment {
  id: string;
  instrumentCode: string;
  instrumentTitle: string;
  academicYear: string;
  period: string;
  assesseeName: string;
  assesseeRole: string;
  supervisorUid: string;
  supervisorName: string;
  scheduledDate: string;
  status: 'Terjadwal' | 'Berlangsung' | 'Menunggu Validasi' | 'Disetujui';
  totalScore: number;
  maxScore: number;
  finalScore: number;
  predicate: string;
  unfilledCount: number;
  duplicateCount: number;
  scoresMap: Record<string, IndicatorScoreEntry>;
  examinerFindings: string;
  examinerStrengths: string;
  examinerSuggestions: string;
  followUpPlan: string;
  followUpStatus: 'Belum Dimulai' | 'Proses' | 'Selesai';
  validatedByName?: string;
  validatedAt?: string;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: RoleCode;
  action: string;
  module: string;
  summary: string;
  timestamp: string;
}
