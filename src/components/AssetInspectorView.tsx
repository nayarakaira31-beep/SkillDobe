import React, { useState, useEffect } from 'react';
import {
  ADOBE_STOCK_CATEGORIES,
  BANNED_ADOBE_STOCK_TERMS,
  StockAsset,
} from '../types/stock.ts';
import {
  Download,
  RefreshCw,
  Save,
  Copy,
  Check,
  Grid,
  Plus,
  ArrowUp,
  X,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AssetInspectorViewProps {
  assets: StockAsset[];
  activeAsset: StockAsset | null;
  onSelectAsset: (asset: StockAsset) => void;
  onSaveMetadata: (
    assetId: string,
    payload: {
      filename: string;
      title: string;
      keywords: string[];
      categoryId: number;
      isGenerativeAI: boolean;
    }
  ) => Promise<void>;
  onRegenerateSeo: (assetId: string) => Promise<void>;
  onTriggerSftpSingle: (assetId: string) => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.00 MB';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AssetInspectorView: React.FC<AssetInspectorViewProps> = ({
  assets,
  activeAsset,
  onSelectAsset,
  onSaveMetadata,
  onRegenerateSeo,
  onTriggerSftpSingle,
}) => {
  const current = activeAsset || assets[0] || null;

  const [filename, setFilename] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number>(19);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [showCopySpaceGrid, setShowCopySpaceGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<'title' | 'keywords' | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (current) {
      setFilename(current.filename);
      setTitle(current.metadata.title);
      setCategoryId(current.metadata.categoryId);
      setKeywords([...current.metadata.keywords]);
      setSaveMessage(null);
    }
  }, [current?.id, current?.updatedAt]);

  if (!current) {
    return (
      <div className="bg-[#111726] border border-slate-800 rounded-xl p-12 text-center">
        <p className="text-sm text-slate-300">Belum ada aset 4K untuk diinspeksi.</p>
      </div>
    );
  }

  // Live Compliance Checks
  const detectedBannedInTitle = BANNED_ADOBE_STOCK_TERMS.filter((term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(title)
  );
  const hasCommaInTitle = title.includes(',');
  const isTitleLenValid = title.trim().length > 0 && title.length <= 70;
  const isFilenameValid = filename.length <= 30 && filename.endsWith('.jpg');
  const isKeywordCountValid = keywords.length >= 15 && keywords.length <= 49;

  const handleCopyText = (text: string, type: 'title' | 'keywords') => {
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;
    const rawParts = newKeywordInput
      .split(',')
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);

    const next = [...keywords];
    for (const part of rawParts) {
      if (next.length >= 49) break;
      if (!next.includes(part)) {
        next.push(part);
      }
    }
    setKeywords(next);
    setNewKeywordInput('');
  };

  const handlePromoteToTop10 = (index: number) => {
    if (index <= 0) return;
    const next = [...keywords];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    setKeywords(next);
  };

  const handleRemoveKeyword = (index: number) => {
    const next = [...keywords];
    next.splice(index, 1);
    setKeywords(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onSaveMetadata(current.id, {
        filename,
        title,
        keywords,
        categoryId,
        isGenerativeAI: true,
      });
      setSaveMessage('Metadata & kepatuhan Adobe Stock berhasil disimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setSaveMessage(null);
    try {
      await onRegenerateSeo(current.id);
      setSaveMessage('Judul & 49 Keyword berhasil diregenerasi oleh Gemini AI.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Asset Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-indigo-400 mb-1">
            Audit Kualitas Teknis 4K & Optimasi 49 Kata Kunci Adobe Stock
          </p>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            Inspektor Aset 4K Ultra-HD & Editor Kepatuhan SEO
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">Pilih Aset:</label>
          <select
            value={current.id}
            onChange={(e) => {
              const found = assets.find((a) => a.id === e.target.value);
              if (found) onSelectAsset(found);
            }}
            className="px-3 py-2 text-xs font-mono bg-[#111726] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.filename} ({a.technicalSpecs.width}×{a.technicalSpecs.height})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2-Column Split Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 Cols): 4K Canvas Preview + Technical QC Audit */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-300 font-mono tabular-nums">
                {current.technicalSpecs.width} × {current.technicalSpecs.height} px ·{' '}
                {current.technicalSpecs.megapixels} MP · {current.technicalSpecs.colorSpace}
              </div>
              <button
                type="button"
                onClick={() => setShowCopySpaceGrid(!showCopySpaceGrid)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showCopySpaceGrid
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Grid Copy Space
              </button>
            </div>

            {/* 4K Image Viewport with Optional Designer Rule-of-Thirds & Copy Space Overlay */}
            <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
              {current.imageUrl ? (
                <img
                  src={current.imageUrl}
                  alt={current.metadata.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-slate-500 font-mono">Pratinjau 4K sedang diproses</div>
              )}

              {showCopySpaceGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-indigo-500/40">
                  <div className="border-r border-b border-indigo-400/30 bg-indigo-950/25 flex items-start justify-start p-2">
                    <span className="text-[10px] font-mono text-indigo-200 bg-slate-950/80 px-1.5 py-0.5 rounded">
                      ZONA COPY SPACE UTAMA (35%)
                    </span>
                  </div>
                  <div className="border-r border-b border-indigo-400/30" />
                  <div className="border-b border-indigo-400/30" />
                  <div className="border-r border-b border-indigo-400/30 bg-indigo-950/25" />
                  <div className="border-r border-b border-indigo-400/30" />
                  <div className="border-b border-indigo-400/30" />
                  <div className="border-r border-indigo-400/30 bg-indigo-950/25" />
                  <div className="border-r border-indigo-400/30" />
                  <div />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <a
                href={`/api/assets/${current.id}/image?download=1`}
                download={current.filename}
                className="px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Unduh Berkas 4K ({formatBytes(current.technicalSpecs.fileSizeBytes)})
              </a>

              <button
                type="button"
                onClick={() => onTriggerSftpSingle(current.id)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Unggah ke SFTP Adobe Stock
              </button>
            </div>
          </div>

          {/* Technical Quality Control (QC) Audit Table */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100">
                Hasil Audit Kualitas Teknis 4K (Adobe Stock QC)
              </h2>
              <span className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                LULUS ({current.technicalSpecs.qcScore}/100)
              </span>
            </div>

            <dl className="divide-y divide-slate-800/70 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-400">Dimensi Piksel & Rasio</dt>
                <dd className="font-mono tabular-nums text-slate-100">
                  {current.technicalSpecs.width} × {current.technicalSpecs.height} px (
                  {current.aspectRatio})
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-400">Total Megapiksel (Min. 4.0 MP)</dt>
                <dd className="font-mono tabular-nums text-emerald-400">
                  {current.technicalSpecs.megapixels} MP (Lolos Ambang 4K)
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-400">Ruang Warna & Enkoding</dt>
                <dd className="font-mono tabular-nums text-slate-200">
                  {current.technicalSpecs.colorSpace} · JPEG {current.technicalSpecs.quality}% (4:4:4)
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-400">Ukuran Berkas (Batas Maks. 45 MB)</dt>
                <dd className="font-mono tabular-nums text-slate-200">
                  {formatBytes(current.technicalSpecs.fileSizeBytes)}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-400">Indeks Ketajaman & Bebas Artefak</dt>
                <dd className="font-mono tabular-nums text-slate-200">
                  {current.technicalSpecs.sharpnessScore}/100 · Lanczos3 Unsharp
                </dd>
              </div>
              <div className="pt-2.5 flex items-center justify-between">
                <dt className="text-slate-400">Pipeline Pemrosesan</dt>
                <dd className="text-slate-300 text-right max-w-[220px] truncate">
                  {current.technicalSpecs.engineUsed}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right Column (7 Cols): Adobe Stock SEO & Generative AI Compliance Editor */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-[#111726] border border-slate-800 rounded-xl p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Metadata CSV & Optimasi 49 Kata Kunci Adobe Stock
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Divalidasi terhadap pedoman resmi Generative AI Adobe Stock Contributor.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Menyusun SEO...' : 'Regenerasi SEO AI'}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Metadata'}
              </button>
            </div>
          </div>

          {saveMessage && (
            <div className="px-3.5 py-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* Row 1: Filename (<=30 chars) & Category ID (1-21) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-medium text-slate-300">
                  Kolom CSV 1: Filename (Wajib .jpg)
                </label>
                <span
                  className={`font-mono tabular-nums ${
                    isFilenameValid ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {filename.length}/30 karakter
                </span>
              </div>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-medium text-slate-300">
                  Kolom CSV 4: Kategori Resmi Adobe Stock (1–21)
                </label>
                <span className="font-mono text-slate-400">ID: {categoryId}</span>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {ADOBE_STOCK_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.id} — {cat.name} ({cat.indonesianName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title (<= 70 chars, no commas, no camera/4K specs) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="font-medium text-slate-300">
                Kolom CSV 2: Title (Maks. 70 Karakter · Tanpa Koma · Bebas Istilah Teknis/4K)
              </label>
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono tabular-nums ${
                    isTitleLenValid && !hasCommaInTitle && detectedBannedInTitle.length === 0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {title.length}/70 karakter
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(title, 'title')}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'title' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {(hasCommaInTitle || detectedBannedInTitle.length > 0) && (
              <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Perhatian: Adobe Stock melarang tanda koma atau istilah spesifikasi teknis (
                  {detectedBannedInTitle.join(', ') || 'koma'}) di dalam Title. Sistem akan
                  membersihkannya otomatis saat disimpan.
                </span>
              </p>
            )}
          </div>

          {/* Row 3: 49 Priority Keywords Editor */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block">
                  Kolom CSV 3: Keywords (Urutan Prioritas Pencarian Adobe Stock)
                </label>
                <p className="text-[11px] text-slate-400">
                  10 kata kunci pertama memiliki bobot tertinggi pada algoritma pencarian Adobe
                  Stock. Klik panah atas untuk mempromosikan kata kunci ke Top 10.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    isKeywordCountValid ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {keywords.length}/49 Keyword
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(keywords.join(', '), 'keywords')}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedField === 'keywords' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin 49 Keyword</span>
                </button>
              </div>
            </div>

            {/* Add Keyword Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword(e);
                  }
                }}
                placeholder="Tambah kata kunci baru (pisahkan dengan koma)..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>

            {/* Top 10 High-Priority Keywords Section */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 space-y-2">
              <div className="text-[11px] font-medium text-indigo-300 flex items-center justify-between">
                <span>10 Kata Kunci Utama (Prioritas Algoritma #1–#10)</span>
                <span className="font-mono text-slate-400">Bobot SEO: Maksimum</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 10).map((kw, idx) => (
                  <div
                    key={`${kw}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-100"
                  >
                    <span className="font-mono text-[10px] text-indigo-400">{idx + 1}.</span>
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(idx)}
                      className="text-indigo-300/70 hover:text-rose-400 cursor-pointer"
                      title="Hapus kata kunci"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Remaining Keywords (#11 - #49) */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Kata Kunci Pendukung & Long-Tail (#11–#{keywords.length})</span>
                <span>Klik panah atas untuk pindahkan ke Top 10</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {keywords.slice(10).map((kw, relIdx) => {
                  const actualIdx = relIdx + 10;
                  return (
                    <div
                      key={`${kw}-${actualIdx}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    >
                      <span className="font-mono text-[10px] text-slate-500">
                        {actualIdx + 1}.
                      </span>
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handlePromoteToTop10(actualIdx)}
                        className="text-slate-500 hover:text-indigo-400 cursor-pointer"
                        title="Promosikan ke urutan #1 (Top 10)"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(actualIdx)}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Hapus kata kunci"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mandatory Generative AI Compliance Checklist Footer */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Created using Generative AI Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>People & Property are Fictional</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Bebas Merek/IP & Spesifikasi Kamera</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
