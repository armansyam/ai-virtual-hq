# Panduan Migrasi AI Virtual HQ ke Homelab Server 24/7

Paket ini menyiapkan **AI Virtual HQ** agar berjalan mandiri 24 jam sehari di server Ubuntu / Debian / Proxmox LXC / Mini PC homelab Anda.

---

## Alat Kerja Karyawan (WAJIB untuk Social & Themes)
Karyawan AI tidak hanya mengobrol: Social merender carousel & merekam Reels, Themes menulis master tema di **Theme Atelier**
(ruang kerja terkurung), mengaudit, merender, memotret, lalu mengirim draf lewat MCP ke Draft Themes luxvite.id.
Semua alat itu dipasang otomatis oleh:
```bash
cd /opt/Karyawan-Luxvite
LUXENARY_REPO=https://github.com/<akun>/luxenary-invite.git LUXENARY_DIR=/opt/luxenary-engine bash tools/setup.sh
```
- Script memasang Pillow, Node 22 (`~/.local/node`), pabrik Reels, browser headless (`tools/.browsers`), dan mesin render Luxenary
  (clone + `npm ci`, dipakai hanya untuk render/audit lokal dengan DB uji, tanpa kredensial produksi).
- Yang butuh sudo dicetak sebagai **[PERLU]**, misalnya `sudo apt-get install -y bubblewrap` (sandbox Atelier) dan pustaka Chrome.
- Set `projectPath` di `config/company_profile.json` ke `LUXENARY_DIR` yang sama, lalu login `agy` sekali di host.
- Cek dari browser: `GET /api/tools/readiness` (login admin) menampilkan alat yang siap/belum. Atelier menolak jalan bila sandbox tidak ada.

> Docker image saat ini hanya berisi Python (tanpa agy, Node, browser, mesin render). Untuk karyawan penuh gunakan **Opsi B (systemd native)**.

### Arsip konten ke Google Drive (rclone)
Saat CEO menandai konten **Sudah diposting / Dipakai / Ditolak**, folder di `content-queue/` otomatis dikompres (PNG → WebP), dizip,
diunggah ke Google Drive, dicocokkan MD5-nya, lalu salinan lokal dihapus. Housekeeping harian juga mengarsipkan folder yang sudah
keluar dari antrean (lebih tua dari 2 hari) dan mengunggah ulang zip yang sebelumnya gagal. Tanpa Drive, zip disimpan di `archive/YYYY-MM/`.

`tools/setup.sh` memasang rclone ke `~/.local/bin/rclone`. Login Google sekali (token tersimpan di `~/.config/rclone/` milik host, bukan di HQ):
1. (Disarankan) Buat client ID OAuth sendiri agar tidak kena batas client bawaan rclone: Google Cloud Console → APIs & Services →
   aktifkan *Google Drive API* → Credentials → *OAuth client ID* tipe **Desktop app** → catat client ID & secret.
2. Di host: `~/.local/bin/rclone config` → `n` (remote baru) → nama **`gdrive`** → storage **`drive`** → isi client ID/secret
   (atau kosongkan) → scope **`drive.file`** (rclone hanya bisa melihat berkas yang ia unggah sendiri) → lewati opsi lanjutan.
3. Homelab tanpa layar: jawab `n` pada *Use web browser to automatically authenticate*, jalankan `rclone authorize "drive"` di Mac
   (yang ada browser), login, lalu tempel token yang dicetak ke terminal homelab.
4. Arsip dikirim ke `gdrive:Luxvite-Arsip/YYYY-MM/`. Ganti tujuan dengan env `ARCHIVE_RCLONE_REMOTE` (mis. `gdrive:Arsip/Luxvite`).
   Cek: `GET /api/tools/readiness` → `driveArchive: true`.

## Opsi A — Jalankan via Docker Compose (tampilan kantor saja, tanpa alat kerja)
1. Salin folder proyek ke homelab (beserta `config/`, `memory/`, `reports/`, `skills/` agar seluruh histori & memori Obsidian ikut terbawa):
   ```bash
   rsync -avz --exclude='.git' /Users/macbookprom1/Documents/Karyawan-Luxvite/ ubuntu@<IP-HOMELAB>:/opt/Karyawan-Luxvite/
   ```
2. Masuk ke homelab dan jalankan container:
   ```bash
   cd /opt/Karyawan-Luxvite/deploy
   docker compose up -d --build
   docker compose logs -f
   ```
3. Cek kesehatan:
   ```bash
   curl http://127.0.0.1:8484/api/public/live-state
   ```

---

## Opsi B — Jalankan Native dengan `systemd` (Ubuntu / Debian / Proxmox LXC)
Cocok jika Anda ingin memakai CLI lokal (`agy` / `claude`) langsung di host Linux.

```bash
sudo cp /opt/Karyawan-Luxvite/deploy/ai-virtual-hq.service /etc/systemd/system/
# Edit User & WorkingDirectory bila perlu:
sudo nano /etc/systemd/system/ai-virtual-hq.service

sudo systemctl daemon-reload
sudo systemctl enable --now ai-virtual-hq
sudo systemctl status ai-virtual-hq
```

---

## Checklist Wajib Sebelum Ditinggal 24/7

1. **Model Cadangan Otomatis (Auto-Fallback):**
   - Buka **Setup 1 Pintu → ⚡ Token Saver → Auto-Fallback Model AI** (pastikan **ON**).
   - Tambahkan minimal 1 **API Key** (Gemini API / OpenRouter / Anthropic) di tab **🔑 API Key & Model AI** supaya bila CLI OAuth sempat *expired*, kantor tetap jalan tanpa henti.
2. **Rem Kuota Harian (Daily Token Budget Cap):**
   - Di tab **⚡ Token Saver**, default sudah diset `2M tokens / hari` (ubah sesuai kuota Anda).
3. **Jadwal Jam Kantor & Zona Waktu:**
   - Klik pill jam di pojok kanan atas (`WITA · BUKA`) → atur jam buka, istirahat siang, jam tutup, atau pilih **⚡ 24/7 Non-Stop**.
4. **Telegram Bot CEO (Pantau & ACC dari HP):**
   - Buat bot di `@BotFather`, ambil Chat ID Anda di `@userinfobot`.
   - Masukkan di **Setup 1 Pintu → 🔗 Konektor & Integrasi → 📲 Telegram Bot CEO** lalu klik **🧪 Tes Kirim**.
   - Perintah cepat dari HP: `/status`, `/report`, `/wake`, `/rest`, `/task SOCIAL Buat 3 ide Reels minggu ini`.
5. **Akses Aman dari Luar Rumah (Tanpa Port-Forwarding):**
   - Pasang **Tailscale** di homelab & MacBook/HP, lalu buka `http://<tailscale-ip>:8484`.
   - Atau pakai **Cloudflare Tunnel** (`cloudflared`) ke subdomain privat Anda.
6. **Sinkronisasi Memori Obsidian Real-Time:**
   - Pasang **Syncthing** pada folder `/opt/Karyawan-Luxvite/memory` ↔ MacBook Anda, lalu buka di Obsidian untuk melihat Graph View `[[wikilink]]` perusahaan bertumbuh setiap hari.
7. **Backup Otomatis Harian (Cron):**
   ```bash
   chmod +x /opt/Karyawan-Luxvite/deploy/backup-hq.sh
   (crontab -l 2>/dev/null; echo "30 23 * * * /opt/Karyawan-Luxvite/deploy/backup-hq.sh >> /var/log/hq-backup.log 2>&1") | crontab -
   ```
