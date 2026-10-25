# StockFlow 4K — Agen Otomatisasi Gambar 4K & Distribusi Adobe Stock (PRD)

Dokumen Product Requirements Document (PRD) dan cetak biru arsitektur untuk **StockFlow 4K**, platform agen otonom yang melakukan riset tren pasar mikro-stok, memproduksi gambar komersial beresolusi **4K Ultra-HD**, menyusun metadata SEO yang patuh pada regulasi Generative AI Adobe Stock, memvalidasi kualitas teknis aset, dan mendistribusikannya secara terjadwal melalui **SFTP Adobe Stock Contributor** beserta file **CSV Metadata UTF-8**.

---

## User Review & Keputusan Kritis yang Dikonfirmasi

> [!IMPORTANT]
> Spesifikasi produk di bawah ini telah diselaraskan berdasarkan preferensi arsitektur yang Anda konfirmasi pada tahap klarifikasi awal. Silakan tinjau keseluruhan PRD ini dan klik **Proceed** apabila sudah sesuai untuk memulai tahap pembangunan aplikasi.

- **Keputusan Terkonfirmasi 1 — Metode Pengiriman Aset**: Menggunakan **Integrasi SFTP Adobe Stock (`sftp.contributor.adobestock.com:22`) + Generator CSV Metadata resmi**, dilengkapi fitur unduh langsung paket CSV UTF-8 dan aset 4K untuk sinkronisasi satu klik di portal kontributor.
- **Keputusan Terkonfirmasi 2 — Alur Kerja Operasional**: Berjalan dalam **Mode Batch Terjadwal (Cron / Antrean Harian)** yang memungkinkan pengguna mengatur jadwal produksi otomatis maupun pemicu batch instan dengan pemantauan tahapan pipeline secara *real-time*.
- **Keputusan Terkonfirmasi 3 — Kapabilitas Inti Agen Cerdas**:
  1. **Riset Tren Pasar & Niche Otomatis via AI** (analisis musiman, *commercial buyer intent*, dan *supply-demand gap*).
  2. **Optimasi SEO Judul & 49 Keyword Adobe Stock** (pengurutan 10 kata kunci utama berbobot tinggi serta filter otomatis kata terlarang sesuai pedoman Generative AI Adobe).
  3. **Generasi & Upscaling Resolusi 4K Ultra-HD + Cek Kualitas Teknis (QC)** (validasi dimensi $\ge 4\text{MP}$ hingga $4\text{K}$, profil warna sRGB, ketajaman, dan batas ukuran file $<45\text{MB}$).

> [!NOTE]
> **Persyaratan Model Berbayar (4K Image Generation)**: Pembuatan gambar native beresolusi 4K menggunakan model `gemini-nano-banana-2.1` dan penalaran pasar menggunakan `gemini-4-argon` memerlukan *Paid API Key* pada lingkungan Google AI Studio yang akan dikonfigurasi saat implementasi dimulai.

---

## 1. Ikhtisar Produk & Konsep Inti (Product Overview)

### Apa yang Dilakukan Aplikasi Ini
**StockFlow 4K** adalah sistem otomasi *end-to-end* bagi kontributor Adobe Stock profesional. Alih-alih membuat prompt satu per satu, melakukan *upscaling* manual, mengetik puluhan kata kunci, dan mengunggah file lewat aplikasi FTP eksternal, pengguna cukup menentukan target niche atau mengaktifkan **Penjadwal Batch Harian**. Agen akan bekerja secara berurutan melalui 5 tahapan pipeline:
1. **Market Trend Intelligence**: Menganalisis tren komersial musiman dan celah pasar (*high-demand, low-competition*) untuk menghasilkan daftar ide prompt fotografi/ilustrasi komersial bernilai jual tinggi.
2. **4K Studio Image Engine**: Menghasilkan gambar komersial beresolusi 4K Ultra-HD (`gemini-nano-banana-2.1` dengan `imageSize: "4K"`) dengan pencahayaan studio, komposisi ruang kosong (*copy space*) untuk kebutuhan desainer, dan bebas artefak.
3. **Technical Quality Control (QC) & 4K Normalizer**: Memproses ulang gambar di sisi server ke ruang warna standar **sRGB**, memastikan resolusi berada di skala **4K Ultra-HD** (mis. $3840 \times 2160$ atau $4096 \times 4096$, jauh di atas batas minimum 4 Megapiksel Adobe Stock), menghitung skor ketajaman/noise, dan memberi penamaan file maksimal 30 karakter.
4. **Adobe Stock SEO & Compliance Engine**: Menghasilkan metadata yang mematuhi aturan ketat Adobe Stock Generative AI:
   - **Filename**: Maksimal 30 karakter termasuk ekstensi `.jpg`.
   - **Title**: Maksimal 70 karakter, deskriptif, tanpa tanda koma, dan otomatis membersihkan istilah teknis/kamera/render (*4K, 8K, photorealistic, Canon, volumetric lighting*) maupun nama merek/IP yang dilarang Adobe.
   - **Keywords**: Tepat **49 kata kunci** berbahasa Inggris yang diurutkan berdasarkan bobot relevansi tertinggi pada **10 urutan pertama** (*Top-10 Priority Weighting*).
   - **Category**: Pemetaan otomatis ke kode kategori numerik resmi Adobe Stock (ID `1` hingga `21`).
