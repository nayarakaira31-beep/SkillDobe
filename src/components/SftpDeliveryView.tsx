import React, { useState } from 'react';
import {
  SftpConnectionConfig,
  SftpLogEntry,
  StockAsset,
} from '../types/stock.ts';
import {
  Server,
  UploadCloud,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface SftpDeliveryViewProps {
  assets: StockAsset[];
  sftpConfig: SftpConnectionConfig;
  sftpLogs: SftpLogEntry[];
  isUploading: boolean;
  onSaveSftpConfig: (config: Partial<SftpConnectionConfig>) => Promise<void>;
  onUploadAllReadySftp: () => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.00 MB';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const SftpDeliveryView: React.FC<SftpDeliveryViewProps> = ({
  assets,
  sftpConfig,
  sftpLogs,
  isUploading,
  onSaveSftpConfig,
  onUploadAllReadySftp,
}) => {
  const [host, setHost] = useState(sftpConfig.host);
  const [port, setPort] = useState(sftpConfig.port);
  const [username, setUsername] = useState(sftpConfig.username);
  const [password, setPassword] = useState('');
  const [remoteDirectory, setRemoteDirectory] = useState(sftpConfig.remoteDirectory || '/');
  const [simulationMode, setSimulationMode] = useState(sftpConfig.simulationMode);
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  const readyOrUploadedAssets = assets.filter(
    (a) => a.status === 'ready' || a.status === 'uploaded'
  );

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSftpConfig({
      host,
      port: Number(port) || 22,
      username,
      password: password || undefined,
      remoteDirectory,
      simulationMode,
    });
    setPassword('');
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="border-b border-slate-800 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-indigo-400 tracking-wide mb-2">
            Integrasi Protokol SFTP Port 22 & Sinkronisasi CSV UTF-8
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">
            Distribusi SFTP Adobe Stock Contributor & Ekspor CSV Metadata
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Unggah seluruh gambar 4K sRGB langsung ke server{' '}
            <code className="font-mono text-slate-200">sftp.contributor.adobestock.com</code> dan
            unduh tabel CSV UTF-8 dengan format kolom resmi Adobe Stock untuk mengikat judul, 49
            kata kunci, dan kategori secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="/api/export/csv"
            download
            className="px-4 py-2.5 text-xs font-semibold text-slate-100 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Unduh CSV Adobe Stock (UTF-8)
          </a>

          <button
            type="button"
            onClick={onUploadAllReadySftp}
            disabled={isUploading || readyOrUploadedAssets.length === 0}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            {isUploading
              ? 'Mengirim Berkas 4K via SFTP...'
              : `Transmisikan ${readyOrUploadedAssets.length} Aset 4K ke SFTP`}
          </button>
        </div>
      </section>

      {/* 2-Column Layout: SFTP Connection Settings + Live CSV Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: SFTP Credentials Form (5 Cols) */}
        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-5 bg-[#111726] border border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100">
                Kredensial SFTP Kontributor Adobe Stock
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">SSH-2 / Port 22</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Alamat Host SFTP</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Adobe Stock SFTP Username / ID Kontributor
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: 209481920@adobestock"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label className="text-slate-400">Password SFTP (Dari Portal Kontributor)</label>
              {sftpConfig.hasSavedPassword && (
                <span className="text-emerald-400 text-[11px]">Password Tersimpan di Server</span>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password SFTP yang digenerate di Adobe Stock..."
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Direktori Target Remote</label>
            <input
              type="text"
              value={remoteDirectory}
              onChange={(e) => setRemoteDirectory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simulationMode}
                onChange={(e) => setSimulationMode(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              <div>
                <span className="font-medium text-slate-200 block">
                  Mode Verifikasi Dry-Run SFTP
                </span>
                <span className="text-slate-400 text-[11px]">
                  Aktifkan saat menguji alur kerja tanpa password SFTP live. Nonaktifkan untuk
                  membuka soket SSH-2 langsung ke server Adobe Stock.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            {configSavedNotice ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Konfigurasi SFTP diperbarui
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Kredensial hanya disimpan di server
              </span>
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Konfigurasi SFTP
            </button>
          </div>
        </form>

        {/* Right: Official CSV Metadata Structure Preview & SFTP Logs (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* CSV Structure Preview Table */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  Pratinjau Struktur CSV Metadata Resmi Adobe Stock (UTF-8)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Format wajib: <code className="font-mono">Filename,Title,Keywords,Category,Releases</code>
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {readyOrUploadedAssets.length} Baris Siap Ekspor
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950/60">
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Title (≤70c)</th>
                    <th className="py-2.5 px-3">Keywords (49 Priority Ordered)</th>
                    <th className="py-2.5 px-3 text-right">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {readyOrUploadedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-indigo-300 whitespace-nowrap">
                        {asset.filename}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 max-w-[200px] truncate">
                        {asset.metadata.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] max-w-[240px] truncate">
                        {asset.metadata.keywords.join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {asset.metadata.categoryId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SFTP Transmission Log Table */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100">
                Riwayat Transmisi SFTP ({sftpConfig.host})
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {sftpLogs.length} Transmisi Tercatat
              </span>
            </div>

            {sftpLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada riwayat pengiriman SFTP.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto">
                {sftpLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      {log.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-mono font-medium text-slate-100">
                          {log.filename}{' '}
                          <span className="text-slate-500 font-normal">
                            · {formatBytes(log.fileSizeBytes)} · {log.durationMs} ms
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{log.message}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
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
