// Merakit rancangan Dept Themes lewat mesin Theme Builder Luxenary (bukan reskin blueprint) dan merender pratinjau demo.
// Dijalankan dengan cwd = repo Luxenary agar alias "@/..." dan berkas blueprint/aset terbaca:
//   npx tsx <hq>/tools/theme-studio/render.ts catalog
//   npx tsx <hq>/tools/theme-studio/render.ts build <design.json> <outDir>
// build menulis master.html (dikirim ke Draft Themes), preview.html (data demo, <base> ke luxvite.id), result.json.
import fs from "fs";
import path from "path";
import {
  ANIMATION_OPTIONS,
  DESKTOP_LAYOUTS,
  FONT_OPTIONS,
  ORDERABLE_SECTIONS,
  PALETTE_PRESETS,
  RADIUS_OPTIONS,
  SCRIM_STYLES,
  TEXTURE_OPTIONS,
  VARIANT_GROUPS,
  defaultBuilderSpec,
  parseBuilderSpec,
  type BuilderEventType,
} from "@/lib/themeBuilder/spec";
import { compileAndAudit, renderBuilderPreview } from "@/lib/themeBuilder/server";

const PREVIEW_BASE = process.env.LUXVITE_PREVIEW_BASE || "https://luxvite.id/";

function catalog() {
  return {
    variants: VARIANT_GROUPS.map((g) => ({ key: g.key, label: g.label, options: g.options.map((o) => `${o.id} (${o.hint})`) })),
    fonts: FONT_OPTIONS.map((f) => `${f.id} = ${f.label}, ${f.kind}`),
    textures: TEXTURE_OPTIONS.map((t) => `${t.id || '""'} = ${t.label}`),
    palettePresets: PALETTE_PRESETS.map((p) => ({ id: p.id, mode: p.mode, palette: p.palette })),
    animations: ANIMATION_OPTIONS.map((a) => `${a.id} (${a.hint})`),
    radius: RADIUS_OPTIONS.map((r) => r.id),
    scrimStyles: SCRIM_STYLES.map((s) => `${s.id} (${s.hint})`),
    desktopLayouts: DESKTOP_LAYOUTS.map((d) => `${d.id} (${d.hint})`),
    sections: [...ORDERABLE_SECTIONS],
  };
}

async function build(designPath: string, outDir: string) {
  const design = JSON.parse(fs.readFileSync(designPath, "utf-8")) as Record<string, any>;
  const eventType = String(design.eventType || "WEDDING").toUpperCase() as BuilderEventType;
  const base = defaultBuilderSpec(eventType);
  const merged = {
    ...base,
    ...design,
    eventType,
    palette: { ...base.palette, ...(design.palette || {}) },
    fonts: { ...base.fonts, ...(design.fonts || {}) },
    variants: { ...base.variants, ...(design.variants || {}) },
  };
  const parsed = parseBuilderSpec(merged);
  if (!parsed.ok) {
    process.stdout.write(JSON.stringify({ ok: false, errors: parsed.errors }) + "\n");
    return;
  }
  const compiled = compileAndAudit(parsed.spec);
  const preview = await renderBuilderPreview(parsed.spec, undefined, "demo");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "master.html"), compiled.html, "utf-8");
  fs.writeFileSync(
    path.join(outDir, "preview.html"),
    preview.html.replace(/<head([^>]*)>/i, `<head$1><base href="${PREVIEW_BASE}">`),
    "utf-8",
  );
  const result = { ok: true, issues: compiled.issues, spec: parsed.spec };
  fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2), "utf-8");
  process.stdout.write(JSON.stringify({ ok: true, issues: compiled.issues }) + "\n");
}

const [cmd, a1, a2] = process.argv.slice(2);
(async () => {
  if (cmd === "catalog") process.stdout.write(JSON.stringify(catalog()) + "\n");
  else if (cmd === "build" && a1 && a2) await build(a1, a2);
  else {
    console.error("Pemakaian: render.ts catalog | build <design.json> <outDir>");
    process.exit(2);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : String(e));
  process.exit(1);
});