5. **Automated SFTP Dispatcher & CSV Packager**: Mengunggah batch gambar 4K langsung ke server `sftp.contributor.adobestock.com` melalui koneksi SFTP terenkripsi di sisi server, sekaligus menghasilkan file **CSV UTF-8** siap unggah ke halaman manajemen kontributor Adobe Stock.

### Target Pengguna
- **Kontributor Microstock Profesional & Agensi Kreatif** yang ingin meningkatkan skala portofolio harian dengan standar kualitas komersial dan kepatuhan penuh terhadap kurasi moderator Adobe Stock.

### Nilai Utama & Metrik Keberhasilan
- **Zero-Rejection Metadata**: Eliminasi penolakan aset akibat pelanggaran kata kunci terlarang, judul lebih dari 70 karakter, atau nama file lebih dari 30 karakter.
- **Kecepatan Produksi Batch**: Memangkas waktu kerja dari rata-rata 25 menit per aset (riset, pembuatan gambar, upscale 4K, penulisan 49 keyword, upload FTP) menjadi kurang dari 60 detik per aset dalam antrean batch otomatis.

---

## 2. Pengalaman Pengguna & Desain Visual (UX & Visual Design)

### Alur Pengguna Utama (Key User Flows)
1. **Riset Tren & Perencanaan Batch (Market Intelligence Flow)**:
   - Pengguna memilih kategori industri atau menekan **"Riset Tren Pasar AI"**.
   - Agen menyajikan peluang niche komersial lengkap dengan *Buyer Intent*, rekomendasi rasio aspek (`16:9`, `4:3`, `1:1`, `3:4`, `9:16`), dan draf prompt komersial yang dapat langsung dimasukkan ke antrean batch harian.
2. **Eksekusi Batch & Penjadwalan Otomatis (Scheduled Batch Queue Flow)**:
   - Pengguna mengatur konfigurasi penjadwal (jam eksekusi harian, jumlah target gambar per batch, rasio aspek default, dan mode otomatis lanjut ke SFTP).
   - Saat batch berjalan (baik via jadwal maupun tombol **"Jalankan Batch Sekarang"**), setiap item di tabel antrean menampilkan progres tahapan secara *real-time*: `Queued` $\rightarrow$ `Generating 4K` $\rightarrow$ `QC & Upscaling` $\rightarrow$ `SEO Metadata` $\rightarrow$ `Ready / SFTP Uploaded`.
3. **Inspeksi Kualitas 4K & Audit SEO (Asset Inspector & Compliance Flow)**:
   - Pengguna mengklik salah satu aset untuk membuka panel inspeksi detail: melihat pratinjau resolusi 4K, dimensi piksel aktual, ukuran file (MB), skor QC teknis, indikator kepatuhan aturan Adobe Stock, serta mengedit judul (dengan penghitung 70 karakter) dan urutan 49 kata kunci (dengan sorotan khusus pada 10 kata kunci utama).
4. **Pengiriman SFTP & Ekspor CSV (SFTP & CSV Delivery Flow)**:
   - Pengguna menyimpan kredensial SFTP Adobe Stock (`sftp.contributor.adobestock.com`, Port `22`, Username/ID Kontributor, dan Password SFTP).
   - Agen mengunggah file `.jpg` 4K yang lolos QC ke server SFTP dan menyediakan unduhan satu klik **CSV Metadata Adobe Stock (UTF-8)** yang memetakan kolom `Filename,Title,Keywords,Category,Releases`.

