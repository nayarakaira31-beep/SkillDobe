import React, { useState } from 'react';
import {
  ADOBE_STOCK_CATEGORIES,
  AspectRatioOption,
  MarketTrendIdea,
} from '../types/stock.ts';
import { Sparkles, PlusCircle, Compass, ArrowUpRight, Layers } from 'lucide-react';

interface TrendResearchViewProps {
  trends: MarketTrendIdea[];
  isAnalyzing: boolean;
  onAnalyzeTrends: (focusIndustry: string) => Promise<void>;
  onQueueFromTrend: (
    prompt: string,
    nicheTag: string,
    aspectRatio: AspectRatioOption,
    negativeSpaceDirection: string,
    categoryId: number,
    runImmediately: boolean
  ) => Promise<void>;
}

const INDUSTRY_PRESETS = [
  'Clean Energy, Hydrogen Grid & ESG Corporate Sustainability',
  'Next-Gen Biotechnology, Longevity & Clinical AI Diagnostics',
  'Artisanal Culinary, Mindful Matcha & Organic Packaging Aesthetics',
  'Nordic Mass-Timber Architecture & Electric Mobility Infrastructure',
  'Cybersecurity Operations, Quantum FinTech & Executive Boardrooms',
];

export const TrendResearchView: React.FC<TrendResearchViewProps> = ({
  trends,
  isAnalyzing,
  onAnalyzeTrends,
  onQueueFromTrend,
}) => {
  const [focusTopic, setFocusTopic] = useState(INDUSTRY_PRESETS[0]);
  const [queuingId, setQueuingId] = useState<string | null>(null);

  const handleTriggerAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusTopic.trim()) return;
    await onAnalyzeTrends(focusTopic.trim());
  };

  const handleQueueIdea = async (idea: MarketTrendIdea, runImmediately: boolean) => {
    setQueuingId(idea.id);
    try {
      await onQueueFromTrend(
        idea.suggestedPrompt,
        idea.nicheTitle,
        idea.recommendedAspectRatio,
        idea.negativeSpaceNote,
        idea.categoryId,
        runImmediately
      );
    } finally {
      setQueuingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Market Query Bar */}
      <section className="border-b border-slate-800 pb-6">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-indigo-400 tracking-wide mb-2">
            Riset Permintaan Pembeli Komersial · Analisis Celah Pasar Adobe Stock
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight text-balance">
            Intelijen Tren Pasar & Generator Konsep 4K Bernilai Jual Tinggi
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Temukan ceruk pasar (*high-demand, low-competition*) lengkap dengan panduan ruang
            negatif (*copy space*) bagi desainer agensi, rekomendasi rasio aspek 4K, dan 10 kata
            kunci pemicu pencarian utama.
          </p>
        </div>

        <form onSubmit={handleTriggerAnalyze} className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Compass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="Masukkan fokus industri, kampanye musiman, atau tema visual..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#111726] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isAnalyzing ? 'Menganalisis Pasar via Gemini AI...' : 'Riset Niche & Ide Prompt AI'}
          </button>
        </form>

        {/* Preset Topic Buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Fokus Cepat:</span>
          {INDUSTRY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setFocusTopic(preset);
                onAnalyzeTrends(preset);
              }}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                focusTopic === preset
                  ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200'
                  : 'bg-[#111726] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.split(',')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Grid of Market Trend Opportunities */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trends.map((idea, index) => {
          const category = ADOBE_STOCK_CATEGORIES.find((c) => c.id === idea.categoryId);
          const isBusy = queuingId === idea.id;

          return (
            <article
              key={idea.id}
              className="bg-[#111726] border border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                {/* Clean Unboxed Metadata Header */}
                <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-semibold">
                      0{index + 1}.
                    </span>
                    <span>
                      Kat. {idea.categoryId} ({category?.indonesianName || 'Teknologi'})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Rasio {idea.recommendedAspectRatio} (4K)
                    </span>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-emerald-400">Permintaan: {idea.demandLevel}</span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="text-slate-300">Kompetisi: {idea.competitionLevel}</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                    {idea.nicheTitle}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    <strong className="text-slate-300 font-medium">Buyer Intent:</strong>{' '}
                    {idea.commercialBuyerIntent}
                  </p>
                </div>

                {/* Commercial Studio Prompt Box */}
                <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">
                      Prompt Studio 4K (Bebas Nama Kamera/Merek)
                    </span>
                    <span className="font-mono">{idea.seasonalWindow}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-mono leading-relaxed select-all">
                    "{idea.suggestedPrompt}"
                  </p>
                  <p className="text-[11px] text-indigo-300/90 pt-1 border-t border-slate-800/80">
                    Arahan Komposisi: {idea.negativeSpaceNote}
                  </p>
                </div>

                {/* Top 10 Priority Seed Keywords (Unboxed clean text) */}
                <div>
                  <span className="block text-[11px] font-medium text-slate-400 mb-1">
                    10 Kata Kunci Utama (Bobot Algoritma Tertinggi Adobe Stock):
                  </span>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    {idea.topSeedKeywords.join(' · ')}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleQueueIdea(idea, false)}
                  disabled={isBusy}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Simpan ke Antrean Harian
                </button>

                <button
                  type="button"
                  onClick={() => handleQueueIdea(idea, true)}
                  disabled={isBusy}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {isBusy ? 'Memproduksi 4K & 49 Keyword...' : 'Generate 4K & 49 Keyword Sekarang'}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
