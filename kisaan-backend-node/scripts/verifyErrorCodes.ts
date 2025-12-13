#!/usr/bin/env ts-node
/**
 * Verification script to ensure no legacy failure(res, usages remain in controllers.
 * Allows failureCode and standard helpers while forbidding direct failure(res, string message patterns.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', 'src', 'controllers');
const ALLOWED_FILES: Set<string> = new Set<string>([
  // add any exceptions here if needed
]);

let violations: { file: string; line: number; snippet: string }[] = [];

function scanFile(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    // detect failure( res or failure(res with no subsequent ErrorCodes token on the same line
    if (/failure\s*\(\s*res\s*,/.test(line) && !/failureCode\s*\(/.test(line)) {
      violations.push({
        file: filePath,
        line: idx + 1,
        snippet: line.trim().slice(0, 160)
      });
    }
  });
}

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (st.isFile() && /Controller\.ts$/.test(entry)) {
      if (!ALLOWED_FILES.has(full)) scanFile(full);
    }
  }
}

walk(ROOT);

if (violations.length) {
  console.error('\n[verifyErrorCodes] Found legacy failure(res, usages:');
  for (const v of violations) {
    console.error(` - ${relative(process.cwd(), v.file)}:${v.line} -> ${v.snippet}`);
  }
  console.error('\nPlease migrate these to failureCode(res, status, ErrorCodes.XYZ, ...).');
  process.exit(1);
}

console.log('[verifyErrorCodes] ✅ No legacy failure(res, usages detected in controllers.');
