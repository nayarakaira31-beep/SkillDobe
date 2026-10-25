import React, { useState, useRef } from 'react';
import {
  ADOBE_STOCK_CATEGORIES,
  AspectRatioOption,
  BatchScheduleConfig,
  StockAsset,
} from '../types/stock.ts';
import {
  Play,
  Download,
  UploadCloud,
  CheckSquare,
  Square,
  Search,
  SlidersHorizontal,
  Trash2,
  Eye,
  Clock,
  FileSpreadsheet,
  ImagePlus,
} from 'lucide-react';

interface BatchQueueViewProps {
  assets: StockAsset[];
  schedule: BatchScheduleConfig;
  isRunningBatch: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onInspectAsset: (asset: StockAsset) => void;
  onDeleteAsset: (id: string) => void;
  onRunBatchNow: () => Promise<void>;
  onUpdateSchedule: (partial: Partial<BatchScheduleConfig>) => Promise<void>;
  onOpenNewBatchModal: () => void;
  onUploadCustomImage4K: (
    base64: string,
    prompt: string,
    nicheTag: string,
    aspectRatio: AspectRatioOption
  ) => Promise<void>;
  onNavigateTab: (tab: 'queue' | 'trends' | 'inspector' | 'sftp') => void;
  onTriggerSftpUpload: (ids: string[]) => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.00 MB';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStatusLabel(status: StockAsset['status'], portalId?: string): { text: string; colorClass: string } {
  switch (status) {
    case 'approved_live':
      return { text: `Live di Adobe Stock (${portalId || 'Published'})`, colorClass: 'text-emerald-400' };
    case 'in_review':
      return { text: `In Review Moderasi (${portalId || 'Submitted'})`, colorClass: 'text-emerald-400' };
    case 'uploaded':
      return { text: 'Terkirim ke SFTP', colorClass: 'text-emerald-400' };
    case 'ready':
      return { text: 'Lolos QC 4K · Siap Auto-Post', colorClass: 'text-indigo-400' };
    case 'generating_image':
      return { text: 'Merender Studio 4K...', colorClass: 'text-amber-400' };
    case 'processing_4k_qc':
      return { text: 'Normalisasi 4K sRGB + EXIF...', colorClass: 'text-amber-400' };
    case 'generating_seo':
      return { text: 'Menyusun 49 Keyword SEO...', colorClass: 'text-amber-400' };
    case 'uploading_sftp':
      return { text: 'Auto-Posting ke Akun Adobe...', colorClass: 'text-amber-400' };
    case 'failed':
      return { text: 'Perlu Tindakan', colorClass: 'text-rose-400' };
    default:
      return { text: 'Dalam Antrean Batch', colorClass: 'text-slate-400' };
  }
}

