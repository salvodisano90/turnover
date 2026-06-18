#!/usr/bin/env node
/* scripts/stamp-version.mjs — stampa version/build/commit/data in design/buildInfo.ts (FASE 6).
 * Eseguito da `npm run stamp` (incluso in predeploy). Riproducibile, nessun edit manuale. */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const appjson = (() => { try { return JSON.parse(readFileSync('app.json', 'utf8')); } catch { return {}; } })();
const version = (appjson.expo && appjson.expo.version) || pkg.version || '1.0.0';
const sh = (c, d) => { try { return execSync(c, { encoding: 'utf8' }).trim(); } catch { return d; } };
const commit = sh('git rev-parse --short HEAD', 'local');
const branch = sh('git rev-parse --abbrev-ref HEAD', 'local');
const count = sh('git rev-list --count HEAD', '0');
const date = new Date().toISOString();
const out = `// design/buildInfo.ts — GENERATO da scripts/stamp-version.mjs. NON modificare a mano.
export const BUILD_INFO = {
  version: '${version}',
  build: '${count}',
  commit: '${commit}',
  branch: '${branch}',
  date: '${date}',
} as const;
`;
writeFileSync('design/buildInfo.ts', out);
console.log(`stamp: v${version} build ${count} (${commit}) ${date}`);
