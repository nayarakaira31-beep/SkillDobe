/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AdobeAccountProfile,
  AspectRatioOption,
  AutoPostJobLog,
  BatchScheduleConfig,
  MarketTrendIdea,
  SftpConnectionConfig,
  SftpLogEntry,
  StockAsset,
} from './types/stock.ts';
import { BatchQueueView } from './components/BatchQueueView.tsx';
import { TrendResearchView } from './components/TrendResearchView.tsx';
import { AssetInspectorView } from './components/AssetInspectorView.tsx';
import { SftpDeliveryView } from './components/SftpDeliveryView.tsx';
import { AccountAutomationView } from './components/AccountAutomationView.tsx';
import { NewBatchModal } from './components/NewBatchModal.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type ActiveWorkspaceTab = 'queue' | 'trends' | 'inspector' | 'accounts' | 'sftp';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('queue');
  const [assets, setAssets] = useState<StockAsset[]>([]);
  const [schedule, setSchedule] = useState<BatchScheduleConfig>({
    enabled: true,
    cronTime: '02:00',
    dailyBatchSize: 4,
    defaultAspectRatio: '16:9',
    defaultCategoryId: 19,
    autoSftpUpload: true,
    autoSubmitPortalReview: true,
    preferFreeApiEngine: true,
    targetNiches: ['Clean Energy & ESG', 'Biotech & Genomics'],
    lastRunAt: null,
    nextRunAt: '',
  });
  const [sftpConfig, setSftpConfig] = useState<SftpConnectionConfig>({
    host: 'sftp.contributor.adobestock.com',
    port: 22,
    username: '209481920@adobestock',
    remoteDirectory: '/',
    simulationMode: true,
  });
  const [sftpLogs, setSftpLogs] = useState<SftpLogEntry[]>([]);
  const [trends, setTrends] = useState<MarketTrendIdea[]>([]);
  const [accounts, setAccounts] = useState<AdobeAccountProfile[]>([]);
  const [autoPostLogs, setAutoPostLogs] = useState<AutoPostJobLog[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedAsset, setInspectedAsset] = useState<StockAsset | null>(null);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
  const [isUploadingSftp, setIsUploadingSftp] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Gagal memuat state aplikasi.');
      const data = await res.json();
      setAssets(data.assets || []);
      if (data.schedule) setSchedule(data.schedule);
      if (data.sftpConfig) setSftpConfig(data.sftpConfig);
      if (data.sftpLogs) setSftpLogs(data.sftpLogs);
      if (data.trends) setTrends(data.trends);
      if (data.accounts) setAccounts(data.accounts);
      if (data.autoPostLogs) setAutoPostLogs(data.autoPostLogs);
      if (!inspectedAsset && data.assets?.length > 0) {
        setInspectedAsset(data.assets[0]);
      }
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal memuat katalog 4K.');
    } finally {
      setIsLoadingInitial(false);
    }
  }, [inspectedAsset, showNotice]);

  useEffect(() => {
    fetchState();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleInspectAsset = (asset: StockAsset) => {
    setInspectedAsset(asset);
    setActiveTab('inspector');
  };

  const handleCreateOrQueueBatchItem = async (payload: {
    prompt: string;
    nicheTag: string;
    aspectRatio: AspectRatioOption;
    negativeSpaceDirection: string;
    categoryId: number;
    runImmediately: boolean;
  }) => {
    try {
      setIsRunningBatch(true);
      const res = await fetch('/api/assets/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat aset 4K.');
      setAssets(data.assets || []);
      if (data.accounts) setAccounts(data.accounts);
      if (data.autoPostLogs) setAutoPostLogs(data.autoPostLogs);
      if (data.sftpLogs) setSftpLogs(data.sftpLogs);
      if (data.asset) setInspectedAsset(data.asset);
      showNotice(
        'success',
        payload.runImmediately
          ? `Aset 4K "${data.asset?.filename}" selesai diproduksi & diposting otomatis ke Adobe Stock.`
          : `Konsep "${payload.nicheTag}" berhasil ditambahkan ke antrean batch.`
      );
      setActiveTab('queue');
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal memproses aset 4K.');
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleUploadCustomImage4K = async (
    imageBase64: string,
    prompt: string,
    nicheTag: string,
    aspectRatio: AspectRatioOption
  ) => {
    try {
      setIsRunningBatch(true);
      const res = await fetch('/api/assets/upload-upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          prompt,
          nicheTag,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal melakukan upscale 4K.');
      setAssets(data.assets || []);
      if (data.asset) setInspectedAsset(data.asset);
      showNotice(
        'success',
        `Gambar berhasil di-upscale ke 4K (${data.asset?.technicalSpecs?.width}×${data.asset?.technicalSpecs?.height}) beserta EXIF & 49 keyword SEO.`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal meng-upscale gambar ke 4K.');
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleRunBatchNow = async () => {
    try {
      setIsRunningBatch(true);
      const res = await fetch('/api/batch/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateFromTrendsIfEmpty: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan batch 4K.');
      setAssets(data.assets || []);
      if (data.schedule) setSchedule(data.schedule);
      if (data.accounts) setAccounts(data.accounts);
      if (data.autoPostLogs) setAutoPostLogs(data.autoPostLogs);
      if (data.sftpLogs) setSftpLogs(data.sftpLogs);
      showNotice(
        'success',
        `Batch selesai: ${data.processedCount} aset 4K sRGB & 49 kata kunci berhasil diproses.`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal menjalankan antrean batch.');
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleUpdateSchedule = async (partial: Partial<BatchScheduleConfig>) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (data.schedule) setSchedule(data.schedule);
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal memperbarui jadwal.');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        if (inspectedAsset?.id === id) {
          setInspectedAsset(data.assets[0] || null);
        }
      }
      showNotice('success', 'Aset 4K dihapus dari katalog.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal menghapus aset.');
    }
  };

  const handleAnalyzeTrends = async (focusIndustry: string) => {
    try {
      setIsAnalyzingTrends(true);
      const res = await fetch('/api/trends/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusIndustry }),
      });
      const data = await res.json();
      if (data.trends) setTrends(data.trends);
      showNotice('success', 'Riset ceruk pasar & ide prompt 4K diperbarui.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal menganalisis tren pasar.');
    } finally {
      setIsAnalyzingTrends(false);
    }
  };

  const handleSaveMetadata = async (
    assetId: string,
    payload: {
      filename: string;
      title: string;
      keywords: string[];
      categoryId: number;
      isGenerativeAI: boolean;
    }
  ) => {
    const res = await fetch(`/api/assets/${assetId}/metadata`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan metadata.');
    if (data.assets) setAssets(data.assets);
    if (data.asset) setInspectedAsset(data.asset);
  };

  const handleRegenerateSeo = async (assetId: string) => {
    const res = await fetch(`/api/assets/${assetId}/regenerate-seo`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal meregenerasi SEO.');
    if (data.assets) setAssets(data.assets);
    if (data.asset) setInspectedAsset(data.asset);
  };

  const handleSaveSftpConfig = async (config: Partial<SftpConnectionConfig>) => {
    const res = await fetch('/api/sftp/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (data.sftpConfig) setSftpConfig(data.sftpConfig);
  };

  const handleTriggerSftpUpload = async (assetIds?: string[]) => {
    try {
      setIsUploadingSftp(true);
      const res = await fetch('/api/sftp/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.logs) setSftpLogs(data.logs);
        throw new Error(data.error || 'Gagal mengunggah ke SFTP.');
      }
      if (data.assets) setAssets(data.assets);
      if (data.logs) setSftpLogs(data.logs);
      if (data.accounts) setAccounts(data.accounts);
      if (data.autoPostLogs) setAutoPostLogs(data.autoPostLogs);
      showNotice(
        'success',
        `Aset 4K berhasil dikirim ke SFTP & disubmit ke moderasi akun Adobe Stock.`
      );
      setActiveTab('accounts');
    } catch (err: any) {
      showNotice('error', err?.message || 'Koneksi SFTP gagal.');
    } finally {
      setIsUploadingSftp(false);
    }
  };

  const handleSelectActiveAccount = async (accountId: string) => {
    const res = await fetch(`/api/accounts/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    });
    const data = await res.json();
    if (data.accounts) setAccounts(data.accounts);
    showNotice('success', `Akun aktif dialihkan ke ${data.account?.accountName}.`);
  };

  const handleUpdateAccount = async (
    accountId: string,
    partial: Partial<AdobeAccountProfile>
  ) => {
    const res = await fetch(`/api/accounts/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (data.accounts) setAccounts(data.accounts);
  };

  const handleCreateAccount = async (payload: {
    accountName: string;
    adobeIdEmail: string;
    contributorId: string;
    sftpUsername: string;
    maxDailySubmissions: number;
    submissionPacingSeconds: number;
  }) => {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showNotice('error', data.error || 'Gagal menambahkan akun.');
      return;
    }
    if (data.accounts) setAccounts(data.accounts);
    showNotice('success', `Akun kontributor "${payload.accountName}" berhasil ditambahkan.`);
  };

  const handleRunAutoPostNow = async (accountId: string, assetIds?: string[]) => {
    try {
      setIsUploadingSftp(true);
      const res = await fetch(`/api/accounts/${accountId}/auto-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan auto-post.');
      if (data.assets) setAssets(data.assets);
      if (data.accounts) setAccounts(data.accounts);
      if (data.autoPostLogs) setAutoPostLogs(data.autoPostLogs);
      if (data.sftpLogs) setSftpLogs(data.sftpLogs);
      showNotice(
        'success',
        `${data.processedCount} aset 4K berhasil diposting otomatis ke antrean In Review Adobe Stock.`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Gagal memposting otomatis.');
    } finally {
      setIsUploadingSftp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-10 py-4 border-b border-slate-800/90 bg-[#090D16]/95 sticky top-0 z-30 backdrop-blur-xs">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#queue"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('queue');
          }}
          className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0"
        >
          StockFlow 4K
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'queue'
                ? 'text-slate-50 border-indigo-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Antrean Batch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'trends'
                ? 'text-slate-50 border-indigo-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Riset Tren AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'inspector'
                ? 'text-slate-50 border-indigo-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Inspektor 4K & SEO
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'accounts'
                ? 'text-slate-50 border-indigo-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Otomatisasi Akun
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sftp')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'sftp'
                ? 'text-slate-50 border-indigo-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            SFTP & CSV
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsNewBatchModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + Buat Batch 4K
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium bg-[#111726] border-slate-700 text-slate-100">
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Workspace Container (1440px baseline) */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
        {isLoadingInitial ? (
          <div className="space-y-4">
            <div className="h-24 bg-[#111726] border border-slate-800 rounded-xl animate-pulse" />
            <div className="h-96 bg-[#111726] border border-slate-800 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <BatchQueueView
                assets={assets}
                schedule={schedule}
                isRunningBatch={isRunningBatch}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onInspectAsset={handleInspectAsset}
                onDeleteAsset={handleDeleteAsset}
                onRunBatchNow={handleRunBatchNow}
                onUpdateSchedule={handleUpdateSchedule}
                onOpenNewBatchModal={() => setIsNewBatchModalOpen(true)}
                onUploadCustomImage4K={handleUploadCustomImage4K}
                onNavigateTab={(t) => setActiveTab(t)}
                onTriggerSftpUpload={(ids) => handleTriggerSftpUpload(ids)}
              />
            )}

            {activeTab === 'trends' && (
              <TrendResearchView
                trends={trends}
                isAnalyzing={isAnalyzingTrends}
                onAnalyzeTrends={handleAnalyzeTrends}
                onQueueFromTrend={(
                  prompt,
                  nicheTag,
                  aspectRatio,
                  negativeSpaceDirection,
                  categoryId,
                  runImmediately
                ) =>
                  handleCreateOrQueueBatchItem({
                    prompt,
                    nicheTag,
                    aspectRatio,
                    negativeSpaceDirection,
                    categoryId,
                    runImmediately,
                  })
                }
              />
            )}

            {activeTab === 'inspector' && (
              <AssetInspectorView
                assets={assets}
                activeAsset={inspectedAsset}
                onSelectAsset={(a) => setInspectedAsset(a)}
                onSaveMetadata={handleSaveMetadata}
                onRegenerateSeo={handleRegenerateSeo}
                onTriggerSftpSingle={(assetId) => handleTriggerSftpUpload([assetId])}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountAutomationView
                accounts={accounts}
                autoPostLogs={autoPostLogs}
                assets={assets}
                isAutoPosting={isUploadingSftp}
                onSelectActiveAccount={handleSelectActiveAccount}
                onUpdateAccount={handleUpdateAccount}
                onCreateAccount={handleCreateAccount}
                onRunAutoPostNow={handleRunAutoPostNow}
              />
            )}

            {activeTab === 'sftp' && (
              <SftpDeliveryView
                assets={assets}
                sftpConfig={sftpConfig}
                sftpLogs={sftpLogs}
                isUploading={isUploadingSftp}
                onSaveSftpConfig={handleSaveSftpConfig}
                onUploadAllReadySftp={() => handleTriggerSftpUpload()}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-6 lg:px-10 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            StockFlow 4K · Otomatisasi Gambar 4K sRGB, EXIF/IPTC, 49 Keyword SEO & Auto-Submit Akun
            Adobe Stock
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Otomatisasi Akun Adobe Stock
            </button>
            <span aria-hidden="true">·</span>
            <a
              href="/api/export/csv"
              download
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Unduh CSV UTF-8 Terbaru
            </a>
          </div>
        </div>
      </footer>

      {/* New Batch 4K Modal */}
      <NewBatchModal
        isOpen={isNewBatchModalOpen}
        defaultAspectRatio={schedule.defaultAspectRatio}
        defaultCategoryId={schedule.defaultCategoryId}
        onClose={() => setIsNewBatchModalOpen(false)}
        onSubmitBatchItem={handleCreateOrQueueBatchItem}
      />
    </div>
  );
}
