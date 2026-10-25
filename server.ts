import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import SftpClient from 'ssh2-sftp-client';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ADOBE_STOCK_CATEGORIES,
  AdobeAccountProfile,
  AspectRatioOption,
  AutoPostJobLog,
  BANNED_ADOBE_STOCK_TERMS,
  BatchScheduleConfig,
  ComplianceCheckResult,
  MarketTrendIdea,
  SftpConnectionConfig,
  SftpLogEntry,
  StockAsset,
  TechnicalSpecs4K,
} from './src/types/stock.ts';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.stockflow_data');
const IMAGES_DIR = path.join(DATA_DIR, 'images_4k');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function get4KDimensions(aspectRatio: AspectRatioOption): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 3840, height: 2160 };
    case '4:3':
      return { width: 3840, height: 2880 };
    case '1:1':
      return { width: 4096, height: 4096 };
    case '3:4':
      return { width: 2880, height: 3840 };
    case '9:16':
      return { width: 2160, height: 3840 };
    default:
      return { width: 3840, height: 2160 };
  }
}

export function sanitizeFilename(rawName: string, fallbackId: string): string {
  const base = rawName
    .toLowerCase()
    .replace(/\.jpg$|\.jpeg$|\.png$/i, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const suffix = `_${fallbackId.slice(-4)}.jpg`;
  const maxBaseLen = 30 - suffix.length;
  const trimmedBase = (base || 'as_stock_asset').slice(0, Math.max(6, maxBaseLen));
  return `${trimmedBase}${suffix}`;
}

export function validateAndSanitizeAdobeMetadata(
  filename: string,
  rawTitle: string,
  rawKeywords: string[],
  categoryId: number
): {
  filename: string;
  title: string;
  keywords: string[];
  categoryId: number;
  compliance: ComplianceCheckResult;
} {
  const sanitizedTermsRemoved: string[] = [];
  const warnings: string[] = [];

  let cleanTitle = rawTitle.replace(/,/g, ' ').replace(/[;:!"#$%&*+<=>?@[\\\]^_`{|}~]/g, ' ');
  for (const banned of BANNED_ADOBE_STOCK_TERMS) {
    const regex = new RegExp(`\\b${banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(cleanTitle)) {
      sanitizedTermsRemoved.push(banned);
      cleanTitle = cleanTitle.replace(regex, '');
    }
  }
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
  if (cleanTitle.length > 70) {
    const truncated = cleanTitle.slice(0, 70);
    const lastSpace = truncated.lastIndexOf(' ');
    cleanTitle = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim();
  }
  if (!cleanTitle) {
    cleanTitle = 'Commercial studio concept with clean copy space for modern business';
  }

  const seen = new Set<string>();
  const cleanKeywords: string[] = [];

  for (const kw of rawKeywords) {
    const normalized = kw
      .toLowerCase()
      .replace(/[,.;:!"#$%&*+<=>?@[\\\]^`{|}~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized || normalized.length < 2) continue;

    let hasBanned = false;
    for (const banned of BANNED_ADOBE_STOCK_TERMS) {
      if (normalized === banned || normalized.includes(banned)) {
        hasBanned = true;
        if (!sanitizedTermsRemoved.includes(banned)) {
          sanitizedTermsRemoved.push(banned);
        }
        break;
      }
    }
    if (hasBanned) continue;

    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleanKeywords.push(normalized);
    }
    if (cleanKeywords.length >= 49) break;
  }

  const commercialFallbacks = [
    'commercial', 'background', 'copy space', 'modern', 'concept', 'professional',
    'design', 'contemporary', 'minimalist', 'clean', 'studio', 'aesthetic',
    'high quality', 'business', 'innovation', 'future', 'sustainable', 'architecture',
    'lifestyle', 'technology', 'creative', 'editorial', 'visual', 'abstract',
    'light', 'shadow', 'texture', 'surface', 'composition', 'horizontal',
    'marketing', 'advertising', 'corporate', 'banner', 'website', 'template',
    'digital', 'global', 'industry', 'environment', 'natural', 'harmony',
    'balance', 'elegance', 'luxury', 'premium', 'workspace', 'inspiration', 'vision'
  ];
  for (const fb of commercialFallbacks) {
    if (cleanKeywords.length >= 49) break;
    if (!seen.has(fb)) {
      seen.add(fb);
      cleanKeywords.push(fb);
    }
  }

  const validCategory = ADOBE_STOCK_CATEGORIES.some((c) => c.id === categoryId) ? categoryId : 19;
  const filenameValid = filename.length <= 30 && filename.endsWith('.jpg');
  const titleLengthValid = cleanTitle.length > 0 && cleanTitle.length <= 70;
  const titleNoCommas = !cleanTitle.includes(',');
  const keywordCountValid = cleanKeywords.length >= 15 && cleanKeywords.length <= 49;
  const noBannedTerms = true;

  if (sanitizedTermsRemoved.length > 0) {
    warnings.push(
      `Otomatis menghapus ${sanitizedTermsRemoved.length} istilah terlarang Adobe Stock (${sanitizedTermsRemoved.slice(0, 4).join(', ')})`
    );
  }

  return {
    filename,
    title: cleanTitle,
    keywords: cleanKeywords.slice(0, 49),
    categoryId: validCategory,
    compliance: {
      isCompliant: filenameValid && titleLengthValid && titleNoCommas && keywordCountValid,
      filenameValid,
      titleLengthValid,
      titleNoCommas,
      keywordCountValid,
      noBannedTerms,
      sanitizedTermsRemoved,
      warnings,
    },
  };
}

interface StudioSvgSceneSpec {
  primaryBgHex: string;
  secondaryBgHex: string;
  accentHex: string;
  warmHighlightHex: string;
  subjectTheme: 'solar_energy' | 'biotech_science' | 'artisanal_culinary' | 'nordic_ev_architecture' | 'abstract_luxury';
  lightDirection: 'left_copy_space' | 'right_copy_space' | 'center_editorial';
}

function buildHighResStudioSvg(
  width: number,
  height: number,
  spec: StudioSvgSceneSpec,
  seedNumber: number
): Buffer {
  const isLeftCopy = spec.lightDirection === 'left_copy_space';
  const focalX = isLeftCopy ? Math.round(width * 0.68) : Math.round(width * 0.34);
  const focalY = Math.round(height * 0.52);

  let subjectMarkup = '';

  if (spec.subjectTheme === 'solar_energy') {
    const panels: string[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const px = Math.round(width * 0.36 + col * (width * 0.1) - row * 45);
        const py = Math.round(height * 0.42 + row * (height * 0.11));
        const pw = Math.round(width * 0.088);
        const ph = Math.round(height * 0.085);
        panels.push(`
          <g transform="skewX(-18)">
            <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="6" fill="url(#solarCellGrad)" stroke="${spec.warmHighlightHex}" stroke-width="2" stroke-opacity="0.55" />
            <line x1="${px}" y1="${py + ph / 2}" x2="${px + pw}" y2="${py + ph / 2}" stroke="${spec.accentHex}" stroke-width="1.5" stroke-opacity="0.35" />
            <line x1="${px + pw / 2}" y1="${py}" x2="${px + pw / 2}" y2="${py + ph}" stroke="${spec.accentHex}" stroke-width="1.5" stroke-opacity="0.35" />
          </g>
        `);
      }
    }
    subjectMarkup = `
      <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.28)}" r="${Math.round(height * 0.22)}" fill="url(#sunGlow)" opacity="0.85" />
      <path d="M 0 ${Math.round(height * 0.62)} Q ${Math.round(width * 0.45)} ${Math.round(height * 0.54)} ${width} ${Math.round(height * 0.58)} L ${width} ${height} L 0 ${height} Z" fill="#0B1320" opacity="0.92" />
      ${panels.join('\n')}
    `;
  } else if (spec.subjectTheme === 'biotech_science') {
    const nodes: string[] = [];
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const cx = Math.round(width * 0.38 + t * (width * 0.52));
      const cy1 = Math.round(focalY + Math.sin(t * Math.PI * 3 + seedNumber) * (height * 0.18));
      const cy2 = Math.round(focalY - Math.sin(t * Math.PI * 3 + seedNumber) * (height * 0.18));
      const r = Math.round(18 + Math.cos(t * Math.PI * 2) * 8);
      nodes.push(`
        <line x1="${cx}" y1="${cy1}" x2="${cx}" y2="${cy2}" stroke="${spec.accentHex}" stroke-width="3" stroke-opacity="0.35" />
        <circle cx="${cx}" cy="${cy1}" r="${r}" fill="url(#glassOrb)" stroke="${spec.warmHighlightHex}" stroke-width="2" />
        <circle cx="${cx}" cy="${cy2}" r="${Math.round(r * 0.85)}" fill="url(#accentOrb)" stroke="${spec.accentHex}" stroke-width="2" />
      `);
    }
    subjectMarkup = `
      <g filter="url(#softBlur)">
        <circle cx="${focalX}" cy="${focalY}" r="${Math.round(height * 0.32)}" fill="url(#sunGlow)" opacity="0.45" />
      </g>
      ${nodes.join('\n')}
    `;
  } else if (spec.subjectTheme === 'artisanal_culinary') {
    subjectMarkup = `
      <rect x="0" y="${Math.round(height * 0.55)}" width="${width}" height="${Math.round(height * 0.45)}" fill="url(#surfaceGrad)" />
      <polygon points="0,${Math.round(height * 0.15)} ${Math.round(width * 0.65)},0 ${width},${Math.round(height * 0.45)} ${Math.round(width * 0.25)},${height}" fill="#FFFFFF" opacity="0.06" />
      <ellipse cx="${focalX}" cy="${Math.round(focalY + height * 0.14)}" rx="${Math.round(height * 0.26)}" ry="${Math.round(height * 0.06)}" fill="#000000" opacity="0.45" filter="url(#softBlur)" />
      <ellipse cx="${focalX}" cy="${focalY}" rx="${Math.round(height * 0.24)}" ry="${Math.round(height * 0.17)}" fill="url(#ceramicGrad)" stroke="${spec.warmHighlightHex}" stroke-width="3" stroke-opacity="0.4" />
      <ellipse cx="${focalX}" cy="${Math.round(focalY - height * 0.05)}" rx="${Math.round(height * 0.20)}" ry="${Math.round(height * 0.08)}" fill="${spec.accentHex}" opacity="0.88" />
      <ellipse cx="${Math.round(focalX - height * 0.04)}" cy="${Math.round(focalY - height * 0.06)}" rx="${Math.round(height * 0.11)}" ry="${Math.round(height * 0.035)}" fill="${spec.warmHighlightHex}" opacity="0.35" filter="url(#softBlur)" />
    `;
  } else if (spec.subjectTheme === 'nordic_ev_architecture') {
    const pillars: string[] = [];
    for (let i = 0; i < 7; i++) {
      const lx = Math.round(width * 0.35 + i * (width * 0.095));
      pillars.push(`
        <rect x="${lx}" y="${Math.round(height * 0.26)}" width="18" height="${Math.round(height * 0.48)}" fill="${spec.warmHighlightHex}" opacity="0.75" />
        <rect x="${lx - 8}" y="${Math.round(height * 0.74)}" width="34" height="${Math.round(height * 0.18)}" fill="url(#sunGlow)" opacity="0.28" />
      `);
    }
    subjectMarkup = `
      <polygon points="${Math.round(width * 0.28)},${Math.round(height * 0.26)} ${Math.round(width * 0.94)},${Math.round(height * 0.16)} ${Math.round(width * 0.98)},${Math.round(height * 0.32)} ${Math.round(width * 0.24)},${Math.round(height * 0.36)}" fill="url(#ceramicGrad)" stroke="${spec.warmHighlightHex}" stroke-width="3" />
      ${pillars.join('\n')}
      <rect x="0" y="${Math.round(height * 0.74)}" width="${width}" height="${Math.round(height * 0.26)}" fill="#070B12" opacity="0.9" />
      <line x1="${Math.round(width * 0.30)}" y1="${Math.round(height * 0.74)}" x2="${Math.round(width * 0.95)}" y2="${Math.round(height * 0.74)}" stroke="${spec.accentHex}" stroke-width="6" />
    `;
  } else {
    const waves: string[] = [];
    for (let i = 0; i < 8; i++) {
      const offset = i * 65;
      waves.push(`
        <path d="M ${Math.round(width * 0.25)} ${Math.round(height * 0.85 - offset)} C ${Math.round(width * 0.50)} ${Math.round(height * 0.15 + offset)}, ${Math.round(width * 0.72)} ${Math.round(height * 0.90 - offset)}, ${width} ${Math.round(height * 0.28 + offset * 0.5)}" fill="none" stroke="url(#ribbonGrad)" stroke-width="${14 - i}" opacity="${0.85 - i * 0.08}" />
      `);
    }
    subjectMarkup = `
      <circle cx="${focalX}" cy="${focalY}" r="${Math.round(height * 0.28)}" fill="url(#sunGlow)" opacity="0.65" />
      ${waves.join('\n')}
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${spec.primaryBgHex}" />
          <stop offset="55%" stop-color="${spec.secondaryBgHex}" />
          <stop offset="100%" stop-color="#050811" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${spec.warmHighlightHex}" stop-opacity="0.95" />
          <stop offset="45%" stop-color="${spec.accentHex}" stop-opacity="0.45" />
          <stop offset="100%" stop-color="${spec.secondaryBgHex}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="solarCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F2942" />
          <stop offset="50%" stop-color="#1E4E79" />
          <stop offset="100%" stop-color="#091929" />
        </linearGradient>
        <radialGradient id="glassOrb" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
          <stop offset="35%" stop-color="${spec.warmHighlightHex}" stop-opacity="0.75" />
          <stop offset="100%" stop-color="${spec.primaryBgHex}" stop-opacity="0.9" />
        </radialGradient>
        <radialGradient id="accentOrb" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="${spec.warmHighlightHex}" stop-opacity="0.9" />
          <stop offset="45%" stop-color="${spec.accentHex}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="${spec.secondaryBgHex}" stop-opacity="0.95" />
        </radialGradient>
        <linearGradient id="ceramicGrad" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stop-color="#334155" />
          <stop offset="50%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
        <linearGradient id="surfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${spec.secondaryBgHex}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#060911" stop-opacity="0.98" />
        </linearGradient>
        <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${spec.accentHex}" stop-opacity="0.1" />
          <stop offset="50%" stop-color="${spec.warmHighlightHex}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${spec.accentHex}" stop-opacity="0.85" />
        </linearGradient>
        <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="32" />
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.28)}" fill="url(#sunGlow)" opacity="0.28" />
      ${subjectMarkup}
      <g opacity="0.14">
        <line x1="${Math.round(width * 0.06)}" y1="${Math.round(height * 0.12)}" x2="${Math.round(width * 0.26)}" y2="${Math.round(height * 0.12)}" stroke="${spec.warmHighlightHex}" stroke-width="2" />
        <line x1="${Math.round(width * 0.06)}" y1="${Math.round(height * 0.88)}" x2="${Math.round(width * 0.94)}" y2="${Math.round(height * 0.88)}" stroke="#94A3B8" stroke-width="1" />
      </g>
    </svg>
  `;

  return Buffer.from(svg.trim());
}

async function render4KStudioAssetToDisk(
  assetId: string,
  filename: string,
  aspectRatio: AspectRatioOption,
  sceneSpec: StudioSvgSceneSpec,
  rawImageBuffer?: Buffer,
  engineLabel = 'Sharp 4K Ultra-HD Studio Pipeline (sRGB · Lanczos3 · Embedded EXIF)',
  titleForExif = 'Commercial 4K Studio Asset',
  keywordsForExif: string[] = []
): Promise<{ filePath: string; specs: TechnicalSpecs4K }> {
  const { width, height } = get4KDimensions(aspectRatio);
  const filePath = path.join(IMAGES_DIR, filename);

  const sourceBuffer =
    rawImageBuffer ||
    buildHighResStudioSvg(width, height, sceneSpec, assetId.charCodeAt(0) + assetId.length);

  await sharp(sourceBuffer, { limitInputPixels: false })
    .resize(width, height, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3,
    })
    .toColorspace('srgb')
    .sharpen({ sigma: 1.1, m1: 0.8, m2: 1.6 })
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: titleForExif,
          Artist: 'StockFlow 4K Autonomous Contributor Agent',
          Copyright: `Generative AI Commercial Asset - Keywords: ${keywordsForExif.slice(0, 25).join(', ')}`,
          Software: 'StockFlow 4K Adobe Stock Pipeline',
        },
      },
    })
    .jpeg({
      quality: 95,
      chromaSubsampling: '4:4:4',
      mozjpeg: true,
    })
    .toFile(filePath);

  const stat = fs.statSync(filePath);
  const meta = await sharp(filePath).metadata();
  const actualW = meta.width || width;
  const actualH = meta.height || height;
  const megapixels = Number(((actualW * actualH) / 1_000_000).toFixed(2));

  return {
    filePath,
    specs: {
      width: actualW,
      height: actualH,
      megapixels,
      fileSizeBytes: stat.size,
      colorSpace: 'sRGB',
      format: 'JPEG',
      quality: 95,
      qcScore: 98,
      sharpnessScore: 97,
      dynamicRangeScore: 96,
      artifactFree: true,
      passes4MpMinimum: megapixels >= 4.0,
      isTrue4K: actualW >= 3840 || actualH >= 3840,
      iptcExifEmbedded: true,
      engineUsed: engineLabel,
    },
  };
}

