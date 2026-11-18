import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, testFirestoreConnection } from '../lib/firebase';
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

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface SaveUserInput extends UserProfile {
  password?: string;
}

interface SimsContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  currentUser: UserProfile | null;
  activeRole: RoleCode;
  setPreviewRole: (role: RoleCode | null) => void;
  previewRole: RoleCode | null;
  can: (module: ModuleKey, action: PermissionAction) => boolean;
  loginWithCredentials: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  changeOwnPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
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
  saveUserProfile: (user: SaveUserInput) => Promise<boolean>;
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

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    });
    return out as T;
  }
  return value;
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    return list.map((x, i) => (i === idx ? item : x));
  }
  return [item, ...list];
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

  const syncStateToServer = useCallback(async (patch: Record<string, unknown>) => {
    try {
      await fetch('/api/sims/state', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripUndefined(patch)),
      });
    } catch {
      // Non-blocking fallback
    }
  }, []);

  const hydrateAuthenticatedServerData = useCallback(async (user: UserProfile) => {
    setLoadingData(true);
    try {
      const [stateResp, usersResp] = await Promise.all([
        fetch('/api/sims/state', { credentials: 'include' }),
        ['super_admin', 'kepala_sekolah', 'supervisor', 'tendik'].includes(user.role)
          ? fetch('/api/auth/users', { credentials: 'include' })
          : Promise.resolve(null),
      ]);

      if (stateResp.ok) {
        const data = await stateResp.json();
        const st = data?.state || {};
        if (Array.isArray(st.schoolContent)) setSchoolContent(st.schoolContent);
        if (Array.isArray(st.announcements)) setAnnouncements(st.announcements);
        if (Array.isArray(st.calendarEvents)) setCalendarEvents(st.calendarEvents);
        if (Array.isArray(st.galleryItems)) setGalleryItems(st.galleryItems);
        if (Array.isArray(st.academicYears)) setAcademicYears(st.academicYears);
        if (Array.isArray(st.classes)) setClasses(st.classes);
        if (Array.isArray(st.subjects)) setSubjects(st.subjects);
        if (Array.isArray(st.teachersStaff)) setTeachersStaff(st.teachersStaff);
        if (Array.isArray(st.students)) setStudents(st.students);
        if (Array.isArray(st.grades)) setGrades(st.grades);
        if (Array.isArray(st.attendance)) setAttendance(st.attendance);
        if (Array.isArray(st.notifications)) setNotifications(st.notifications);
        if (Array.isArray(st.archiveFolders)) setArchiveFolders(st.archiveFolders);
        if (Array.isArray(st.archives)) setArchives(st.archives);
        if (Array.isArray(st.supervisions)) setSupervisions(st.supervisions);
        if (Array.isArray(st.activityLogs)) setActivityLogs(st.activityLogs);
        if (st.customRbac && typeof st.customRbac === 'object') setCustomRbac(st.customRbac);
      }

      if (usersResp && usersResp.ok) {
        const usersData = await usersResp.json();
        if (Array.isArray(usersData?.users)) {
          setUsersDirectory(usersData.users);
        }
      }
    } catch {
      // Fallback to initial seed data cleanly
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Test Firestore connection on mount & hydrate public profile + check cookie session
  useEffect(() => {
    testFirestoreConnection();

    let cancelled = false;
    (async () => {
      try {
        const [pubResp, meResp] = await Promise.all([
          fetch('/api/sims/public'),
          fetch('/api/auth/me', { credentials: 'include' }),
        ]);

        if (!cancelled && pubResp.ok) {
          const pub = await pubResp.json();
          if (Array.isArray(pub.schoolContent)) setSchoolContent(pub.schoolContent);
          if (Array.isArray(pub.announcements)) setAnnouncements(pub.announcements);
          if (Array.isArray(pub.calendarEvents)) setCalendarEvents(pub.calendarEvents);
          if (Array.isArray(pub.galleryItems)) setGalleryItems(pub.galleryItems);
          if (Array.isArray(pub.teachersStaff)) setTeachersStaff(pub.teachersStaff);
        }

        if (!cancelled && meResp.ok) {
          const meData = await meResp.json();
          if (meData?.user) {
            setCurrentUser(meData.user as UserProfile);
            await hydrateAuthenticatedServerData(meData.user as UserProfile);
          }
        }
      } catch {
        // Ignore network errors during boot
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    })();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    return () => {
      cancelled = true;
      unsubAuth();
    };
  }, [hydrateAuthenticatedServerData]);

  // Public listeners for Web Profil Sekolah (if Firebase data exists)
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
        () => {}
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

  // Optional Firestore authenticated listeners if a Firebase Auth user happens to be signed in
  useEffect(() => {
    if (!firebaseUser || !currentUser) return;

    const unsubs: Array<() => void> = [];
    const role = currentUser.role;
    const isStaff = ['super_admin', 'kepala_sekolah', 'guru', 'tendik', 'supervisor', 'wali_kelas'].includes(role);

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
    }

    return () => unsubs.forEach((u) => u());
  }, [firebaseUser, currentUser]);

  const recordLog = useCallback(
    async (action: string, module: string, summary: string) => {
      if (!currentUser) return;
      const id = makeId('log');
      const log: ActivityLog = {
        id,
        actorUid: currentUser.uid || firebaseUser?.uid || 'system',
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action,
        module,
        summary,
        timestamp: new Date().toISOString(),
      };
      const nextLogs = [log, ...activityLogs].slice(0, 300);
      setActivityLogs(nextLogs);
      await syncStateToServer({ activityLogs: nextLogs });
      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'activity_logs', id), log);
        } catch {
          // Non-blocking
        }
      }
    },
    [activityLogs, currentUser, firebaseUser, syncStateToServer]
  );

  const loginWithCredentials = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      setLoadingData(true);
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await resp.json();
        if (!resp.ok || !data?.user) {
          const errorMsg = data?.error || 'Username atau password salah.';
          pushToast('error', errorMsg);
          return { ok: false, error: errorMsg };
        }
        const loggedUser = data.user as UserProfile;
        setCurrentUser(loggedUser);
        setPreviewRole(null);
        await hydrateAuthenticatedServerData(loggedUser);
        pushToast('success', `Selamat datang, ${loggedUser.fullName}.`);
        return { ok: true };
      } catch {
        const errorMsg = 'Gagal menghubungi server autentikasi.';
        pushToast('error', errorMsg);
        return { ok: false, error: errorMsg };
      } finally {
        setLoadingData(false);
      }
    },
    [hydrateAuthenticatedServerData, pushToast]
  );

  const changeOwnPassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const resp = await fetch('/api/auth/change-password', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          const errorMsg = data?.error || 'Gagal mengganti password.';
          pushToast('error', errorMsg);
          return { ok: false, error: errorMsg };
        }
        await recordLog('UBAH_PASSWORD', 'Keamanan Akun', `Mengubah password akun ${currentUser?.username || currentUser?.fullName}`);
        pushToast('success', 'Password akun berhasil diperbarui.');
        return { ok: true };
      } catch {
        const errorMsg = 'Gagal terhubung ke server.';
        pushToast('error', errorMsg);
        return { ok: false, error: errorMsg };
      }
    },
    [currentUser, pushToast, recordLog]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore
    }
    if (firebaseUser) {
      try {
        await signOut(auth);
      } catch {
        // Ignore
      }
    }
    setCurrentUser(null);
    setUsersDirectory([]);
    setPreviewRole(null);
    pushToast('info', 'Anda telah keluar dari portal SIMS.');
  }, [firebaseUser, pushToast]);

  // CRUD implementations (sync locally + server store, and Firestore when Firebase Auth user is present)
  const saveSchoolContent = useCallback(
    async (section: SchoolContentSection) => {
      const payload: SchoolContentSection = stripUndefined({
        ...section,
        updatedBy: currentUser?.fullName || 'Admin',
        updatedAt: new Date().toISOString(),
      });
      const next = upsertById(schoolContent, payload);
      setSchoolContent(next);
      await syncStateToServer({ schoolContent: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'school_content', section.sectionKey), payload);
      }
      await recordLog('PERBARUI_CMS', 'Profil Sekolah', `Memperbarui bagian ${section.title}`);
      pushToast('success', `Konten "${section.title}" berhasil disimpan.`);
    },
    [currentUser, firebaseUser, pushToast, recordLog, schoolContent, syncStateToServer]
  );

  const saveAnnouncement = useCallback(
    async (item: AnnouncementItem) => {
      const id = item.id || makeId('ann');
      const payload = stripUndefined({ ...item, id });
      const next = upsertById(announcements, payload).sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt)
      );
      setAnnouncements(next);
      await syncStateToServer({ announcements: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'announcements', id), payload);
      }
      await recordLog('PUBLIKASI_PENGUMUMAN', 'Profil Sekolah', `Menyimpan ${item.category}: ${item.title}`);
      pushToast('success', `${item.category} berhasil dipublikasikan.`);
    },
    [announcements, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const deleteAnnouncement = useCallback(
    async (id: string) => {
      const next = announcements.filter((a) => a.id !== id);
      setAnnouncements(next);
      await syncStateToServer({ announcements: next });
      if (firebaseUser) {
        await deleteDoc(doc(db, 'announcements', id));
      }
      await recordLog('HAPUS_PENGUMUMAN', 'Profil Sekolah', `Menghapus pengumuman ID ${id}`);
      pushToast('info', 'Pengumuman dihapus.');
    },
    [announcements, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const saveCalendarEvent = useCallback(
    async (ev: CalendarEvent) => {
      const id = ev.id || makeId('cal');
      const payload = stripUndefined({ ...ev, id });
      const next = upsertById(calendarEvents, payload);
      setCalendarEvents(next);
      await syncStateToServer({ calendarEvents: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'calendar_events', id), payload);
      }
      await recordLog('SIMPAN_KALENDER', 'Kalender Akademik', `Menyimpan agenda: ${ev.title}`);
      pushToast('success', 'Agenda kalender akademik tersimpan.');
    },
    [calendarEvents, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const deleteCalendarEvent = useCallback(
    async (id: string) => {
      const next = calendarEvents.filter((c) => c.id !== id);
      setCalendarEvents(next);
      await syncStateToServer({ calendarEvents: next });
      if (firebaseUser) {
        await deleteDoc(doc(db, 'calendar_events', id));
      }
      pushToast('info', 'Agenda kalender dihapus.');
    },
    [calendarEvents, firebaseUser, pushToast, syncStateToServer]
  );

  const saveGalleryItem = useCallback(
    async (item: GalleryMediaItem) => {
      const id = item.id || makeId('gal');
      const payload = stripUndefined({ ...item, id });
      const next = upsertById(galleryItems, payload).sort((a, b) => b.date.localeCompare(a.date));
      setGalleryItems(next);
      await syncStateToServer({ galleryItems: next });
      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'gallery_items', id), payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `gallery_items/${id}`);
        }
      }
      await recordLog('KELOLA_FOTO', 'Foto & Galeri', `Memperbarui item galeri: ${item.title}`);
      pushToast('success', `Foto "${item.title}" berhasil disimpan.`);
    },
    [firebaseUser, galleryItems, pushToast, recordLog, syncStateToServer]
  );

  const deleteGalleryItem = useCallback(
    async (id: string) => {
      const next = galleryItems.filter((g) => g.id !== id);
      setGalleryItems(next);
      await syncStateToServer({ galleryItems: next });
      if (firebaseUser) {
        try {
          await deleteDoc(doc(db, 'gallery_items', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `gallery_items/${id}`);
        }
      }
      await recordLog('HAPUS_FOTO', 'Foto & Galeri', `Menghapus item galeri ID ${id}`);
      pushToast('info', 'Item galeri foto dihapus.');
    },
    [firebaseUser, galleryItems, pushToast, recordLog, syncStateToServer]
  );

  const updateOwnPhoto = useCallback(
    async (photoUrl: string) => {
      if (!currentUser) return;
      const updated: UserProfile = {
        ...currentUser,
        photoUrl,
        updatedAt: new Date().toISOString(),
      };
      try {
        const resp = await fetch('/api/auth/profile-photo', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setCurrentUser(data.user || updated);
          setUsersDirectory((prev) =>
            prev.map((u) => (u.uid === updated.uid ? data.user || updated : u))
          );
        } else {
          setCurrentUser(updated);
        }
        if (firebaseUser) {
          await setDoc(doc(db, 'users', firebaseUser.uid), stripUndefined(updated));
        }
        await recordLog('UBAH_FOTO_PROFIL', 'Profil Akun', `Mengubah foto profil ${currentUser.fullName}`);
        pushToast('success', 'Foto profil akun berhasil diperbarui.');
      } catch (err) {
        if (firebaseUser) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        } else {
          pushToast('error', 'Gagal memperbarui foto profil akun.');
        }
      }
    },
    [currentUser, firebaseUser, pushToast, recordLog]
  );

  const saveAcademicYear = useCallback(
    async (ay: AcademicYear) => {
      const id = ay.id || makeId('ay');
      const item = { ...ay, id };
      let next = upsertById(academicYears, item);
      if (ay.isActive) {
        next = next.map((y) => (y.id === id ? item : { ...y, isActive: false }));
      }
      setAcademicYears(next);
      await syncStateToServer({ academicYears: next });

      if (firebaseUser) {
        if (ay.isActive) {
          const batch = writeBatch(db);
          academicYears.forEach((y) => {
            if (y.id !== id && y.isActive) {
              batch.update(doc(db, 'academic_years', y.id), { isActive: false });
            }
          });
          batch.set(doc(db, 'academic_years', id), item);
          await batch.commit();
        } else {
          await setDoc(doc(db, 'academic_years', id), item);
        }
      }
      await recordLog('KELOLA_TAHUN_AJARAN', 'Akademik', `Memperbarui tahun pelajaran ${ay.name} (${ay.semester})`);
      pushToast('success', `Tahun Pelajaran ${ay.name} (${ay.semester}) disimpan.`);
    },
    [academicYears, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const saveClassRoom = useCallback(
    async (cls: ClassRoom) => {
      const id = cls.id || makeId('cls');
      const item = { ...cls, id };
      const next = upsertById(classes, item);
      setClasses(next);
      await syncStateToServer({ classes: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'classes', id), item);
      }
      await recordLog('KELOLA_KELAS', 'Akademik', `Menyimpan rombel ${cls.name} (Wali Kelas: ${cls.homeroomTeacherName})`);
      pushToast('success', `Kelas ${cls.name} berhasil disimpan.`);
    },
    [classes, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const saveSubject = useCallback(
    async (sub: Subject) => {
      const id = sub.id || makeId('sub');
      const item = { ...sub, id };
      const next = upsertById(subjects, item);
      setSubjects(next);
      await syncStateToServer({ subjects: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'subjects', id), item);
      }
      await recordLog('KELOLA_MAPEL', 'Akademik', `Menyimpan mata pelajaran ${sub.name}`);
      pushToast('success', `Mata pelajaran ${sub.name} berhasil disimpan.`);
    },
    [firebaseUser, pushToast, recordLog, subjects, syncStateToServer]
  );

  const saveTeacherStaff = useCallback(
    async (ts: TeacherStaff) => {
      const id = ts.id || makeId('gtk');
      const payload = stripUndefined({ ...ts, id });
      const next = upsertById(teachersStaff, payload);
      setTeachersStaff(next);
      await syncStateToServer({ teachersStaff: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'teachers_staff', id), payload);
      }
      await recordLog('KELOLA_GTK', 'Akademik', `Menyimpan data ${ts.type}: ${ts.fullName}`);
      pushToast('success', `Data ${ts.fullName} berhasil disimpan.`);
    },
    [firebaseUser, pushToast, recordLog, syncStateToServer, teachersStaff]
  );

  const deleteTeacherStaff = useCallback(
    async (id: string) => {
      const next = teachersStaff.filter((t) => t.id !== id);
      setTeachersStaff(next);
      await syncStateToServer({ teachersStaff: next });
      if (firebaseUser) {
        await deleteDoc(doc(db, 'teachers_staff', id));
      }
      pushToast('info', 'Data GTK dihapus.');
    },
    [firebaseUser, pushToast, syncStateToServer, teachersStaff]
  );

  const saveStudent = useCallback(
    async (st: Student) => {
      const id = st.id || makeId('std');
      const payload = stripUndefined({ ...st, id });
      const next = upsertById(students, payload);
      setStudents(next);
      await syncStateToServer({ students: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'students', id), payload);
      }
      await recordLog('KELOLA_SISWA', 'Akademik', `Menyimpan data siswa ${st.fullName} (${st.className})`);
      pushToast('success', `Data siswa ${st.fullName} berhasil disimpan.`);
    },
    [firebaseUser, pushToast, recordLog, students, syncStateToServer]
  );

  const deleteStudent = useCallback(
    async (id: string) => {
      const next = students.filter((s) => s.id !== id);
      setStudents(next);
      await syncStateToServer({ students: next });
      if (firebaseUser) {
        await deleteDoc(doc(db, 'students', id));
      }
      await recordLog('HAPUS_SISWA', 'Akademik', `Menghapus siswa ID ${id}`);
      pushToast('info', 'Data siswa dihapus.');
    },
    [firebaseUser, pushToast, recordLog, students, syncStateToServer]
  );

  const importStudentsBatch = useCallback(
    async (rows: Partial<Student>[]) => {
      const createdList: Student[] = [];
      const batch = firebaseUser ? writeBatch(db) : null;
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
        createdList.push(student);
        if (batch) batch.set(doc(db, 'students', id), student);
      });
      const next = [...createdList, ...students];
      setStudents(next);
      await syncStateToServer({ students: next });
      if (batch) await batch.commit();
      await recordLog('IMPOR_SISWA', 'Akademik', `Mengimpor ${createdList.length} data siswa dari Excel`);
      pushToast('success', `${createdList.length} data siswa berhasil diimpor ke database.`);
      return createdList.length;
    },
    [classes, firebaseUser, pushToast, recordLog, students, syncStateToServer]
  );

  const saveGrade = useCallback(
    async (gr: GradeRecord) => {
      const id = gr.id || makeId('grd');
      const payload = stripUndefined({ ...gr, id });
      const next = upsertById(grades, payload);
      setGrades(next);
      await syncStateToServer({ grades: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'grades', id), payload);
      }
      await recordLog('INPUT_NILAI', 'Akademik', `Menyimpan nilai ${gr.subjectName} untuk ${gr.studentName} (${gr.finalScore})`);
      pushToast('success', `Nilai ${gr.studentName} tersimpan.`);
    },
    [firebaseUser, grades, pushToast, recordLog, syncStateToServer]
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
      const batch = firebaseUser ? writeBatch(db) : null;
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
          recordedByUid: currentUser?.uid || firebaseUser?.uid || 'system',
          recordedByName: currentUser?.fullName || 'Guru',
          verifiedAt: now,
          ...(item.student.parentUid ? { parentUid: item.student.parentUid } : {}),
        };
        if (batch) batch.set(doc(db, 'attendance', attId), record);
        savedRecords.push({ record, student: item.student });
      }

      // Step 1: Commit verified attendance records atomically first!
      let nextAttendance = [...attendance];
      savedRecords.forEach(({ record }) => {
        nextAttendance = upsertById(nextAttendance, record);
      });
      setAttendance(nextAttendance);
      await syncStateToServer({ attendance: nextAttendance });
      if (batch) await batch.commit();

      let sentCount = 0;
      let nextNotifications = [...notifications];
      if (params.notifyParents) {
        for (const { record, student } of savedRecords) {
          const shouldNotify = params.notifyAllStatuses || record.status !== 'Hadir';
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
          nextNotifications = [notifDoc, ...nextNotifications];
          if (firebaseUser) {
            await setDoc(doc(db, 'attendance_notifications', notifId), notifDoc);
          }
          if (deliveryStatus === 'sent') sentCount += 1;
        }
        setNotifications(nextNotifications);
        await syncStateToServer({ notifications: nextNotifications });
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
    [attendance, currentUser, firebaseUser, notifications, pushToast, recordLog, syncStateToServer]
  );

  const createArchiveFolder = useCallback(
    async (folder: Omit<ArchiveFolder, 'id' | 'createdByUid'>) => {
      const id = makeId('fld');
      const docData: ArchiveFolder = {
        ...folder,
        id,
        createdByUid: currentUser?.uid || firebaseUser?.uid || 'system',
      };
      const next = [...archiveFolders, docData];
      setArchiveFolders(next);
      await syncStateToServer({ archiveFolders: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'archive_folders', id), docData);
      }
      await recordLog('BUAT_FOLDER_ARSIP', 'Arsip Digital', `Membuat folder "${folder.name}" di ${folder.rootCategory}`);
      pushToast('success', `Folder "${folder.name}" berhasil dibuat.`);
    },
    [archiveFolders, currentUser, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const uploadArchiveDocument = useCallback(
    async (docItem: Omit<DigitalArchive, 'id' | 'uploadedByUid' | 'uploadedByName'>) => {
      const id = makeId('arc');
      const fullDoc: DigitalArchive = {
        ...docItem,
        id,
        uploadedByUid: currentUser?.uid || firebaseUser?.uid || 'system',
        uploadedByName: currentUser?.fullName || 'Staf Sekolah',
      };
      const next = [fullDoc, ...archives];
      setArchives(next);
      await syncStateToServer({ archives: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'digital_archives', id), fullDoc);
      }
      await recordLog('UNGGAH_ARSIP', 'Arsip Digital', `Mengunggah dokumen "${docItem.title}" (${docItem.fileType})`);
      pushToast('success', `Dokumen "${docItem.title}" berhasil diarsipkan.`);
    },
    [archives, currentUser, firebaseUser, pushToast, recordLog, syncStateToServer]
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
      const next = upsertById(archives, updated);
      setArchives(next);
      await syncStateToServer({ archives: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'digital_archives', archive.id), updated);
      }
      await recordLog('REVISI_ARSIP', 'Arsip Digital', `Memperbarui "${archive.title}" ke versi v${nextVersion}`);
      pushToast('success', `Dokumen diperbarui ke versi v${nextVersion}.`);
    },
    [archives, currentUser, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const deleteArchiveDocument = useCallback(
    async (id: string, title: string) => {
      const next = archives.filter((a) => a.id !== id);
      setArchives(next);
      await syncStateToServer({ archives: next });
      if (firebaseUser) {
        await deleteDoc(doc(db, 'digital_archives', id));
      }
      await recordLog('HAPUS_ARSIP', 'Arsip Digital', `Menghapus dokumen "${title}"`);
      pushToast('info', `Dokumen "${title}" dihapus dari arsip.`);
    },
    [archives, firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const saveSupervision = useCallback(
    async (sup: SupervisionAssessment) => {
      const id = sup.id || makeId('sup');
      const payload = stripUndefined({ ...sup, id });
      const next = upsertById(supervisions, payload);
      setSupervisions(next);
      await syncStateToServer({ supervisions: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'supervisions', id), payload);
      }
      await recordLog(
        'SIMPAN_SUPERVISI',
        'Supervisi Digital',
        `Menyimpan penilaian ${sup.instrumentCode} untuk ${sup.assesseeName} (Nilai: ${sup.finalScore} · ${sup.predicate})`
      );
      pushToast('success', `Penilaian supervisi ${sup.instrumentCode} tersimpan.`);
    },
    [firebaseUser, pushToast, recordLog, supervisions, syncStateToServer]
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
      const updated: SupervisionAssessment = stripUndefined({
        ...sup,
        status: 'Disetujui',
        validatedByName: currentUser?.fullName || 'Kepala Sekolah',
        validatedAt: new Date().toISOString().slice(0, 10),
      });
      const next = upsertById(supervisions, updated);
      setSupervisions(next);
      await syncStateToServer({ supervisions: next });
      if (firebaseUser) {
        await setDoc(doc(db, 'supervisions', sup.id), updated);
      }
      await recordLog(
        'VALIDASI_SUPERVISI',
        'Supervisi Digital',
        `Menyetujui supervisi ${sup.instrumentCode} atas nama ${sup.assesseeName} (Nilai: ${sup.finalScore} · ${sup.predicate})`
      );
      pushToast('success', `Hasil supervisi ${sup.instrumentCode} resmi disetujui.`);
    },
    [currentUser, firebaseUser, pushToast, recordLog, supervisions, syncStateToServer]
  );

  const saveUserProfile = useCallback(
    async (user: SaveUserInput): Promise<boolean> => {
      try {
        const resp = await fetch('/api/auth/users', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id || undefined,
            username: user.username || '',
            password: user.password || undefined,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data?.user) {
          pushToast('error', data?.error || 'Gagal menyimpan akun pengguna.');
          return false;
        }
        const savedUser = data.user as UserProfile;
        setUsersDirectory((prev) => upsertById(prev, savedUser));
        if (currentUser?.uid === savedUser.uid) {
          setCurrentUser(savedUser);
        }
        if (firebaseUser) {
          await setDoc(doc(db, 'users', savedUser.id), stripUndefined(savedUser));
        }
        await recordLog(
          'KELOLA_AKUN',
          'RBAC & Akun',
          `Memperbarui akun @${savedUser.username || savedUser.fullName} sebagai ${savedUser.role}`
        );
        pushToast('success', `Akun ${savedUser.fullName} berhasil disimpan.`);
        return true;
      } catch {
        pushToast('error', 'Gagal menghubungi server manajemen akun.');
        return false;
      }
    },
    [currentUser, firebaseUser, pushToast, recordLog]
  );

  const updateRbacPermission = useCallback(
    (role: RoleCode, module: ModuleKey, action: PermissionAction) => {
      setCustomRbac((prev) => {
        const currentActions = prev[role]?.[module] || [];
        const exists = currentActions.includes(action);
        const nextActions = exists
          ? currentActions.filter((a) => a !== action)
          : [...currentActions, action];
        const nextRbac = {
          ...prev,
          [role]: {
            ...prev[role],
            [module]: nextActions,
          },
        };
        syncStateToServer({ customRbac: nextRbac });
        return nextRbac;
      });
      pushToast('info', `Hak akses ${role} pada modul ${module} diperbarui.`);
    },
    [pushToast, syncStateToServer]
  );

  const exportBackupJson = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      school: 'SMA Darul Ulum Kepohbaru',
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
    galleryItems,
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
        const patch: Record<string, unknown> = {};
        if (Array.isArray(data.schoolContent)) {
          setSchoolContent(data.schoolContent);
          patch.schoolContent = data.schoolContent;
        }
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
          patch.announcements = data.announcements;
        }
        if (Array.isArray(data.calendarEvents)) {
          setCalendarEvents(data.calendarEvents);
          patch.calendarEvents = data.calendarEvents;
        }
        if (Array.isArray(data.galleryItems)) {
          setGalleryItems(data.galleryItems);
          patch.galleryItems = data.galleryItems;
        }
        if (Array.isArray(data.academicYears)) {
          setAcademicYears(data.academicYears);
          patch.academicYears = data.academicYears;
        }
        if (Array.isArray(data.classes)) {
          setClasses(data.classes);
          patch.classes = data.classes;
        }
        if (Array.isArray(data.subjects)) {
          setSubjects(data.subjects);
          patch.subjects = data.subjects;
        }
        if (Array.isArray(data.teachersStaff)) {
          setTeachersStaff(data.teachersStaff);
          patch.teachersStaff = data.teachersStaff;
        }
        if (Array.isArray(data.students)) {
          setStudents(data.students);
          patch.students = data.students;
        }
        if (Array.isArray(data.grades)) {
          setGrades(data.grades);
          patch.grades = data.grades;
        }
        if (Array.isArray(data.archiveFolders)) {
          setArchiveFolders(data.archiveFolders);
          patch.archiveFolders = data.archiveFolders;
        }
        if (Array.isArray(data.archives)) {
          setArchives(data.archives);
          patch.archives = data.archives;
        }
        if (Array.isArray(data.supervisions)) {
          setSupervisions(data.supervisions);
          patch.supervisions = data.supervisions;
        }
        await syncStateToServer(patch);

        if (firebaseUser) {
          const batch = writeBatch(db);
          const restoreList = (colName: string, arr?: Array<{ id: string }>) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((item) => {
              if (item?.id) batch.set(doc(db, colName, item.id), stripUndefined(item));
            });
          };
          restoreList('school_content', data.schoolContent);
          restoreList('announcements', data.announcements);
          restoreList('calendar_events', data.calendarEvents);
          restoreList('gallery_items', data.galleryItems);
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
        }
        await recordLog('PEMULIHAN_DATA', 'Backup & Pemulihan', `Memulihkan database dari berkas ${file.name}`);
        pushToast('success', 'Pemulihan data dari berkas backup berhasil.');
      } catch {
        pushToast('error', 'Format berkas backup JSON tidak valid.');
      }
    },
    [firebaseUser, pushToast, recordLog, syncStateToServer]
  );

  const value: SimsContextValue = {
    authReady,
    firebaseUser,
    currentUser,
    activeRole,
    setPreviewRole,
    previewRole,
    can,
    loginWithCredentials,
    changeOwnPassword,
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
