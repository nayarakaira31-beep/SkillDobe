export type AspectRatioOption = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

export type AssetPipelineStatus =
  | 'queued'
  | 'generating_image'
  | 'processing_4k_qc'
  | 'generating_seo'
  | 'ready'
  | 'uploading_sftp'
  | 'uploaded'
  | 'in_review'
  | 'approved_live'
  | 'failed';

export interface AdobeStockCategory {
  id: number;
  name: string;
  indonesianName: string;
}

export const ADOBE_STOCK_CATEGORIES: AdobeStockCategory[] = [
  { id: 1, name: 'Animals', indonesianName: 'Hewan & Satwa' },
  { id: 2, name: 'Buildings and Architecture', indonesianName: 'Bangunan & Arsitektur' },
  { id: 3, name: 'Business', indonesianName: 'Bisnis & Korporat' },
  { id: 4, name: 'Drinks', indonesianName: 'Minuman' },
  { id: 5, name: 'The Environment', indonesianName: 'Lingkungan & Keberlanjutan' },
  { id: 6, name: 'States of Mind', indonesianName: 'Emosi & Kesehatan Mental' },
  { id: 7, name: 'Food', indonesianName: 'Makanan & Kuliner' },
  { id: 8, name: 'Graphic Resources', indonesianName: 'Sumber Daya Grafis & Latar' },
  { id: 9, name: 'Hobbies and Leisure', indonesianName: 'Hobi & Gaya Hidup' },
  { id: 10, name: 'Industry', indonesianName: 'Industri & Manufaktur' },
  { id: 11, name: 'Landscapes', indonesianName: 'Bentang Alam & Lanskap' },
  { id: 12, name: 'Lifestyle', indonesianName: 'Aktivitas Sehari-hari' },
  { id: 13, name: 'People', indonesianName: 'Manusia & Potret' },
  { id: 14, name: 'Plants and Flowers', indonesianName: 'Tanaman & Botani' },
  { id: 15, name: 'Culture and Religion', indonesianName: 'Budaya & Tradisi' },
  { id: 16, name: 'Science', indonesianName: 'Sains & Bioteknologi' },
  { id: 17, name: 'Social Issues', indonesianName: 'Isu Sosial' },
  { id: 18, name: 'Sports', indonesianName: 'Olahraga & Kebugaran' },
  { id: 19, name: 'Technology', indonesianName: 'Teknologi & Masa Depan' },
  { id: 20, name: 'Transport', indonesianName: 'Transportasi & Mobilitas' },
  { id: 21, name: 'Travel', indonesianName: 'Pariwisata & Destinasi' },
];

export const BANNED_ADOBE_STOCK_TERMS: string[] = [
  '4k',
  '8k',
  'uhd',
  'ultra hd',
  'hd',
  'photorealistic',
  'hyperrealistic',
  'unreal engine',
  'octane render',
  'vray',
  'midjourney',
  'stable diffusion',
  'dall-e',
  'dalle',
  'firefly',
  'adobe firefly',
  'canon',
  'nikon',
  'sony alpha',
  'leica',
  'hasselblad',
  'fujifilm',
  'volumetric lighting',
  'ray tracing',
  '--ar',
  '--v',
  '--q',
  '--stylize',
];

export interface TechnicalSpecs4K {
  width: number;
  height: number;
  megapixels: number;
  fileSizeBytes: number;
  colorSpace: 'sRGB';
  format: 'JPEG';
  quality: number;
  qcScore: number;
  sharpnessScore: number;
  dynamicRangeScore: number;
  artifactFree: boolean;
  passes4MpMinimum: boolean;
  isTrue4K: boolean;
  iptcExifEmbedded?: boolean;
  engineUsed: string;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  filenameValid: boolean;
  titleLengthValid: boolean;
  titleNoCommas: boolean;
  keywordCountValid: boolean;
  noBannedTerms: boolean;
  sanitizedTermsRemoved: string[];
  warnings: string[];
}

export interface AdobeStockMetadata {
  title: string;
  keywords: string[];
  categoryId: number;
  releases: string;
  isGenerativeAI: boolean;
  fictionalPeoplePropertyDeclaration: boolean;
  compliance: ComplianceCheckResult;
}

export interface StockAsset {
  id: string;
  filename: string;
  prompt: string;
  negativeSpaceDirection: string;
  nicheTag: string;
  aspectRatio: AspectRatioOption;
  status: AssetPipelineStatus;
  createdAt: string;
  updatedAt: string;
  uploadedAt?: string;
  submittedForReviewAt?: string;
  adobePortalAssetId?: string;
  accountId?: string;
  imageUrl: string;
  technicalSpecs: TechnicalSpecs4K;
  metadata: AdobeStockMetadata;
  errorMessage?: string;
}

export interface MarketTrendIdea {
  id: string;
  nicheTitle: string;
  commercialBuyerIntent: string;
  demandLevel: 'Sangat Tinggi' | 'Tinggi' | 'Menengah';
  competitionLevel: 'Rendah' | 'Sedang' | 'Tinggi';
  recommendedAspectRatio: AspectRatioOption;
  categoryId: number;
  suggestedPrompt: string;
  negativeSpaceNote: string;
  topSeedKeywords: string[];
  seasonalWindow: string;
}

export interface BatchScheduleConfig {
  enabled: boolean;
  cronTime: string;
  dailyBatchSize: number;
  defaultAspectRatio: AspectRatioOption;
  defaultCategoryId: number;
  autoSftpUpload: boolean;
  autoSubmitPortalReview: boolean;
  preferFreeApiEngine: boolean;
  targetNiches: string[];
  lastRunAt: string | null;
  nextRunAt: string;
}

export interface SftpConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  hasSavedPassword?: boolean;
  remoteDirectory: string;
  simulationMode: boolean;
}

export interface SftpLogEntry {
  id: string;
  timestamp: string;
  filename: string;
  assetId: string;
  fileSizeBytes: number;
  host: string;
  status: 'success' | 'simulated_success' | 'error';
  message: string;
  durationMs: number;
}

export interface AdobeAccountProfile {
  id: string;
  accountName: string;
  adobeIdEmail: string;
  contributorId: string;
  sftpHost: string;
  sftpPort: number;
  sftpUsername: string;
  hasSftpPassword: boolean;
  portalSessionConnected: boolean;
  autoEmbedIptcExif: boolean;
  autoUploadSftp: boolean;
  autoCheckGenAiDisclosure: boolean;
  autoCheckFictionalPeopleProperty: boolean;
  autoSubmitForReview: boolean;
  maxDailySubmissions: number;
  submissionPacingSeconds: number;
  active: boolean;
  lastSyncedAt: string;
  stats: {
    todaySubmittedCount: number;
    inReviewCount: number;
    approvedLiveCount: number;
    acceptanceRatePct: number;
  };
}

export interface AutoPostPipelineStep {
  stepNumber: number;
  stepName: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  detail: string;
}

export interface AutoPostJobLog {
  id: string;
  timestamp: string;
  accountId: string;
  accountName: string;
  assetId: string;
  filename: string;
  adobePortalAssetId: string;
  overallStatus: 'submitted_for_review' | 'approved_live' | 'failed';
  durationMs: number;
  steps: AutoPostPipelineStep[];
}