### Identitas Visual & Tema (SaaS Studio Workspace)
- **Arah Estetika**: *Precision Creative Operations Console* — menggabungkan kejelasan ruang kerja editorial fotografi (seperti Capture One / Frame.io) dengan kepadatan data *enterprise dashboard* yang rapi, tenang, dan presisi.
- **Palet Warna (Distribusi 60-30-10)**:
  - **60% Kanvas Netral Dominan**: `Slate-950` (`#090D16`) untuk latar ruang kerja utama agar pratinjau warna gambar 4K tampil akurat tanpa bias optik.
  - **30% Permukaan Struktural**: `Slate-900` (`#111726`) dengan garis batas tipis 1px (`#1E293B`) untuk panel navigasi, tabel antrean batch, dan panel inspektor.
  - **10% Aksen Fungsional**: `Indigo-500` (`#6366F1`) khusus untuk aksi utama, ditambah warna status semantik yang selalu berpasangan dengan label teks eksplisit:
    - `Emerald-500` (`#10B981`): Lolos QC 4K / Terkirim ke SFTP
    - `Amber-500` (`#F59E0B`): Sedang Diproses / Antrean Terjadwal
    - `Rose-500` (`#F43F5E`): Peringatan Kepatuhan / Gagal Unggah
- **Tipografi & Hierarki (Aturan 2+1 Font)**:
  - *Display & Navigasi*: `Plus Jakarta Sans` (SemiBold/Bold) untuk struktur judul halaman dan metrik ringkasan.
  - *Prosa & Editor Metadata*: `DM Sans` (Regular/Medium) untuk keterbacaan tinggi pada daftar 49 kata kunci dan deskripsi prompt.
  - *Data Teknis & Telemetri*: `JetBrains Mono` dengan `tabular-nums` untuk dimensi piksel (`3840 × 2160 px`), ukuran berkas (`14.8 MB`), hitung mundur jadwal cron, dan penghitung karakter (`64/70 chars`).
- **Tata Letak & Disiplin Komponen**:
  - **Kontrak Navigasi Atas (Top Bar Contract)**: Satu baris bersih berisi 3 zona: Wordmark **StockFlow 4K** di kiri, 4 tautan navigasi ruang kerja (`Antrean Batch`, `Riset Tren AI`, `Katalog & SEO`, `Distribusi SFTP`) di tengah, dan 1 tombol aksi utama (`+ Buat Batch 4K`) di kanan.
  - **Disiplin Tanpa Pill Statis (Zero-Pill Metadata)**: Seluruh metadata statis pada kartu dan baris tabel (seperti dimensi, rasio aspek, kode kategori, dan waktu pembuatan) ditampilkan sebagai teks bersih dengan pemisah tipografi (`3840×2160 · 16:9 · Kat. 19 · 12.4 MB`) tanpa membungkusnya dalam *pill badge* warna-warni yang ramai.

---

## 3. Keputusan Produk Utama & Pertimbangan Teknis (Trade-Offs)

### Keputusan 1: Generasi 4K Native + Normalisasi Piksel Server-Side (`sharp`)
- **Pendekatan yang Dipilih**: Mengombinasikan pembuatan gambar beresolusi tinggi via model `gemini-nano-banana-2.1` (`imageSize: "4K"`) dengan pemrosesan *pipeline* gambar `sharp` di server Node.js untuk konversi ke JPEG kualitas 95%, penyematan profil warna sRGB, dan *lanczos3 upscaling/normalization* jika diperlukan agar selalu memenuhi standar piksel 4K Ultra-HD.
- **Alasan**: Adobe Stock menolak gambar di bawah 4MP atau gambar dengan profil warna non-standar. Pemrosesan di sisi server memastikan setiap file `.jpg` yang dikirim lewat SFTP memiliki spesifikasi teknis yang konsisten dan siap kurasi.
- **Alternatif yang Dipertimbangkan**: Mengandalkan output mentah base64 langsung di browser tanpa normalisasi server — dilewati karena tidak menjamin metadata resolusi JPEG, ukuran file, dan kompatibilitas pengiriman SFTP biner.