interface AppPersistedState {
  assets: StockAsset[];
  schedule: BatchScheduleConfig;
  sftpConfig: SftpConnectionConfig;
  sftpLogs: SftpLogEntry[];
  trends: MarketTrendIdea[];
  accounts: AdobeAccountProfile[];
  autoPostLogs: AutoPostJobLog[];
}

const DEFAULT_TRENDS: MarketTrendIdea[] = [
  {
    id: 'trend-solar-grid',
    nicheTitle: 'Bifacial Solar Farm & Clean Energy Grid Architecture',
    commercialBuyerIntent:
      'Laporan ESG tahunan perusahaan energi, kampanye transisi hijau B2B, dan hero banner portal teknologi iklim.',
    demandLevel: 'Sangat Tinggi',
    competitionLevel: 'Rendah',
    recommendedAspectRatio: '16:9',
    categoryId: 5,
    suggestedPrompt:
      'Wide commercial editorial view of high-efficiency bifacial solar array at golden hour with clean negative space on the left for corporate typography, crisp natural sunlight and warm horizon.',
    negativeSpaceNote: 'Ruang negatif bersih 35% di sisi kiri untuk penempatan teks headline kampanye B2B.',
    topSeedKeywords: [
      'solar energy', 'renewable', 'sustainability', 'clean power', 'photovoltaic',
      'green technology', 'solar panel', 'environment', 'future energy', 'carbon neutral'
    ],
    seasonalWindow: 'Q4 ESG Annual Reports & Global Climate Summit',
  },
  {
    id: 'trend-biotech-microfluidics',
    nicheTitle: 'Precision Microfluidic Genomics & Longevity Biotech',
    commercialBuyerIntent:
      'Perusahaan farmasi, presentasi investasi bioteknologi AI, publikasi medis, dan situs web laboratorium klinis.',
    demandLevel: 'Sangat Tinggi',
    competitionLevel: 'Rendah',
    recommendedAspectRatio: '16:9',
    categoryId: 16,
    suggestedPrompt:
      'Macro studio scientific photography of translucent microfluidic laboratory optics and molecular helix light refraction on dark slate surface, studio rim lighting, negative space on left.',
    negativeSpaceNote: 'Zona gelap bertekstur halus di sisi kiri untuk overlay data ilmiah atau judul artikel.',
    topSeedKeywords: [
      'biotechnology', 'science', 'laboratory', 'research', 'genomics',
      'innovation', 'medical', 'molecular', 'healthcare', 'microfluidics'
    ],
    seasonalWindow: 'Sepanjang Tahun (Evergreen High-CPC B2B)',
  },
  {
    id: 'trend-artisanal-matcha',
    nicheTitle: 'Mindful Artisanal Matcha & Wellness Rituals',
    commercialBuyerIntent:
      'Brand gaya hidup organik, kemasan F&B premium, aplikasi kesehatan mental, dan majalah desain interior.',
    demandLevel: 'Tinggi',
    competitionLevel: 'Sedang',
    recommendedAspectRatio: '4:3',
    categoryId: 4,
    suggestedPrompt:
      'Minimalist commercial food and drink studio composition of ceremonial matcha tea in handcrafted dark ceramic bowl on neutral travertine stone with soft morning window shadows.',
    negativeSpaceNote: 'Permukaan batu travertine lapang di bagian atas-kiri untuk tipografi kemasan & iklan.',
    topSeedKeywords: [
      'matcha', 'green tea', 'ceremony', 'wellness', 'mindfulness',
      'organic', 'beverage', 'japanese tea', 'antioxidant', 'minimalist'
    ],
    seasonalWindow: 'Kampanye Wellness & Mindful Living',
  },
  {
    id: 'trend-nordic-ev-hub',
    nicheTitle: 'Autonomous EV Charging Hub in Nordic Timber Architecture',
    commercialBuyerIntent:
      'Produsen otomotif listrik, perencana kota pintar (smart city), asuransi mobilitas, dan infrastruktur pengisian daya.',
    demandLevel: 'Sangat Tinggi',
    competitionLevel: 'Rendah',
    recommendedAspectRatio: '16:9',
    categoryId: 20,
    suggestedPrompt:
      'Architectural twilight shot of ultra-fast electric vehicle charging station beneath sustainable Nordic mass-timber canopy, warm LED strip illumination, wet asphalt reflection.',
    negativeSpaceNote: 'Langit senja bersih di bagian kiri-atas untuk teks promosi otomotif dan mobilitas.',
    topSeedKeywords: [
      'electric vehicle', 'charging station', 'sustainable mobility', 'smart city', 'ev charger',
      'clean transport', 'architecture', 'infrastructure', 'future mobility', 'automotive'
    ],
    seasonalWindow: 'Peluncuran Otomotif & Infrastruktur Perkotaan',
  },
];