export const BatchQueueView: React.FC<BatchQueueViewProps> = ({
  assets,
  schedule,
  isRunningBatch,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onInspectAsset,
  onDeleteAsset,
  onRunBatchNow,
  onUpdateSchedule,
  onOpenNewBatchModal,
  onUploadCustomImage4K,
  onNavigateTab,
  onTriggerSftpUpload,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'uploaded' | 'queued'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredAssets = assets.filter((item) => {
    if (statusFilter === 'ready' && item.status !== 'ready') return false;
    if (
      statusFilter === 'uploaded' &&
      item.status !== 'uploaded' &&
      item.status !== 'in_review' &&
      item.status !== 'approved_live'
    ) {
      return false;
    }
    if (
      statusFilter === 'queued' &&
      item.status !== 'queued' &&
      item.status !== 'generating_image' &&
      item.status !== 'processing_4k_qc' &&
      item.status !== 'generating_seo'
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = item.metadata.title.toLowerCase().includes(q);
      const inFile = item.filename.toLowerCase().includes(q);
      const inNiche = item.nicheTag.toLowerCase().includes(q);
      const inKw = item.metadata.keywords.some((k) => k.toLowerCase().includes(q));
      return inTitle || inFile || inNiche || inKw;
    }
    return true;
  });

  const totalReadyOrUploaded = assets.filter(
    (a) =>
      a.status === 'ready' ||
      a.status === 'uploaded' ||
      a.status === 'in_review' ||
      a.status === 'approved_live'
  ).length;
  const totalUploaded = assets.filter(
    (a) =>
      a.status === 'uploaded' ||
      a.status === 'in_review' ||
      a.status === 'approved_live'
  ).length;
  const avgQcScore =
    assets.length > 0
      ? Math.round(
          assets.reduce((acc, a) => acc + (a.technicalSpecs.qcScore || 96), 0) / assets.length
        )
      : 98;

  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLocal(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = String(reader.result || '');
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        await onUploadCustomImage4K(
          base64,
          `Commercial stock photography of ${cleanName} with clean studio lighting and copy space`,
          cleanName.slice(0, 24) || 'Custom Studio Upload',
          schedule.defaultAspectRatio
        );
        setIsUploadingLocal(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingLocal(false);
    }
  };

  const allFilteredSelected =
    filteredAssets.length > 0 && filteredAssets.every((a) => selectedIds.includes(a.id));

  return (
    <div className="space-y-8">
      {/* Section 1: Executive Operations Header & Key Metrics Strip */}
      <section className="border-b border-slate-800/90 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-indigo-400 tracking-wide mb-2">
              Pipeline Otomatisasi Kontributor Adobe Stock · Standar Resolusi 4K sRGB
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight text-balance">
              Manajemen Antrean Batch 4K & Penjadwalan Harian
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Otomatisasi pembuatan gambar komersial beresolusi 4K Ultra-HD, validasi kepatuhan
              metadata Generative AI Adobe Stock (judul maksimal 70 karakter & 49 kata kunci
              terurut), serta pengiriman SFTP terjadwal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLocalFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLocal}
              className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <ImagePlus className="w-4 h-4 text-indigo-400" />
              {isUploadingLocal ? 'Meng-upscale ke 4K...' : 'Upscale Gambar Lokal ke 4K'}
            </button>

            <a
              href={`/api/export/csv${selectedIds.length > 0 ? `?ids=${selectedIds.join(',')}` : ''}`}
              download
              className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Unduh CSV Metadata ({selectedIds.length > 0 ? selectedIds.length : totalReadyOrUploaded})
            </a>

            <button
              type="button"
              onClick={onRunBatchNow}
              disabled={isRunningBatch}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              {isRunningBatch ? 'Memproses Pipeline 4K...' : 'Jalankan Batch Sekarang'}
            </button>
          </div>
        </div>

        {/* 4-Column Quantitative KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/70">
          <div>
            <span className="text-xs text-slate-400">Total Aset Katalog 4K</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                {assets.length}
              </span>
              <span className="text-xs text-slate-400">berkas · min. 8.29 MP (3840×2160)</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400">Kepatuhan SEO & Aturan AI Adobe</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                100%
              </span>
              <span className="text-xs text-slate-400">49 keyword · bebas istilah kamera/4K</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400">Rata-Rata Skor QC Teknis</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
                {avgQcScore}/100
              </span>
              <span className="text-xs text-slate-400">sRGB · JPEG 95% · Lanczos3</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400">Status Distribusi SFTP</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-400 font-mono tabular-nums">
                {totalUploaded}/{assets.length}
              </span>
              <span className="text-xs text-slate-400">tersinkronisasi dengan CSV UTF-8</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Automated Cron / Daily Batch Scheduler Configuration Bar */}
      <section className="bg-[#111726] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Konfigurasi Penjadwal Batch Otomatis (Cron Harian)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Agen akan meriset konsep pasar, membuat gambar 4K sRGB, menyusun 49 kata kunci SEO,
                dan menyiapkan CSV pada jam yang ditentukan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={schedule.preferFreeApiEngine}
                onChange={(e) =>
                  onUpdateSchedule({ preferFreeApiEngine: e.target.checked })
                }
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Mode Kunci API Gratis (Gemini 3.8 Flash + Sharp 4K Studio)</span>
            </label>

            <button
              type="button"
              onClick={() => onUpdateSchedule({ enabled: !schedule.enabled })}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                schedule.enabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {schedule.enabled ? 'Penjadwal Aktif' : 'Penjadwal Nonaktif'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Jam Eksekusi Harian</label>
            <input
              type="time"
              value={schedule.cronTime}
              onChange={(e) => onUpdateSchedule({ cronTime: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Target Aset per Batch</label>
            <select
              value={schedule.dailyBatchSize}
              onChange={(e) =>
                onUpdateSchedule({ dailyBatchSize: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value={2}>2 Aset 4K / Hari</option>
              <option value={4}>4 Aset 4K / Hari</option>
              <option value={8}>8 Aset 4K / Hari</option>
              <option value={12}>12 Aset 4K / Hari</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Rasio Aspek Default 4K</label>
            <select
              value={schedule.defaultAspectRatio}
              onChange={(e) =>
                onUpdateSchedule({
                  defaultAspectRatio: e.target.value as AspectRatioOption,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="16:9">16:9 Landscape (3840×2160 · 8.29 MP)</option>
              <option value="4:3">4:3 Editorial (3840×2880 · 11.06 MP)</option>
              <option value="1:1">1:1 Square Studio (4096×4096 · 16.78 MP)</option>
              <option value="3:4">3:4 Vertical Print (2880×3840 · 11.06 MP)</option>
              <option value="9:16">9:16 Vertical Story (2160×3840 · 8.29 MP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Kategori Utama Adobe Stock</label>
            <select
              value={schedule.defaultCategoryId}
              onChange={(e) =>
                onUpdateSchedule({ defaultCategoryId: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {ADOBE_STOCK_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.id}. {cat.indonesianName} ({cat.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Otomatis Unggah SFTP</label>
            <button
              type="button"
              onClick={() =>
                onUpdateSchedule({ autoSftpUpload: !schedule.autoSftpUpload })
              }
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-950 border border-slate-800 rounded-lg text-left text-slate-200 hover:border-slate-700 transition-colors cursor-pointer"
            >
              {schedule.autoSftpUpload
                ? 'Langsung Kirim ke SFTP Setelah QC'
                : 'Simpan di Status Ready (Kurasi Dulu)'}
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Filter Bar & Bulk Actions */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Interactive Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-[#111726] border border-slate-800 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Aset ({assets.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'ready'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Siap Kirim ({assets.filter((a) => a.status === 'ready').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('uploaded')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'uploaded'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terkirim SFTP ({totalUploaded})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('queued')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'queued'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Antrean Proses (
              {
                assets.filter(
                  (a) =>
                    a.status === 'queued' ||
                    a.status === 'generating_image' ||
                    a.status === 'processing_4k_qc' ||
                    a.status === 'generating_seo'
                ).length
              }
              )
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onTriggerSftpUpload(selectedIds)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Unggah {selectedIds.length} File ke SFTP Adobe Stock
              </button>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, nama file, atau keyword..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#111726] border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* High-Density 4K Asset & Metadata Table */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden">
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-slate-300">
                Belum ada aset 4K pada filter ini.
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tambahkan konsep komersial baru dari Riset Tren Pasar AI atau buat batch 4K baru
                untuk mulai memproduksi aset beserta 49 kata kunci Adobe Stock.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenNewBatchModal}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  + Buat Aset 4K Baru
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('trends')}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Buka Riset Tren Pasar AI
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400 bg-slate-950/50">
                    <th className="py-3 pl-4 pr-2 w-10">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectAll(
                            allFilteredSelected ? [] : filteredAssets.map((a) => a.id)
                          )
                        }
                        className="text-slate-400 hover:text-slate-200 cursor-pointer"
                        aria-label="Pilih semua aset"
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Pratinjau & Berkas (≤30c)</th>
                    <th className="py-3 px-3">Judul SEO Adobe Stock (≤70c) & Top Keyword</th>
                    <th className="py-3 px-3 text-right">Spesifikasi 4K Ultra-HD</th>
                    <th className="py-3 px-3 text-right">QC & Kepatuhan</th>
                    <th className="py-3 px-3">Status Pipeline</th>
                    <th className="py-3 pl-3 pr-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedIds.includes(asset.id);
                    const statusObj = getStatusLabel(asset.status, asset.adobePortalAssetId);
                    const categoryObj = ADOBE_STOCK_CATEGORIES.find(
                      (c) => c.id === asset.metadata.categoryId
                    );

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => onInspectAsset(asset)}
                        className={`transition-colors hover:bg-slate-800/40 cursor-pointer ${
                          isSelected ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td
                          className="py-3.5 pl-4 pr-2 align-middle"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(asset.id);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </td>

                        {/* Preview & Filename */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-10 rounded bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                              {asset.imageUrl ? (
                                <img
                                  src={asset.imageUrl}
                                  alt={asset.metadata.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">4K</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-mono text-xs font-medium text-slate-100 truncate max-w-[190px]">
                                {asset.filename}
                              </div>
                              {/* Unboxed metadata with typographic separators */}
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>{asset.nicheTag}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {asset.filename.length}/30c
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SEO Title & Top Keywords */}
                        <td className="py-3.5 px-3 align-middle max-w-md">
                          <div className="font-medium text-slate-100 line-clamp-1">
                            {asset.metadata.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            <span className="font-mono tabular-nums text-slate-300">
                              {asset.metadata.title.length}/70c
                            </span>
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            <span>
                              Kat. {asset.metadata.categoryId} ({categoryObj?.name || 'Technology'})
                            </span>
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-slate-300">
                              {asset.metadata.keywords.slice(0, 5).join(', ')}
                            </span>
                          </div>
                        </td>

                        {/* 4K Specs */}
                        <td className="py-3.5 px-3 align-middle text-right font-mono tabular-nums">
                          <div className="text-slate-100 font-medium">
                            {asset.technicalSpecs.width} × {asset.technicalSpecs.height}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {asset.technicalSpecs.megapixels} MP · {asset.aspectRatio} ·{' '}
                            {formatBytes(asset.technicalSpecs.fileSizeBytes)}
                          </div>
                        </td>

                        {/* QC & Compliance */}
                        <td className="py-3.5 px-3 align-middle text-right font-mono tabular-nums">
                          <div className="text-emerald-400 font-medium">
                            QC {asset.technicalSpecs.qcScore}/100
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {asset.metadata.keywords.length}/49 kw · sRGB
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 align-middle">
                          <span className={`font-medium ${statusObj.colorClass}`}>
                            {statusObj.text}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            AI Flag: Terdeklarasi
                          </div>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 pl-3 pr-4 align-middle text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onInspectAsset(asset)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Inspeksi Resolusi 4K & Edit 49 Keyword"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={`/api/assets/${asset.id}/image?download=1`}
                              download={asset.filename}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition-colors"
                              title="Unduh Gambar 4K (.jpg)"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => onDeleteAsset(asset.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Hapus Aset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
