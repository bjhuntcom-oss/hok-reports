#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HOK Reports — HTML → PDF Converter (A4)                       ║
 * ║  Puppeteer-based professional conversion tool                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  • A4 format, proper margins, no overflow                      ║
 * ║  • Cover page + SVG diagram support                            ║
 * ║  • Per-page audit for overflow detection                       ║
 * ║  • Auto-fix CSS injection + retry loop                         ║
 * ║  • Screenshot preview of rendered pages                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  Usage:
 *    node scripts/html-to-pdf.js                     # All 3 docs
 *    node scripts/html-to-pdf.js --file=TECHNICAL    # One doc
 *    node scripts/html-to-pdf.js --audit             # Audit only
 *    node scripts/html-to-pdf.js --preview           # + screenshots
 */

const puppeteer = require("puppeteer");
const { readFileSync, mkdirSync, existsSync } = require("fs");
const { resolve, basename, join } = require("path");

const ROOT = resolve(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs");
const OUTPUT_DIR = join(ROOT, "docs");
const PREVIEW_DIR = join(ROOT, "docs", "_preview");

// ─── A4 CONFIG ───────────────────────────────────────────────────
const A4 = {
  marginTop: "14mm",
  marginBottom: "14mm",
  marginLeft: "16mm",
  marginRight: "16mm",
};

const FILES = [
  { html: "PLATFORM_DOCUMENTATION.html", pdf: "PLATFORM_DOCUMENTATION.pdf", label: "Plateforme" },
  { html: "TECHNICAL_DOCUMENTATION.html", pdf: "TECHNICAL_DOCUMENTATION.pdf", label: "Technique" },
  { html: "FUNCTIONAL_DOCUMENTATION.html", pdf: "FUNCTIONAL_DOCUMENTATION.pdf", label: "Fonctionnelle" },
];

// ─── PRINT-FIX CSS ───────────────────────────────────────────────
const PRINT_FIX_CSS = `
<style id="pdf-print-fix">
  @page { size: A4; margin: 14mm 16mm; }
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }
    .cover {
      height: 100vh !important;
      page-break-after: always !important;
      break-after: page !important;
      display: flex !important;
    }
    .page {
      max-width: 100% !important;
      padding: 30px 0 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    .page-break {
      page-break-before: always !important;
      break-before: page !important;
    }
    table {
      width: 100% !important;
      table-layout: fixed !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      font-size: 10px !important;
    }
    th, td {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      word-break: break-word !important;
      padding: 7px 8px !important;
    }
    pre, code {
      white-space: pre-wrap !important;
      word-break: break-all !important;
      overflow-wrap: break-word !important;
      max-width: 100% !important;
    }
    svg {
      max-width: 100% !important;
      height: auto !important;
    }
    .tree, .schema-diagram {
      overflow: hidden !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
      font-size: 9.5px !important;
    }
    .grid-2 {
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
    }
    .footer, .highlight, .qa {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    h2, h3, h4 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .col-route {
      font-size: 9px !important;
    }
    .badge {
      font-size: 8px !important;
      padding: 1px 5px !important;
    }
  }
</style>
`;

// ─── LOGGING ─────────────────────────────────────────────────────
const log = (icon, msg) => console.log(`  ${icon}  ${msg}`);
const logBox = (title) => {
  console.log("");
  console.log(`  ┌─${"─".repeat(title.length + 2)}─┐`);
  console.log(`  │ ${title}  │`);
  console.log(`  └─${"─".repeat(title.length + 2)}─┘`);
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    fileFilter: (args.find((a) => a.startsWith("--file=")) || "").split("=")[1] || null,
    auditOnly: args.includes("--audit"),
    preview: args.includes("--preview"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

// ─── AUDIT ───────────────────────────────────────────────────────
async function auditPage(page) {
  return page.evaluate(() => {
    const problems = [];
    const vw = document.documentElement.clientWidth;
    const seen = new Set();

    document.querySelectorAll("table, svg, pre, .tree, .schema-diagram, img").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 5) {
        const key = el.tagName + (el.className || "");
        if (!seen.has(key)) {
          seen.add(key);
          problems.push({
            type: "overflow",
            tag: el.tagName.toLowerCase(),
            cls: (typeof el.className === "string" ? el.className.split(" ")[0] : ""),
            over: Math.round(r.right - vw),
          });
        }
      }
    });

    document.querySelectorAll("table").forEach((t) => {
      if (t.scrollWidth > t.clientWidth + 5) {
        problems.push({ type: "table-scroll", over: t.scrollWidth - t.clientWidth });
      }
    });

    return problems;
  });
}

// ─── AUTO-FIX ────────────────────────────────────────────────────
async function applyFixes(page, round) {
  if (round === 1) {
    await page.evaluate(() => {
      const s = document.createElement("style");
      s.textContent = `
        * { max-width: 100% !important; box-sizing: border-box !important; }
        table { font-size: 9.5px !important; table-layout: fixed !important; }
        .col-route { font-size: 8.5px !important; word-break: break-all !important; }
        pre { font-size: 9px !important; overflow: hidden !important; }
        .tree, .schema-diagram { font-size: 9px !important; overflow: hidden !important; }
        svg { max-width: 100% !important; height: auto !important; }
      `;
      document.head.appendChild(s);
    });
  } else if (round === 2) {
    // Scale-down approach for stubborn overflows
    await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      document.querySelectorAll("table, svg, pre, .tree, .schema-diagram").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 5) {
          const scale = Math.max((vw - 10) / r.width, 0.65);
          el.style.transform = `scale(${scale})`;
          el.style.transformOrigin = "top left";
          el.style.marginBottom = `-${Math.round(r.height * (1 - scale))}px`;
        }
      });
    });
  }
  await new Promise((r) => setTimeout(r, 500));
}

