// Merekam demo tema luxvite.id frame demi frame dengan "waktu virtual": jam, timer, requestAnimationFrame, dan animasi CSS
// dimajukan tepat 1/fps per frame lalu difoto, sehingga video tidak patah-patah seperti rekam layar biasa.
// Pemakaian: node record.js <themeId> <outDir> [seconds]
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const [themeId, outDir, secondsArg] = process.argv.slice(2);
if (!themeId || !/^[a-z0-9-]{2,60}$/.test(themeId) || !outDir) {
  console.error("Pemakaian: node record.js <themeId> <outDir> [seconds]");
  process.exit(2);
}
const SECONDS = Math.min(20, Math.max(8, Number(secondsArg) || 15));
const BASE_URL = process.env.LUXVITE_DEMO_BASE || "https://luxvite.id/demo";
const CHROME = process.env.CHROME_PATH || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";

const VIRTUAL_TIME = `(() => {
  const START = Date.now();
  let vt = 0;
  const RealDate = Date;
  class VDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(START + vt); else super(...a); }
    static now() { return START + vt; }
  }
  window.Date = VDate;
  performance.now = () => vt;
  let nextId = 1;
  const timers = new Map();
  window.setTimeout = (fn, ms = 0, ...args) => { const id = nextId++; timers.set(id, { fn, at: vt + Math.max(0, +ms || 0), args, every: 0 }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = nextId++; const every = Math.max(1, +ms || 1); timers.set(id, { fn, at: vt + every, args, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  let rafs = [];
  window.requestAnimationFrame = (cb) => { const id = nextId++; rafs.push({ id, cb }); return id; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r.id !== id); };
  Element.prototype.requestFullscreen = () => Promise.resolve();
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  window.__vtStep = (dt) => {
    const target = vt + dt;
    for (let guard = 0; guard < 5000; guard++) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= target && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) break;
      const [id, t] = next;
      vt = Math.max(vt, t.at);
      if (t.every) t.at += t.every; else timers.delete(id);
      try { typeof t.fn === "function" ? t.fn(...t.args) : (0, eval)(t.fn); } catch (e) { console.warn("timer error", e && e.message); }
    }
    vt = target;
    const cur = rafs; rafs = [];
    for (const r of cur) { try { r.cb(vt); } catch (e) { console.warn("raf error", e && e.message); } }
    for (const a of document.getAnimations()) {
      try {
        if (a.playState === "finished") continue;
        const base = a.__vt === undefined ? (a.currentTime || 0) : a.__vt;
        a.pause();
        a.currentTime = base + dt;
        a.__vt = a.currentTime;
      } catch (e) { console.warn("animation error", e && e.message); }
    }
  };
  window.__findScroller = () => {
    const cands = [document.scrollingElement, ...document.querySelectorAll("*")].filter((el) => {
      if (!el) return false;
      const cs = el === document.scrollingElement ? null : getComputedStyle(el);
      const scrollable = !cs || /(auto|scroll)/.test(cs.overflowY);
      return scrollable && el.scrollHeight - el.clientHeight > 300;
    });
    cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    return cands[0] || null;
  };
  window.__clickOpen = () => {
    const el = [...document.querySelectorAll("button, a, [role=button], [onclick]")]
      .find((e) => /buka undangan|open invitation|buka/i.test((e.innerText || e.textContent || "").trim()) && e.offsetParent !== null);
    if (el) { el.click(); return true; }
    return false;
  };
})();`;

const ease = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

async function recordPass(browser, view, fps, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport(view);
  if (view.isMobile) {
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
  }
  await page.evaluateOnNewDocument(VIRTUAL_TIME);
  const resp = await page.goto(`${BASE_URL}/${themeId}`, { waitUntil: "networkidle2", timeout: 60000 });
  if (!resp || resp.status() !== 200) throw new Error(`Demo ${themeId} menjawab HTTP ${resp ? resp.status() : "?"}`);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const client = await page.createCDPSession();
  const total = Math.round(SECONDS * fps);
  const dt = 1000 / fps;
  // Layar pembuka tema ±1 detik, lalu sampul terlihat ±2 detik sebelum "Buka Undangan" diklik.
  const OPEN_AT = 3.0, SCROLL_FROM = 4.6;
  let opened = false, scrollMax = null;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    if (!opened && t >= OPEN_AT) {
      opened = await page.evaluate(() => window.__clickOpen());
      if (!opened) opened = true; // tema tanpa tombol buka: langsung scroll
    }
    if (t >= SCROLL_FROM) {
      if (scrollMax === null) {
        scrollMax = await page.evaluate(() => { const s = window.__findScroller(); return s ? Math.round((s.scrollHeight - s.clientHeight) * 0.72) : 0; });
      }
      const p = ease(Math.min(1, (t - SCROLL_FROM) / (SECONDS - SCROLL_FROM - 0.6)));
      await page.evaluate((y) => { const s = window.__findScroller(); if (s) s.scrollTop = y; }, Math.round(scrollMax * p));
    }
    await page.evaluate((d) => window.__vtStep(d), dt);
    const shot = await client.send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
    fs.writeFileSync(path.join(dir, `${String(i).padStart(5, "0")}.jpg`), Buffer.from(shot.data, "base64"));
  }
  await page.close();
  return total;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-first-run", "--mute-audio", "--hide-scrollbars"] });
  try {
    const phoneFrames = await recordPass(browser, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 60, path.join(outDir, "phone"));
    const laptopFrames = await recordPass(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 30, path.join(outDir, "laptop"));
    fs.writeFileSync(path.join(outDir, "record.json"), JSON.stringify({ themeId, seconds: SECONDS, phoneFrames, laptopFrames }, null, 2));
    console.log(JSON.stringify({ ok: true, phoneFrames, laptopFrames }));
  } finally {
    // Brave headless kadang menggantung saat close(); proses tetap diakhiri setelah 5 detik.
    await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
    browser.process()?.kill("SIGKILL");
  }
})().then(() => process.exit(0)).catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  process.exit(1);
});
