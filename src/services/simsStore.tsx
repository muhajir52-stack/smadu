import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, testFirestoreConnection } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../lib/firebaseErrors';
import {
  AcademicYear,
  ActivityLog,
  AnnouncementItem,
  ArchiveFolder,
  ArchiveRootCategory,
  AttendanceNotification,
  AttendanceRecord,
  AttendanceStatus,
  CalendarEvent,
  ClassRoom,
  DigitalArchive,
  GalleryMediaItem,
  GradeRecord,
  ModuleKey,
  PermissionAction,
  RoleCode,
  SchoolContentSection,
  Student,
  Subject,
  SupervisionAssessment,
  TeacherStaff,
  UserProfile,
} from '../types/sims';
import {
  INITIAL_ACADEMIC_YEARS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ARCHIVES,
  INITIAL_ARCHIVE_FOLDERS,
  INITIAL_ATTENDANCE,
  INITIAL_CALENDAR,
  INITIAL_CLASSES,
  INITIAL_GALLERY,
  INITIAL_GRADES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SCHOOL_CONTENT,
  INITIAL_STUDENTS,
  INITIAL_SUBJECTS,
  INITIAL_SUPERVISIONS,
  INITIAL_TEACHERS_STAFF,
} from '../data/seedData';
import { ROLE_DEFINITIONS, checkPermission } from '../data/rbacMatrix';