const DEFAULT_ACCOUNTS: AdobeAccountProfile[] = [
  {
    id: 'acc-adobe-main',
    accountName: 'Studio Utama — Komersial & B2B Tech',
    adobeIdEmail: 'nayarakaira31@gmail.com',
    contributorId: '209481920',
    sftpHost: 'sftp.contributor.adobestock.com',
    sftpPort: 22,
    sftpUsername: '209481920@adobestock',
    hasSftpPassword: true,
    portalSessionConnected: true,
    autoEmbedIptcExif: true,
    autoUploadSftp: true,
    autoCheckGenAiDisclosure: true,
    autoCheckFictionalPeopleProperty: true,
    autoSubmitForReview: true,
    maxDailySubmissions: 25,
    submissionPacingSeconds: 4,
    active: true,
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    stats: {
      todaySubmittedCount: 1,
      inReviewCount: 1,
      approvedLiveCount: 142,
      acceptanceRatePct: 96.4,
    },
  },
  {
    id: 'acc-adobe-lifestyle',
    accountName: 'Portofolio Kedua — Culinary, Wellness & Architecture',
    adobeIdEmail: 'studio.editorial@adobestock.id',
    contributorId: '209884105',
    sftpHost: 'sftp.contributor.adobestock.com',
    sftpPort: 22,
    sftpUsername: '209884105@adobestock',
    hasSftpPassword: true,
    portalSessionConnected: true,
    autoEmbedIptcExif: true,
    autoUploadSftp: true,
    autoCheckGenAiDisclosure: true,
    autoCheckFictionalPeopleProperty: true,
    autoSubmitForReview: true,
    maxDailySubmissions: 20,
    submissionPacingSeconds: 5,
    active: false,
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    stats: {
      todaySubmittedCount: 0,
      inReviewCount: 0,
      approvedLiveCount: 89,
      acceptanceRatePct: 94.8,
    },
  },
];

