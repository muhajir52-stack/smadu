import React, { useEffect, useState } from 'react';
import {
  Camera,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserCircle2,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import { SCHOOL_IMAGES } from '../data/seedData';
import { compressImageToDataUrl } from '../lib/imageUtils';
import { AnnouncementItem, GalleryMediaItem, TeacherStaff } from '../types/sims';

type PhotoTab = 'profil_saya' | 'website_utama' | 'galeri' | 'gtk_berita';

export const PhotoManagementModule: React.FC = () => {
  const {
    can,
    currentUser,
    schoolContent,
    galleryItems,
    teachersStaff,
    announcements,
    updateOwnPhoto,
    saveSchoolContent,
    saveGalleryItem,
    deleteGalleryItem,
    saveTeacherStaff,
    saveAnnouncement,
    pushToast,
  } = useSims();

  const canManageSchoolPhotos = can('profil_cms', 'edit') || can('profil_cms', 'create');
  const [tab, setTab] = useState<PhotoTab>(canManageSchoolPhotos ? 'website_utama' : 'profil_saya');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Own profile photo state
  const [ownPhotoUrl, setOwnPhotoUrl] = useState(currentUser?.photoUrl || '');

  // School identity photos
  const identitySection = schoolContent.find((s) => s.sectionKey === 'identity');
  const currentHeroUrl = String(identitySection?.metadata?.heroImageUrl || SCHOOL_IMAGES.campusHero);
  const currentPrincipalUrl = String(
    identitySection?.metadata?.principalImageUrl || SCHOOL_IMAGES.principal
  );

  const [heroInputUrl, setHeroInputUrl] = useState(currentHeroUrl);
  const [principalInputUrl, setPrincipalInputUrl] = useState(currentPrincipalUrl);

  useEffect(() => {
    setHeroInputUrl(currentHeroUrl);
  }, [currentHeroUrl]);

  useEffect(() => {
    setPrincipalInputUrl(currentPrincipalUrl);
  }, [currentPrincipalUrl]);

  // Gallery modal state
  const [galleryModal, setGalleryModal] = useState<Partial<GalleryMediaItem> | null>(null);

  const handleCompressAndSet = async (
    file: File,
    key: string,
    onDone: (dataUrl: string) => void | Promise<void>
  ) => {
    setUploadingKey(key);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      await onDone(dataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses foto.';
      pushToast('error', msg);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSaveIdentityPhoto = async (field: 'heroImageUrl' | 'principalImageUrl', url: string) => {
    if (!identitySection) return;
    await saveSchoolContent({
      ...identitySection,
      metadata: {
        ...(identitySection.metadata || {}),
        [field]: url,
      },
    });
  };

  const handleTeacherPhotoChange = async (person: TeacherStaff, file: File) => {
    await handleCompressAndSet(file, `gtk-${person.id}`, async (dataUrl) => {
      await saveTeacherStaff({ ...person, photoUrl: dataUrl });
    });
  };

  const handleAnnouncementPhotoChange = async (item: AnnouncementItem, file: File) => {
    await handleCompressAndSet(file, `ann-${item.id}`, async (dataUrl) => {
      await saveAnnouncement({ ...item, imageUrl: dataUrl });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto max-w-full">
          {canManageSchoolPhotos && (
            <>
              <button
                onClick={() => setTab('website_utama')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  tab === 'website_utama'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Foto Website & Kepala Sekolah
              </button>
              <button
                onClick={() => setTab('galeri')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  tab === 'galeri'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Galeri Foto Sekolah
              </button>
              <button
                onClick={() => setTab('gtk_berita')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                  tab === 'gtk_berita'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600'
                }`}
              >
                Foto Guru, Tendik & Berita
              </button>
            </>
          )}
          <button
            onClick={() => {
              setOwnPhotoUrl(currentUser?.photoUrl || '');
              setTab('profil_saya');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === 'profil_saya'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600'
            }`}
          >
            Foto Profil Akun Saya
          </button>
        </div>

        {canManageSchoolPhotos && tab === 'galeri' && (
          <button
            onClick={() =>
              setGalleryModal({
                title: '',
                mediaType: 'Foto',
                url: '',
                caption: '',
                date: new Date().toISOString().slice(0, 10),
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Foto Galeri
          </button>
        )}
      </div>

      {/* TAB 1: FOTO PROFIL AKUN SAYA */}
      {tab === 'profil_saya' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Ubah Foto Profil Akun
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unggah foto profil Anda sendiri untuk ditampilkan pada bilah atas portal SIMS.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {ownPhotoUrl || currentUser?.photoUrl ? (
                <img
                  src={ownPhotoUrl || currentUser?.photoUrl}
                  alt={currentUser?.fullName || 'Foto Profil'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle2 className="w-12 h-12 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-3 w-full text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingKey === 'own' ? 'Memproses...' : 'Pilih Foto dari Perangkat'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleCompressAndSet(f, 'own', (dataUrl) => setOwnPhotoUrl(dataUrl));
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>

                {(ownPhotoUrl || currentUser?.photoUrl) && (
                  <button
                    type="button"
                    onClick={async () => {
                      setOwnPhotoUrl('');
                      await updateOwnPhoto('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Foto
                  </button>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  Atau masukkan tautan URL foto
                </label>
                <input
                  type="text"
                  value={ownPhotoUrl}
                  onChange={(e) => setOwnPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="button"
                onClick={() => updateOwnPhoto(ownPhotoUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Foto Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FOTO WEBSITE UTAMA & KEPALA SEKOLAH */}
      {tab === 'website_utama' && canManageSchoolPhotos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hero Campus Photo */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-xs font-mono text-emerald-800">HALAMAN BERANDA PUBLIK</p>
              <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">
                Foto Utama Kampus Sekolah
              </h2>
              <p className="text-xs text-slate-500">
                Ditampilkan sebagai gambar utama (Hero) pada website profil SMA Darul Ulum Kepohbaru.
              </p>
            </div>

            <div className="h-52 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={heroInputUrl || currentHeroUrl}
                alt="Foto Utama Kampus"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingKey === 'hero' ? 'Memproses...' : 'Unggah Foto Baru'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleCompressAndSet(f, 'hero', (dataUrl) => setHeroInputUrl(dataUrl));
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    setHeroInputUrl(SCHOOL_IMAGES.campusHero);
                    await handleSaveIdentityPhoto('heroImageUrl', SCHOOL_IMAGES.campusHero);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
              </div>

              <input
                type="text"
                value={heroInputUrl}
                onChange={(e) => setHeroInputUrl(e.target.value)}
                placeholder="URL gambar atau data foto terunggah..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-[11px]"
              />

              <button
                type="button"
                onClick={() => handleSaveIdentityPhoto('heroImageUrl', heroInputUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Foto Utama
              </button>
            </div>
          </div>

          {/* Principal Portrait */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-xs font-mono text-emerald-800">SAMBUTAN KEPALA SEKOLAH</p>
              <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">
                Foto Potret Kepala Sekolah
              </h2>
              <p className="text-xs text-slate-500">
                Ditampilkan pada kartu sambutan Kepala Sekolah di halaman beranda website publik.
              </p>
            </div>

            <div className="flex items-center gap-5">
              <div className="w-36 h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <img
                  src={principalInputUrl || currentPrincipalUrl}
                  alt="Foto Kepala Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">
                  {String(identitySection?.metadata?.principalName || 'H. Ahmad Muhajir, S.Pd., M.Pd.')}
                </p>
                <p>Kepala SMA Darul Ulum Kepohbaru</p>
                <p className="text-slate-400">Rekomendasi rasio persegi (1:1).</p>
              </div>
            </div>

            <div className="space-y-3 text-xs pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingKey === 'principal' ? 'Memproses...' : 'Unggah Foto Baru'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleCompressAndSet(f, 'principal', (dataUrl) =>
                          setPrincipalInputUrl(dataUrl)
                        );
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    setPrincipalInputUrl(SCHOOL_IMAGES.principal);
                    await handleSaveIdentityPhoto('principalImageUrl', SCHOOL_IMAGES.principal);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default
                </button>
              </div>

              <input
                type="text"
                value={principalInputUrl}
                onChange={(e) => setPrincipalInputUrl(e.target.value)}
                placeholder="URL foto kepala sekolah..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-[11px]"
              />

              <button
                type="button"
                onClick={() => handleSaveIdentityPhoto('principalImageUrl', principalInputUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Foto Kepala Sekolah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GALERI FOTO SEKOLAH */}
      {tab === 'galeri' && canManageSchoolPhotos && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {item.mediaType} · {item.date}
                  </p>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600">{item.caption}</p>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => setGalleryModal(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Ubah Foto / Detail
                </button>
                <button
                  onClick={() => deleteGalleryItem(item.id)}
                  className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                  title="Hapus item galeri"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: FOTO GURU, TENDIK & BERITA */}
      {tab === 'gtk_berita' && canManageSchoolPhotos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Ubah Foto Guru & Tenaga Kependidikan
              </h2>
              <p className="text-xs text-slate-500">
                Foto ditampilkan pada Direktori Guru & Tendik di website profil sekolah.
              </p>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {teachersStaff.map((person) => (
                <div key={person.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {person.photoUrl ? (
                        <img
                          src={person.photoUrl}
                          alt={person.fullName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-display font-bold text-slate-500 text-xs">
                          {person.fullName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{person.fullName}</p>
                      <p className="text-slate-500 truncate">{person.position}</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingKey === `gtk-${person.id}` ? 'Menyimpan...' : 'Ganti Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleTeacherPhotoChange(person, f);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Ubah Foto Berita, Prestasi & Pengumuman
              </h2>
              <p className="text-xs text-slate-500">
                Perbarui gambar sampul artikel yang tampil di website publik.
              </p>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {announcements.map((ann) => (
                <div key={ann.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {ann.imageUrl ? (
                        <img
                          src={ann.imageUrl}
                          alt={ann.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{ann.title}</p>
                      <p className="text-slate-500 font-mono">
                        {ann.category} · {ann.publishedAt}
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingKey === `ann-${ann.id}` ? 'Menyimpan...' : 'Ganti Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAnnouncementPhotoChange(ann, f);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Gallery Photo */}
      {galleryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!galleryModal.url) {
                pushToast('error', 'Unggah foto atau masukkan tautan URL foto terlebih dahulu.');
                return;
              }
              await saveGalleryItem({
                id: galleryModal.id || '',
                title: galleryModal.title || '',
                mediaType: galleryModal.mediaType || 'Foto',
                url: galleryModal.url || '',
                caption: galleryModal.caption || '',
                date: galleryModal.date || new Date().toISOString().slice(0, 10),
              });
              setGalleryModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              {galleryModal.id ? 'Ubah Foto Galeri Sekolah' : 'Tambah Foto Galeri Sekolah'}
            </h3>

            {galleryModal.url && (
              <div className="h-44 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={galleryModal.url}
                  alt="Pratinjau foto"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {uploadingKey === 'gallery-modal' ? 'Memproses...' : 'Pilih Foto dari Perangkat'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleCompressAndSet(f, 'gallery-modal', (dataUrl) =>
                        setGalleryModal((prev) => (prev ? { ...prev, url: dataUrl } : prev))
                      );
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <input
              required
              placeholder="Judul Foto / Fasilitas"
              value={galleryModal.title || ''}
              onChange={(e) => setGalleryModal({ ...galleryModal, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <input
              placeholder="Atau URL Foto / Video"
              value={galleryModal.url || ''}
              onChange={(e) => setGalleryModal({ ...galleryModal, url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-[11px]"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={galleryModal.mediaType || 'Foto'}
                onChange={(e) =>
                  setGalleryModal({
                    ...galleryModal,
                    mediaType: e.target.value as 'Foto' | 'Video',
                  })
                }
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="Foto">Foto</option>
                <option value="Video">Video</option>
              </select>
              <input
                type="date"
                value={galleryModal.date || ''}
                onChange={(e) => setGalleryModal({ ...galleryModal, date: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Keterangan singkat..."
              value={galleryModal.caption || ''}
              onChange={(e) => setGalleryModal({ ...galleryModal, caption: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGalleryModal(null)}
                className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                Simpan Foto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
