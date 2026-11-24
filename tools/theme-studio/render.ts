// Theme Atelier: audit kontrak master tulisan tangan + render dengan data demo memakai engine Luxenary yang sama dengan undangan klien.
// Dijalankan dengan cwd = repo Luxenary agar alias "@/..." dan berkas blueprint/aset terbaca:
//   npx tsx <hq>/tools/theme-studio/render.ts master <master.html> <WEDDING|PERSONAL|EVENT> <outDir>
// Menulis preview.html (latar fallback) dan preview-bg.html (klien mengunggah foto latar), <base> ke luxvite.id.
import fs from "fs";
import path from "path";
import type { BuilderEventType } from "@/lib/themeBuilder/spec";
import { readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { composeInvitationData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { DEFAULT_THEME_BY_EVENT } from "@/lib/invitationUtils";
import vm from "vm";

const PREVIEW_BASE = process.env.LUXVITE_PREVIEW_BASE || "https://luxvite.id/";

const tokensOf = (html: string) => new Set([...html.matchAll(/\{\{\s*(?:#if\s+|#unless\s+)?([\w.]+)\s*\}\}/g)].map((m) => m[1]));
const fieldsOf = (html: string) => new Set([...html.matchAll(/data-lux-field="([^"]+)"/g)].map((m) => m[1]));

/**
 * Kontrak master tulisan tangan Atelier terhadap blueprint mode terkini: semua token engine & label Studio tetap ada,
 * latar lewat slot media (fixed-bg-layer + has-custom-bg), warna hanya di :root, tanpa URL luar, skrip inline lolos parse.
 * Penanda builder (data-lux-section/-block) tidak diwajibkan karena master ini bukan hasil builder.
 */
function auditMaster(html: string, blueprint: string): string[] {
  const issues: string[] = [];
  if (!/<!doctype html|<html[\s>]/i.test(html)) issues.push("Bukan dokumen HTML utuh (<!DOCTYPE html>/<html>).");
  if (!/:root\s*\{/.test(html)) issues.push("Tidak ada blok :root berisi token warna.");
  const outside = html.replace(/:root\s*\{[^}]*\}/g, "").replace(/&#x?[0-9a-f]+;/gi, "");
  const hex = [...new Set(outside.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])];
  const rgb = outside.match(/\b(?:rgba?|hsla?)\(\s*\d/g) ?? [];
  if (hex.length || rgb.length) issues.push(`Warna mati di luar :root (${[...hex.slice(0, 6), ...(rgb.length ? [`${rgb.length}x rgb/hsl`] : [])].join(", ")}); pakai var(--...) atau color-mix.`);
  const tokens = tokensOf(html);
  const missingTokens = [...tokensOf(blueprint)].filter((t) => !tokens.has(t));
  if (missingTokens.length) issues.push(`Token engine hilang: ${missingTokens.join(", ")}.`);
  const fields = fieldsOf(html);
  const missingFields = [...fieldsOf(blueprint)].filter((f) => !fields.has(f));
  if (missingFields.length) issues.push(`Label Studio (data-lux-field) hilang: ${missingFields.join(", ")}.`);
  if (!html.includes("fixed-bg-layer") || !html.includes("has-custom-bg")) {
    issues.push("Latar wajib lewat slot media: elemen .fixed-bg-layer dan selector .has-custom-bg (inline --custom-bg) harus ada.");
  }
  // Tautan <a href> ke Instagram/Maps milik klien sah; yang dilarang adalah aset yang dimuat dari luar (src, <link>, url()).
  const ext = [...new Set([
    ...[...html.matchAll(/\ssrc\s*=\s*["'](?:https?:)?\/\/(?!luxvite\.id)([^"'/]+)/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<link\b[^>]*href\s*=\s*["'](?:https?:)?\/\/(?!luxvite\.id)([^"'/]+)/gi)].map((m) => m[1]),
  ])];
  const cssExt = [...new Set([...html.matchAll(/url\(\s*['"]?(?:https?:)?\/\/([^'")/]+)/gi)].map((m) => m[1]))];
  if (ext.length || cssExt.length || /@import/i.test(html)) issues.push(`URL/aset luar tidak boleh (${[...ext, ...cssExt].join(", ") || "@import"}); pakai aset lokal /fonts, /assets.`);
  [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].forEach((m, i) => {
    try {
      new vm.Script(m[1].replace(/\{\{[^}]*\}\}/g, "0"));
    } catch (err) {
      issues.push(`Skrip inline #${i + 1} gagal diparse: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  if (html.length > 400_000) issues.push("Master melebihi 400 KB.");
  return issues;
}

async function renderMasterVariant(html: string, eventType: BuilderEventType, withBg: boolean): Promise<string> {
  const demo = buildDemoInvitation(DEFAULT_THEME_BY_EVENT[eventType] || "kalandra", undefined, eventType, null);
  if (withBg) {
    const photo = demo.media.find((m: any) => m.mediaSlot === "LANDING_COVER" || m.mediaSlot === "DESKTOP_SIDEBAR")?.localPath;
    if (photo) demo.media = [...demo.media.filter((m: any) => m.mediaSlot !== "GLOBAL_FIXED_BG"), { mediaSlot: "GLOBAL_FIXED_BG", localPath: photo }];
  }
  const data = (await composeInvitationData({ ...demo, eventType })) as Record<string, any>;
  const out = await renderTemplateFile("atelier-preview", data, { eventType, invitationId: "demo-atelier", templateSource: html });
  return out.replace(/<head([^>]*)>/i, `<head$1><base href="${PREVIEW_BASE}">`);
}

async function master(masterPath: string, eventTypeRaw: string, outDir: string) {
  const eventType = String(eventTypeRaw || "WEDDING").toUpperCase() as BuilderEventType;
  const html = fs.readFileSync(masterPath, "utf-8");
  const issues = auditMaster(html, readBuilderBlueprint(eventType));
  fs.mkdirSync(outDir, { recursive: true });
  let renderError = "";
  try {
    fs.writeFileSync(path.join(outDir, "preview.html"), await renderMasterVariant(html, eventType, false), "utf-8");
    fs.writeFileSync(path.join(outDir, "preview-bg.html"), await renderMasterVariant(html, eventType, true), "utf-8");
  } catch (e) {
    renderError = e instanceof Error ? e.message : String(e);
    issues.push(`Render engine gagal: ${renderError}`);
  }
  process.stdout.write(JSON.stringify({ ok: issues.length === 0, issues, rendered: !renderError }) + "\n");
}

const [cmd, a1, a2, a3] = process.argv.slice(2);
(async () => {
  if (cmd === "master" && a1 && a2 && a3) await master(a1, a2, a3);
  else {
    console.error("Pemakaian: render.ts master <master.html> <eventType> <outDir>");
    process.exit(2);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
