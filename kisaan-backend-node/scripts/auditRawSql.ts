#!/usr/bin/env ts-node
/**
 * Raw SQL Audit Script
 * Scans source for sequelize.query usages and flags potentially unsafe patterns:
 *  - Template literals containing ${ ... user-controlled vars ... }
 *  - String concatenation with + before passing to sequelize.query
 *  - Missing replacements / bind params when variable interpolation suspected
 * Exits non-zero if any HIGH severity issues found.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

interface Finding { file: string; line: number; severity: 'HIGH' | 'WARN'; message: string; snippet: string; }
const findings: Finding[] = [];

const ROOT = join(__dirname, '..', 'src');

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full); else if (st.isFile() && entry.endsWith('.ts')) scan(full);
  }
}

// Heuristic: identify variable interpolation inside the first arg to sequelize.query
// Patterns flagged:
// 1. sequelize.query(` ... ${var} ...`)
// 2. sequelize.query("SELECT ..." + var + "...")
// 3. sequelize.query(queryVar)  (cannot tell content) -> WARN only
// 4. Missing { replacements|bind } object when template literal used (HIGH)
const QUERY_CALL_REGEX = /sequelize\.query\s*\(([^,)]*)/g;

function classify(line: string, captured: string): { severity: 'HIGH' | 'WARN'; message: string } | null {
  const trimmed = captured.trim();
  if (trimmed.startsWith('`')) {
    if (/\$\{[^}]+\}/.test(trimmed)) {
      return { severity: 'HIGH', message: 'Template literal with interpolation used in raw SQL. Replace with :named parameters + replacements.' };
    }
  }
  if (/['\"][^]*\+[^]*['\"]/ .test(trimmed)) {
    return { severity: 'HIGH', message: 'String concatenation in SQL argument may allow injection. Use parameter binding.' };
  }
  if (/^[a-zA-Z_$][\w$]*$/.test(trimmed)) {
    return { severity: 'WARN', message: 'Indirect variable passed to sequelize.query; ensure it uses parameter binding inside its definition.' };
  }
  return null;
}

function scan(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (line.includes('sequelize.query')) {
      let m: RegExpExecArray | null;
      QUERY_CALL_REGEX.lastIndex = 0;
      while ((m = QUERY_CALL_REGEX.exec(line)) !== null) {
        const res = classify(line, m[1]);
        if (res) {
          findings.push({ file: filePath, line: idx + 1, severity: res.severity, message: res.message, snippet: line.trim().slice(0, 200) });
        }
      }
    }
  });
}

walk(ROOT);

const highs = findings.filter(f => f.severity === 'HIGH');
const warns = findings.filter(f => f.severity === 'WARN');

if (findings.length === 0) {
  console.log('[auditRawSql] ✅ No raw SQL risk patterns detected.');
  process.exit(0);
}

console.log('[auditRawSql] Findings:');
for (const f of findings) {
  const rel = relative(process.cwd(), f.file);
  console.log(` - ${f.severity} ${rel}:${f.line} :: ${f.message}\n   ${f.snippet}`);
}

if (highs.length) {
  console.error(`\n[auditRawSql] ❌ High severity issues found (${highs.length}). Please remediate.`);
  process.exit(1);
}

console.log(`\n[auditRawSql] ⚠ Only WARN level issues (${warns.length}).`);
process.exit(0);
