// Memotret pratinjau draf tema (preview.html dari render.ts) di HP 390px dan desktop 1440px untuk kritik visual.
// Halaman disajikan seolah dari luxvite.id (intersepsi request) agar font, foto demo, dan aset satu origin seperti aslinya.
// Pemakaian: node shoot.js <preview.html> <outDir>
const fs = require("fs");
const path = require("path");
const puppeteer = require(path.join(__dirname, "..", "reel-factory", "node_modules", "puppeteer-core"));

const [previewPath, outDir, prefixArg, mobileArg, desktopArg] = process.argv.slice(2);
const PREFIX = prefixArg ? `${prefixArg}-` : "";
const MOBILE_SHOTS = Math.max(1, Number(mobileArg) || 8);
const DESKTOP_SHOTS = desktopArg === undefined ? 3 : Math.max(0, Number(desktopArg));
const pageErrors = [];
if (!previewPath || !outDir) {
  console.error("Pemakaian: node shoot.js <preview.html> <outDir>");
  process.exit(2);
}
// Mac lokal memakai browser terpasang; homelab Linux memakai chromium sistem atau chrome-headless-shell hasil tools/setup.sh.
function resolveChrome() {
  const local = path.join(__dirname, "..", ".browsers");
  const shells = fs.existsSync(local)
    ? fs.readdirSync(local, { recursive: true }).map((f) => path.join(local, String(f))).filter((f) => /chrome-headless-shell$/.test(f))
    : [];
  const cands = [
    process.env.CHROME_PATH,
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    ...shells,
  ].filter(Boolean);
  const found = cands.find((c) => fs.existsSync(c));
  if (!found) throw new Error("Browser untuk memotret tidak ditemukan; jalankan tools/setup.sh atau set CHROME_PATH.");
  return found;
}
const CHROME = resolveChrome();
const PAGE_URL = "https://luxvite.id/__hq-theme-preview";
const html = fs.readFileSync(previewPath, "utf-8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openPage(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (err) => pageErrors.push(String(err && err.message ? err.message : err).slice(0, 200)));
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.url() === PAGE_URL) req.respond({ status: 200, contentType: "text/html; charset=utf-8", body: html });
    else req.continue();
  });
  await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(1500);
  return page;
}

async function clickOpen(page) {
  const opened = await page.evaluate(() => {
    const el = [...document.querySelectorAll("button, a, [role=button], [onclick]")]
      .find((e) => /buka undangan|open invitation|buka/i.test((e.innerText || e.textContent || "").trim()) && e.offsetParent !== null);
    if (el) { el.click(); return true; }
    return false;
  });
  await sleep(2200);
  return opened;
}

async function scrollShots(page, prefix, count) {
  const files = [];
  const total = await page.evaluate(() => {
    const cands = [document.scrollingElement, ...document.querySelectorAll("*")].filter((el) => {
      if (!el) return false;
      const cs = el === document.scrollingElement ? null : getComputedStyle(el);
      return (!cs || /(auto|scroll)/.test(cs.overflowY)) && el.scrollHeight - el.clientHeight > 300;
    });
    cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    window.__hqScroller = cands[0] || document.scrollingElement;
    return window.__hqScroller.scrollHeight - window.__hqScroller.clientHeight;
  });
  for (let i = 0; i < count; i++) {
    const y = Math.round((total * i) / Math.max(1, count - 1));
    await page.evaluate((yy) => { window.__hqScroller.scrollTo({ top: yy, behavior: "instant" }); }, y);
    await sleep(1300);
    const f = path.join(outDir, `${prefix}-${String(i + 1).padStart(2, "0")}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  return { files, total };
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--hide-scrollbars", "--mute-audio"] });
  try {
    const result = { mobile: [], desktop: [], opened: {} };
    const m = await openPage(browser, { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const mCover = path.join(outDir, `${PREFIX}mobile-00-cover.png`);
    await m.screenshot({ path: mCover });
    result.mobile.push(mCover);
    result.opened.mobile = await clickOpen(m);
    const ms = await scrollShots(m, `${PREFIX}mobile`, MOBILE_SHOTS);
    result.mobile.push(...ms.files);
    result.scrollHeightMobile = ms.total;
    await m.close();

    if (DESKTOP_SHOTS > 0) {
      const d = await openPage(browser, { width: 1440, height: 900, deviceScaleFactor: 1 });
      const dCover = path.join(outDir, `${PREFIX}desktop-00-cover.png`);
      await d.screenshot({ path: dCover });
      result.desktop.push(dCover);
      result.opened.desktop = await clickOpen(d);
      const ds = await scrollShots(d, `${PREFIX}desktop`, DESKTOP_SHOTS);
      result.desktop.push(...ds.files);
      await d.close();
    }
    process.stdout.write(JSON.stringify({ ok: true, ...result, pageErrors: [...new Set(pageErrors)].slice(0, 10) }) + "\n");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
