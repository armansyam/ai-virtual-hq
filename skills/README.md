# 🧠 Folder Skills Terpusat — AI Virtual HQ (`skills/`)

Seluruh skill karyawan AI (termasuk skill hasil import dari GitHub, Claude/Agent Skills, maupun SOP custom) disimpan rapi di dalam satu folder ini mengikuti standar **Agent Skills (`SKILL.md`)**:

```text
skills/
├── README.md
└── <nama-skill>/
    ├── SKILL.md        # YAML frontmatter (name, description, triggers) + instruksi Markdown penuh
    ├── meta.json       # Konfigurasi HQ (enabled, scope: ALL | DEPT | AGENTS, depts, agentIds)
    ├── references/     # (Opsional) Dokumen referensi / contoh tambahan
    └── scripts/        # (Opsional) Script pembantu skill
```

## Cara Menambahkan Skill
Anda bisa menambahkan skill langsung dari Dashboard HQ (**⚙️ Pengaturan → 🧠 Skills Tim AI**) dengan 3 cara:
1. **Import URL / GitHub:** Tempel tautan repo GitHub atau URL raw `SKILL.md` dari katalog Agent Skills terpercaya.
2. **Import Folder / File `.md`:** Pilih folder skill lokal dari komputer Anda lewat Finder/Explorer atau unggah file `.md`.
3. **Buat Baru (`SKILL.md`):** Tulis langsung di editor Markdown lalu tentukan targetnya (**Semua Staf**, **Departemen tertentu**, atau **Staf spesifik**).

## Cara Kerja Hemat Token (*Progressive Disclosure*)
- Staf AI **hanya** menerima indeks ringkas dari skill yang berstatus **ON** dan memang ditugaskan kepadanya.
- Isi penuh `SKILL.md` hanya dimuat secara otomatis saat permintaan CEO cocok dengan topik/trigger skill tersebut (atau saat AI memanggil `[[LOAD_SKILL:"<slug>"]]`).
