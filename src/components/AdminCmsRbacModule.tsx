import React, { useEffect, useState } from 'react';
import {
  Camera,
  Database,
  Download,
  Plus,
  Save,
  Shield,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import { compressImageToDataUrl } from '../lib/imageUtils';
import { MODULE_LABELS, ROLE_DEFINITIONS } from '../data/rbacMatrix';
import {
  AnnouncementItem,
  CalendarEvent,
  ModuleKey,
  PermissionAction,
  RoleCode,
  SchoolContentSection,
  UserProfile,
} from '../types/sims';

export const CmsManagementView: React.FC = () => {
  const {
    can,
    schoolContent,
    announcements,
    calendarEvents,
    saveSchoolContent,
    saveAnnouncement,
    deleteAnnouncement,
    saveCalendarEvent,
    deleteCalendarEvent,
    currentUser,
    firebaseUser,
    pushToast,
  } = useSims();

  const canEdit = can('profil_cms', 'edit') || can('profil_cms', 'create');
  const [cmsTab, setCmsTab] = useState<'profil' | 'berita' | 'kalender'>('profil');
  const [editingSection, setEditingSection] = useState<SchoolContentSection | null>(
    schoolContent[0] || null
  );
  const [annModal, setAnnModal] = useState<Partial<AnnouncementItem> | null>(null);
  const [calModal, setCalModal] = useState<Partial<CalendarEvent> | null>(null);

  useEffect(() => {
    if (!editingSection && schoolContent.length > 0) {
      setEditingSection({ ...schoolContent[0] });
    }
  }, [schoolContent, editingSection]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        <button
          onClick={() => setCmsTab('profil')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
            cmsTab === 'profil' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
          }`}
        >
          Konten Profil Sekolah
        </button>
        <button
          onClick={() => setCmsTab('berita')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
            cmsTab === 'berita' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
          }`}
        >
          Berita, Pengumuman & Prestasi
        </button>
        <button
          onClick={() => setCmsTab('kalender')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
            cmsTab === 'kalender' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600'
          }`}
        >
          Kalender Akademik
        </button>
      </div>

      {cmsTab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <h2 className="font-display text-sm font-bold text-slate-900 px-2 pb-2 border-b border-slate-100 mb-2">
              Bagian Halaman Profil Publik
            </h2>
            {schoolContent.map((sec) => (
              <button
                key={sec.sectionKey}
                onClick={() => setEditingSection({ ...sec })}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  editingSection?.sectionKey === sec.sectionKey
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
            {editingSection && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveSchoolContent(editingSection);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <p className="text-[11px] font-mono text-emerald-800">
                    BAGIAN CMS: {editingSection.sectionKey}
                  </p>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                    Kelola Konten Publik Tanpa Mengubah Kode
                  </h3>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Judul Bagian</label>
                  <input
                    disabled={!canEdit}
                    value={editingSection.title}
                    onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subjudul</label>
                  <input
                    disabled={!canEdit}
                    value={editingSection.subtitle || ''}
                    onChange={(e) => setEditingSection({ ...editingSection, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Isi / Narasi Utama</label>
                  <textarea
                    rows={5}
                    disabled={!canEdit}
                    value={editingSection.body}
                    onChange={(e) => setEditingSection({ ...editingSection, body: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg leading-relaxed"
                  />
                </div>
                {editingSection.sectionKey === 'contact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-slate-700 mb-1">Alamat Sekolah</label>
                      <input
                        disabled={!canEdit}
                        value={String(editingSection.metadata?.address || '')}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            metadata: { ...editingSection.metadata, address: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Nomor Telepon</label>
                      <input
                        disabled={!canEdit}
                        value={String(editingSection.metadata?.phone || '')}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            metadata: { ...editingSection.metadata, phone: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Email Resmi</label>
                      <input
                        disabled={!canEdit}
                        value={String(editingSection.metadata?.email || '')}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            metadata: { ...editingSection.metadata, email: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                {editingSection.sectionKey === 'ppdb_info' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Jadwal Gelombang I</label>
                      <input
                        disabled={!canEdit}
                        value={String(editingSection.metadata?.wave1 || '')}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            metadata: { ...editingSection.metadata, wave1: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Jadwal Gelombang II</label>
                      <input
                        disabled={!canEdit}
                        value={String(editingSection.metadata?.wave2 || '')}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            metadata: { ...editingSection.metadata, wave2: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Persyaratan Pendaftaran</label>
                      <input
                        disabled={!canEdit}
                        value={String(editingSection.metadata?.requirements || '')}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            metadata: { ...editingSection.metadata, requirements: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                {editingSection.sectionKey === 'org_structure' && (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block font-medium text-slate-700 mb-1">
                      Daftar Struktur Pimpinan (satu baris per jabatan)
                    </label>
                    <textarea
                      rows={5}
                      disabled={!canEdit}
                      value={((editingSection.metadata?.roles as string[]) || []).join('\n')}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          metadata: {
                            ...editingSection.metadata,
                            roles: e.target.value.split('\n').filter((x) => x.trim().length > 0),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
                {canEdit && (
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan ke Website Publik
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {cmsTab === 'berita' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">
              Daftar Berita, Pengumuman, Prestasi & PPDB
            </h2>
            {canEdit && (
              <button
                onClick={() =>
                  setAnnModal({
                    category: 'Pengumuman',
                    audience: 'Publik',
                    isPublished: true,
                    publishedAt: new Date().toISOString().slice(0, 10),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Publikasi
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {announcements.map((a) => (
              <div key={a.id} className="py-3.5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-slate-500 tabular-nums">
                    {a.category} · {a.audience} · {a.publishedAt}
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{a.title}</p>
                  <p className="text-slate-600 mt-0.5">{a.summary}</p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setAnnModal(a)} className="text-emerald-700 font-semibold hover:underline">
                      Ubah
                    </button>
                    <button onClick={() => deleteAnnouncement(a.id)} className="text-red-700 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {cmsTab === 'kalender' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">Agenda Kalender Akademik</h2>
            {canEdit && (
              <button
                onClick={() =>
                  setCalModal({
                    category: 'Akademik',
                    eventDate: new Date().toISOString().slice(0, 10),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Agenda
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {calendarEvents.map((ev) => (
              <div key={ev.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-emerald-800 tabular-nums">{ev.eventDate} · {ev.category}</p>
                  <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                  <p className="text-slate-600">{ev.description}</p>
                </div>
                {canEdit && (
                  <button onClick={() => deleteCalendarEvent(ev.id)} className="text-red-700 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {annModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveAnnouncement({
                id: annModal.id || '',
                title: annModal.title || '',
                category: annModal.category || 'Pengumuman',
                summary: annModal.summary || '',
                content: annModal.content || annModal.summary || '',
                audience: annModal.audience || 'Publik',
                publishedAt: annModal.publishedAt || new Date().toISOString().slice(0, 10),
                isPublished: annModal.isPublished ?? true,
                authorUid: firebaseUser?.uid || 'system',
                authorName: currentUser?.fullName || 'Administrator',
                ...(annModal.imageUrl ? { imageUrl: annModal.imageUrl } : {}),
              });
              setAnnModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Publikasi Konten Sekolah</h3>
            <input required placeholder="Judul Berita / Pengumuman / Prestasi" value={annModal.title || ''} onChange={(e) => setAnnModal({ ...annModal, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <div className="grid grid-cols-3 gap-3">
              <select value={annModal.category || 'Pengumuman'} onChange={(e) => setAnnModal({ ...annModal, category: e.target.value as AnnouncementItem['category'] })} className="px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <option value="Berita">Berita</option>
                <option value="Pengumuman">Pengumuman</option>
                <option value="Prestasi">Prestasi</option>
                <option value="PPDB">PPDB</option>
              </select>
              <select value={annModal.audience || 'Publik'} onChange={(e) => setAnnModal({ ...annModal, audience: e.target.value as AnnouncementItem['audience'] })} className="px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <option value="Publik">Publik</option>
                <option value="Internal">Internal</option>
                <option value="Orang Tua">Orang Tua</option>
              </select>
              <input type="date" value={annModal.publishedAt || ''} onChange={(e) => setAnnModal({ ...annModal, publishedAt: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-700">Foto Sampul (Opsional)</label>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  Unggah Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        try {
                          const dataUrl = await compressImageToDataUrl(f);
                          setAnnModal((prev) => (prev ? { ...prev, imageUrl: dataUrl } : prev));
                        } catch (err) {
                          pushToast('error', err instanceof Error ? err.message : 'Gagal memuat foto.');
                        }
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              {annModal.imageUrl && (
                <img
                  src={annModal.imageUrl}
                  alt="Pratinjau foto berita"
                  referrerPolicy="no-referrer"
                  className="h-32 w-full object-cover rounded-lg border border-slate-200"
                />
              )}
              <input
                placeholder="URL Foto (opsional)"
                value={annModal.imageUrl || ''}
                onChange={(e) => setAnnModal({ ...annModal, imageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-[11px]"
              />
            </div>
            <input required placeholder="Ringkasan singkat" value={annModal.summary || ''} onChange={(e) => setAnnModal({ ...annModal, summary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <textarea rows={4} required placeholder="Isi lengkap konten..." value={annModal.content || ''} onChange={(e) => setAnnModal({ ...annModal, content: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAnnModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan & Publikasikan</button>
            </div>
          </form>
        </div>
      )}

      {calModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveCalendarEvent({
                id: calModal.id || '',
                title: calModal.title || '',
                eventDate: calModal.eventDate || new Date().toISOString().slice(0, 10),
                category: calModal.category || 'Akademik',
                description: calModal.description || '',
              });
              setCalModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Tambah Agenda Kalender Akademik</h3>
            <input required placeholder="Nama Kegiatan" value={calModal.title || ''} onChange={(e) => setCalModal({ ...calModal, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={calModal.eventDate || ''} onChange={(e) => setCalModal({ ...calModal, eventDate: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              <select value={calModal.category || 'Akademik'} onChange={(e) => setCalModal({ ...calModal, category: e.target.value as CalendarEvent['category'] })} className="px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <option value="Akademik">Akademik</option>
                <option value="Ujian">Ujian</option>
                <option value="Kegiatan">Kegiatan</option>
                <option value="Libur">Libur</option>
              </select>
            </div>
            <textarea rows={3} placeholder="Keterangan kegiatan..." value={calModal.description || ''} onChange={(e) => setCalModal({ ...calModal, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCalModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan Agenda</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const UsersRbacView: React.FC = () => {
  const {
    can,
    usersDirectory,
    customRbac,
    saveUserProfile,
    updateRbacPermission,
  } = useSims();

  const canManage = can('pengguna_rbac', 'edit');
  const [userModal, setUserModal] = useState<Partial<UserProfile> | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Manajemen Multi-Akun Pengguna SIMS
            </h2>
            <p className="text-xs text-slate-500">
              Atur akun guru, staf administrasi, kepala sekolah, supervisor, wali kelas, dan orang tua
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setUserModal({ role: 'guru', isActive: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Daftarkan Akun
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-medium">Nama Lengkap</th>
                <th className="py-2.5 px-3 font-medium">Email Akun</th>
                <th className="py-2.5 px-3 font-medium">Peran RBAC</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                {canManage && <th className="py-2.5 px-3 font-medium text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersDirectory.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{u.fullName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                  <td className="py-2.5 px-3 font-medium text-emerald-800">
                    {ROLE_DEFINITIONS[u.role]?.label || u.role}
                  </td>
                  <td className="py-2.5 px-3">{u.isActive ? 'Aktif' : 'Nonaktif'}</td>
                  {canManage && (
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setUserModal(u)}
                        className="text-emerald-700 font-semibold hover:underline"
                      >
                        Ubah Peran
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive 7-Role RBAC Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700" />
          <h2 className="font-display text-base font-bold text-slate-900">
            Matriks Hak Akses Pengguna (Role-Based Access Control)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-medium">Modul Sistem</th>
                {Object.values(ROLE_DEFINITIONS).map((r) => (
                  <th key={r.code} className="py-2.5 px-2 font-medium text-center">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((mod) => (
                <tr key={mod} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{MODULE_LABELS[mod]}</td>
                  {(Object.keys(ROLE_DEFINITIONS) as RoleCode[]).map((roleCode) => {
                    const perms = customRbac[roleCode]?.[mod] || [];
                    return (
                      <td key={roleCode} className="py-2 px-2 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {(['view', 'create', 'edit', 'approve', 'export'] as PermissionAction[]).map(
                            (act) => {
                              const active = perms.includes(act);
                              return (
                                <button
                                  key={act}
                                  type="button"
                                  disabled={!canManage || roleCode === 'super_admin'}
                                  onClick={() => updateRbacPermission(roleCode, mod, act)}
                                  title={`${ROLE_DEFINITIONS[roleCode].label}: ${act}`}
                                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                                    active
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {act[0].toUpperCase()}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">
          Keterangan Tombol: V = View/Baca · C = Create/Tambah · E = Edit/Ubah · A = Approve/Validasi · E(kanan) = Export PDF/Excel.
        </p>
      </div>

      {userModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveUserProfile({
                id: userModal.id || '',
                uid: userModal.uid || userModal.id || '',
                email: userModal.email || '',
                fullName: userModal.fullName || '',
                role: userModal.role || 'guru',
                isActive: userModal.isActive ?? true,
                createdAt: userModal.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setUserModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">Kelola Akun & Peran Pengguna</h3>
            <input required placeholder="Nama Lengkap" value={userModal.fullName || ''} onChange={(e) => setUserModal({ ...userModal, fullName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <input required type="email" placeholder="Alamat Email Google" value={userModal.email || ''} onChange={(e) => setUserModal({ ...userModal, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
            <select value={userModal.role || 'guru'} onChange={(e) => setUserModal({ ...userModal, role: e.target.value as RoleCode })} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white">
              {Object.values(ROLE_DEFINITIONS).map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={userModal.isActive ?? true} onChange={(e) => setUserModal({ ...userModal, isActive: e.target.checked })} />
              <span>Akun Aktif</span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setUserModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan Akun</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AuditBackupView: React.FC = () => {
  const { activityLogs, exportBackupJson, restoreBackupJson, can } = useSims();
  const canRestore = can('audit_backup', 'create');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Cadangan (Backup) & Pemulihan Basis Data SIMS
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unduh seluruh data akademik, absensi, arsip digital, CMS profil sekolah, dan hasil supervisi dalam format JSON terstruktur.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportBackupJson}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Backup Lengkap
          </button>
          {canRestore && (
            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Pulihkan dari JSON
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) restoreBackupJson(f);
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-slate-900">
          Jejak Audit Aktivitas Pengguna (Audit Trail)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-medium">Waktu</th>
                <th className="py-2.5 px-3 font-medium">Pengguna</th>
                <th className="py-2.5 px-3 font-medium">Peran</th>
                <th className="py-2.5 px-3 font-medium">Modul</th>
                <th className="py-2.5 px-3 font-medium">Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {log.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{log.actorName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{log.actorRole}</td>
                  <td className="py-2.5 px-3 text-slate-700">{log.module}</td>
                  <td className="py-2.5 px-3 text-slate-700">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