// ─── CONVERT ONE FILE ────────────────────────────────────────────
async function convertFile(browser, fc, opts) {
  const htmlPath = join(DOCS_DIR, fc.html);
  const pdfPath = join(OUTPUT_DIR, fc.pdf);

  logBox(`${fc.label} — ${fc.html}`);

  if (!existsSync(htmlPath)) {
    log("❌", `Introuvable: ${htmlPath}`);
    return { ok: false, file: fc.pdf, err: "not found" };
  }

  let html = readFileSync(htmlPath, "utf-8");
  html = html.replace("</head>", `${PRINT_FIX_CSS}\n</head>`);

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 800));

  // Audit + fix loop (max 3 rounds)
  let issues = [];
  for (let round = 0; round <= 2; round++) {
    issues = await auditPage(page);
    const overflows = issues.filter((i) => i.type === "overflow" || i.type === "table-scroll");

    if (round === 0) {
      if (overflows.length === 0) {
        log("✅", "Audit OK — aucun débordement");
        break;
      }
      log("⚠️", `${overflows.length} débordement(s) détecté(s)`);
      overflows.slice(0, 5).forEach((i) =>
        log("  ", `↳ <${i.tag}${i.cls ? "." + i.cls : ""}> +${i.over}px`)
      );
    }

    if (overflows.length === 0) {
      log("✅", `Corrigé au round ${round}`);
      break;
    }

    if (round < 2) {
      log("🔧", `Correction round ${round + 1}...`);
      await applyFixes(page, round + 1);
    } else {
      log("⚠️", `${overflows.length} résiduel(s) — tolérable pour impression`);
    }
  }

  // Preview screenshots
  if (opts.preview) {
    if (!existsSync(PREVIEW_DIR)) mkdirSync(PREVIEW_DIR, { recursive: true });
    const name = basename(fc.html, ".html");

    log("📸", "Screenshots...");
    await page.screenshot({
      path: join(PREVIEW_DIR, `${name}_full.png`),
      fullPage: true,
      type: "png",
    });
    log("  ", `↳ ${name}_full.png`);

    // First page screenshot (cover)
    await page.screenshot({
      path: join(PREVIEW_DIR, `${name}_cover.png`),
      fullPage: false,
      type: "png",
      clip: { x: 0, y: 0, width: 794, height: 1123 },
    });
    log("  ", `↳ ${name}_cover.png`);
  }

  // Generate PDF
  if (!opts.auditOnly) {
    log("📄", "Génération PDF A4...");
    const buf = await page.pdf({
      path: pdfPath,
      format: "A4",
      margin: {
        top: A4.marginTop,
        bottom: A4.marginBottom,
        left: A4.marginLeft,
        right: A4.marginRight,
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      timeout: 60000,
    });

    const kb = Math.round(buf.length / 1024);
    const estPages = await page.evaluate(() =>
      Math.ceil(document.body.scrollHeight / 1123)
    );
    log("✅", `${fc.pdf} — ${kb} Ko, ~${estPages} pages`);
  }

  await page.close();
  return { ok: true, file: fc.pdf, issues: issues.length };
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (opts.help) {
    console.log(`
  HOK Reports — HTML → PDF Converter (A4)

  Usage:
    node scripts/html-to-pdf.js                     Tout convertir
    node scripts/html-to-pdf.js --file=TECHNICAL    Un seul fichier
    node scripts/html-to-pdf.js --audit             Audit sans PDF
    node scripts/html-to-pdf.js --preview           + screenshots
    `);
    return;
  }

  console.log("");
  console.log("  ╔═══════════════════════════════════════════════════╗");
  console.log("  ║   HOK Reports — HTML → PDF Converter (A4)        ║");
  console.log("  ╠═══════════════════════════════════════════════════╣");
  console.log(`  ║   Mode: ${opts.auditOnly ? "Audit" : "PDF"}${opts.preview ? " + Aperçu" : ""}`.padEnd(54) + "║");
  console.log("  ╚═══════════════════════════════════════════════════╝");

  let files = FILES;
  if (opts.fileFilter) {
    files = FILES.filter((f) => f.html.toUpperCase().includes(opts.fileFilter.toUpperCase()));
    if (!files.length) {
      log("❌", `Aucun fichier pour "${opts.fileFilter}"`);
      process.exit(1);
    }
  }

  log("🚀", `${files.length} fichier(s) à traiter`);
  log("🌐", "Lancement Puppeteer...");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"],
  });

  const results = [];
  for (const fc of files) {
    try {
      results.push(await convertFile(browser, fc, opts));
    } catch (e) {
      log("❌", `${fc.pdf}: ${e.message}`);
      results.push({ ok: false, file: fc.pdf, err: e.message });
    }
  }

  await browser.close();

  // Summary
  logBox("Résumé");
  for (const r of results) {
    if (r.ok) {
      log("📄", `${r.file} — ${r.issues > 0 ? `⚠️ ${r.issues} fix(es)` : "✅ parfait"}`);
    } else {
      log("❌", `${r.file} — ÉCHEC: ${r.err}`);
    }
  }

  console.log("");
  if (results.every((r) => r.ok)) {
    log("🎉", "Toutes les conversions terminées !");
  } else {
    log("⚠️", "Certaines conversions ont échoué.");
    process.exit(1);
  }
  console.log("");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