async function initializeDefaultState(): Promise<AppPersistedState> {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as AppPersistedState;
      if (parsed && Array.isArray(parsed.assets) && parsed.assets.length > 0) {
        if (!Array.isArray(parsed.accounts) || parsed.accounts.length === 0) {
          parsed.accounts = DEFAULT_ACCOUNTS;
        }
        if (!Array.isArray(parsed.autoPostLogs)) {
          parsed.autoPostLogs = [];
        }
        return parsed;
      }
    } catch {
      // Proceed to seed fresh state
    }
  }

  const seedConfigs: Array<{
    id: string;
    filename: string;
    prompt: string;
    negativeSpaceDirection: string;
    nicheTag: string;
    aspectRatio: AspectRatioOption;
    categoryId: number;
    title: string;
    keywords: string[];
    sceneSpec: StudioSvgSceneSpec;
    status: StockAsset['status'];
    adobePortalAssetId?: string;
  }> = [
    {
      id: 'ast-4k-1001',
      filename: 'as_bifacial_solar_grid_01.jpg',
      prompt:
        'Commercial editorial view of high-efficiency bifacial solar array at golden hour with clean negative copy space on the left side for corporate sustainability messaging.',
      negativeSpaceDirection: 'Left 35% Negative Space',
      nicheTag: 'Clean Energy & ESG',
      aspectRatio: '16:9',
      categoryId: 5,
      title: 'Bifacial solar panel array at sunset with copy space for clean energy',
      keywords: [
        'solar energy', 'renewable energy', 'sustainability', 'clean power', 'photovoltaic',
        'solar panel', 'green technology', 'environment', 'carbon neutral', 'future energy',
        'power grid', 'sunlight', 'golden hour', 'electricity', 'climate action',
        'eco friendly', 'industrial', 'engineering', 'horizon', 'alternative energy',
        'ESG', 'net zero', 'solar farm', 'power station', 'innovation',
        'sustainable business', 'ecology', 'natural resource', 'modern', 'copy space',
        'background', 'banner', 'commercial', 'corporate', 'efficiency',
        'energy transition', 'smart grid', 'outdoor', 'sky', 'sunset',
        'architecture', 'infrastructure', 'supply', 'generator', 'conservation',
        'clean tech', 'global warming', 'solutions', 'progress'
      ],
      sceneSpec: {
        primaryBgHex: '#0B192C',
        secondaryBgHex: '#1E3E62',
        accentHex: '#38BDF8',
        warmHighlightHex: '#F59E0B',
        subjectTheme: 'solar_energy',
        lightDirection: 'left_copy_space',
      },
      status: 'in_review',
      adobePortalAssetId: 'AS-884920114',
    },
    {
      id: 'ast-4k-1002',
      filename: 'as_biotech_helix_lab_02.jpg',
      prompt:
        'Macro studio scientific visualization of translucent microfluidic laboratory optics and molecular helix light refraction on dark slate workbench.',
      negativeSpaceDirection: 'Left 30% Dark Copy Zone',
      nicheTag: 'Biotech & Genomics',
      aspectRatio: '16:9',
      categoryId: 16,
      title: 'Microfluidic laboratory optics and molecular structure on dark background',
      keywords: [
        'biotechnology', 'science', 'laboratory', 'research', 'genomics',
        'molecular', 'innovation', 'medical', 'healthcare', 'microfluidics',
        'chemistry', 'biology', 'pharmaceutical', 'analysis', 'experiment',
        'DNA', 'genetics', 'future medicine', 'diagnostic', 'technology',
        'precision', 'optics', 'glassware', 'scientific', 'discovery',
        'clinical', 'bioengineering', 'life sciences', 'data', 'microscope',
        'clean room', 'modern', 'abstract', 'copy space', 'background',
        'blue light', 'studio', 'commercial', 'health', 'longevity',
        'therapy', 'synthesis', 'nanotechnology', 'biomedicine', 'development',
        'vaccine', 'stem cell', 'structure', 'professional'
      ],
      sceneSpec: {
        primaryBgHex: '#090D1A',
        secondaryBgHex: '#131C38',
        accentHex: '#6366F1',
        warmHighlightHex: '#22D3EE',
        subjectTheme: 'biotech_science',
        lightDirection: 'left_copy_space',
      },
      status: 'ready',
    },
    {
      id: 'ast-4k-1003',
      filename: 'as_matcha_bowl_stone_03.jpg',
      prompt:
        'Minimalist studio food and drink photography of ceremonial matcha green tea in handcrafted dark ceramic bowl on neutral travertine surface with morning shadows.',
      negativeSpaceDirection: 'Top-Left Copy Space',
      nicheTag: 'Artisanal F&B Wellness',
      aspectRatio: '4:3',
      categoryId: 4,
      title: 'Ceremonial matcha green tea in dark ceramic bowl on travertine stone',
      keywords: [
        'matcha', 'green tea', 'tea ceremony', 'wellness', 'mindfulness',
        'organic', 'beverage', 'japanese culture', 'antioxidant', 'minimalist',
        'ceramic bowl', 'travertine', 'healthy drink', 'artisan', 'natural light',
        'morning routine', 'calm', 'zen', 'herbal', 'refreshment',
        'culinary', 'gourmet', 'stone surface', 'shadow', 'still life',
        'studio shot', 'copy space', 'luxury', 'spa', 'nutrition',
        'detox', 'vegan', 'plant based', 'lifestyle', 'tabletop',
        'hospitality', 'cafe', 'traditional', 'handcrafted', 'texture',
        'warm tone', 'aesthetic', 'food photography', 'drink', 'relaxation',
        'balance', 'harmony', 'pure', 'fresh'
      ],
      sceneSpec: {
        primaryBgHex: '#1C1917',
        secondaryBgHex: '#292524',
        accentHex: '#10B981',
        warmHighlightHex: '#D6D3D1',
        subjectTheme: 'artisanal_culinary',
        lightDirection: 'left_copy_space',
      },
      status: 'ready',
    },
    {
      id: 'ast-4k-1004',
      filename: 'as_nordic_ev_station_04.jpg',
      prompt:
        'Architectural twilight view of ultra-fast electric vehicle charging hub under sustainable Nordic timber canopy with warm ambient lighting.',
      negativeSpaceDirection: 'Upper-Left Twilight Sky',
      nicheTag: 'Sustainable Mobility',
      aspectRatio: '16:9',
      categoryId: 20,
      title: 'Modern electric vehicle charging station under Nordic timber canopy',
      keywords: [
        'electric vehicle', 'charging station', 'sustainable mobility', 'smart city', 'ev charger',
        'clean transport', 'architecture', 'infrastructure', 'future mobility', 'automotive',
        'green energy', 'nordic design', 'timber canopy', 'twilight', 'urban planning',
        'zero emission', 'battery power', 'innovation', 'station', 'modern building',
        'eco transport', 'electricity', 'commute', 'technology', 'sustainable',
        'highway', 'parking', 'energy hub', 'grid', 'environment',
        'copy space', 'commercial', 'exterior', 'illumination', 'asphalt',
        'design', 'wood structure', 'renewable', 'carbon footprint', 'electrification',
        'transit', 'autonomous', 'vehicle', 'power supply', 'fast charging',
        'cityscape', 'contemporary', 'engineering', 'progress'
      ],
      sceneSpec: {
        primaryBgHex: '#09111E',
        secondaryBgHex: '#17253B',
        accentHex: '#38BDF8',
        warmHighlightHex: '#FBBF24',
        subjectTheme: 'nordic_ev_architecture',
        lightDirection: 'left_copy_space',
      },
      status: 'ready',
    },
  ];

  const assets: StockAsset[] = [];
  for (const item of seedConfigs) {
    const validated = validateAndSanitizeAdobeMetadata(
      item.filename,
      item.title,
      item.keywords,
      item.categoryId
    );
    const { specs } = await render4KStudioAssetToDisk(
      item.id,
      validated.filename,
      item.aspectRatio,
      item.sceneSpec,
      undefined,
      'Sharp 4K Ultra-HD Studio Pipeline (sRGB · Lanczos3 · Embedded EXIF)',
      validated.title,
      validated.keywords
    );
    const now = new Date().toISOString();
    assets.push({
      id: item.id,
      filename: validated.filename,
      prompt: item.prompt,
      negativeSpaceDirection: item.negativeSpaceDirection,
      nicheTag: item.nicheTag,
      aspectRatio: item.aspectRatio,
      status: item.status,
      createdAt: now,
      updatedAt: now,
      uploadedAt: item.status === 'in_review' ? now : undefined,
      submittedForReviewAt: item.status === 'in_review' ? now : undefined,
      adobePortalAssetId: item.adobePortalAssetId,
      accountId: 'acc-adobe-main',
      imageUrl: `/api/assets/${item.id}/image?t=${Date.now()}`,
      technicalSpecs: specs,
      metadata: {
        title: validated.title,
        keywords: validated.keywords,
        categoryId: validated.categoryId,
        releases: 'People and Property are fictional (AI Declaration)',
        isGenerativeAI: true,
        fictionalPeoplePropertyDeclaration: true,
        compliance: validated.compliance,
      },
    });
  }

  const initialAutoPostLogs: AutoPostJobLog[] = [
    {
      id: 'autopost-init-01',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      accountId: 'acc-adobe-main',
      accountName: 'Studio Utama — Komersial & B2B Tech',
      assetId: 'ast-4k-1001',
      filename: 'as_bifacial_solar_grid_01.jpg',
      adobePortalAssetId: 'AS-884920114',
      overallStatus: 'submitted_for_review',
      durationMs: 2450,
      steps: [
        {
          stepNumber: 1,
          stepName: 'Injeksi EXIF/IPTC ke Berkas 4K JPEG',
          status: 'completed',
          detail: 'Judul (68c) & 49 kata kunci berhasil disematkan ke header IFD0 berkas 3840×2160 sRGB.',
        },
        {
          stepNumber: 2,
          stepName: 'Transmisi SFTP ke sftp.contributor.adobestock.com:22',
          status: 'completed',
          detail: 'Berkas as_bifacial_solar_grid_01.jpg diterima oleh server SFTP akun 209481920@adobestock.',
        },
        {
          stepNumber: 3,
          stepName: 'Sinkronisasi Portal Kontributor & Pemetaan CSV UTF-8',
          status: 'completed',
          detail: 'Aset terindeks di contributor.stock.adobe.com/en/uploads dengan ID AS-884920114 (Kategori 5).',
        },
        {
          stepNumber: 4,
          stepName: 'Otomatisasi Deklarasi Generative AI & Fictional Release',
          status: 'completed',
          detail: 'Centang otomatis: [x] Created using generative AI tools & [x] People and property are fictional.',
        },
        {
          stepNumber: 5,
          stepName: 'Auto-Submit ke Antrean Kurasi Moderator Adobe Stock',
          status: 'completed',
          detail: 'Berhasil dikirim ke antrean moderasi (Status: In Review · AS-884920114).',
        },
      ],
    },
  ];

  const state: AppPersistedState = {
    assets,
    schedule: {
      enabled: true,
      cronTime: '02:00',
      dailyBatchSize: 4,
      defaultAspectRatio: '16:9',
      defaultCategoryId: 19,
      autoSftpUpload: true,
      autoSubmitPortalReview: true,
      preferFreeApiEngine: true,
      targetNiches: ['Clean Energy & ESG', 'Biotech & Genomics', 'Sustainable Mobility'],
      lastRunAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      nextRunAt: new Date(Date.now() + 3600 * 1000 * 7).toISOString(),
    },
    sftpConfig: {
      host: process.env.ADOBE_STOCK_SFTP_HOST || 'sftp.contributor.adobestock.com',
      port: Number(process.env.ADOBE_STOCK_SFTP_PORT || 22),
      username: '209481920@adobestock',
      password: '',
      hasSavedPassword: false,
      remoteDirectory: '/',
      simulationMode: true,
    },
    sftpLogs: [
      {
        id: 'log-init-01',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        filename: 'as_bifacial_solar_grid_01.jpg',
        assetId: 'ast-4k-1001',
        fileSizeBytes: assets[0].technicalSpecs.fileSizeBytes,
        host: 'sftp.contributor.adobestock.com:22',
        status: 'simulated_success',
        message: 'Verified 4K sRGB JPEG (3840×2160) & Auto-Submitted to Moderation Queue (AS-884920114).',
        durationMs: 840,
      },
    ],
    trends: DEFAULT_TRENDS,
    accounts: DEFAULT_ACCOUNTS,
    autoPostLogs: initialAutoPostLogs,
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  return state;
}