### Keputusan 2: Sanitasi Otomatis Regulasi Metadata Adobe Stock Generative AI
- **Pendekatan yang Dipilih**: Menerapkan validasi dua lapis (instruksi skema JSON terstruktur pada `gemini-4-argon` + *rule-based sanitizer* di server) yang memotong nama file maksimal 30 karakter, judul maksimal 70 karakter bebas koma, membatasi tepat 49 kata kunci, dan menghapus daftar kata terlarang Adobe Stock (*4K, 8K, UHD, photorealistic, hyperrealistic, Unreal Engine, Octane Render, Midjourney, Firefly, Canon, Nikon*).
- **Alasan**: Penyebab utama penolakan (*rejection*) atau penangguhan akun kontributor AI di Adobe Stock adalah pencantuman istilah spesifikasi render/resolusi di dalam judul atau kata kunci serta penggunaan nama kamera/merek.

### Keputusan 3: Klien SFTP Asli di Server + Mode Fallback Paket ZIP/CSV
- **Pendekatan yang Dipilih**: Menyediakan modul koneksi SFTP nyata di backend Express menuju `sftp.contributor.adobestock.com:22` untuk mengunggah file gambar `.jpg`, dilengkapi fitur unduh langsung **CSV Metadata UTF-8** dan berkas gambar 4K ke komputer lokal.
- **Alasan**: Di Adobe Stock, pengiriman via SFTP mengirimkan file media ke portal kontributor, sedangkan file CSV metadata diunggah oleh kontributor melalui tab *Upload CSV* di dashboard Adobe Stock untuk menyematkan judul, 49 keyword, dan kategori secara massal dalam satu klik.

---

## 4. Arsitektur Teknis & Strategi Data