const BOOTSTRAP_ADMIN_EMAIL = 'muhajir52@guru.sma.belajar.id';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface SimsContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  currentUser: UserProfile | null;
  activeRole: RoleCode;
  setPreviewRole: (role: RoleCode | null) => void;
  previewRole: RoleCode | null;
  can: (module: ModuleKey, action: PermissionAction) => boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loadingData: boolean;
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;

  // Data collections
  schoolContent: SchoolContentSection[];
  announcements: AnnouncementItem[];
  calendarEvents: CalendarEvent[];
  galleryItems: GalleryMediaItem[];
  academicYears: AcademicYear[];
  classes: ClassRoom[];
  subjects: Subject[];
  teachersStaff: TeacherStaff[];
  students: Student[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  notifications: AttendanceNotification[];
  archiveFolders: ArchiveFolder[];
  archives: DigitalArchive[];
  supervisions: SupervisionAssessment[];
  activityLogs: ActivityLog[];
  usersDirectory: UserProfile[];
  customRbac: Record<RoleCode, Record<ModuleKey, PermissionAction[]>>;

  // Actions
  saveSchoolContent: (section: SchoolContentSection) => Promise<void>;
  saveAnnouncement: (item: AnnouncementItem) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  saveCalendarEvent: (ev: CalendarEvent) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;
  saveGalleryItem: (item: GalleryMediaItem) => Promise<void>;
  deleteGalleryItem: (id: string) => Promise<void>;
  updateOwnPhoto: (photoUrl: string) => Promise<void>;
  saveAcademicYear: (ay: AcademicYear) => Promise<void>;
  saveClassRoom: (cls: ClassRoom) => Promise<void>;
  saveSubject: (sub: Subject) => Promise<void>;
  saveTeacherStaff: (ts: TeacherStaff) => Promise<void>;
  deleteTeacherStaff: (id: string) => Promise<void>;
  saveStudent: (st: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  importStudentsBatch: (rows: Partial<Student>[]) => Promise<number>;
  saveGrade: (gr: GradeRecord) => Promise<void>;
  recordVerifiedAttendance: (params: {
    entries: Array<{
      student: Student;
      status: AttendanceStatus;
      notes: string;
    }>;
    classRoom: ClassRoom;
    subjectName: string;
    date: string;
    notifyParents: boolean;
    notifyAllStatuses: boolean;
  }) => Promise<{ savedCount: number; sentCount: number }>;
  createArchiveFolder: (folder: Omit<ArchiveFolder, 'id' | 'createdByUid'>) => Promise<void>;
  uploadArchiveDocument: (
    docItem: Omit<DigitalArchive, 'id' | 'uploadedByUid' | 'uploadedByName'>
  ) => Promise<void>;
  updateArchiveDocumentVersion: (
    archive: DigitalArchive,
    newFileName: string,
    changeNotes: string,
    newPreview?: string
  ) => Promise<void>;
  deleteArchiveDocument: (id: string, title: string) => Promise<void>;
  saveSupervision: (sup: SupervisionAssessment) => Promise<void>;
  approveSupervision: (sup: SupervisionAssessment) => Promise<void>;
  saveUserProfile: (user: UserProfile) => Promise<void>;
  updateRbacPermission: (
    role: RoleCode,
    module: ModuleKey,
    action: PermissionAction
  ) => void;
  exportBackupJson: () => void;
  restoreBackupJson: (file: File) => Promise<void>;
}

const SimsContext = createContext<SimsContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const SimsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [previewRole, setPreviewRole] = useState<RoleCode | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [schoolContent, setSchoolContent] = useState<SchoolContentSection[]>(INITIAL_SCHOOL_CONTENT);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(INITIAL_ANNOUNCEMENTS);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR);
  const [galleryItems, setGalleryItems] = useState<GalleryMediaItem[]>(INITIAL_GALLERY);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(INITIAL_ACADEMIC_YEARS);
  const [classes, setClasses] = useState<ClassRoom[]>(INITIAL_CLASSES);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [teachersStaff, setTeachersStaff] = useState<TeacherStaff[]>(INITIAL_TEACHERS_STAFF);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [grades, setGrades] = useState<GradeRecord[]>(INITIAL_GRADES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [notifications, setNotifications] = useState<AttendanceNotification[]>(INITIAL_NOTIFICATIONS);
  const [archiveFolders, setArchiveFolders] = useState<ArchiveFolder[]>(INITIAL_ARCHIVE_FOLDERS);
  const [archives, setArchives] = useState<DigitalArchive[]>(INITIAL_ARCHIVES);
  const [supervisions, setSupervisions] = useState<SupervisionAssessment[]>(INITIAL_SUPERVISIONS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [usersDirectory, setUsersDirectory] = useState<UserProfile[]>([]);

  const [customRbac, setCustomRbac] = useState<Record<RoleCode, Record<ModuleKey, PermissionAction[]>>>(
    () =>
      Object.fromEntries(
        Object.values(ROLE_DEFINITIONS).map((r) => [r.code, { ...r.permissions }])
      ) as Record<RoleCode, Record<ModuleKey, PermissionAction[]>>
  );

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = makeId('toast');
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const activeRole: RoleCode = useMemo(() => {
    if (currentUser?.role === 'super_admin' && previewRole) {
      return previewRole;
    }
    return currentUser?.role || 'orang_tua';
  }, [currentUser, previewRole]);

  const can = useCallback(
    (module: ModuleKey, action: PermissionAction) => {
      return checkPermission(activeRole, module, action, customRbac);
    },
    [activeRole, customRbac]
  );

  // Test Firestore connection on mount
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Public listeners for Web Profil Sekolah (always available)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        collection(db, 'school_content'),
        (snap) => {
          if (!snap.empty) {
            setSchoolContent(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SchoolContentSection)));
          }
        },
        () => {
          // Fallback silently to initial static content if not seeded yet
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'announcements'), where('isPublished', '==', true)),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnnouncementItem));
            list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
            setAnnouncements(list);
          }
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'calendar_events'),
        (snap) => {
          if (!snap.empty) {
            setCalendarEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent)));
          }
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'gallery_items'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GalleryMediaItem));
            list.sort((a, b) => b.date.localeCompare(a.date));
            setGalleryItems(list);
          }
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'teachers_staff'),
        (snap) => {
          if (!snap.empty) {
            setTeachersStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherStaff)));
          }
        },
        () => {}
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  const seedInitialFirestoreData = useCallback(async (adminUid: string) => {
    try {
      const checkSnap = await getDocs(collection(db, 'academic_years'));
      if (!checkSnap.empty) return;

      const batch = writeBatch(db);
      INITIAL_SCHOOL_CONTENT.forEach((item) => batch.set(doc(db, 'school_content', item.id), item));
      INITIAL_ANNOUNCEMENTS.forEach((item) => batch.set(doc(db, 'announcements', item.id), item));
      INITIAL_CALENDAR.forEach((item) => batch.set(doc(db, 'calendar_events', item.id), item));
      INITIAL_GALLERY.forEach((item) => batch.set(doc(db, 'gallery_items', item.id), item));
      INITIAL_ACADEMIC_YEARS.forEach((item) => batch.set(doc(db, 'academic_years', item.id), item));
      INITIAL_CLASSES.forEach((item) => batch.set(doc(db, 'classes', item.id), item));
      INITIAL_SUBJECTS.forEach((item) => batch.set(doc(db, 'subjects', item.id), item));
      INITIAL_TEACHERS_STAFF.forEach((item) => batch.set(doc(db, 'teachers_staff', item.id), item));
      INITIAL_STUDENTS.forEach((item) => batch.set(doc(db, 'students', item.id), item));
      INITIAL_GRADES.forEach((item) => batch.set(doc(db, 'grades', item.id), item));
      INITIAL_ATTENDANCE.forEach((item) => batch.set(doc(db, 'attendance', item.id), item));
      INITIAL_NOTIFICATIONS.forEach((item) => batch.set(doc(db, 'attendance_notifications', item.id), item));
      INITIAL_ARCHIVE_FOLDERS.forEach((item) => batch.set(doc(db, 'archive_folders', item.id), item));
      INITIAL_ARCHIVES.forEach((item) => batch.set(doc(db, 'digital_archives', item.id), item));
      INITIAL_SUPERVISIONS.forEach((item) => batch.set(doc(db, 'supervisions', item.id), item));
      INITIAL_ACTIVITY_LOGS.forEach((item) =>
        batch.set(doc(db, 'activity_logs', item.id), { ...item, actorUid: adminUid })
      );

      await batch.commit();
    } catch (err) {
      console.error('Seed data error:', err);
    }
  }, []);

  // Auth listener & user profile sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUser(null);
        setPreviewRole(null);
        setAuthReady(true);
        return;
      }

      setLoadingData(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const isBootAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

        if (!snap.exists()) {
          const now = new Date().toISOString();
          const newProfile: UserProfile = {
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || (isBootAdmin ? 'H. Ahmad Muhajir, S.Pd., M.Pd.' : 'Pengguna Sekolah'),
            role: isBootAdmin ? 'super_admin' : 'orang_tua',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(userRef, newProfile);
          setCurrentUser(newProfile);
          if (isBootAdmin) {
            await seedInitialFirestoreData(user.uid);
          }
        } else {
          const existingProfile = { id: snap.id, ...snap.data() } as UserProfile;
          setCurrentUser(existingProfile);
          if (isBootAdmin || existingProfile.role === 'super_admin') {
            await seedInitialFirestoreData(user.uid);
          }
        }
      } catch (err) {
        console.error('Error initializing user profile:', err);
      } finally {
        setLoadingData(false);
        setAuthReady(true);
      }
    });

    return () => unsubAuth();
  }, [seedInitialFirestoreData]);

  // Authenticated Firestore subscriptions scoped by role
  useEffect(() => {
    if (!firebaseUser || !currentUser) return;

    const unsubs: Array<() => void> = [];
    const role = currentUser.role;
    const isStaff = ['super_admin', 'kepala_sekolah', 'guru', 'tendik', 'supervisor', 'wali_kelas'].includes(role);

    unsubs.push(
      onSnapshot(
        collection(db, 'academic_years'),
        (snap) => {
          if (!snap.empty) setAcademicYears(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcademicYear)));
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'academic_years')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'classes'),
        (snap) => {
          if (!snap.empty) setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassRoom)));
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'classes')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'subjects'),
        (snap) => {
          if (!snap.empty) setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject)));
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'subjects')
      )
    );

    if (isStaff) {
      unsubs.push(
        onSnapshot(
          collection(db, 'students'),
          (snap) => {
            if (!snap.empty) setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'students')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'grades'),
          (snap) => {
            if (!snap.empty) setGrades(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GradeRecord)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'grades')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'attendance'),
          (snap) => {
            if (!snap.empty) setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'attendance')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'attendance_notifications'),
          (snap) => {
            if (!snap.empty)
              setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceNotification)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'attendance_notifications')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'archive_folders'),
          (snap) => {
            if (!snap.empty) setArchiveFolders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArchiveFolder)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'archive_folders')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'digital_archives'),
          (snap) => {
            if (!snap.empty) setArchives(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DigitalArchive)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'digital_archives')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'supervisions'),
          (snap) => {
            if (!snap.empty)
              setSupervisions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupervisionAssessment)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'supervisions')
        )
      );
    } else {
      // Parent scoped queries
      unsubs.push(
        onSnapshot(
          query(collection(db, 'students'), where('parentUid', '==', firebaseUser.uid)),
          (snap) => {
            if (!snap.empty) setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'students')
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'attendance'), where('parentUid', '==', firebaseUser.uid)),
          (snap) => {
            if (!snap.empty) setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'grades'), where('parentUid', '==', firebaseUser.uid)),
          (snap) => {
            if (!snap.empty) setGrades(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GradeRecord)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'grades')
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'attendance_notifications'), where('parentUid', '==', firebaseUser.uid)),
          (snap) => {
            if (!snap.empty)
              setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceNotification)));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'attendance_notifications')
        )
      );
    }

    if (['super_admin', 'kepala_sekolah', 'supervisor', 'tendik'].includes(role)) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            setUsersDirectory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserProfile)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'users')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'activity_logs'),
          (snap) => {
            if (!snap.empty) {
              const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
              logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
              setActivityLogs(logs);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'activity_logs')
        )
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [firebaseUser, currentUser]);

  const recordLog = useCallback(
    async (action: string, module: string, summary: string) => {
      if (!firebaseUser || !currentUser) return;
      const id = makeId('log');
      const log: ActivityLog = {
        id,
        actorUid: firebaseUser.uid,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action,
        module,
        summary,
        timestamp: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, 'activity_logs', id), log);
      } catch {
        // Non-blocking audit log fallback in local state
        setActivityLogs((prev) => [log, ...prev]);
      }
    },
    [firebaseUser, currentUser]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      pushToast('success', 'Berhasil masuk ke SIMS SMA Darul Ulum Kepohbaru.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal login Google';
      pushToast('error', `Autentikasi gagal: ${msg}`);
    }
  }, [pushToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setPreviewRole(null);
    pushToast('info', 'Anda telah keluar dari portal SIMS.');
  }, [pushToast]);

  // CRUD implementations
  const saveSchoolContent = useCallback(
    async (section: SchoolContentSection) => {
      const payload: SchoolContentSection = {
        ...section,
        updatedBy: currentUser?.fullName || 'Admin',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'school_content', section.sectionKey), payload);
      await recordLog('PERBARUI_CMS', 'Profil Sekolah', `Memperbarui bagian ${section.title}`);
      pushToast('success', `Konten "${section.title}" berhasil disimpan.`);
    },
    [currentUser, pushToast, recordLog]
  );

  const saveAnnouncement = useCallback(
    async (item: AnnouncementItem) => {
      const id = item.id || makeId('ann');
      await setDoc(doc(db, 'announcements', id), { ...item, id });
      await recordLog('PUBLIKASI_PENGUMUMAN', 'Profil Sekolah', `Menyimpan ${item.category}: ${item.title}`);
      pushToast('success', `${item.category} berhasil dipublikasikan.`);
    },
    [pushToast, recordLog]
  );

  const deleteAnnouncement = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, 'announcements', id));
      await recordLog('HAPUS_PENGUMUMAN', 'Profil Sekolah', `Menghapus pengumuman ID ${id}`);
      pushToast('info', 'Pengumuman dihapus.');
    },
    [pushToast, recordLog]
  );

  const saveCalendarEvent = useCallback(
    async (ev: CalendarEvent) => {
      const id = ev.id || makeId('cal');
      await setDoc(doc(db, 'calendar_events', id), { ...ev, id });
      await recordLog('SIMPAN_KALENDER', 'Kalender Akademik', `Menyimpan agenda: ${ev.title}`);
      pushToast('success', 'Agenda kalender akademik tersimpan.');
    },
    [pushToast, recordLog]
  );

  const deleteCalendarEvent = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, 'calendar_events', id));
      pushToast('info', 'Agenda kalender dihapus.');
    },
    [pushToast]
  );

  const saveGalleryItem = useCallback(
    async (item: GalleryMediaItem) => {
      const id = item.id || makeId('gal');
      try {
        await setDoc(doc(db, 'gallery_items', id), { ...item, id });
        await recordLog('KELOLA_FOTO', 'Foto & Galeri', `Memperbarui item galeri: ${item.title}`);
        pushToast('success', `Foto "${item.title}" berhasil disimpan.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `gallery_items/${id}`);
      }
    },
    [pushToast, recordLog]
  );

  const deleteGalleryItem = useCallback(
    async (id: string) => {
      try {
        await deleteDoc(doc(db, 'gallery_items', id));
        await recordLog('HAPUS_FOTO', 'Foto & Galeri', `Menghapus item galeri ID ${id}`);
        pushToast('info', 'Item galeri foto dihapus.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `gallery_items/${id}`);
      }
    },
    [pushToast, recordLog]
  );

  const updateOwnPhoto = useCallback(
    async (photoUrl: string) => {
      if (!firebaseUser || !currentUser) return;
      const updated: UserProfile = {
        ...currentUser,
        photoUrl,
        updatedAt: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), updated);
        setCurrentUser(updated);
        await recordLog('UBAH_FOTO_PROFIL', 'Profil Akun', `Mengubah foto profil ${currentUser.fullName}`);
        pushToast('success', 'Foto profil akun berhasil diperbarui.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    },
    [currentUser, firebaseUser, pushToast, recordLog]
  );

  const saveAcademicYear = useCallback(
    async (ay: AcademicYear) => {
      const id = ay.id || makeId('ay');
      if (ay.isActive) {
        const batch = writeBatch(db);
        academicYears.forEach((y) => {
          if (y.id !== id && y.isActive) {
            batch.update(doc(db, 'academic_years', y.id), { isActive: false });
          }
        });
        batch.set(doc(db, 'academic_years', id), { ...ay, id });
        await batch.commit();
      } else {
        await setDoc(doc(db, 'academic_years', id), { ...ay, id });
      }
      await recordLog('KELOLA_TAHUN_AJARAN', 'Akademik', `Memperbarui tahun pelajaran ${ay.name} (${ay.semester})`);
      pushToast('success', `Tahun Pelajaran ${ay.name} (${ay.semester}) disimpan.`);
    },
    [academicYears, pushToast, recordLog]
  );

  const saveClassRoom = useCallback(
    async (cls: ClassRoom) => {
      const id = cls.id || makeId('cls');
      await setDoc(doc(db, 'classes', id), { ...cls, id });
      await recordLog('KELOLA_KELAS', 'Akademik', `Menyimpan rombel ${cls.name} (Wali Kelas: ${cls.homeroomTeacherName})`);
      pushToast('success', `Kelas ${cls.name} berhasil disimpan.`);
    },
    [pushToast, recordLog]
  );

  const saveSubject = useCallback(
    async (sub: Subject) => {
      const id = sub.id || makeId('sub');
      await setDoc(doc(db, 'subjects', id), { ...sub, id });
      await recordLog('KELOLA_MAPEL', 'Akademik', `Menyimpan mata pelajaran ${sub.name}`);
      pushToast('success', `Mata pelajaran ${sub.name} berhasil disimpan.`);
    },
    [pushToast, recordLog]
  );

  const saveTeacherStaff = useCallback(
    async (ts: TeacherStaff) => {
      const id = ts.id || makeId('gtk');
      await setDoc(doc(db, 'teachers_staff', id), { ...ts, id });
      await recordLog('KELOLA_GTK', 'Akademik', `Menyimpan data ${ts.type}: ${ts.fullName}`);
      pushToast('success', `Data ${ts.fullName} berhasil disimpan.`);
    },
    [pushToast, recordLog]
  );

  const deleteTeacherStaff = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, 'teachers_staff', id));
      pushToast('info', 'Data GTK dihapus.');
    },
    [pushToast]
  );

  const saveStudent = useCallback(
    async (st: Student) => {
      const id = st.id || makeId('std');
      await setDoc(doc(db, 'students', id), { ...st, id });
      await recordLog('KELOLA_SISWA', 'Akademik', `Menyimpan data siswa ${st.fullName} (${st.className})`);
      pushToast('success', `Data siswa ${st.fullName} berhasil disimpan.`);
    },
    [pushToast, recordLog]
  );

  const deleteStudent = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, 'students', id));
      await recordLog('HAPUS_SISWA', 'Akademik', `Menghapus siswa ID ${id}`);
      pushToast('info', 'Data siswa dihapus.');
    },
    [pushToast, recordLog]
  );

  const importStudentsBatch = useCallback(
    async (rows: Partial<Student>[]) => {
      const batch = writeBatch(db);
      let count = 0;
      rows.forEach((row) => {
        if (!row.fullName) return;
        const id = makeId('std');
        const matchedClass = classes.find((c) => c.name.toLowerCase() === (row.className || '').toLowerCase());
        const student: Student = {
          id,
          nis: row.nis || String(Math.floor(260200 + Math.random() * 800)),
          nisn: row.nisn || String(Math.floor(1000000000 + Math.random() * 900000000)),
          fullName: row.fullName,
          gender: row.gender || 'L',
          classId: matchedClass?.id || classes[0]?.id || 'cls-xa',
          className: matchedClass?.name || row.className || 'X-A',
          status: row.status || 'Aktif',
          parentName: row.parentName || 'Wali Murid',
          parentWhatsapp: row.parentWhatsapp || '6281200000000',
          enrollmentYear: row.enrollmentYear || '2026',
          previousSchool: row.previousSchool || '-',
        };
        batch.set(doc(db, 'students', id), student);
        count += 1;
      });
      await batch.commit();
      await recordLog('IMPOR_SISWA', 'Akademik', `Mengimpor ${count} data siswa dari Excel`);
      pushToast('success', `${count} data siswa berhasil diimpor ke database.`);
      return count;
    },
    [classes, pushToast, recordLog]
  );

  const saveGrade = useCallback(
    async (gr: GradeRecord) => {
      const id = gr.id || makeId('grd');
      await setDoc(doc(db, 'grades', id), { ...gr, id });
      await recordLog('INPUT_NILAI', 'Akademik', `Menyimpan nilai ${gr.subjectName} untuk ${gr.studentName} (${gr.finalScore})`);
      pushToast('success', `Nilai ${gr.studentName} tersimpan.`);
    },
    [pushToast, recordLog]
  );

  const recordVerifiedAttendance = useCallback(
    async (params: {
      entries: Array<{ student: Student; status: AttendanceStatus; notes: string }>;
      classRoom: ClassRoom;
      subjectName: string;
      date: string;
      notifyParents: boolean;
      notifyAllStatuses: boolean;
    }) => {
      const now = new Date().toISOString();
      const batch = writeBatch(db);
      const savedRecords: Array<{ record: AttendanceRecord; student: Student }> = [];

      for (const item of params.entries) {
        const attId = `att-${params.date}-${item.student.id}-${params.subjectName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;
        const record: AttendanceRecord = {
          id: attId,
          studentId: item.student.id,
          studentName: item.student.fullName,
          classId: params.classRoom.id,
          className: params.classRoom.name,
          subjectName: params.subjectName,
          date: params.date,
          status: item.status,
          notes: item.notes,
          verified: true,
          recordedByUid: firebaseUser?.uid || 'system',
          recordedByName: currentUser?.fullName || 'Guru',
          verifiedAt: now,
          ...(item.student.parentUid ? { parentUid: item.student.parentUid } : {}),
        };
        batch.set(doc(db, 'attendance', attId), record);
        savedRecords.push({ record, student: item.student });
      }

      // Step 1: Commit verified attendance records atomically first!
      await batch.commit();

      let sentCount = 0;
      if (params.notifyParents) {
        for (const { record, student } of savedRecords) {
          const shouldNotify =
            params.notifyAllStatuses || record.status !== 'Hadir';
          if (!shouldNotify || !student.parentWhatsapp) continue;

          const messageBody = `[SIMS SMA Darul Ulum Kepohbaru] Yth. Bapak/Ibu ${student.parentName}, kami informasikan ananda ${student.fullName} (Kelas ${record.className}) tercatat ${record.status.toUpperCase()} pada mata pelajaran ${record.subjectName} tanggal ${record.date}.${record.notes ? ` Catatan: ${record.notes}.` : ''}`;

          let deliveryStatus: 'sent' | 'failed' = 'sent';
          let gatewayNote = '';
          let sentAt = new Date().toISOString();

          try {
            const resp = await fetch('/api/whatsapp/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attendanceId: record.id,
                studentName: student.fullName,
                className: record.className,
                recipientPhone: student.parentWhatsapp,
                status: record.status,
                date: record.date,
                messageBody,
                verified: record.verified,
              }),
            });
            const data = await resp.json();
            deliveryStatus = data.delivered ? 'sent' : 'failed';
            gatewayNote = data.gatewayNote || data.error || 'Terkirim via gateway';
            if (data.sentAt) sentAt = data.sentAt;
          } catch {
            deliveryStatus = 'failed';
            gatewayNote = 'Gagal menghubungi endpoint WhatsApp Gateway server';
          }

          const notifId = makeId('notif');
          const notifDoc: AttendanceNotification = {
            id: notifId,
            attendanceId: record.id,
            studentId: student.id,
            studentName: student.fullName,
            parentName: student.parentName,
            recipientPhone: student.parentWhatsapp,
            attendanceStatus: record.status,
            messageBody,
            deliveryStatus,
            gatewayNote,
            sentAt,
            ...(student.parentUid ? { parentUid: student.parentUid } : {}),
          };
          await setDoc(doc(db, 'attendance_notifications', notifId), notifDoc);
          if (deliveryStatus === 'sent') sentCount += 1;
        }
      }

      await recordLog(
        'VERIFIKASI_ABSENSI',
        'Absensi',
        `Memverifikasi ${savedRecords.length} absensi kelas ${params.classRoom.name} (${params.subjectName}) dan mengirim ${sentCount} notifikasi WA`
      );
      pushToast(
        'success',
        `${savedRecords.length} data absensi terverifikasi & ${sentCount} notifikasi WhatsApp orang tua tercatat.`
      );
      return { savedCount: savedRecords.length, sentCount };
    },
    [currentUser, firebaseUser, pushToast, recordLog]
  );

  const createArchiveFolder = useCallback(
    async (folder: Omit<ArchiveFolder, 'id' | 'createdByUid'>) => {
      const id = makeId('fld');
      const docData: ArchiveFolder = {
        ...folder,
        id,
        createdByUid: firebaseUser?.uid || 'system',
      };
      await setDoc(doc(db, 'archive_folders', id), docData);
      await recordLog('BUAT_FOLDER_ARSIP', 'Arsip Digital', `Membuat folder "${folder.name}" di ${folder.rootCategory}`);
      pushToast('success', `Folder "${folder.name}" berhasil dibuat.`);
    },
    [firebaseUser, pushToast, recordLog]
  );

  const uploadArchiveDocument = useCallback(
    async (docItem: Omit<DigitalArchive, 'id' | 'uploadedByUid' | 'uploadedByName'>) => {
      const id = makeId('arc');
      const fullDoc: DigitalArchive = {
        ...docItem,
        id,
        uploadedByUid: firebaseUser?.uid || 'system',
        uploadedByName: currentUser?.fullName || 'Staf Sekolah',
      };
      await setDoc(doc(db, 'digital_archives', id), fullDoc);
      await recordLog('UNGGAH_ARSIP', 'Arsip Digital', `Mengunggah dokumen "${docItem.title}" (${docItem.fileType})`);
      pushToast('success', `Dokumen "${docItem.title}" berhasil diarsipkan.`);
    },
    [currentUser, firebaseUser, pushToast, recordLog]
  );

  const updateArchiveDocumentVersion = useCallback(
    async (archive: DigitalArchive, newFileName: string, changeNotes: string, newPreview?: string) => {
      const nextVersion = archive.version + 1;
      const updated: DigitalArchive = {
        ...archive,
        fileName: newFileName,
        version: nextVersion,
        previewContent: newPreview || archive.previewContent,
        versionHistory: [
          ...archive.versionHistory,
          {
            version: nextVersion,
            fileName: newFileName,
            updatedAt: new Date().toISOString().slice(0, 10),
            updatedByName: currentUser?.fullName || 'Pengguna',
            changeNotes,
          },
        ],
      };
      await setDoc(doc(db, 'digital_archives', archive.id), updated);
      await recordLog('REVISI_ARSIP', 'Arsip Digital', `Memperbarui "${archive.title}" ke versi v${nextVersion}`);
      pushToast('success', `Dokumen diperbarui ke versi v${nextVersion}.`);
    },
    [currentUser, pushToast, recordLog]
  );

  const deleteArchiveDocument = useCallback(
    async (id: string, title: string) => {
      await deleteDoc(doc(db, 'digital_archives', id));
      await recordLog('HAPUS_ARSIP', 'Arsip Digital', `Menghapus dokumen "${title}"`);
      pushToast('info', `Dokumen "${title}" dihapus dari arsip.`);
    },
    [pushToast, recordLog]
  );

  const saveSupervision = useCallback(
    async (sup: SupervisionAssessment) => {
      const id = sup.id || makeId('sup');
      await setDoc(doc(db, 'supervisions', id), { ...sup, id });
      await recordLog(
        'SIMPAN_SUPERVISI',
        'Supervisi Digital',
        `Menyimpan penilaian ${sup.instrumentCode} untuk ${sup.assesseeName} (Nilai: ${sup.finalScore} · ${sup.predicate})`
      );
      pushToast('success', `Penilaian supervisi ${sup.instrumentCode} tersimpan.`);
    },
    [pushToast, recordLog]
  );

  const approveSupervision = useCallback(
    async (sup: SupervisionAssessment) => {
      if (sup.unfilledCount > 0) {
        pushToast(
          'error',
          `Validasi ditolak: masih ada ${sup.unfilledCount} butir indikator yang belum diisi (harus 0).`
        );
        return;
      }
      const updated: SupervisionAssessment = {
        ...sup,
        status: 'Disetujui',
        validatedByName: currentUser?.fullName || 'Kepala Sekolah',
        validatedAt: new Date().toISOString().slice(0, 10),
      };
      await setDoc(doc(db, 'supervisions', sup.id), updated);
      await recordLog(
        'VALIDASI_SUPERVISI',
        'Supervisi Digital',
        `Menyetujui supervisi ${sup.instrumentCode} atas nama ${sup.assesseeName} (Nilai: ${sup.finalScore} · ${sup.predicate})`
      );
      pushToast('success', `Hasil supervisi ${sup.instrumentCode} resmi disetujui.`);
    },
    [currentUser, pushToast, recordLog]
  );

  const saveUserProfile = useCallback(
    async (user: UserProfile) => {
      const id = user.id || user.uid || makeId('usr');
      const now = new Date().toISOString();
      await setDoc(doc(db, 'users', id), {
        ...user,
        id,
        uid: user.uid || id,
        updatedAt: now,
        createdAt: user.createdAt || now,
      });
      if (firebaseUser?.uid === id) {
        setCurrentUser({ ...user, id, uid: user.uid || id });
      }
      await recordLog('KELOLA_AKUN', 'RBAC & Akun', `Memperbarui akun ${user.fullName} sebagai ${user.role}`);
      pushToast('success', `Akun ${user.fullName} berhasil disimpan.`);
    },
    [firebaseUser, pushToast, recordLog]
  );

  const updateRbacPermission = useCallback(
    (role: RoleCode, module: ModuleKey, action: PermissionAction) => {
      setCustomRbac((prev) => {
        const currentActions = prev[role]?.[module] || [];
        const exists = currentActions.includes(action);
        const nextActions = exists
          ? currentActions.filter((a) => a !== action)
          : [...currentActions, action];
        return {
          ...prev,
          [role]: {
            ...prev[role],
            [module]: nextActions,
          },
        };
      });
      pushToast('info', `Hak akses ${role} pada modul ${module} diperbarui.`);
    },
    [pushToast]
  );

  const exportBackupJson = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      school: 'SMA Darul Ulum Kepohbaru',
      schoolContent,
      announcements,
      calendarEvents,
      academicYears,
      classes,
      subjects,
      teachersStaff,
      students,
      grades,
      attendance,
      notifications,
      archiveFolders,
      archives,
      supervisions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SIMS_SMA_Darul_Ulum_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordLog('BACKUP_DATA', 'Backup & Pemulihan', 'Mengunduh berkas backup database JSON lengkap.');
    pushToast('success', 'Backup database lengkap berhasil diunduh.');
  }, [
    academicYears,
    announcements,
    archiveFolders,
    archives,
    attendance,
    calendarEvents,
    classes,
    grades,
    notifications,
    pushToast,
    recordLog,
    schoolContent,
    students,
    subjects,
    supervisions,
    teachersStaff,
  ]);

  const restoreBackupJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const batch = writeBatch(db);
        const restoreList = (colName: string, arr?: Array<{ id: string }>) => {
          if (!Array.isArray(arr)) return;
          arr.forEach((item) => {
            if (item?.id) batch.set(doc(db, colName, item.id), item);
          });
        };
        restoreList('school_content', data.schoolContent);
        restoreList('announcements', data.announcements);
        restoreList('calendar_events', data.calendarEvents);
        restoreList('academic_years', data.academicYears);
        restoreList('classes', data.classes);
        restoreList('subjects', data.subjects);
        restoreList('teachers_staff', data.teachersStaff);
        restoreList('students', data.students);
        restoreList('grades', data.grades);
        restoreList('archive_folders', data.archiveFolders);
        restoreList('digital_archives', data.archives);
        restoreList('supervisions', data.supervisions);
        await batch.commit();
        await recordLog('PEMULIHAN_DATA', 'Backup & Pemulihan', `Memulihkan database dari berkas ${file.name}`);
        pushToast('success', 'Pemulihan data dari berkas backup berhasil.');
      } catch {
        pushToast('error', 'Format berkas backup JSON tidak valid.');
      }
    },
    [pushToast, recordLog]
  );

  const value: SimsContextValue = {
    authReady,
    firebaseUser,
    currentUser,
    activeRole,
    setPreviewRole,
    previewRole,
    can,
    loginWithGoogle,
    logout,
    loadingData,
    toasts,
    pushToast,
    dismissToast,
    schoolContent,
    announcements,
    calendarEvents,
    galleryItems,
    academicYears,
    classes,
    subjects,
    teachersStaff,
    students,
    grades,
    attendance,
    notifications,
    archiveFolders,
    archives,
    supervisions,
    activityLogs,
    usersDirectory,
    customRbac,
    saveSchoolContent,
    saveAnnouncement,
    deleteAnnouncement,
    saveCalendarEvent,
    deleteCalendarEvent,
    saveGalleryItem,
    deleteGalleryItem,
    updateOwnPhoto,
    saveAcademicYear,
    saveClassRoom,
    saveSubject,
    saveTeacherStaff,
    deleteTeacherStaff,
    saveStudent,
    deleteStudent,
    importStudentsBatch,
    saveGrade,
    recordVerifiedAttendance,
    createArchiveFolder,
    uploadArchiveDocument,
    updateArchiveDocumentVersion,
    deleteArchiveDocument,
    saveSupervision,
    approveSupervision,
    saveUserProfile,
    updateRbacPermission,
    exportBackupJson,
    restoreBackupJson,
  };

  return <SimsContext.Provider value={value}>{children}</SimsContext.Provider>;
};

export function useSims() {
  const ctx = useContext(SimsContext);
  if (!ctx) throw new Error('useSims harus digunakan di dalam SimsProvider');
  return ctx;
}

export const ARCHIVE_ROOT_CATEGORIES: ArchiveRootCategory[] = [
  'Manajerial',
  'Kewirausahaan',
  'Supervisi Tendik',
];
