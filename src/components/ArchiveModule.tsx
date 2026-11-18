import React, { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  FilePlus,
  Folder,
  FolderPlus,
  History,
  Lock,
  Search,
  Trash2,
} from 'lucide-react';
import { ARCHIVE_ROOT_CATEGORIES, useSims } from '../services/simsStore';
import { ROLE_DEFINITIONS } from '../data/rbacMatrix';
import {
  ArchiveFileType,
  ArchiveFolder,
  ArchiveRootCategory,
  DigitalArchive,
  RoleCode,
} from '../types/sims';

export const ArchiveModule: React.FC = () => {
  const {
    activeRole,
    can,
    archiveFolders,
    archives,
    activityLogs,
    createArchiveFolder,
    uploadArchiveDocument,
    updateArchiveDocumentVersion,
    deleteArchiveDocument,
    exportBackupJson,
    restoreBackupJson,
    pushToast,
  } = useSims();

  const canCreate = can('arsip', 'create');
  const canEdit = can('arsip', 'edit');
  const canDelete = can('arsip', 'delete');

  const [selectedRoot, setSelectedRoot] = useState<ArchiveRootCategory>('Manajerial');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('Semua');
  const [typeFilter, setTypeFilter] = useState('Semua');

  const [folderModal, setFolderModal] = useState<{
    name: string;
    description: string;
    parentId: string;
    allowedRoles: RoleCode[];
  } | null>(null);

  const [uploadModal, setUploadModal] = useState<{
    folderId: string;
    title: string;
    documentNumber: string;
    documentDate: string;
    fileName: string;
    fileType: ArchiveFileType;
    fileSizeLabel: string;
    previewContent: string;
  } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<DigitalArchive | null>(null);
  const [revisionDoc, setRevisionDoc] = useState<DigitalArchive | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionFileName, setRevisionFileName] = useState('');

  // Role-filtered folders
  const accessibleFolders = useMemo(() => {
    return archiveFolders.filter(
      (f) =>
        f.rootCategory === selectedRoot &&
        (activeRole === 'super_admin' || f.allowedRoles.includes(activeRole))
    );
  }, [archiveFolders, selectedRoot, activeRole]);

  const filteredDocuments = useMemo(() => {
    const allowedFolderIds = new Set(
      archiveFolders
        .filter((f) => activeRole === 'super_admin' || f.allowedRoles.includes(activeRole))
        .map((f) => f.id)
    );

    return archives.filter((docItem) => {
      if (!allowedFolderIds.has(docItem.folderId)) return false;
      if (docItem.rootCategory !== selectedRoot) return false;
      if (selectedFolderId !== 'ALL' && docItem.folderId !== selectedFolderId) return false;
      if (yearFilter !== 'Semua' && docItem.documentYear !== yearFilter) return false;
      if (typeFilter !== 'Semua' && docItem.fileType !== typeFilter) return false;
      const q = search.toLowerCase();
      return (
        !q ||
        docItem.title.toLowerCase().includes(q) ||
        docItem.documentNumber.toLowerCase().includes(q) ||
        docItem.fileName.toLowerCase().includes(q)
      );
    });
  }, [archives, archiveFolders, activeRole, selectedRoot, selectedFolderId, yearFilter, typeFilter, search]);

  const availableYears = useMemo(
    () => Array.from(new Set(archives.map((a) => a.documentYear))).sort().reverse(),
    [archives]
  );

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadModal) return;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const validTypes: ArchiveFileType[] = ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG'];
    const detectedType: ArchiveFileType = validTypes.includes(ext as ArchiveFileType)
      ? (ext as ArchiveFileType)
      : 'PDF';

    let previewText = `Berkas terunggah: ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
    if (detectedType === 'JPG' || detectedType === 'PNG') {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadModal((prev) =>
          prev
            ? {
                ...prev,
                fileName: file.name,
                fileType: detectedType,
                fileSizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                previewContent: String(reader.result || previewText),
              }
            : prev
        );
      };
      reader.readAsDataURL(file);
      return;
    }
    setUploadModal({
      ...uploadModal,
      fileName: file.name,
      fileType: detectedType,
      fileSizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      previewContent: previewText,
    });
  };

  const handleDownloadArchive = (item: DigitalArchive) => {
    const content = item.previewContent.startsWith('data:')
      ? item.previewContent
      : `SMA DARUL ULUM KEPOHBARU — ARSIP DIGITAL\nJudul: ${item.title}\nNomor: ${item.documentNumber}\nTanggal: ${item.documentDate}\nVersi: v${item.version}\n\n${item.previewContent}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('info', `Mengunduh metadata/pratinjau berkas ${item.fileName}`);
  };

  const archiveLogs = activityLogs.filter((l) => l.module === 'Arsip Digital').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Category Tabs + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {ARCHIVE_ROOT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedRoot(cat);
                setSelectedFolderId('ALL');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedRoot === cat
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <>
              <button
                onClick={() =>
                  setFolderModal({
                    name: '',
                    description: '',
                    parentId: selectedFolderId === 'ALL' ? '' : selectedFolderId,
                    allowedRoles: ['super_admin', 'kepala_sekolah', 'tendik', 'supervisor'],
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
                Folder Baru
              </button>
              <button
                onClick={() =>
                  setUploadModal({
                    folderId:
                      selectedFolderId !== 'ALL'
                        ? selectedFolderId
                        : accessibleFolders[0]?.id || '',
                    title: '',
                    documentNumber: '',
                    documentDate: new Date().toISOString().slice(0, 10),
                    fileName: 'Dokumen_Sekolah.pdf',
                    fileType: 'PDF',
                    fileSizeLabel: '512 KB',
                    previewContent: '',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
              >
                <FilePlus className="w-3.5 h-3.5" />
                Unggah Dokumen
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split: Folder Tree + Documents List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="font-display text-sm font-bold text-slate-900">
              Direktori {selectedRoot}
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {accessibleFolders.length} Folder
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolderId('ALL')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                selectedFolderId === 'ALL'
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Semua Dokumen {selectedRoot}</span>
              <span className="font-mono text-slate-500 tabular-nums">
                {archives.filter((a) => a.rootCategory === selectedRoot).length}
              </span>
            </button>

            {accessibleFolders.map((folder: ArchiveFolder) => {
              const count = archives.filter((a) => a.folderId === folder.id).length;
              const isSub = Boolean(folder.parentId);
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-start justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    isSub ? 'pl-6' : ''
                  } ${
                    selectedFolderId === folder.id
                      ? 'bg-emerald-50 text-emerald-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Folder className="w-3.5 h-3.5 mt-0.5 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate">{folder.name}</p>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 inline" />
                        {folder.allowedRoles.length} peran diizinkan
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-slate-500 tabular-nums shrink-0">{count}</span>
                </button>
              );
            })}
          </div>

          {activeRole === 'super_admin' && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-800">Backup & Pemulihan Arsip</p>
              <div className="flex gap-2">
                <button
                  onClick={exportBackupJson}
                  className="flex-1 py-1.5 px-2.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Backup JSON
                </button>
                <label className="flex-1 py-1.5 px-2.5 text-xs font-medium text-center text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer">
                  Pulihkan
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
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari judul, nomor surat, atau nama berkas..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="Semua">Semua Format</option>
                {(['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG'] as ArchiveFileType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="Semua">Semua Tahun</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredDocuments.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                  Belum ada dokumen pada filter atau direktori ini.
                </p>
              ) : (
                filteredDocuments.map((docItem) => {
                  const folderName =
                    archiveFolders.find((f) => f.id === docItem.folderId)?.name || docItem.rootCategory;
                  return (
                    <div key={docItem.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          {docItem.fileType} · {docItem.fileSizeLabel} · v{docItem.version} · {docItem.documentDate} · {folderName}
                        </p>
                        <h3 className="text-sm font-bold text-slate-900">{docItem.title}</h3>
                        <p className="text-xs text-slate-600">
                          No: <span className="font-mono">{docItem.documentNumber || '-'}</span> · Diunggah oleh {docItem.uploadedByName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewDoc(docItem)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Pratinjau
                        </button>
                        <button
                          onClick={() => handleDownloadArchive(docItem)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setRevisionDoc(docItem);
                              setRevisionFileName(docItem.fileName);
                              setRevisionNotes('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                            title="Perbarui versi dokumen"
                          >
                            <History className="w-3.5 h-3.5" />
                            Revisi
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteArchiveDocument(docItem.id, docItem.title)}
                            className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg"
                            title="Hapus dokumen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Archive Activity Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
              Log Aktivitas Arsip Digital Terbaru
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {archiveLogs.length === 0 ? (
                <p className="text-slate-500">Belum ada catatan aktivitas arsip terbaru.</p>
              ) : (
                archiveLogs.map((l) => (
                  <div key={l.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-700">{l.summary} ({l.actorName})</span>
                    <span className="font-mono text-slate-400 tabular-nums shrink-0">{l.timestamp.slice(0, 10)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Folder */}
      {folderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await createArchiveFolder({
                rootCategory: selectedRoot,
                parentId: folderModal.parentId,
                name: folderModal.name,
                description: folderModal.description,
                allowedRoles: folderModal.allowedRoles,
              });
              setFolderModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Buat Folder / Subfolder di {selectedRoot}
            </h3>
            <input
              required
              placeholder="Nama Folder"
              value={folderModal.name}
              onChange={(e) => setFolderModal({ ...folderModal, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <select
              value={folderModal.parentId}
              onChange={(e) => setFolderModal({ ...folderModal, parentId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Folder Utama ({selectedRoot})</option>
              {accessibleFolders.map((f) => (
                <option key={f.id} value={f.id}>Subfolder di dalam: {f.name}</option>
              ))}
            </select>
            <input
              placeholder="Deskripsi singkat folder"
              value={folderModal.description}
              onChange={(e) => setFolderModal({ ...folderModal, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <div>
              <p className="font-semibold text-slate-700 mb-2">Hak Akses Peran untuk Folder Ini:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.values(ROLE_DEFINITIONS).map((r) => (
                  <label key={r.code} className="flex items-center gap-1.5 text-slate-700">
                    <input
                      type="checkbox"
                      checked={folderModal.allowedRoles.includes(r.code)}
                      onChange={() => {
                        const exists = folderModal.allowedRoles.includes(r.code);
                        setFolderModal({
                          ...folderModal,
                          allowedRoles: exists
                            ? folderModal.allowedRoles.filter((x) => x !== r.code)
                            : [...folderModal.allowedRoles, r.code],
                        });
                      }}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFolderModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan Folder</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Upload Document */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await uploadArchiveDocument({
                folderId: uploadModal.folderId,
                rootCategory: selectedRoot,
                title: uploadModal.title,
                documentNumber: uploadModal.documentNumber || '-',
                documentDate: uploadModal.documentDate,
                documentYear: uploadModal.documentDate.slice(0, 4),
                fileName: uploadModal.fileName,
                fileType: uploadModal.fileType,
                fileSizeLabel: uploadModal.fileSizeLabel,
                version: 1,
                previewContent: uploadModal.previewContent || `Dokumen ${uploadModal.title}`,
                versionHistory: [
                  {
                    version: 1,
                    fileName: uploadModal.fileName,
                    updatedAt: uploadModal.documentDate,
                    updatedByName: 'Pengguna SIMS',
                    changeNotes: 'Unggahan awal dokumen.',
                  },
                ],
              });
              setUploadModal(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Unggah Dokumen ke Arsip {selectedRoot}
            </h3>
            <select
              value={uploadModal.folderId}
              onChange={(e) => setUploadModal({ ...uploadModal, folderId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
            >
              {accessibleFolders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input
              required
              placeholder="Judul Dokumen"
              value={uploadModal.title}
              onChange={(e) => setUploadModal({ ...uploadModal, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Nomor Surat / Dokumen"
                value={uploadModal.documentNumber}
                onChange={(e) => setUploadModal({ ...uploadModal, documentNumber: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
              <input
                type="date"
                value={uploadModal.documentDate}
                onChange={(e) => setUploadModal({ ...uploadModal, documentDate: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Pilih Berkas (PDF, DOCX, XLSX, PPTX, JPG, PNG)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={handleFilePick}
                className="w-full text-xs text-slate-600"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Terpilih: {uploadModal.fileName} ({uploadModal.fileType} · {uploadModal.fileSizeLabel})
              </p>
            </div>
            <textarea
              rows={3}
              placeholder="Ringkasan isi dokumen untuk pratinjau cepat..."
              value={uploadModal.previewContent.startsWith('data:') ? '' : uploadModal.previewContent}
              onChange={(e) => setUploadModal({ ...uploadModal, previewContent: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setUploadModal(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan Arsip</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Document Preview & Version History */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-mono text-emerald-800">
                  {previewDoc.rootCategory} · {previewDoc.fileType} · Versi {previewDoc.version}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">{previewDoc.title}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  No. {previewDoc.documentNumber} · {previewDoc.documentDate}
                </p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                Tutup
              </button>
            </div>

            {previewDoc.previewContent.startsWith('data:image') ? (
              <img
                src={previewDoc.previewContent}
                alt={previewDoc.title}
                referrerPolicy="no-referrer"
                className="max-h-72 rounded-lg border border-slate-200 mx-auto"
              />
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-line font-sans leading-relaxed">
                {previewDoc.previewContent}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">Riwayat Perubahan Dokumen</h4>
              <div className="divide-y divide-slate-100 text-xs">
                {previewDoc.versionHistory.map((v) => (
                  <div key={v.version} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-semibold text-emerald-800">v{v.version}</span> · {v.fileName} — {v.changeNotes}
                    </div>
                    <span className="font-mono text-slate-500 shrink-0">{v.updatedAt} ({v.updatedByName})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revise Version */}
      {revisionDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateArchiveDocumentVersion(
                revisionDoc,
                revisionFileName || revisionDoc.fileName,
                revisionNotes || 'Pembaruan dokumen'
              );
              setRevisionDoc(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 text-xs"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Unggah Revisi Baru (v{revisionDoc.version + 1})
            </h3>
            <input
              required
              value={revisionFileName}
              onChange={(e) => setRevisionFileName(e.target.value)}
              placeholder="Nama berkas revisi"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
            />
            <textarea
              required
              rows={3}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Catatan perubahan versi..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRevisionDoc(null)} className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 rounded-lg">Batal</button>
              <button type="submit" className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg">Simpan Revisi</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
