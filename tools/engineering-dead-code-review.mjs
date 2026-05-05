#!/usr/bin/env node
/**
 * Engineering dead-code review (heuristic)
 *
 * Scans JavaScript for top-level declarations and checks whether each symbol
 * name appears elsewhere in the corpus (JS + optional HTML). Also flags JS
 * files that are never referenced by path/basename from other JS or HTML.
 *
 * Limitations (intentional v1 scope):
 * - No full scope analysis: inner function/const "unused" is not detected.
 * - Name-based matching has false positives/negatives (minified names, strings, HTML).
 * - Dynamic import(), eval, build-time bundling, and SharePoint-hosted paths are opaque.
 *
 * Usage:
 *   node tools/engineering-dead-code-review.mjs
 *   node tools/engineering-dead-code-review.mjs --root . --json > report.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as acorn from "acorn";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEFAULT_SCAN_DIRS = ["sites", "pdf-generator", "."];
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".venv",
  "dist",
  "build",
  "out",
  "coverage",
  ".cursor",
  ".agents",
]);

const SHORT_NAME_SKIP = new Set([
  "id",
  "on",
  "to",
  "fn",
  "cb",
  "el",
  "e",
  "i",
  "x",
  "y",
  "a",
  "b",
  "t",
  "n",
  "r",
  "s",
  "o",
  "p",
  "q",
  "d",
  "m",
  "h",
  "w",
  "v",
  "u",
  "k",
  "j",
  "g",
  "l",
  "c",
]);

function parseArgs (argv) {
  const out = {
    root: REPO_ROOT,
    dirs: DEFAULT_SCAN_DIRS,
    json: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--json") out.json = true;
    else if (a === "--root") out.root = path.resolve(argv[++i] || ".");
    else if (a === "--dirs")
      out.dirs = (argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  }
  return out;
}

function usage () {
  console.log(`Engineering dead-code review (heuristic)

Options:
  --root <path>   Repo root (default: parent of tools/)
  --dirs a,b,c    Comma-separated dirs relative to root (default: sites,pdf-generator,.)
  --json          Machine-readable output
  --help          This message
`);
}

function* walkFiles (dirAbs) {
  let stat;
  try {
    stat = fs.statSync(dirAbs);
  } catch {
    return;
  }
  if (!stat.isDirectory()) return;
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) yield* walkFiles(full);
    else yield full;
  }
}

function collectFiles (root, relDirs) {
  const jsFiles = [];
  const htmlFiles = [];
  for (const rel of relDirs) {
    const abs = path.resolve(root, rel);
    if (rel === "." && abs === root) {
      for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
        if (!ent.isFile()) continue;
        const f = path.join(root, ent.name);
        if (ent.name.endsWith(".js")) jsFiles.push(f);
        if (ent.name.endsWith(".html") || ent.name.endsWith(".htm"))
          htmlFiles.push(f);
      }
      continue;
    }
    for (const f of walkFiles(abs)) {
      if (f.endsWith(".js")) jsFiles.push(f);
      if (f.endsWith(".html") || f.endsWith(".htm")) htmlFiles.push(f);
    }
  }
  const uniq = (arr) => [...new Set(arr)];
  return { jsFiles: uniq(jsFiles), htmlFiles: uniq(htmlFiles) };
}

function tryParse (source, filePath) {
  const attempts = [
    { ecmaVersion: "latest", sourceType: "module" },
    { ecmaVersion: "latest", sourceType: "script" },
  ];
  for (const opts of attempts) {
    try {
      return acorn.parse(source, { ...opts, locations: true });
    } catch {
      /* try next */
    }
  }
  return { error: true, filePath };
}

function topLevelDeclarations (ast) {
  const names = [];
  if (!ast || ast.error) return names;
  const body = ast.body || [];
  for (const stmt of body) {
    if (stmt.type === "FunctionDeclaration" && stmt.id?.name)
      names.push({ kind: "function", name: stmt.id.name, loc: stmt.loc });
    if (stmt.type === "ClassDeclaration" && stmt.id?.name)
      names.push({ kind: "class", name: stmt.id.name, loc: stmt.loc });
    if (stmt.type === "VariableDeclaration") {
      for (const d of stmt.declarations) {
        if (d.id?.type === "Identifier" && d.id.name)
          names.push({ kind: `var:${stmt.kind}`, name: d.id.name, loc: d.loc });
      }
    }
  }
  return names;
}

function escapeRegExp (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences (haystack, name) {
  const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "g");
  let n = 0;
  for (; ;) {
    const m = re.exec(haystack);
    if (!m) break;
    n++;
  }
  return n;
}

function isLikelyFalsePositive (name) {
  if (name.length <= 2) return true;
  if (SHORT_NAME_SKIP.has(name)) return true;
  if (/^[_]+$/.test(name)) return true;
  return false;
}

function buildCorpus (fileContents) {
  return fileContents.map((f) => `\n/*@@${f.rel}@@*/\n${f.text}`).join("\n");
}

function jsNeverReferenced (jsRel, htmlCorpusLower, jsBasenamesInHtml, jsImports) {
  const base = path.basename(jsRel);
  if (jsImports.has(base)) return false;
  if (jsBasenamesInHtml.has(base)) return false;
  // SharePoint / master pages often reference scripts without a clean <script src="...basename">
  if (htmlCorpusLower.includes(base.toLowerCase())) return false;
  return true;
}

