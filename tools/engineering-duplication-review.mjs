#!/usr/bin/env node
/**
 * Engineering duplication review (heuristic)
 *
 * 1) Sliding normalized line windows across .js files to find repeated blocks.
 * 2) Normalized source slices for top-level function declarations / function
 *    expressions in variable declarators (best-effort; ignores nested depth).
 *
 * Statistics: window counts, duplicate clusters, estimated redundant lines/chars.
 *
 * Usage:
 *   node tools/engineering-duplication-review.mjs
 *   node tools/engineering-duplication-review.mjs --window 10 --top 30 --json
 *
 * Limits: ignores HTML inline scripts; minified one-liners create noise;
 * identical logic with different names still matches on line windows / body text.
 */

import crypto from "crypto";
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

function parseArgs (argv) {
  const out = {
    root: REPO_ROOT,
    dirs: DEFAULT_SCAN_DIRS,
    window: 8,
    minFunctionChars: 120,
    top: 25,
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
    else if (a === "--window") out.window = Math.max(2, parseInt(argv[++i] || "8", 10) || 8);
    else if (a === "--min-function-chars")
      out.minFunctionChars = Math.max(40, parseInt(argv[++i] || "120", 10) || 120);
    else if (a === "--top") out.top = Math.max(1, parseInt(argv[++i] || "25", 10) || 25);
  }
  return out;
}

function usage () {
  console.log(`Engineering duplication review (heuristic)

Options:
  --root <path>            Repo root (default: parent of tools/)
  --dirs a,b,c             Comma-separated dirs (default: sites,pdf-generator,.)
  --window <n>             Line window size (default: 8)
  --min-function-chars <n> Min normalized function size to compare (default: 120)
  --top <n>                Max clusters per category in text output (default: 25)
  --json                   Machine-readable output
  --help                   This message
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

function collectJsFiles (root, relDirs) {
  const jsFiles = [];
  for (const rel of relDirs) {
    const abs = path.resolve(root, rel);
    if (rel === "." && abs === root) {
      for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
        if (!ent.isFile()) continue;
        if (ent.name.endsWith(".js")) jsFiles.push(path.join(root, ent.name));
      }
      continue;
    }
    for (const f of walkFiles(abs)) {
      if (f.endsWith(".js")) jsFiles.push(f);
    }
  }
  return [...new Set(jsFiles)];
}

function hashKey (s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function normalizeWhitespace (s) {
  return s.replace(/\s+/g, " ").trim();
}

function lineWindowKey (lines, start, windowSize) {
  const slice = lines.slice(start, start + windowSize);
  if (slice.length < windowSize) return null;
  const norm = slice.map((l) => normalizeWhitespace(l)).join("\n");
  const compact = norm.replace(/[^\w{}();,=\[\].+\-*/%|&<>!'`?:@#]/g, "");
  if (compact.length < 24) return null;
  return norm;
}

function tryParse (source) {
  const attempts = [
    { ecmaVersion: "latest", sourceType: "module" },
    { ecmaVersion: "latest", sourceType: "script" },
  ];
  for (const opts of attempts) {
    try {
      return acorn.parse(source, { ...opts, locations: true });
    } catch {
      /* continue */
    }
  }
  return null;
}

function visitEstree (node, fn) {
  if (!node || typeof node !== "object") return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "range" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments") continue;
    const v = node[k];
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const ch of v) visitEstree(ch, fn);
    } else if (typeof v === "object" && v.type) {
      visitEstree(v, fn);
    }
  }
}

function normalizeFunctionSnippet (source, node) {
  if (node.start == null || node.end == null) return "";
  let raw = source.slice(node.start, node.end);
  raw = raw.replace(/\bfunction\s+[A-Za-z0-9_$]+\b/, "function ");
  return normalizeWhitespace(raw);
}

function analyzeLineBlocks (root, files, windowSize) {
  /** @type {Map<string, { norm: string, hits: { file: string, line: number }[] }>} */
  const map = new Map();
  let windowsScanned = 0;

  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i <= lines.length - windowSize; i++) {
      const norm = lineWindowKey(lines, i, windowSize);
      windowsScanned++;
      if (!norm) continue;
      const key = hashKey(norm);
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { norm, hits: [] };
        map.set(key, bucket);
      }
      bucket.hits.push({ file: rel, line: i + 1 });
    }
  }

  const clusters = [];
  let redundantLineEstimate = 0;
  for (const [, bucket] of map) {
    if (bucket.hits.length < 2) continue;
    const distinctSpots = new Set(bucket.hits.map((h) => `${h.file}:${h.line}`));
    if (distinctSpots.size < 2) continue;
    const est = (bucket.hits.length - 1) * windowSize;
    redundantLineEstimate += est;
    clusters.push({
      kind: "line-window",
      windowLines: windowSize,
      occurrences: bucket.hits.length,
      distinctLocations: distinctSpots.size,
      estimatedRedundantLines: est,
      preview: bucket.norm.length > 320 ? `${bucket.norm.slice(0, 320)}…` : bucket.norm,
      locations: bucket.hits.slice(0, 40),
    });
  }
  clusters.sort((a, b) => b.estimatedRedundantLines - a.estimatedRedundantLines);
  return { clusters, windowsScanned, redundantLineEstimate };
}