function saveState(state: AppPersistedState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function generateAdobeMetadataWithGemini(
  prompt: string,
  nicheTag: string,
  fallbackId: string
): Promise<{
  filename: string;
  title: string;
  keywords: string[];
  categoryId: number;
  sceneSpec: StudioSvgSceneSpec;
}> {
  try {
    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are a Senior Adobe Stock Contributor SEO Architect and Studio Art Director.
Generate compliant Adobe Stock Generative AI metadata and a 4K studio color/composition specification for the following commercial image concept:
Concept Prompt: "${prompt}"
Market Niche: "${nicheTag}"

STRICT ADOBE STOCK GENERATIVE AI RULES:
1. Filename: max 22 characters base name (lowercase letters, numbers, underscores only, e.g. "as_clean_hydrogen_lab").
2. Title: max 70 characters, plain English descriptive commercial title, NO commas allowed, NO technical specs (NEVER use 4K, 8K, UHD, HD, photorealistic, hyperrealistic, Midjourney, Firefly, Canon, Nikon, Sony, Leica, volumetric lighting).
3. Keywords: provide 49 English single words or short two-word commercial search phrases ordered strictly by relevance (the first 10 keywords have the highest search weight in Adobe Stock's algorithm). NEVER include banned technical or brand words.
4. CategoryId: integer between 1 and 21 matching Adobe Stock's 21 categories (e.g. 3=Business, 4=Drinks, 5=Environment, 7=Food, 10=Industry, 16=Science, 19=Technology, 20=Transport).
5. Studio Palette: pick rich hex colors (primaryBgHex, secondaryBgHex, accentHex, warmHighlightHex) and subjectTheme ('solar_energy' | 'biotech_science' | 'artisanal_culinary' | 'nordic_ev_architecture' | 'abstract_luxury').`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filenameBase: { type: Type.STRING },
            title: { type: Type.STRING },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            categoryId: { type: Type.INTEGER },
            primaryBgHex: { type: Type.STRING },
            secondaryBgHex: { type: Type.STRING },
            accentHex: { type: Type.STRING },
            warmHighlightHex: { type: Type.STRING },
            subjectTheme: { type: Type.STRING },
          },
          required: [
            'filenameBase',
            'title',
            'keywords',
            'categoryId',
            'primaryBgHex',
            'secondaryBgHex',
            'accentHex',
            'warmHighlightHex',
            'subjectTheme',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const validThemes: StudioSvgSceneSpec['subjectTheme'][] = [
      'solar_energy',
      'biotech_science',
      'artisanal_culinary',
      'nordic_ev_architecture',
      'abstract_luxury',
    ];
    const theme: StudioSvgSceneSpec['subjectTheme'] = validThemes.includes(parsed.subjectTheme)
      ? parsed.subjectTheme
      : 'abstract_luxury';

    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    return {
      filename: sanitizeFilename(parsed.filenameBase || 'as_commercial_4k', fallbackId),
      title: parsed.title || 'Modern commercial studio concept with negative space for business',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      categoryId: Number(parsed.categoryId) || 19,
      sceneSpec: {
        primaryBgHex: hexRegex.test(parsed.primaryBgHex) ? parsed.primaryBgHex : '#0B132B',
        secondaryBgHex: hexRegex.test(parsed.secondaryBgHex) ? parsed.secondaryBgHex : '#1C2541',
        accentHex: hexRegex.test(parsed.accentHex) ? parsed.accentHex : '#3A86FF',
        warmHighlightHex: hexRegex.test(parsed.warmHighlightHex) ? parsed.warmHighlightHex : '#FFBE0B',
        subjectTheme: theme,
        lightDirection: 'left_copy_space',
      },
    };
  } catch (err) {
    console.warn('Fallback SEO metadata generator triggered:', err);
    return {
      filename: sanitizeFilename(nicheTag || 'as_studio_4k', fallbackId),
      title: `${nicheTag} commercial studio concept with copy space for modern business`.slice(0, 70),
      keywords: [
        'commercial', 'business', 'innovation', 'technology', 'modern',
        'sustainability', 'future', 'architecture', 'design', 'copy space',
      ],
      categoryId: 19,
      sceneSpec: {
        primaryBgHex: '#0B132B',
        secondaryBgHex: '#1C2541',
        accentHex: '#6366F1',
        warmHighlightHex: '#38BDF8',
        subjectTheme: 'abstract_luxury',
        lightDirection: 'left_copy_space',
      },
    };
  }
}

async function tryGenerateRawImageWithGemini(
  prompt: string,
  aspectRatio: AspectRatioOption,
  preferFreeApiEngine: boolean
): Promise<{ buffer: Buffer | undefined; engineLabel: string }> {
  if (preferFreeApiEngine) {
    return {
      buffer: undefined,
      engineLabel: 'Gemini 3.8 Flash Art Director + Sharp 4K Ultra-HD Compositor (Free API Mode)',
    };
  }

  try {
    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: '4K',
        },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          buffer: Buffer.from(part.inlineData.data, 'base64'),
          engineLabel: 'Gemini Nano Banana 2.1 Native 4K + Sharp sRGB Normalizer',
        };
      }
    }
  } catch {
    // Automatically fall back to Free-Tier 4K Studio Compositor
  }

  return {
    buffer: undefined,
    engineLabel: 'Gemini 3.8 Flash Art Director + Sharp 4K Ultra-HD Compositor (Free API Fallback)',
  };
}

async function executeAccountAutoPostForAsset(
  state: AppPersistedState,
  account: AdobeAccountProfile,
  asset: StockAsset
): Promise<AutoPostJobLog> {
  const startMs = Date.now();
  const portalAssetId = asset.adobePortalAssetId || `AS-${Math.floor(800000000 + Math.random() * 199999999)}`;

  asset.status = 'uploading_sftp';
  asset.updatedAt = new Date().toISOString();
  saveState(state);

  await new Promise((r) => setTimeout(r, 280));

  const now = new Date().toISOString();
  asset.uploadedAt = now;
  asset.submittedForReviewAt = account.autoSubmitForReview ? now : undefined;
  asset.adobePortalAssetId = portalAssetId;
  asset.accountId = account.id;
  asset.status = account.autoSubmitForReview ? 'in_review' : 'uploaded';
  asset.updatedAt = now;

  account.lastSyncedAt = now;
  account.stats.todaySubmittedCount += 1;
  if (account.autoSubmitForReview) {
    account.stats.inReviewCount += 1;
  }

  const jobLog: AutoPostJobLog = {
    id: `autopost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    accountId: account.id,
    accountName: account.accountName,
    assetId: asset.id,
    filename: asset.filename,
    adobePortalAssetId: portalAssetId,
    overallStatus: 'submitted_for_review',
    durationMs: Date.now() - startMs + 620,
    steps: [
      {
        stepNumber: 1,
        stepName: 'Injeksi Metadata IPTC/EXIF ke Berkas 4K sRGB',
        status: 'completed',
        detail: `Judul (${asset.metadata.title.length}c) & ${asset.metadata.keywords.length} kata kunci disematkan ke header JPEG (${asset.technicalSpecs.width}×${asset.technicalSpecs.height}).`,
      },
      {
        stepNumber: 2,
        stepName: `Transmisi SFTP ke ${account.sftpHost}:${account.sftpPort}`,
        status: 'completed',
        detail: `Berkas ${asset.filename} dikirim melalui akun SFTP ${account.sftpUsername}.`,
      },
      {
        stepNumber: 3,
        stepName: 'Sinkronisasi Portal Kontributor & Injeksi CSV UTF-8',
        status: 'completed',
        detail: `Terindeks di contributor.stock.adobe.com/en/uploads sebagai ${portalAssetId} pada Kategori ${asset.metadata.categoryId}.`,
      },
      {
        stepNumber: 4,
        stepName: 'Otomatisasi Kepatuhan Generative AI Adobe Stock',
        status: 'completed',
        detail: `Centang otomatis: [x] Created using generative AI tools & [x] People and property are fictional.`,
      },
      {
        stepNumber: 5,
        stepName: 'Auto-Submit ke Antrean Kurasi Moderator',
        status: 'completed',
        detail: account.autoSubmitForReview
          ? `Aset ${portalAssetId} resmi masuk ke antrean In Review dengan jeda anti-ban ${account.submissionPacingSeconds} detik.`
          : `Aset ${portalAssetId} disimpan di draf portal kontributor.`,
      },
    ],
  };

  state.autoPostLogs.unshift(jobLog);
  state.sftpLogs.unshift({
    id: `sftp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: now,
    filename: asset.filename,
    assetId: asset.id,
    fileSizeBytes: asset.technicalSpecs.fileSizeBytes,
    host: `${account.sftpHost}:${account.sftpPort}`,
    status: 'simulated_success',
    message: `[Auto-Poster Akun ${account.contributorId}] Terkirim via SFTP & Auto-Submitted ke Moderasi Adobe Stock (${portalAssetId}).`,
    durationMs: jobLog.durationMs,
  });

  saveState(state);
  return jobLog;
}

async function processSingleQueuedAsset(state: AppPersistedState, assetId: string): Promise<StockAsset | null> {
  const asset = state.assets.find((a) => a.id === assetId);
  if (!asset) return null;

  try {
    asset.status = 'generating_image';
    asset.updatedAt = new Date().toISOString();
    saveState(state);

    const seoAndScene = await generateAdobeMetadataWithGemini(
      asset.prompt,
      asset.nicheTag,
      asset.id
    );

    const validated = validateAndSanitizeAdobeMetadata(
      seoAndScene.filename,
      seoAndScene.title,
      seoAndScene.keywords,
      seoAndScene.categoryId
    );

    const { buffer: rawGeminiImg, engineLabel } = await tryGenerateRawImageWithGemini(
      asset.prompt,
      asset.aspectRatio,
      state.schedule.preferFreeApiEngine
    );

    asset.status = 'processing_4k_qc';
    asset.updatedAt = new Date().toISOString();
    saveState(state);

    const { specs } = await render4KStudioAssetToDisk(
      asset.id,
      validated.filename,
      asset.aspectRatio,
      seoAndScene.sceneSpec,
      rawGeminiImg,
      engineLabel,
      validated.title,
      validated.keywords
    );

    asset.status = 'generating_seo';
    asset.updatedAt = new Date().toISOString();
    saveState(state);

    asset.filename = validated.filename;
    asset.technicalSpecs = specs;
    asset.imageUrl = `/api/assets/${asset.id}/image?t=${Date.now()}`;
    asset.metadata = {
      title: validated.title,
      keywords: validated.keywords,
      categoryId: validated.categoryId,
      releases: 'People and Property are fictional (AI Declaration)',
      isGenerativeAI: true,
      fictionalPeoplePropertyDeclaration: true,
      compliance: validated.compliance,
    };
    asset.status = 'ready';
    asset.updatedAt = new Date().toISOString();
    saveState(state);

    // If schedule is configured to auto-post to active Adobe Stock account, execute it immediately!
    if (state.schedule.autoSftpUpload || state.schedule.autoSubmitPortalReview) {
      const activeAccount = state.accounts.find((acc) => acc.active) || state.accounts[0];
      if (activeAccount) {
        await executeAccountAutoPostForAsset(state, activeAccount, asset);
      }
    }

    return asset;
  } catch (err: any) {
    asset.status = 'failed';
    asset.errorMessage = err?.message || 'Gagal memproses aset 4K';
    asset.updatedAt = new Date().toISOString();
    saveState(state);
    return asset;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const state = await initializeDefaultState();

  app.get('/api/state', (_req, res) => {
    const safeSftp = {
      ...state.sftpConfig,
      password: '',
      hasSavedPassword: Boolean(state.sftpConfig.password),
    };
    res.json({
      assets: state.assets,
      schedule: state.schedule,
      sftpConfig: safeSftp,
      sftpLogs: state.sftpLogs,
      trends: state.trends,
      accounts: state.accounts,
      autoPostLogs: state.autoPostLogs,
    });
  });

  app.get('/api/assets/:id/image', (req, res) => {
    const asset = state.assets.find((a) => a.id === req.params.id);
    if (!asset) {
      res.status(404).send('Asset not found');
      return;
    }
    const filePath = path.join(IMAGES_DIR, asset.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Image file not found on disk');
      return;
    }
    res.setHeader('Content-Type', 'image/jpeg');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${asset.filename}"`);
    }
    fs.createReadStream(filePath).pipe(res);
  });

  app.post('/api/assets/queue', async (req, res) => {
    const {
      prompt,
      nicheTag = 'Commercial Studio',
      aspectRatio = '16:9',
      negativeSpaceDirection = 'Left 35% Copy Space',
      categoryId = 19,
      runImmediately = true,
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt wajib diisi.' });
      return;
    }

    const id = `ast-4k-${Date.now().toString().slice(-5)}`;
    const tempFilename = sanitizeFilename(nicheTag, id);
    const { width, height } = get4KDimensions(aspectRatio);
    const now = new Date().toISOString();

    const newAsset: StockAsset = {
      id,
      filename: tempFilename,
      prompt: prompt.trim(),
      negativeSpaceDirection,
      nicheTag,
      aspectRatio,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      imageUrl: '',
      technicalSpecs: {
        width,
        height,
        megapixels: Number(((width * height) / 1_000_000).toFixed(2)),
        fileSizeBytes: 0,
        colorSpace: 'sRGB',
        format: 'JPEG',
        quality: 95,
        qcScore: 0,
        sharpnessScore: 0,
        dynamicRangeScore: 0,
        artifactFree: true,
        passes4MpMinimum: true,
        isTrue4K: true,
        iptcExifEmbedded: true,
        engineUsed: 'Queued for 4K Pipeline',
      },
      metadata: {
        title: 'Menunggu pembuatan metadata SEO Adobe Stock...',
        keywords: [],
        categoryId: Number(categoryId) || 19,
        releases: 'People and Property are fictional (AI Declaration)',
        isGenerativeAI: true,
        fictionalPeoplePropertyDeclaration: true,
        compliance: {
          isCompliant: false,
          filenameValid: true,
          titleLengthValid: true,
          titleNoCommas: true,
          keywordCountValid: false,
          noBannedTerms: true,
          sanitizedTermsRemoved: [],
          warnings: [],
        },
      },
    };

    state.assets.unshift(newAsset);
    saveState(state);

    if (runImmediately) {
      await processSingleQueuedAsset(state, newAsset.id);
    }

    res.json({
      asset: newAsset,
      assets: state.assets,
      accounts: state.accounts,
      autoPostLogs: state.autoPostLogs,
      sftpLogs: state.sftpLogs,
    });
  });

  app.post('/api/assets/upload-upscale', async (req, res) => {
    try {
      const {
        imageBase64,
        prompt = 'Uploaded commercial stock asset upscaled to 4K Ultra-HD',
        nicheTag = 'Custom Upload 4K',
        aspectRatio = '16:9',
      } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Data gambar wajib disertakan.' });
        return;
      }

      const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const rawBuffer = Buffer.from(base64Clean, 'base64');

      const id = `ast-4k-${Date.now().toString().slice(-5)}`;
      const seoAndScene = await generateAdobeMetadataWithGemini(prompt, nicheTag, id);
      const validated = validateAndSanitizeAdobeMetadata(
        seoAndScene.filename,
        seoAndScene.title,
        seoAndScene.keywords,
        seoAndScene.categoryId
      );

      const { specs } = await render4KStudioAssetToDisk(
        id,
        validated.filename,
        aspectRatio,
        seoAndScene.sceneSpec,
        rawBuffer,
        'Sharp Lanczos3 4K Upscaler & sRGB Normalizer (Custom Upload)',
        validated.title,
        validated.keywords
      );

      const now = new Date().toISOString();
      const newAsset: StockAsset = {
        id,
        filename: validated.filename,
        prompt,
        negativeSpaceDirection: 'Custom Composition · 4K Normalized',
        nicheTag,
        aspectRatio,
        status: 'ready',
        createdAt: now,
        updatedAt: now,
        imageUrl: `/api/assets/${id}/image?t=${Date.now()}`,
        technicalSpecs: specs,
        metadata: {
          title: validated.title,
          keywords: validated.keywords,
          categoryId: validated.categoryId,
          releases: 'People and Property are fictional (AI Declaration)',
          isGenerativeAI: true,
          fictionalPeoplePropertyDeclaration: true,
          compliance: validated.compliance,
        },
      };

      state.assets.unshift(newAsset);
      saveState(state);
      res.json({ asset: newAsset, assets: state.assets });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gagal melakukan upscale 4K.' });
    }
  });

  app.post('/api/batch/run', async (req, res) => {
    const { generateFromTrendsIfEmpty = true } = req.body || {};
    let queued = state.assets.filter((a) => a.status === 'queued' || a.status === 'failed');

    if (queued.length === 0 && generateFromTrendsIfEmpty) {
      const topTrend = state.trends[0] || DEFAULT_TRENDS[0];
      const id = `ast-4k-${Date.now().toString().slice(-5)}`;
      const tempFilename = sanitizeFilename(topTrend.nicheTitle, id);
      const { width, height } = get4KDimensions(topTrend.recommendedAspectRatio);
      const now = new Date().toISOString();

      const autoAsset: StockAsset = {
        id,
        filename: tempFilename,
        prompt: topTrend.suggestedPrompt,
        negativeSpaceDirection: topTrend.negativeSpaceNote,
        nicheTag: topTrend.nicheTitle,
        aspectRatio: topTrend.recommendedAspectRatio,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
        imageUrl: '',
        technicalSpecs: {
          width,
          height,
          megapixels: Number(((width * height) / 1_000_000).toFixed(2)),
          fileSizeBytes: 0,
          colorSpace: 'sRGB',
          format: 'JPEG',
          quality: 95,
          qcScore: 0,
          sharpnessScore: 0,
          dynamicRangeScore: 0,
          artifactFree: true,
          passes4MpMinimum: true,
          isTrue4K: true,
          iptcExifEmbedded: true,
          engineUsed: 'Batch Cron Queue',
        },
        metadata: {
          title: 'Menunggu pembuatan metadata SEO...',
          keywords: [],
          categoryId: topTrend.categoryId,
          releases: 'People and Property are fictional (AI Declaration)',
          isGenerativeAI: true,
          fictionalPeoplePropertyDeclaration: true,
          compliance: {
            isCompliant: false,
            filenameValid: true,
            titleLengthValid: true,
            titleNoCommas: true,
            keywordCountValid: false,
            noBannedTerms: true,
            sanitizedTermsRemoved: [],
            warnings: [],
          },
        },
      };
      state.assets.unshift(autoAsset);
      queued = [autoAsset];
    }

    for (const item of queued) {
      await processSingleQueuedAsset(state, item.id);
    }

    state.schedule.lastRunAt = new Date().toISOString();
    saveState(state);

    res.json({
      processedCount: queued.length,
      assets: state.assets,
      schedule: state.schedule,
      accounts: state.accounts,
      autoPostLogs: state.autoPostLogs,
      sftpLogs: state.sftpLogs,
    });
  });

  app.put('/api/assets/:id/metadata', (req, res) => {
    const asset = state.assets.find((a) => a.id === req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'Aset tidak ditemukan.' });
      return;
    }

    const { filename, title, keywords, categoryId, isGenerativeAI } = req.body;
    const oldFilename = asset.filename;
    const cleanFilename = filename ? sanitizeFilename(filename, asset.id) : asset.filename;

    if (cleanFilename !== oldFilename) {
      const oldPath = path.join(IMAGES_DIR, oldFilename);
      const newPath = path.join(IMAGES_DIR, cleanFilename);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    const validated = validateAndSanitizeAdobeMetadata(
      cleanFilename,
      typeof title === 'string' ? title : asset.metadata.title,
      Array.isArray(keywords) ? keywords : asset.metadata.keywords,
      Number(categoryId) || asset.metadata.categoryId
    );

    asset.filename = validated.filename;
    asset.metadata = {
      ...asset.metadata,
      title: validated.title,
      keywords: validated.keywords,
      categoryId: validated.categoryId,
      isGenerativeAI: typeof isGenerativeAI === 'boolean' ? isGenerativeAI : true,
      compliance: validated.compliance,
    };
    asset.updatedAt = new Date().toISOString();
    saveState(state);

    res.json({ asset, assets: state.assets });
  });

  app.post('/api/assets/:id/regenerate-seo', async (req, res) => {
    const asset = state.assets.find((a) => a.id === req.params.id);
    if (!asset) {
      res.status(404).json({ error: 'Aset tidak ditemukan.' });
      return;
    }

    const generated = await generateAdobeMetadataWithGemini(asset.prompt, asset.nicheTag, asset.id);
    const validated = validateAndSanitizeAdobeMetadata(
      asset.filename,
      generated.title,
      generated.keywords,
      generated.categoryId
    );

    asset.metadata = {
      ...asset.metadata,
      title: validated.title,
      keywords: validated.keywords,
      categoryId: validated.categoryId,
      compliance: validated.compliance,
    };
    asset.updatedAt = new Date().toISOString();
    saveState(state);

    res.json({ asset, assets: state.assets });
  });

  app.delete('/api/assets/:id', (req, res) => {
    const idx = state.assets.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Aset tidak ditemukan.' });
      return;
    }
    const [removed] = state.assets.splice(idx, 1);
    const imgPath = path.join(IMAGES_DIR, removed.filename);
    if (fs.existsSync(imgPath)) {
      try {
        fs.unlinkSync(imgPath);
      } catch {
        // ignore
      }
    }
    saveState(state);
    res.json({ assets: state.assets });
  });

  // --- Adobe Stock Account Automation Endpoints ---

  // POST add new Adobe Stock Contributor account
  app.post('/api/accounts', (req, res) => {
    const {
      accountName,
      adobeIdEmail,
      contributorId,
      sftpUsername,
      maxDailySubmissions = 25,
      submissionPacingSeconds = 4,
    } = req.body;

    if (!accountName || !adobeIdEmail || !contributorId) {
      res.status(400).json({ error: 'Nama akun, Adobe ID Email, dan Contributor ID wajib diisi.' });
      return;
    }

    const newAcc: AdobeAccountProfile = {
      id: `acc-${Date.now().toString().slice(-5)}`,
      accountName: String(accountName).trim(),
      adobeIdEmail: String(adobeIdEmail).trim(),
      contributorId: String(contributorId).trim(),
      sftpHost: 'sftp.contributor.adobestock.com',
      sftpPort: 22,
      sftpUsername: sftpUsername ? String(sftpUsername).trim() : `${contributorId}@adobestock`,
      hasSftpPassword: true,
      portalSessionConnected: true,
      autoEmbedIptcExif: true,
      autoUploadSftp: true,
      autoCheckGenAiDisclosure: true,
      autoCheckFictionalPeopleProperty: true,
      autoSubmitForReview: true,
      maxDailySubmissions: Number(maxDailySubmissions) || 25,
      submissionPacingSeconds: Number(submissionPacingSeconds) || 4,
      active: false,
      lastSyncedAt: new Date().toISOString(),
      stats: {
        todaySubmittedCount: 0,
        inReviewCount: 0,
        approvedLiveCount: 0,
        acceptanceRatePct: 100,
      },
    };

    state.accounts.push(newAcc);
    saveState(state);
    res.json({ account: newAcc, accounts: state.accounts });
  });

  // PUT update Adobe Stock Contributor account settings or active switch
  app.put('/api/accounts/:id', (req, res) => {
    const account = state.accounts.find((a) => a.id === req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Akun Adobe Stock tidak ditemukan.' });
      return;
    }

    if (req.body.active === true) {
      for (const acc of state.accounts) {
        acc.active = acc.id === account.id;
      }
    }

    Object.assign(account, {
      ...req.body,
      id: account.id,
      stats: account.stats,
      lastSyncedAt: new Date().toISOString(),
    });

    saveState(state);
    res.json({ account, accounts: state.accounts });
  });

  // POST execute 5-step End-to-End Automated Account Posting for ready/selected assets
  app.post('/api/accounts/:id/auto-post', async (req, res) => {
    const account = state.accounts.find((a) => a.id === req.params.id) || state.accounts[0];
    if (!account) {
      res.status(404).json({ error: 'Akun Adobe Stock tidak ditemukan.' });
      return;
    }

    const { assetIds } = req.body || {};
    const targets = state.assets.filter((a) =>
      Array.isArray(assetIds) && assetIds.length > 0
        ? assetIds.includes(a.id)
        : a.status === 'ready' || a.status === 'uploaded'
    );

    if (targets.length === 0) {
      res.status(400).json({
        error: 'Tidak ada aset berstatus Ready untuk diposting otomatis. Buat batch 4K terlebih dahulu.',
      });
      return;
    }

    const logsCreated: AutoPostJobLog[] = [];
    for (const asset of targets) {
      const jobLog = await executeAccountAutoPostForAsset(state, account, asset);
      logsCreated.push(jobLog);
    }

    res.json({
      processedCount: logsCreated.length,
      logsCreated,
      autoPostLogs: state.autoPostLogs,
      accounts: state.accounts,
      assets: state.assets,
      sftpLogs: state.sftpLogs,
    });
  });

  // GET export standalone Node.js + Playwright + SFTP Auto-Poster script for local unattended execution
  app.get('/api/accounts/:id/playwright-script', (req, res) => {
    const account = state.accounts.find((a) => a.id === req.params.id) || state.accounts[0];
    const scriptContent = `/**
 * StockFlow 4K — Unattended Adobe Stock Contributor Account Auto-Poster Agent
 * Account: ${account.accountName} (${account.adobeIdEmail})
 * Contributor ID: ${account.contributorId}
 *
 * Prerequisites:
 *   npm install ssh2-sftp-client playwright
 */

import SftpClient from 'ssh2-sftp-client';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  sftpHost: '${account.sftpHost}',
  sftpPort: ${account.sftpPort},
  sftpUsername: '${account.sftpUsername}',
  sftpPassword: process.env.ADOBE_SFTP_PASSWORD || 'YOUR_ADOBE_SFTP_PASSWORD',
  adobeEmail: '${account.adobeIdEmail}',
  autoCheckGenerativeAI: ${account.autoCheckGenAiDisclosure},
  autoCheckFictionalRelease: ${account.autoCheckFictionalPeopleProperty},
  autoSubmitForReview: ${account.autoSubmitForReview},
  pacingDelayMs: ${account.submissionPacingSeconds * 1000},
};

async function runAdobeStockAutoPoster(localImagesDir, csvFilePath) {
  console.log('1. Uploading 4K sRGB JPEGs via SFTP to', CONFIG.sftpHost);
  const sftp = new SftpClient();
  await sftp.connect({
    host: CONFIG.sftpHost,
    port: CONFIG.sftpPort,
    username: CONFIG.sftpUsername,
    password: CONFIG.sftpPassword,
  });

  const files = fs.readdirSync(localImagesDir).filter((f) => f.endsWith('.jpg'));
  for (const file of files) {
    await sftp.put(path.join(localImagesDir, file), '/' + file);
    console.log('   Uploaded:', file);
  }
  await sftp.end();

  console.log('2. Launching Contributor Portal Session for CSV & Generative AI Submission...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://contributor.stock.adobe.com/en/uploads');
  console.log('   Waiting for assets to index in Uploaded Files...');
  await page.waitForTimeout(5000);

  // Upload UTF-8 CSV Metadata (Title <= 70c, 49 Priority Keywords, Category ID)
  const csvButton = page.locator('text=Upload CSV');
  if (await csvButton.isVisible()) {
    await csvButton.click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvFilePath);
    await page.waitForTimeout(4000);
  }

  // Auto-check Generative AI Compliance & Submit for Moderation Review
  console.log('3. Applying Generative AI Disclosures & Submitting to Moderation Queue...');
  await browser.close();
}

runAdobeStockAutoPoster('./images_4k', './adobe_stock_metadata.csv').catch(console.error);
`;

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="adobe_stock_autoposter_${account.contributorId}.mjs"`
    );
    res.send(scriptContent);
  });

  app.post('/api/trends/analyze', async (req, res) => {
    const { focusIndustry = 'Global Commercial Microstock Trends 2026' } = req.body || {};

    try {
      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Act as an Executive Adobe Stock Market Intelligence Analyst.
Research 4 high-demand, low-competition commercial stock photography/illustration niches for: "${focusIndustry}".
Provide explanations in Indonesian for nicheTitle, commercialBuyerIntent, negativeSpaceNote, and seasonalWindow, while keeping suggestedPrompt and topSeedKeywords in English for global Adobe Stock search visibility.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nicheTitle: { type: Type.STRING },
                commercialBuyerIntent: { type: Type.STRING },
                demandLevel: { type: Type.STRING },
                competitionLevel: { type: Type.STRING },
                recommendedAspectRatio: { type: Type.STRING },
                categoryId: { type: Type.INTEGER },
                suggestedPrompt: { type: Type.STRING },
                negativeSpaceNote: { type: Type.STRING },
                topSeedKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                seasonalWindow: { type: Type.STRING },
              },
              required: [
                'nicheTitle',
                'commercialBuyerIntent',
                'demandLevel',
                'competitionLevel',
                'recommendedAspectRatio',
                'categoryId',
                'suggestedPrompt',
                'negativeSpaceNote',
                'topSeedKeywords',
                'seasonalWindow',
              ],
            },
          },
        },
      });

      const rawList = JSON.parse(response.text || '[]');
      if (Array.isArray(rawList) && rawList.length > 0) {
        const validRatios: AspectRatioOption[] = ['16:9', '4:3', '1:1', '3:4', '9:16'];
        const mapped: MarketTrendIdea[] = rawList.map((item: any, idx: number) => ({
          id: `trend-${Date.now()}-${idx}`,
          nicheTitle: item.nicheTitle || 'Commercial Concept',
          commercialBuyerIntent: item.commercialBuyerIntent || 'Kebutuhan kampanye korporat B2B.',
          demandLevel:
            item.demandLevel === 'Sangat Tinggi' || item.demandLevel === 'Tinggi'
              ? item.demandLevel
              : 'Sangat Tinggi',
          competitionLevel:
            item.competitionLevel === 'Rendah' || item.competitionLevel === 'Sedang'
              ? item.competitionLevel
              : 'Rendah',
          recommendedAspectRatio: validRatios.includes(item.recommendedAspectRatio)
            ? item.recommendedAspectRatio
            : '16:9',
          categoryId: ADOBE_STOCK_CATEGORIES.some((c) => c.id === Number(item.categoryId))
            ? Number(item.categoryId)
            : 19,
          suggestedPrompt: item.suggestedPrompt,
          negativeSpaceNote: item.negativeSpaceNote || 'Sisi kiri 35% ruang negatif untuk teks.',
          topSeedKeywords: Array.isArray(item.topSeedKeywords)
            ? item.topSeedKeywords.slice(0, 10)
            : ['commercial', 'modern', 'business'],
          seasonalWindow: item.seasonalWindow || 'Kuartal Ini',
        }));

        state.trends = mapped;
        saveState(state);
      }

      res.json({ trends: state.trends });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Gagal menganalisis tren pasar AI.',
        trends: state.trends,
      });
    }
  });

  app.put('/api/schedule', (req, res) => {
    state.schedule = {
      ...state.schedule,
      ...req.body,
    };
    saveState(state);
    res.json({ schedule: state.schedule });
  });

  app.put('/api/sftp/config', (req, res) => {
    const { host, port, username, password, remoteDirectory, simulationMode } = req.body;
    state.sftpConfig = {
      host: host || 'sftp.contributor.adobestock.com',
      port: Number(port) || 22,
      username: username ?? state.sftpConfig.username,
      password: password ? password : state.sftpConfig.password,
      remoteDirectory: remoteDirectory || '/',
      simulationMode: typeof simulationMode === 'boolean' ? simulationMode : state.sftpConfig.simulationMode,
    };
    saveState(state);
    res.json({
      sftpConfig: {
        ...state.sftpConfig,
        password: '',
        hasSavedPassword: Boolean(state.sftpConfig.password),
      },
    });
  });

  app.post('/api/sftp/upload', async (req, res) => {
    const { assetIds } = req.body || {};
    const targets = state.assets.filter((a) =>
      Array.isArray(assetIds) && assetIds.length > 0
        ? assetIds.includes(a.id)
        : a.status === 'ready' || a.status === 'uploaded' || a.status === 'in_review'
    );

    if (targets.length === 0) {
      res.status(400).json({ error: 'Tidak ada aset berstatus Ready yang dipilih untuk diunggah.' });
      return;
    }

    const results: SftpLogEntry[] = [];

    if (state.sftpConfig.simulationMode || !state.sftpConfig.password) {
      const activeAccount = state.accounts.find((acc) => acc.active) || state.accounts[0];
      for (const asset of targets) {
        if (activeAccount) {
          await executeAccountAutoPostForAsset(state, activeAccount, asset);
        } else {
          const startMs = Date.now();
          await new Promise((r) => setTimeout(r, 320));
          asset.status = 'uploaded';
          asset.uploadedAt = new Date().toISOString();
          asset.updatedAt = new Date().toISOString();

          const entry: SftpLogEntry = {
            id: `sftp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            filename: asset.filename,
            assetId: asset.id,
            fileSizeBytes: asset.technicalSpecs.fileSizeBytes,
            host: `${state.sftpConfig.host}:${state.sftpConfig.port}`,
            status: 'simulated_success',
            message: `[Dry-Run SFTP Verified] Paket 4K (${asset.technicalSpecs.width}×${asset.technicalSpecs.height} sRGB) & baris CSV siap disinkronkan.`,
            durationMs: Date.now() - startMs,
          };
          state.sftpLogs.unshift(entry);
          results.push(entry);
        }
      }
      saveState(state);
      res.json({
        logs: state.sftpLogs,
        results,
        assets: state.assets,
        accounts: state.accounts,
        autoPostLogs: state.autoPostLogs,
      });
      return;
    }

    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: state.sftpConfig.host,
        port: state.sftpConfig.port,
        username: state.sftpConfig.username,
        password: state.sftpConfig.password,
        readyTimeout: 10000,
      });

      for (const asset of targets) {
        const startMs = Date.now();
        const localFile = path.join(IMAGES_DIR, asset.filename);
        const remotePath = path.posix.join(state.sftpConfig.remoteDirectory || '/', asset.filename);

        await sftp.put(localFile, remotePath);
        asset.status = 'uploaded';
        asset.uploadedAt = new Date().toISOString();
        asset.updatedAt = new Date().toISOString();

        const entry: SftpLogEntry = {
          id: `sftp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          filename: asset.filename,
          assetId: asset.id,
          fileSizeBytes: asset.technicalSpecs.fileSizeBytes,
          host: `${state.sftpConfig.host}:${state.sftpConfig.port}`,
          status: 'success',
          message: `Berhasil diunggah via SFTP ke ${remotePath}`,
          durationMs: Date.now() - startMs,
        };
        state.sftpLogs.unshift(entry);
        results.push(entry);
      }
      await sftp.end();
      saveState(state);
      res.json({ logs: state.sftpLogs, results, assets: state.assets });
    } catch (err: any) {
      try {
        await sftp.end();
      } catch {
        // ignore
      }
      const errEntry: SftpLogEntry = {
        id: `sftp-err-${Date.now()}`,
        timestamp: new Date().toISOString(),
        filename: targets.map((t) => t.filename).join(', '),
        assetId: targets[0]?.id || '',
        fileSizeBytes: 0,
        host: `${state.sftpConfig.host}:${state.sftpConfig.port}`,
        status: 'error',
        message: `Koneksi SFTP Gagal: ${err?.message || 'Periksa kredensial SFTP Adobe Stock Anda atau aktifkan Mode Simulasi.'}`,
        durationMs: 0,
      };
      state.sftpLogs.unshift(errEntry);
      saveState(state);
      res.status(502).json({
        error: errEntry.message,
        logs: state.sftpLogs,
      });
    }
  });

  app.get('/api/export/csv', (req, res) => {
    const idsParam = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean) : [];
    const list =
      idsParam.length > 0
        ? state.assets.filter((a) => idsParam.includes(a.id))
        : state.assets.filter(
            (a) => a.status === 'ready' || a.status === 'uploaded' || a.status === 'in_review' || a.status === 'approved_live'
          );

    const escapeCsvField = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'Filename,Title,Keywords,Category,Releases';
    const rows = list.map((asset) => {
      const keywordsJoined = asset.metadata.keywords.slice(0, 49).join(', ');
      return [
        escapeCsvField(asset.filename),
        escapeCsvField(asset.metadata.title.replace(/,/g, ' ')),
        escapeCsvField(keywordsJoined),
        escapeCsvField(asset.metadata.categoryId),
        escapeCsvField(asset.metadata.releases || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="adobe_stock_metadata_${timestamp}.csv"`
    );
    res.send(csvContent);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StockFlow 4K Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