function extractHtmlScriptRefs (htmlText) {
  const refs = new Set();
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(htmlText))) {
    const u = m[1].trim();
    const base = path.basename(u.split("?")[0]);
    if (base.endsWith(".js")) refs.add(base);
  }
  return refs;
}

function extractJsStaticImports (source) {
  const refs = new Set();
  const re =
    /(?:import\s+[^'"]*from\s+|import\s*\(\s*)['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(source))) {
    const spec = (m[1] || m[2] || "").trim();
    if (!spec) continue;
    const base = path.basename(spec.split("?")[0]);
    if (base.endsWith(".js")) refs.add(base);
  }
  return refs;
}

function main () {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const { jsFiles, htmlFiles } = collectFiles(args.root, args.dirs);

  const fileContents = [];
  for (const abs of jsFiles) {
    const rel = path.relative(args.root, abs).split(path.sep).join("/");
    fileContents.push({ rel, abs, text: fs.readFileSync(abs, "utf8") });
  }
  const htmlTexts = [];
  for (const abs of htmlFiles) {
    const rel = path.relative(args.root, abs).split(path.sep).join("/");
    htmlTexts.push({ rel, text: fs.readFileSync(abs, "utf8") });
  }

  const jsCorpus = buildCorpus(fileContents);
  const fullCorpus =
    jsCorpus + "\n" + htmlTexts.map((h) => `\n/*@@${h.rel}@@*/\n${h.text}`).join("\n");

  const jsBasenamesInHtml = new Set();
  const htmlCorpusLower = htmlTexts.map((h) => h.text.toLowerCase()).join("\n");
  for (const h of htmlTexts) {
    for (const b of extractHtmlScriptRefs(h.text)) jsBasenamesInHtml.add(b);
  }

  const jsImports = new Set();
  for (const f of fileContents) {
    for (const b of extractJsStaticImports(f.text)) jsImports.add(b);
  }

  const unusedSymbols = [];
  const parseFailures = [];

  for (const f of fileContents) {
    const ast = tryParse(f.text, f.rel);
    if (ast?.error) {
      parseFailures.push(f.rel);
      continue;
    }
    const decls = topLevelDeclarations(ast);
    for (const d of decls) {
      if (isLikelyFalsePositive(d.name)) continue;
      const total = countOccurrences(fullCorpus, d.name);
      if (total <= 1) {
        unusedSymbols.push({
          file: f.rel,
          kind: d.kind,
          name: d.name,
          suggestion:
            "Confirm not referenced from HTML handlers, dynamic import, or server; then remove or narrow export.",
        });
      }
    }
  }

  const orphanJs = [];
  for (const f of fileContents) {
    if (jsNeverReferenced(f.rel, htmlCorpusLower, jsBasenamesInHtml, jsImports))
      orphanJs.push({
        file: f.rel,
        suggestion:
          "If not loaded by SharePoint master pages or runtime injection, archive or delete; otherwise document the real entry path.",
      });
  }

  const report = {
    meta: {
      tool: "engineering-dead-code-review",
      version: 1,
      root: args.root,
      scannedJsFiles: fileContents.length,
      scannedHtmlFiles: htmlTexts.length,
      parseFailures,
    },
    summary: {
      possiblyUnusedTopLevelSymbols: unusedSymbols.length,
      possiblyUnreferencedJsFiles: orphanJs.length,
    },
    possiblyUnusedTopLevelSymbols: unusedSymbols,
    possiblyUnreferencedJsFiles: orphanJs,
    refactorHints: [
      "Prefer deleting unused top-level declarations before extracting new abstractions.",
      "If a symbol is kept for debugging, rename with a clear prefix (e.g. debugLogX) or gate behind NODE_ENV checks.",
      "Consolidate duplicate modules (e.g. *copy*.js) after verifying which build/deploy path is canonical.",
      "For HTML-heavy sites, verify script tags and master pages; basename matching misses path-absolute URLs.",
    ],
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("# Engineering dead-code review (heuristic)\n");
    console.log(`Root: ${args.root}`);
    console.log(`JS files: ${report.meta.scannedJsFiles}, HTML files: ${report.meta.scannedHtmlFiles}`);
    if (parseFailures.length)
      console.log(`\nParse skipped (${parseFailures.length}): ${parseFailures.slice(0, 8).join(", ")}${parseFailures.length > 8 ? "…" : ""}`);
    console.log(
      `\n## Possibly unused top-level symbols (${unusedSymbols.length})\n`
    );
    for (const row of unusedSymbols.slice(0, 200)) {
      console.log(`- **${row.name}** (${row.kind}) — \`${row.file}\``);
      console.log(`  - *Suggestion:* ${row.suggestion}`);
    }
    if (unusedSymbols.length > 200)
      console.log(`\n… ${unusedSymbols.length - 200} more (use --json for full list)\n`);

    console.log(`\n## Possibly unreferenced JS files (${orphanJs.length})\n`);
    for (const row of orphanJs.slice(0, 120)) {
      console.log(`- \`${row.file}\``);
      console.log(`  - *Suggestion:* ${row.suggestion}`);
    }
    if (orphanJs.length > 120)
      console.log(`\n… ${orphanJs.length - 120} more (use --json for full list)\n`);

    console.log("\n## General refactor hints\n");
    for (const h of report.refactorHints) console.log(`- ${h}`);
  }
}

main();
