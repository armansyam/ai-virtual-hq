# Panduan Migrasi AI Virtual HQ ke Homelab Server 24/7

Paket ini menyiapkan **AI Virtual HQ** agar berjalan mandiri 24 jam sehari di server Ubuntu / Debian / Proxmox LXC / Mini PC homelab Anda.

---

## Opsi A — Jalankan via Docker Compose (Paling Cepat)
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
