import React, { useState } from 'react';
import {
  ADOBE_STOCK_CATEGORIES,
  AspectRatioOption,
} from '../types/stock.ts';
import { X, Sparkles, Layers } from 'lucide-react';

interface NewBatchModalProps {
  isOpen: boolean;
  defaultAspectRatio: AspectRatioOption;
  defaultCategoryId: number;
  onClose: () => void;
  onSubmitBatchItem: (payload: {
    prompt: string;
    nicheTag: string;
    aspectRatio: AspectRatioOption;
    negativeSpaceDirection: string;
    categoryId: number;
    runImmediately: boolean;
  }) => Promise<void>;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({
  isOpen,
  defaultAspectRatio,
  defaultCategoryId,
  onClose,
  onSubmitBatchItem,
}) => {
  const [nicheTag, setNicheTag] = useState('Clean Hydrogen & Industrial ESG');
  const [prompt, setPrompt] = useState(
    'Wide commercial architectural photography of green hydrogen electrolysis facility with sleek metallic pipelines and warm golden hour sunlight, clean negative space on the left for corporate headline.'
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>(defaultAspectRatio);
  const [categoryId, setCategoryId] = useState<number>(defaultCategoryId);
  const [negativeSpaceDirection, setNegativeSpaceDirection] = useState(
    'Left 35% Copy Space for Designer Typography'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (runNow: boolean) => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmitBatchItem({
        prompt: prompt.trim(),
        nicheTag: nicheTag.trim() || 'Commercial 4K Studio',
        aspectRatio,
        negativeSpaceDirection,
        categoryId,
        runImmediately: runNow,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#111726] border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Buat Aset Studio 4K & 49 Keyword Adobe Stock
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Otomatis merender resolusi 4K sRGB, memvalidasi batas 70 karakter judul, dan menyusun
              49 kata kunci prioritas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Label Niche / Kampanye Komersial
              </label>
              <input
                type="text"
                value={nicheTag}
                onChange={(e) => setNicheTag(e.target.value)}
                placeholder="Contoh: Clean Energy & ESG"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Kategori Resmi Adobe Stock (1–21)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {ADOBE_STOCK_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.id}. {cat.indonesianName} ({cat.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Dimensi 4K Ultra-HD
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatioOption)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="16:9">16:9 — 3840 × 2160 px (8.29 MP)</option>
                <option value="4:3">4:3 — 3840 × 2880 px (11.06 MP)</option>
                <option value="1:1">1:1 — 4096 × 4096 px (16.78 MP)</option>
                <option value="3:4">3:4 — 2880 × 3840 px (11.06 MP)</option>
                <option value="9:16">9:16 — 2160 × 3840 px (8.29 MP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Arahan Zona Copy Space (Ruang Teks)
              </label>
              <select
                value={negativeSpaceDirection}
                onChange={(e) => setNegativeSpaceDirection(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Left 35% Copy Space for Designer Typography">
                  Sisi Kiri 35% Ruang Negatif (Banner B2B)
                </option>
                <option value="Top-Left Copy Space Zone">
                  Sudut Kiri Atas Lapang (Editorial)
                </option>
                <option value="Balanced Studio Framing">
                  Komposisi Simetris Studio
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Prompt Deskripsi Visual Komersial (Bahasa Inggris / Indonesia)
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Deskripsikan subjek, pencahayaan studio, tekstur permukaan, dan komposisi..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Catatan Kepatuhan: Sistem otomatis membersihkan kata terlarang Adobe Stock seperti
              nama kamera (Canon/Nikon/Leica) atau tag render (4K/8K/photorealistic) dari metadata
              akhir.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5" />
            Masukkan ke Antrean Jadwal
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSubmitting ? 'Memproses 4K & 49 Keyword...' : 'Generate 4K & SEO Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
};
