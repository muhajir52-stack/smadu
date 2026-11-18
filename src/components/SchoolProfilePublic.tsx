import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useSims } from '../services/simsStore';
import { SCHOOL_IMAGES } from '../data/seedData';
import { AnnouncementItem } from '../types/sims';

interface Props {
  onEnterPortal: () => void;
}

type PublicTab = 'beranda' | 'profil' | 'akademik' | 'informasi' | 'kontak';

export const SchoolProfilePublic: React.FC<Props> = ({ onEnterPortal }) => {
  const {
    schoolContent,
    announcements,
    calendarEvents,
    galleryItems,
    teachersStaff,
    students,
    classes,
    subjects,
    firebaseUser,
    loginWithGoogle,
    pushToast,
  } = useSims();

  const [activeTab, setActiveTab] = useState<PublicTab>('beranda');
  const [newsFilter, setNewsFilter] = useState<'Semua' | 'Berita' | 'Pengumuman' | 'Prestasi' | 'PPDB'>('Semua');
  const [selectedArticle, setSelectedArticle] = useState<AnnouncementItem | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', subject: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  const getSection = (key: string) => schoolContent.find((s) => s.sectionKey === key);
  const identity = getSection('identity');
  const history = getSection('history');
  const vision = getSection('vision_mission');
  const org = getSection('org_structure');
  const academic = getSection('academic_info');
  const ppdb = getSection('ppdb_info');
  const contact = getSection('contact');

  const publicAnnouncements = useMemo(() => {
    const list = announcements.filter((a) => a.isPublished && a.audience === 'Publik');
    if (newsFilter === 'Semua') return list;
    return list.filter((a) => a.category === newsFilter);
  }, [announcements, newsFilter]);

  const activeStudentsCount = students.filter((s) => s.status === 'Aktif').length;
  const teachersCount = teachersStaff.filter((t) => t.type === 'Guru').length;
  const tendikCount = teachersStaff.filter((t) => t.type === 'Tendik').length;

  const handlePortalAction = async () => {
    if (firebaseUser) {
      onEnterPortal();
    } else {
      await loginWithGoogle();
      onEnterPortal();
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.message.trim()) {
      pushToast('error', 'Mohon lengkapi nama dan pesan Anda.');
      return;
    }
    setContactSent(true);
    pushToast('success', 'Pesan layanan informasi Anda telah dicatat oleh sekretariat sekolah.');
    setContactForm({ name: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            onClick={() => {
              setActiveTab('beranda');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-left font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SMA Darul Ulum Kepohbaru
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {(
              [
                ['beranda', 'Beranda'],
                ['profil', 'Profil & GTK'],
                ['akademik', 'Akademik'],
                ['informasi', 'Berita & PPDB'],
                ['kontak', 'Kontak'],
              ] as Array<[PublicTab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors border-b-2 ${
                  activeTab === key
                    ? 'text-emerald-800 border-emerald-700 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handlePortalAction}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              {firebaseUser ? 'Buka Dashboard SIMS' : 'Masuk SIMS'}
            </button>
          </div>
        </div>

        {/* Mobile Secondary Nav */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
          {(
            [
              ['beranda', 'Beranda'],
              ['profil', 'Profil & GTK'],
              ['akademik', 'Akademik'],
              ['informasi', 'Berita & PPDB'],
              ['kontak', 'Kontak'],
            ] as Array<[PublicTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap shrink-0 px-2 py-1 rounded ${
                activeTab === key ? 'bg-emerald-50 text-emerald-800 font-semibold' : ''
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1">
        {activeTab === 'beranda' && (
          <>
            {/* Hero Section */}
            <section className="bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center">
                  <p className="text-xs font-medium text-emerald-800 mb-3">
                    Kepohbaru, Bojonegoro, Jawa Timur · NPSN {String(identity?.metadata?.npsn || '20541289')} · Akreditasi {String(identity?.metadata?.accreditation || 'A (Unggul)')}
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] [text-wrap:balance] mb-5">
                    Pendidikan Islam Modern yang Berprestasi dan Terintegrasi Digital
                  </h1>
                  <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                    {identity?.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      onClick={handlePortalAction}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
                    >
                      {firebaseUser ? 'Masuk Ruang Kerja SIMS' : 'Masuk Portal SIMS'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab('informasi')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      Informasi PPDB 2026/2027
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                    <img
                      src={String(identity?.metadata?.heroImageUrl || SCHOOL_IMAGES.campusHero)}
                      alt="Kampus SMA Darul Ulum Kepohbaru Bojonegoro"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent p-6 text-white">
                      <p className="text-xs font-medium text-emerald-200 mb-1">
                        Lingkungan Belajar Asri & Terpadu
                      </p>
                      <p className="text-sm font-semibold">
                        Kampus Terpadu SMA Darul Ulum Kepohbaru — Bojonegoro
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-Width 4-Column Institutional Metrics Strip */}
              <div className="max-w-7xl mx-auto px-6 pb-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl bg-slate-50 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                  <div className="p-5">
                    <p className="text-xs text-slate-500 mb-1">Peserta Didik Aktif</p>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {activeStudentsCount} <span className="text-xs font-sans font-normal text-slate-500">Siswa Terdaftar</span>
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-slate-500 mb-1">Pendidik & Tenaga Kependidikan</p>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {teachersCount + tendikCount} <span className="text-xs font-sans font-normal text-slate-500">{teachersCount} Guru · {tendikCount} Tendik</span>
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-slate-500 mb-1">Rombongan Belajar</p>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {classes.length} <span className="text-xs font-sans font-normal text-slate-500">Kelas X, XI, XII</span>
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-slate-500 mb-1">Tahun Pelajaran Aktif</p>
                    <p className="font-mono text-2xl font-bold text-emerald-800 tabular-nums">
                      2026/2027 <span className="text-xs font-sans font-normal text-slate-500">Semester Ganjil</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sambutan Kepala Sekolah & Visi Misi */}
            <section className="max-w-7xl mx-auto px-6 py-14">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <img
                      src={String(identity?.metadata?.principalImageUrl || SCHOOL_IMAGES.principal)}
                      alt="Kepala SMA Darul Ulum Kepohbaru"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-medium text-emerald-800">Sambutan Kepala Sekolah</p>
                      <h2 className="font-display text-lg font-bold text-slate-900">
                        {String(identity?.metadata?.principalName || 'H. Ahmad Muhajir, S.Pd., M.Pd.')}
                      </h2>
                      <p className="text-xs text-slate-500">Kepala SMA Darul Ulum Kepohbaru</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Assalamu’alaikum Warahmatullahi Wabarakatuh. Kehadiran Sistem Informasi Manajemen Sekolah (SIMS) terintegrasi merupakan komitmen kami dalam menghadirkan layanan akademik yang transparan, pemantauan kehadiran real-time bagi orang tua, serta penjaminan mutu supervisi pembelajaran yang akuntabel.
                  </p>
                  <button
                    onClick={() => setActiveTab('profil')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Pelajari Profil & Struktur Organisasi
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Arah Mutu Institusi</p>
                  <h2 className="font-display text-xl font-bold text-slate-900 mb-3">
                    {vision?.title}
                  </h2>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed mb-5 pb-4 border-b border-slate-100">
                    {vision?.body}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Misi Sekolah</h3>
                      <ol className="space-y-2 text-xs text-slate-600 leading-relaxed list-decimal list-inside">
                        {((vision?.metadata?.missions as string[]) || []).map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 mb-2.5">Tujuan Strategis</h3>
                      <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                        {((vision?.metadata?.goals as string[]) || []).map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Berita, Prestasi & Agenda Terkini */}
            <section className="bg-white border-y border-slate-200 py-14">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="text-xs font-medium text-emerald-800 mb-1">Informasi & Prestasi Terkini</p>
                    <h2 className="font-display text-2xl font-bold text-slate-900">
                      Berita, Pengumuman, dan Kalender Akademik
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('informasi')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                  >
                    Lihat Semua Informasi
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {publicAnnouncements.slice(0, 4).map((item) => (
                      <article
                        key={item.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 flex flex-col justify-between"
                      >
                        {item.imageUrl && (
                          <div className="h-40 bg-slate-100 overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-2">
                              {item.category} · <span className="font-mono tabular-nums">{item.publishedAt}</span>
                            </p>
                            <h3 className="font-display text-base font-bold text-slate-900 mb-2 leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed mb-4">
                              {item.summary}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedArticle(item)}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 text-left inline-flex items-center gap-1"
                          >
                            Baca Selengkapnya
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="lg:col-span-4 border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-4 h-4 text-emerald-700" />
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Kalender Akademik
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {calendarEvents.map((ev) => (
                        <div key={ev.id} className="py-3 first:pt-0 last:pb-0">
                          <p className="text-xs font-mono text-emerald-800 tabular-nums mb-0.5">
                            {ev.eventDate}{ev.endDate ? ` s.d. ${ev.endDate}` : ''} · {ev.category}
                          </p>
                          <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{ev.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Galeri Foto & Fasilitas */}
            <section className="max-w-7xl mx-auto px-6 py-14">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-medium text-emerald-800 mb-1">Dokumentasi Lingkungan Sekolah</p>
                  <h2 className="font-display text-2xl font-bold text-slate-900">Galeri Kegiatan & Fasilitas</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {galleryItems.map((gal) => (
                  <div key={gal.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="h-48 bg-slate-100">
                      <img
                        src={gal.url}
                        alt={gal.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-slate-500 font-mono tabular-nums mb-1">
                        {gal.mediaType} · {gal.date}
                      </p>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">{gal.title}</h3>
                      <p className="text-xs text-slate-600">{gal.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'profil' && (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                <p className="text-xs font-medium text-emerald-800 mb-1">Sejarah & Identitas</p>
                <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">{history?.title}</h1>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{history?.body}</p>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <p className="text-slate-500">Tahun Berdiri</p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">{String(history?.metadata?.foundedYear || '1998')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{String(history?.metadata?.status || 'Terakreditasi A')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Naungan</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{String(history?.metadata?.foundation || 'Yayasan Darul Ulum')}</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                <p className="text-xs font-medium text-emerald-800 mb-1">Kepemimpinan</p>
                <h2 className="font-display text-xl font-bold text-slate-900 mb-4">{org?.title}</h2>
                <ul className="divide-y divide-slate-100 text-sm">
                  {((org?.metadata?.roles as string[]) || []).map((r, i) => (
                    <li key={i} className="py-2.5 text-slate-700">{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Direktori Guru & Tendik */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Direktori Guru & Tenaga Kependidikan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Total {teachersCount} Pendidik dan {tendikCount} Tenaga Kependidikan aktif
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-3 font-medium">Nama Lengkap</th>
                      <th className="py-2.5 px-3 font-medium">Kategori</th>
                      <th className="py-2.5 px-3 font-medium">Jabatan / Tugas</th>
                      <th className="py-2.5 px-3 font-medium">Bidang / Mapel</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachersStaff.map((person) => (
                      <tr key={person.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            {person.photoUrl ? (
                              <img
                                src={person.photoUrl}
                                alt={person.fullName}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">
                                {person.fullName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span>{person.fullName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{person.type}</td>
                        <td className="py-2.5 px-3 text-slate-600">{person.position}</td>
                        <td className="py-2.5 px-3 text-slate-600">{person.subjectSpecialty}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{person.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'akademik' && (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-medium text-emerald-800 mb-1">Informasi Kurikulum & Rombel</p>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">{academic?.title}</h1>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">{academic?.body}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {((academic?.metadata?.programs as string[]) || []).map((prog, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-lg bg-slate-50/60 flex items-start gap-3">
                    <BookOpen className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-800 font-medium">{prog}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-display text-lg font-bold text-slate-900">Struktur Mata Pelajaran</h2>
                </div>
                <div className="divide-y divide-slate-100 text-sm">
                  {subjects.map((sub) => (
                    <div key={sub.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{sub.name}</p>
                        <p className="text-xs text-slate-500">{sub.category} · Pengampu: {sub.teacherName}</p>
                      </div>
                      <span className="font-mono text-xs text-slate-600 tabular-nums shrink-0">KKM {sub.kkm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-display text-lg font-bold text-slate-900">Rekapitulasi Data Siswa & Rombel</h2>
                </div>
                <div className="divide-y divide-slate-100 text-sm">
                  {classes.map((cls) => {
                    const count = students.filter((s) => s.className === cls.name && s.status === 'Aktif').length;
                    return (
                      <div key={cls.id} className="py-2.5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">Kelas {cls.name} (Tingkat {cls.gradeLevel})</p>
                          <p className="text-xs text-slate-500">Wali Kelas: {cls.homeroomTeacherName}</p>
                        </div>
                        <span className="font-mono text-xs text-emerald-800 tabular-nums shrink-0">
                          {count} / {cls.capacity} Siswa
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'informasi' && (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
            {/* PPDB Highlight */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Penerimaan Peserta Didik Baru</p>
                  <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">{ppdb?.title}</h1>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{ppdb?.body}</p>
                  <div className="space-y-2 text-xs text-slate-700">
                    <p><strong className="text-slate-900">Gelombang I:</strong> {String(ppdb?.metadata?.wave1 || '-')}</p>
                    <p><strong className="text-slate-900">Gelombang II:</strong> {String(ppdb?.metadata?.wave2 || '-')}</p>
                    <p><strong className="text-slate-900">Persyaratan:</strong> {String(ppdb?.metadata?.requirements || '-')}</p>
                  </div>
                </div>
                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 text-emerald-800 mb-2">
                    <Award className="w-5 h-5" />
                    <h2 className="font-display text-base font-bold text-slate-900">Prestasi & Beasiswa</h2>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Calon peserta didik baru berprestasi tingkat kabupaten/provinsi serta penghafal Al-Qur’an minimal 3 juz memperoleh prioritas beasiswa pendidikan penuh.
                  </p>
                  <button
                    onClick={() => setActiveTab('kontak')}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
                  >
                    Hubungi Panitia PPDB
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Articles */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Berita, Pengumuman & Prestasi
                </h2>
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                  {(['Semua', 'Berita', 'Pengumuman', 'Prestasi', 'PPDB'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewsFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        newsFilter === cat
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicAnnouncements.map((item) => (
                  <article key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-2">
                        {item.category} · <span className="font-mono tabular-nums">{item.publishedAt}</span>
                      </p>
                      <h3 className="font-display text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">{item.summary}</p>
                    </div>
                    <button
                      onClick={() => setSelectedArticle(item)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 text-left"
                    >
                      Baca Detail →
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kontak' && (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div>
                  <p className="text-xs font-medium text-emerald-800 mb-1">Layanan Informasi</p>
                  <h1 className="font-display text-2xl font-bold text-slate-900">{contact?.title}</h1>
                  <p className="text-xs text-slate-500 mt-1">{contact?.subtitle}</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{contact?.body}</p>
                <div className="space-y-3 pt-4 border-t border-slate-100 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-emerald-700 mt-1 shrink-0" />
                    <span>{String(contact?.metadata?.address || '')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-700 mt-1 shrink-0" />
                    <span className="font-mono text-xs">{String(contact?.metadata?.phone || '')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-emerald-700 mt-1 shrink-0" />
                    <span>{String(contact?.metadata?.email || '')}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
                  Kirim Pesan atau Pertanyaan Layanan Sekolah
                </h2>
                {contactSent ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
                    Terima kasih. Pesan Anda telah diterima oleh staf tata usaha SMA Darul Ulum Kepohbaru.
                    <button
                      onClick={() => setContactSent(false)}
                      className="block mt-3 text-xs font-semibold text-emerald-800 underline"
                    >
                      Kirim pesan lain
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Nama Anda"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Nomor WhatsApp</label>
                        <input
                          type="text"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="0812..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Perihal</label>
                      <input
                        type="text"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        placeholder="Informasi PPDB / Administrasi Siswa / Lainnya"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Pesan</label>
                      <textarea
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Tuliskan pertanyaan atau keperluan Anda..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
                    >
                      Kirim Pesan
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <p className="text-xs text-slate-500 mb-2">
              {selectedArticle.category} · <span className="font-mono tabular-nums">{selectedArticle.publishedAt}</span> · {selectedArticle.authorName}
            </p>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-4">{selectedArticle.title}</h2>
            {selectedArticle.imageUrl && (
              <div className="h-56 rounded-lg overflow-hidden border border-slate-200 mb-4 bg-slate-100 flex items-center justify-center">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-6">
              {selectedArticle.content}
            </p>
            <button
              onClick={() => setSelectedArticle(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Quiet Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-800">
              SMA Darul Ulum Kepohbaru — Kabupaten Bojonegoro, Jawa Timur
            </p>
            <p className="mt-0.5">
              Sistem Informasi Manajemen Sekolah Terintegrasi (SIMS)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Portal Terpadu Akademik, Absensi, Arsip & Supervisi
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