function analyzeFunctionBodies (root, files, minChars) {
  /** @type {Map<string, { norm: string, hits: { file: string, line: number, name?: string }[] }>} */
  const map = new Map();

  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const source = fs.readFileSync(abs, "utf8");
    const ast = tryParse(source);
    if (!ast) continue;

    visitEstree(ast, (node) => {
      if (node.type === "FunctionDeclaration" && node.id?.name) {
        const norm = normalizeFunctionSnippet(source, node);
        if (norm.length < minChars) return;
        const key = hashKey(norm);
        let b = map.get(key);
        if (!b) {
          b = { norm, hits: [] };
          map.set(key, b);
        }
        b.hits.push({
          file: rel,
          line: node.loc?.start?.line ?? 0,
          start: node.start,
          name: node.id.name,
        });
      }
      if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") {
        const init = node.init;
        if (
          init &&
          (init.type === "FunctionExpression" ||
            (init.type === "ArrowFunctionExpression" && init.body?.type === "BlockStatement"))
        ) {
          const norm = normalizeFunctionSnippet(source, init);
          if (norm.length < minChars) return;
          const key = hashKey(norm);
          let b = map.get(key);
          if (!b) {
            b = { norm, hits: [] };
            map.set(key, b);
          }
          b.hits.push({
            file: rel,
            line: node.loc?.start?.line ?? 0,
            start: init.start,
            name: node.id.name,
          });
        }
      }
    });
  }

  const clusters = [];
  let redundantCharEstimate = 0;
  for (const [, bucket] of map) {
    if (bucket.hits.length < 2) continue;
    const distinct = new Set(bucket.hits.map((h) => `${h.file}:${h.start}`));
    if (distinct.size < 2) continue;
    const est = (bucket.hits.length - 1) * Math.min(bucket.norm.length, 2000);
    redundantCharEstimate += est;
    clusters.push({
      kind: "function-body",
      occurrences: bucket.hits.length,
      estimatedRedundantChars: est,
      preview: bucket.norm.length > 400 ? `${bucket.norm.slice(0, 400)}…` : bucket.norm,
      locations: bucket.hits.slice(0, 30),
    });
  }
  clusters.sort((a, b) => b.estimatedRedundantChars - a.estimatedRedundantChars);
  return { clusters, redundantCharEstimate };
}

function main () {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  const root = args.root;

  const jsAbs = collectJsFiles(root, args.dirs);

  const line = analyzeLineBlocks(root, jsAbs, args.window);
  const fn = analyzeFunctionBodies(root, jsAbs, args.minFunctionChars);

  const report = {
    meta: {
      tool: "engineering-duplication-review",
      version: 1,
      root,
      dirs: args.dirs,
      windowLines: args.window,
      minFunctionChars: args.minFunctionChars,
      scannedJsFiles: jsAbs.length,
    },
    statistics: {
      lineWindowsScanned: line.windowsScanned,
      duplicateLineWindowClusters: line.clusters.length,
      estimatedRedundantLinesFromWindows: line.redundantLineEstimate,
      duplicateFunctionBodyClusters: fn.clusters.length,
      estimatedRedundantCharsFromFunctions: fn.redundantCharEstimate,
    },
    topLineWindowDuplicates: line.clusters.slice(0, args.top),
    topFunctionBodyDuplicates: fn.clusters.slice(0, args.top),
    refactoringSuggestions: [
      "Extract repeated line blocks into a shared helper or small module; parameterize the differing literals.",
      "If two functions differ only by constants or endpoints, merge into one function with options/config object.",
      "Move cross-file clones into `sites/de/SiteAssets/js/lib/` (or your team lib folder) and import from both call sites.",
      "For large duplicated regions, extract in stages: first copy into a function with identical behavior, then generalize.",
      "Add a regression test around the first extraction before deleting the duplicate copy.",
    ],
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("# Engineering duplication review (heuristic)\n");
  console.log(`Root: ${root}`);
  console.log(`JS files: ${report.meta.scannedJsFiles}, window: ${args.window} lines\n`);
  console.log("## Statistics\n");
  console.log(`- Line windows scanned: **${report.statistics.lineWindowsScanned}**`);
  console.log(`- Duplicate line-window clusters: **${report.statistics.duplicateLineWindowClusters}**`);
  console.log(`- Estimated redundant lines (windows heuristic): **${report.statistics.estimatedRedundantLinesFromWindows}**`);
  console.log(`- Duplicate function-body clusters: **${report.statistics.duplicateFunctionBodyClusters}**`);
  console.log(`- Estimated redundant chars (function heuristic): **${report.statistics.estimatedRedundantCharsFromFunctions}**\n`);

  console.log(`## Top ${args.top} duplicate line blocks\n`);
  for (const c of report.topLineWindowDuplicates) {
    console.log(`- **${c.occurrences} hits**, ~${c.estimatedRedundantLines} redundant lines (window ${c.windowLines})`);
    console.log(`  \`\`\`text`);
    console.log(c.preview.split("\n").map((l) => `  ${l}`).join("\n"));
    console.log(`  \`\`\``);
    const loc = c.locations
      .slice(0, 6)
      .map((h) => `${h.file}:${h.line}`)
      .join(", ");
    console.log(`  Locations (sample): ${loc}${c.locations.length > 6 ? " …" : ""}\n`);
  }

  console.log(`## Top ${args.top} duplicate function bodies\n`);
  for (const c of report.topFunctionBodyDuplicates) {
    console.log(`- **${c.occurrences}** similar top-level / var-bound functions`);
    console.log(`  \`\`\`js`);
    console.log(c.preview.split("\n").map((l) => `  ${l}`).join("\n"));
    console.log(`  \`\`\``);
    const loc = c.locations
      .slice(0, 6)
      .map((h) => `${h.file}:${h.line}${h.name ? ` (${h.name})` : ""}`)
      .join(", ");
    console.log(`  Locations (sample): ${loc}${c.locations.length > 6 ? " …" : ""}\n`);
  }

  console.log("## Refactoring options\n");
  for (const s of report.refactoringSuggestions) console.log(`- ${s}`);
}

main();
