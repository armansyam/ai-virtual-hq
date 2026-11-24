# AI Virtual HQ — 3D Multi-Agent Workforce Server

Aplikasi server mandiri **3D Virtual HQ** dengan **35 Karyawan AI lintas 6 Departemen**, mendukung **Setup 1 Pintu (White-Label)**, **Multi-Provider LLM API**, **Multi-Remote MCP Server (Streamable HTTP JSON-RPC 2.0)**, **Public Live View (`/`)**, serta **Sistem Login CEO/Admin berbasis `.env` & Signed `HttpOnly` Cookie**.

## Fitur Utama
- **Halaman Utama (`/`) = Public Live View (Read-Only 100% Aman)**: Pengunjung publik langsung melihat aktivitas 3D secara real-time melalui endpoint terisolasi `GET /api/public/live-state` — tanpa kebocoran chat CEO, keuangan, API Key, maupun konfigurasi MCP.
- **Sistem Login CEO/Admin & Keamanan Backend**:
  - Password di-hash dengan **PBKDF2-HMAC-SHA256 (200.000 iterasi)**.
  - Sesi memakai **Signed Cookie (`HttpOnly`, `SameSite=Lax`, `Secure` di HTTPS)** + **Rate Limiting** anti brute-force (8 percobaan gagal / 10 menit per IP; header `X-Forwarded-For`/`CF-Connecting-IP` hanya dipercaya dari reverse proxy di `127.0.0.1`).
  - **ACC CEO untuk aksi agen**: tool Remote MCP yang mengubah sistem (selain `get/list/search/check/read/audit_*`) dan impor skill dari URL yang diminta agen masuk antrean persetujuan (UI & Telegram), baru dijalankan setelah disetujui.
  - **Status Quality Gate jujur**: laporan manajer berstatus REVISI tercatat `REVISI` di Papan Tugas, memori, dan webhook — bukan `DONE`.
  - **Batas gagal**: tugas yang error 2× berhenti sebagai `GAGAL` dan menunggu CEO (tidak diulang tanpa batas). Agen yang kehabisan langkah tool ditandai `HASIL TIDAK TUNTAS`.
  - **Output nyata, bukan naskah**: Social menghasilkan slide carousel PNG (`POST_PACKAGE`) dan video Reels MP4 dari demo tema asli (`REEL_REQUEST`, perlu `cd tools/reel-factory && npm install` + Chrome/Brave); Theme Lab mengirim draf tema dari spesifikasi (`THEME_DRAFT`); departemen lain menyimpan file siap pakai (`OUTPUT_FILE`). Semua masuk Ringkasan CEO (Siap posting / Siap dipakai).
  - **Memori ringkas**: catatan memori utama menyimpan 15 entri terbaru per bagian; entri lama dipindah ke `memory/arsip/`. Memori bekerja di latar belakang dan tidak ditampilkan sebagai wikilink di chat.
  - Firewall strict pada seluruh endpoint `/api/*` dan whitelist static file (file `.env`, `config/`, `reports/`, `*.py`, `*.md` diblokir `403`).
- **Setup 1 Pintu (Zero Hardcode)**: Ubah Nama Perusahaan, Tagline, Industri, Website, Brief Bisnis/SOP, dan Nama 6 Departemen langsung dari UI — seluruh branding dan konteks 35 karyawan AI otomatis menyesuaikan.
- **Multi-Provider AI & Multi-Remote MCP**: Hubungkan Gemini, OpenAI, Anthropic, Groq, Ollama, OpenRouter, serta satu atau banyak server aplikasi Remote MCP (`/api/mcp`).

## 2 Cara Menjalankan (Pilih Sesuai Kebutuhan)

### Cara A — Aplikasi Desktop Lokal (Tanpa Server · Aktif Saat Dibuka)
Cocok untuk pengguna laptop/PC yang tidak punya VPS/homelab. Berjalan hanya saat jendela aplikasi dibuka dan berhenti bersih saat ditutup:
- **Installer Siap Pakai (Orang Awam)**: Unduh `AI-Virtual-HQ-macOS.dmg` (Mac), `AI-Virtual-HQ-Windows.exe` (Windows), atau `AI-Virtual-HQ-Linux.tar.gz` (Linux) di halaman **GitHub Releases** → Install → klik 2x langsung masuk Mode CEO (tanpa terminal & tanpa `localhost`).
- **Jalankan dari Source (Developer)**:
  ```bash
  pip install -r requirements-desktop.txt
  python3 desktop.py
  ```
- **Auto-Build Installer di GitHub Actions**: Setiap kali Anda push tag versi (`git tag v1.0.0 && git push origin v1.0.0`), workflow `.github/workflows/release-desktop.yml` otomatis mem-build dan merilis installer macOS `.dmg`, Windows `.exe`, & Linux ke GitHub Releases.

### Cara B — Server 24 Jam (Homelab / VPS dengan Public Live View + Login)

```bash
# 1. Salin template environment
cp .env.example .env

# 2. (Opsional) Generate SESSION_SECRET dan masukkan ke .env
python3 -c "import secrets; print(secrets.token_hex(32))"

# 3. Jalankan server (Python 3.10+, zero external dependencies)
python3 -u server.py
```

Buka **`http://localhost:8484/`**:
1. Halaman utama langsung menampilkan **Live View 3D (Publik)**.
2. Klik **`Setup Admin`** di pojok kiri atas untuk membuat akun Admin/CEO pertama (atau set `ADMIN_USERNAME` & `ADMIN_PASSWORD` di `.env`).
3. Setelah login, buka menu **`Setup`** untuk mengisi Profil Bisnis, API Key LLM, dan Remote MCP Server Anda.

## Deploy Produksi (PM2 atau Docker)

### Menggunakan PM2
```bash
cp .env.example .env
# Edit .env (set APP_COOKIE_SECURE=true jika di belakang HTTPS/Nginx/Caddy)
pm2 start ecosystem.config.cjs
pm2 save
```

### Menggunakan Docker Compose (Rekomendasi Homelab 24/7)
```bash
git clone <url-repo-anda> ai-virtual-hq
cd ai-virtual-hq
cp .env.example .env
# Edit .env (isi SESSION_SECRET & set APP_COOKIE_SECURE=true jika pakai HTTPS/Cloudflare Tunnel)
docker compose up -d --build
```

### Menggunakan Docker Manual
```bash
docker build -t ai-virtual-hq .
docker run -d --name ai-virtual-hq --restart unless-stopped -p 8484:8484 --env-file .env -v $(pwd)/config:/app/config ai-virtual-hq
```

## Kebutuhan Spesifikasi Server / Homelab
- **Dengan Cloud AI API (Gemini / OpenAI / Anthropic / OpenRouter / Groq)**:
  - Minimum: 1 vCPU, 512 MB RAM, 2 GB Disk (rendering 3D berjalan di browser klien, backend hanya ~30–60 MB RAM).
  - Rekomendasi nyaman 24/7: 1–2 vCPU, 1 GB RAM, 5–10 GB Disk.
- **Dengan LLM Lokal (Ollama di Homelab)**:
  - Tambahan 8–16 GB RAM (atau GPU 8–12 GB VRAM) untuk menjalankan model lokal 7B–8B.

## Keamanan Repo Publik
File `.gitignore` sudah dikonfigurasi ketat agar `.env`, kunci sesi, file `config/*.json` (berisi API key/chat), laporan internal, dan aset privat tidak pernah ikut ter-commit.
