// Captures de vérification : node scripts/shoot.cjs <out-dir> [scenario...]
const { chromium } = require("playwright");
const out = process.argv[2] || "screenshots";
const only = process.argv.slice(3);
const URL = process.env.URL || "http://localhost:5173/";

const scenarios = {
  "desktop-1440": { w: 1440, h: 900, full: true },
  "mobile-390": { w: 390, h: 844, mobile: true, full: true },
  "mobile-390-fold": { w: 390, h: 844, mobile: true },
  "desktop-red": { w: 1440, h: 900, full: false, red: true },
  "mobile-red": { w: 390, h: 844, mobile: true, red: true },
  "desktop-preplan": { w: 1440, h: 900, full: true, q: "?asof=2026-11-20", wait: 2600 },
  "mobile-why": { w: 390, h: 844, mobile: true, why: true },
  "desktop-tooltip": { w: 1440, h: 900, tooltip: true },
  "loading": { w: 1440, h: 900, q: "?state=loading" },
  "error": { w: 390, h: 844, mobile: true, q: "?state=error" },
  "empty": { w: 1440, h: 900, q: "?state=empty" },
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [name, s] of Object.entries(scenarios)) {
    if (only.length && !only.includes(name)) continue;
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: Number(process.env.DSF || 1),
      isMobile: !!s.mobile,
      hasTouch: !!s.mobile,
      reducedMotion: process.env.REDUCED ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
    await page.goto(URL + (s.q || ""), { waitUntil: "networkidle" });
    await page.waitForTimeout(s.wait || (s.q ? 900 : 2600));
    if (s.why) {
      await page.getByRole("button", { name: /Pourquoi ce score/ }).click();
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 420));
      await page.waitForTimeout(200);
    }
    if (s.range) {
      await page.getByRole("radio", { name: `${s.range} jours` }).first().click().catch(async () => {
        await page.locator(`[aria-label="${s.range} jours"]`).first().click();
      });
      await page.waitForTimeout(900);
    }
    if (s.red) {
      // remonte jour par jour jusqu'à une récup basse (< 34 %)
      for (let i = 0; i < 89; i++) {
        const txt = await page.locator("[aria-live=polite]").innerText();
        const m = /(\d+) %/.exec(txt);
        if (m && +m[1] < 34) break;
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(1600);
    }
    if (s.tooltip) {
      const svg = page.locator('svg[aria-label^="Durée de sommeil"]');
      await svg.scrollIntoViewIfNeeded();
      const box = await svg.boundingBox();
      await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5);
      await page.waitForTimeout(500);
    }
    const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ow > 0) errors.push(`${name}: débordement horizontal de ${ow}px`);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: !!s.full });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join("\n") : "aucune erreur console / débordement");
})();
