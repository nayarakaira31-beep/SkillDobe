import React, { useState } from 'react';
import {
  AdobeAccountProfile,
  AutoPostJobLog,
  StockAsset,
} from '../types/stock.ts';
import {
  UserCheck,
  Plus,
  Send,
  Terminal,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  Download,
  Clock,
  FileCheck2,
} from 'lucide-react';

interface AccountAutomationViewProps {
  accounts: AdobeAccountProfile[];
  autoPostLogs: AutoPostJobLog[];
  assets: StockAsset[];
  isAutoPosting: boolean;
  onSelectActiveAccount: (accountId: string) => Promise<void>;
  onUpdateAccount: (accountId: string, partial: Partial<AdobeAccountProfile>) => Promise<void>;
  onCreateAccount: (payload: {
    accountName: string;
    adobeIdEmail: string;
    contributorId: string;
    sftpUsername: string;
    maxDailySubmissions: number;
    submissionPacingSeconds: number;
  }) => Promise<void>;
  onRunAutoPostNow: (accountId: string, assetIds?: string[]) => Promise<void>;
}

export const AccountAutomationView: React.FC<AccountAutomationViewProps> = ({
  accounts,
  autoPostLogs,
  assets,
  isAutoPosting,
  onSelectActiveAccount,
  onUpdateAccount,
  onCreateAccount,
  onRunAutoPostNow,
}) => {
  const activeAccount = accounts.find((a) => a.active) || accounts[0];
  const [showAddForm, setShowAddForm] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [adobeIdEmail, setAdobeIdEmail] = useState('');
  const [contributorId, setContributorId] = useState('');
  const [sftpUsername, setSftpUsername] = useState('');
  const [maxDailySubmissions, setMaxDailySubmissions] = useState(25);
  const [submissionPacingSeconds, setSubmissionPacingSeconds] = useState(4);

  const readyAssets = assets.filter((a) => a.status === 'ready' || a.status === 'uploaded');
  const inReviewAssets = assets.filter((a) => a.status === 'in_review');

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !adobeIdEmail.trim() || !contributorId.trim()) return;
    await onCreateAccount({
      accountName: accountName.trim(),
      adobeIdEmail: adobeIdEmail.trim(),
      contributorId: contributorId.trim(),
      sftpUsername: sftpUsername.trim() || `${contributorId.trim()}@adobestock`,
      maxDailySubmissions,
      submissionPacingSeconds,
    });
    setAccountName('');
    setAdobeIdEmail('');
    setContributorId('');
    setSftpUsername('');
    setShowAddForm(false);
  };

  if (!activeAccount) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header & Primary Auto-Poster Trigger */}
      <section className="border-b border-slate-800 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-indigo-400 tracking-wide mb-2">
            Otomatisasi End-to-End Akun Adobe Stock Contributor · Auto-Submit Moderasi
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight text-balance">
            Otomatisasi Akun Adobe Stock & Pipeline Auto-Posting
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Kelola profil akun kontributor Adobe Stock, sematkan metadata IPTC/EXIF langsung ke
            berkas 4K JPEG, centang otomatis deklarasi wajib Generative AI, dan kirimkan aset
            langsung ke antrean kurasi moderator (*In Review*).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href={`/api/accounts/${activeAccount.id}/playwright-script`}
            download
            className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            Unduh Bot Script (.mjs)
          </a>

          <button
            type="button"
            onClick={() => onRunAutoPostNow(activeAccount.id)}
            disabled={isAutoPosting || readyAssets.length === 0}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isAutoPosting
              ? 'Menjalankan Pipeline Auto-Post 5 Tahap...'
              : `Auto-Post ${readyAssets.length} Aset 4K ke Akun Aktif`}
          </button>
        </div>
      </section>

      {/* Account Selector Strip & Portfolio Metrics */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Profil Akun Kontributor Adobe Stock Terhubung ({accounts.length} Akun)
          </h2>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-[#111726] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            {showAddForm ? 'Tutup Form Akun' : 'Tambah Akun Adobe Stock'}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddAccountSubmit}
            className="bg-[#111726] border border-slate-700 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-xs font-semibold text-slate-200">
              Hubungkan Profil Kontributor Adobe Stock Baru
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Label Studio</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Contoh: Studio B2B Energy"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Adobe ID</label>
                <input
                  type="email"
                  required
                  value={adobeIdEmail}
                  onChange={(e) => setAdobeIdEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  ID Kontributor Adobe Stock
                </label>
                <input
                  type="text"
                  required
                  value={contributorId}
                  onChange={(e) => setContributorId(e.target.value)}
                  placeholder="Contoh: 209481920"
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Username SFTP</label>
                <input
                  type="text"
                  value={sftpUsername}
                  onChange={(e) => setSftpUsername(e.target.value)}
                  placeholder="Otomatis: ID@adobestock"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 cursor-pointer"
              >
                Simpan & Hubungkan Akun
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const isSelected = acc.id === activeAccount.id;
            return (
              <div
                key={acc.id}
                onClick={() => onSelectActiveAccount(acc.id)}
                className={`p-5 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#111726] border-indigo-500/80'
                    : 'bg-[#111726]/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck
                        className={`w-4 h-4 ${
                          isSelected ? 'text-indigo-400' : 'text-slate-500'
                        }`}
                      />
                      <h3 className="text-sm font-bold text-slate-100">{acc.accountName}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {acc.adobeIdEmail} · ID #{acc.contributorId} · {acc.sftpUsername}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {isSelected ? 'Akun Target Aktif' : 'Klik untuk Aktifkan'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Hari Ini</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-200">
                      {acc.stats.todaySubmittedCount}/{acc.maxDailySubmissions}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">In Review</span>
                    <span className="font-mono tabular-nums font-semibold text-amber-400">
                      {acc.id === activeAccount.id ? inReviewAssets.length : acc.stats.inReviewCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Live Portfolio</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-400">
                      {acc.stats.approvedLiveCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Rasio Lulus</span>
                    <span className="font-mono tabular-nums font-semibold text-indigo-300">
                      {acc.stats.acceptanceRatePct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2-Column Split: Account Auto-Posting Rules (Left) + 5-Step Execution Telemetry Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left (5 Cols): Autonomous Posting Rules & Compliance Toggles */}
        <div className="lg:col-span-5 bg-[#111726] border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100">
                Aturan Auto-Posting Akun ({activeAccount.contributorId})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">Sesi Portal Aktif</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeAccount.autoEmbedIptcExif}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    autoEmbedIptcExif: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <span className="font-medium text-slate-200 block">
                  1. Injeksi Otomatis EXIF/IPTC ke Berkas 4K JPEG
                </span>
                <span className="text-slate-400 text-[11px]">
                  Menanamkan Title (≤70c) dan 49 Keyword langsung ke dalam header biner JPEG
                  sebelum dikirim lewat SFTP agar Adobe Stock langsung membacanya.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeAccount.autoUploadSftp}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    autoUploadSftp: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <span className="font-medium text-slate-200 block">
                  2. Transmisi SFTP Otomatis Saat Lulus QC 4K
                </span>
                <span className="text-slate-400 text-[11px]">
                  Mengirim berkas 4K sRGB ke {activeAccount.sftpHost}:{activeAccount.sftpPort}{' '}
                  begitu pembuatan gambar selesai.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeAccount.autoCheckGenAiDisclosure}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    autoCheckGenAiDisclosure: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <span className="font-medium text-slate-200 block">
                  3. Centang Otomatis "Created using generative AI tools"
                </span>
                <span className="text-slate-400 text-[11px]">
                  Kepatuhan wajib portal Adobe Stock Contributor untuk seluruh aset AI.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeAccount.autoCheckFictionalPeopleProperty}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    autoCheckFictionalPeopleProperty: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <span className="font-medium text-slate-200 block">
                  4. Deklarasi Otomatis "People and property are fictional"
                </span>
                <span className="text-slate-400 text-[11px]">
                  Menghindari permintaan Model/Property Release manual untuk subjek sintetis AI.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeAccount.autoSubmitForReview}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    autoSubmitForReview: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <span className="font-medium text-slate-200 block">
                  5. Auto-Submit ke Antrean Kurasi Moderator (Submit for Review)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Mengirimkan aset dari tab Uploaded Files langsung ke tab In Review tanpa klik
                  manual.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Batas Submisi Harian (Anti-Spam)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={activeAccount.maxDailySubmissions}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    maxDailySubmissions: Number(e.target.value) || 25,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Jeda Antar-Post (Detik)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={activeAccount.submissionPacingSeconds}
                onChange={(e) =>
                  onUpdateAccount(activeAccount.id, {
                    submissionPacingSeconds: Number(e.target.value) || 4,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Proteksi Rate-Limit Akun Aktif
            </span>
            <span className="font-mono">
              Sinkron terakhir:{' '}
              {new Date(activeAccount.lastSyncedAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Right (7 Cols): 5-Step Pipeline Execution Log */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  Log Eksekusi Pipeline Auto-Posting 5 Tahap
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rincian tahapan injeksi EXIF, SFTP, pengikatan CSV, deklarasi AI, dan submisi
                  moderasi Adobe Stock.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-indigo-400">
                {autoPostLogs.length} Job Selesai
              </span>
            </div>

            {autoPostLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                Belum ada riwayat auto-posting. Klik tombol Auto-Post di kanan atas untuk mengirim
                aset 4K ke antrean moderasi Adobe Stock.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-[560px] overflow-y-auto">
                {autoPostLogs.map((job) => (
                  <div key={job.id} className="p-5 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-mono font-semibold text-slate-100">
                          {job.filename}
                        </span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs font-mono text-indigo-400">
                          ID Portal: {job.adobePortalAssetId}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{job.durationMs} ms</span>
                        <span>·</span>
                        <span>
                          {new Date(job.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-3.5 space-y-2">
                      {job.steps.map((st) => (
                        <div
                          key={st.stepNumber}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-slate-200">
                                0{st.stepNumber}. {st.stepName}:
                              </span>{' '}
                              <span className="text-slate-400">{st.detail}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