### Diagram Arsitektur & Hirarki Komponen

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND WORKSPACE (React 19 + Tailwind)                  │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar: [StockFlow 4K] ── [Batch | Tren AI | Katalog SEO | SFTP] ── [+Batch]│ │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│         │                         │                        │                     │
│         ▼                         ▼                        ▼                     │
│  ┌──────────────────┐   ┌───────────────────────┐   ┌─────────────────────────┐  │
│  │ Market Trend Lab │   │ Batch Queue & Cron    │   │ 4K Asset & SEO Inspector│  │
│  │ - Riset Niche AI │   │ - Penjadwal Harian    │   │ - Pratinjau 4K & Skor QC│  │
│  │ - Ide Prompt     │──▶│ - Tabel Progres Batch │──▶│ - Editor Judul (<=70c)  │  │
│  │ - Skor Komersial │   │ - Pemicu Batch Instan │   │ - 49 Keyword (Top-10)   │  │
│  └──────────────────┘   └───────────────────────┘   └─────────────────────────┘  │
│                                                            │                     │
│                                                            ▼                     │
│                                                     ┌─────────────────────────┐  │
│                                                     │ SFTP & CSV Delivery Hub │  │
│                                                     │ - Konfigurasi SFTP Port │  │
│                                                     │ - Log Transmisi SFTP    │  │
│                                                     │ - Ekspor CSV UTF-8      │  │
│                                                     └─────────────────────────┘  │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │ REST API (/api/*)
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND AGENT ENGINE (Express + Node.js)                   │
│                                                                                  │
│  ┌─────────────────────────┐  ┌────────────────────────┐  ┌───────────────────┐  │
│  │ Gemini AI Orchestrator  │  │ 4K Image & QC Pipeline │  │ SFTP & CSV Engine │  │
│  │ - gemini-4-argon        │  │ - sharp 4K Normalizer  │  │ - SFTP Client     │  │
│  │   (Tren & 49 Keyword)   │  │ - sRGB & JPEG 95%      │  │   (Port 22 Upload)│  │
│  │ - gemini-nano-banana-2.1│  │ - Validasi >=4MP / 4K  │  │ - UTF-8 CSV       │  │
│  │   (Native 4K Image Gen) │  │ - Kalkulasi Skor QC    │  │   Builder         │  │
│  └─────────────────────────┘  └────────────────────────┘  └───────────────────┘  │
│                                        │                                         │
│                                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ Persistent Local Storage Engine (Data Katalog, Jadwal Cron, & File 4K)     │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Model Data Utama & Kategori Resmi Adobe Stock
1. **StockAsset (Item Gambar & Metadata)**:
   - `id`: Identifier unik aset.
   - `filename`: Nama berkas patuh aturan Adobe Stock (`<= 30` karakter, huruf kecil/angka/garis bawah, berakhiran `.jpg`, contoh: `as_solar_eng_4k_0182.jpg`).
   - `prompt`: Prompt deskriptif komersial yang digunakan untuk membuat gambar.
   - `aspectRatio`: `"16:9"` | `"4:3"` | `"1:1"` | `"3:4"` | `"9:16"`.
   - `status`: `"queued"` | `"generating_image"` | `"processing_4k_qc"` | `"generating_seo"` | `"ready"` | `"uploading_sftp"` | `"uploaded"` | `"failed"`.
   - `technicalSpecs`:
     - `width`: Lebar piksel aktual (contoh: `3840`).
     - `height`: Tinggi piksel aktual (contoh: `2160`).
     - `megapixels`: Total megapiksel (contoh: `8.29 MP`).
     - `fileSizeBytes`: Ukuran berkas JPEG dalam byte.
     - `colorSpace`: `"sRGB"`.
     - `qcScore`: Skor lulus kualitas teknis (`0–100`) beserta rincian pengecekan ketajaman, bebas *clipping* pencahayaan, dan kepatuhan dimensi.
   - `metadata`:
     - `title`: Judul bersih maksimal 70 karakter tanpa koma.
     - `keywords`: Array hingga 49 kata kunci terurut berdasarkan prioritas pencarian (10 kata kunci pertama ditandai sebagai *Primary Search Drivers*).
     - `categoryId`: Nomor kategori resmi Adobe Stock (`1` s.d. `21`, mis. `3` = Business, `7` = Food and Drink, `11` = Landscape, `15` = People, `19` = Technology).
     - `isGenerativeAI`: `true` (penanda wajib konten Generative AI beserta deklarasi *People and Property are fictional*).
     - `complianceReport`: Status validasi bebas kata terlarang dan batas panjang karakter.
2. **BatchScheduleConfig (Penjadwal Antrean Harian)**:
   - Menyimpan status aktif/nonaktif cron otomatis, waktu eksekusi harian (`HH:mm`), jumlah item per batch, target niche default, dan opsi auto-upload SFTP setelah lolos QC.
3. **SftpConnectionConfig (Konfigurasi SFTP Kontributor)**:
   - Menyimpan host (`sftp.contributor.adobestock.com`), port (`22`), username kontributor, direktori tujuan (`/`), serta riwayat log pengiriman berkas.

### Pemetaan Interaksi Komponen & Manajemen State
- **Riset Tren Pasar (`Market Trend Lab`)**: Saat pengguna memasukkan topik atau memilih kategori industri, backend memanggil `gemini-4-argon` dengan *structured JSON schema* untuk menghasilkan 4–6 peluang konsep visual komersial beserta estimasi permintaan pasar dan prompt siap pakai. Tombol **"Tambahkan ke Antrean Batch"** langsung memasukkan konsep tersebut ke daftar `queued` dan mengarahkan ke tab Antrean Batch.
- **Eksekusi Pipeline Bertahap (`Batch Queue & Cron`)**: Baik dipicu oleh timer penjadwal maupun tombol eksekusi manual, worker memproses item antrean satu per satu dan memperbarui status secara langsung di antarmuka:
  1. Memanggil `gemini-nano-banana-2.1` dengan `imageConfig: { aspectRatio, imageSize: "4K" }`.
  2. Mengirim buffer gambar ke modul QC & 4K Normalizer untuk memastikan dimensi 4K Ultra-HD, profil sRGB, dan mengambil metrik piksel nyata.
  3. Memanggil `gemini-4-argon` secara multimodal (mengirim gambar yang baru dibuat + konteks prompt) agar judul dan 49 kata kunci benar-benar akurat menggambarkan isi visual gambar sekaligus lolos filter kepatuhan Adobe Stock.
- **Editor & Audit Kepatuhan (`4K Asset & SEO Inspector`)**: Setiap perubahan manual pada judul atau kata kunci langsung divalidasi secara *real-time* (menghitung batas 70 karakter judul, menolak koma pada judul, memvalidasi 30 karakter nama file, mendeteksi kata terlarang seperti `"4K"` atau `"photorealistic"` di dalam daftar keyword, dan memungkinkan pengurutan ulang 10 keyword teratas).
- **Transmisi SFTP & Generator CSV (`SFTP & CSV Delivery Hub`)**:
  - Tombol **"Uji Koneksi SFTP"** dan **"Unggah Batch ke SFTP Adobe Stock"** mengeksekusi koneksi SFTP dari server ke host kontributor dan melaporkan progres per berkas.
  - Tombol **"Unduh CSV Adobe Stock (UTF-8)"** membangun file CSV dengan BOM UTF-8 dan header resmi `Filename,Title,Keywords,Category,Releases` untuk seluruh aset yang dipilih.
