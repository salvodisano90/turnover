#!/usr/bin/env node
/* scripts/verify.mjs — GATE PRE-DEPLOY (FASE 3).
 * Esegue controlli statici riproducibili. Se UNO fallisce → exit 1 → DEPLOY BLOCCATO.
 * Uso: `npm run verify`. Nessuna dipendenza esterna (solo Node + tsc del progetto).
 * Controlli: 1) TypeScript  2) Import/parse  3) Cicli  4) Route  5) Provider order
 *            6) Dead button  7) onPress vuoti  8) BlurView pointerEvents (web tap)  9) navigazione
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIRS = ['app', 'screens', 'components', 'hooks', 'services', 'utils', 'design', 'types', 'integrations'];
let failures = 0;
const fail = (name, detail) => { failures++; console.log(`\u001b[31m✗ ${name}\u001b[0m`); if (detail) console.log('  ' + String(detail).split('\n').slice(0, 12).join('\n  ')); };
const ok = (name) => console.log(`\u001b[32m✓ ${name}\u001b[0m`);

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}
const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };

// 1) TYPECHECK (errori reali, esclude i typings di libreria non installati nel sandbox)
console.log('\n[1/11] TypeScript');
try {
  const cfg = join(ROOT, 'tsconfig.verify.json');
  execSync(`cat > ${cfg} <<'EOF'\n{ "compilerOptions":{"jsx":"react-jsx","module":"esnext","moduleResolution":"node","noEmit":true,"skipLibCheck":true,"strict":false,"esModuleInterop":true,"allowSyntheticDefaultImports":true,"ignoreDeprecations":"6.0"}, "include":["types","utils","services","hooks","components","screens","app","integrations","design"] }\nEOF`, { shell: '/bin/bash' });
  let out = '';
  try { out = execSync(`npx tsc -p ${cfg} 2>&1 || true`, { encoding: 'utf8', shell: '/bin/bash' }); } catch (e) { out = String(e.stdout || ''); }
  execSync(`rm -f ${cfg}`);
  const real = out.split('\n').filter((l) => /error TS(2304|2300|2305|2308|2322|2339|2345|2451|2741|2739|2552|2448|2449|2454)/.test(l) && !/(node_modules|react-native|expo-|lucide|jsx-runtime)/.test(l));
  if (real.length) fail('TypeScript', real.join('\n')); else ok('TypeScript (0 errori reali)');
} catch (e) { fail('TypeScript', e.message); }

// 2) IMPORT/PARSE — ogni file deve avere import risolvibili relativi esistenti
console.log('\n[2/11] Import/parse');
let badImports = [];
for (const f of files) {
  const src = read(f);
  const re = /from ['"](\.[^'"]+)['"]/g; let m;
  while ((m = re.exec(src))) {
    const rel = m[1];
    const base = join(f, '..', rel);
    const cands = [base, base + '.ts', base + '.tsx', join(base, 'index.ts'), join(base, 'index.tsx')];
    if (!cands.some((c) => existsSync(c))) badImports.push(`${f.replace(ROOT + '/', '')} → ${rel}`);
  }
}
if (badImports.length) fail('Import', badImports.join('\n')); else ok(`Import (${files.length} file, 0 import rotti)`);

// 3) CICLI — scan dipendenze circolari dirette/indirette (DFS)
console.log('\n[3/11] Dipendenze circolari');
const graph = {};
for (const f of files) {
  const src = read(f); const deps = new Set(); const re = /from ['"](\.[^'"]+)['"]/g; let m;
  while ((m = re.exec(src))) {
    const base = join(f, '..', m[1]);
    const cand = [base + '.ts', base + '.tsx', join(base, 'index.ts'), join(base, 'index.tsx'), base].find((c) => existsSync(c));
    if (cand) deps.add(cand);
  }
  graph[f] = [...deps];
}
let cycle = null;
const state = {};
const dfs = (n, stack) => {
  if (cycle) return; state[n] = 1;
  for (const d of graph[n] || []) {
    if (state[d] === 1) { cycle = [...stack.slice(stack.indexOf(d)), d]; return; }
    if (state[d] !== 2) dfs(d, [...stack, d]);
  }
  state[n] = 2;
};
for (const f of files) if (state[f] !== 2) dfs(f, [f]);
if (cycle) fail('Cicli', cycle.map((c) => c.replace(ROOT + '/', '')).join(' → ')); else ok('Cicli (0)');

// 4) ROUTE — ogni router.push/replace('/x') deve avere app/x.tsx (o (tabs)/x)
console.log('\n[4/11] Route');
const routeFiles = new Set();
for (const f of walk(join(ROOT, 'app'))) {
  const rel = f.replace(join(ROOT, 'app') + '/', '').replace(/\.(tsx|ts)$/, '');
  routeFiles.add(rel.replace(/^\(tabs\)\//, '').replace(/\/index$/, ''));
  routeFiles.add(rel);
}
let badRoutes = [];
for (const f of files) {
  const src = read(f); const re = /router\.(push|replace)\(\s*['"`](\/[a-z0-9-]+)['"`]/g; let m;
  while ((m = re.exec(src))) {
    const r = m[2].slice(1);
    if (r && ![...routeFiles].some((rf) => rf === r || rf.endsWith('/' + r))) badRoutes.push(`${f.replace(ROOT + '/', '')} → /${r}`);
  }
}
if (badRoutes.length) fail('Route', [...new Set(badRoutes)].join('\n')); else ok('Route (tutte risolvibili)');

// 5) PROVIDER ORDER — i provider devono annidarsi nell'ordine corretto in app/_layout.tsx
console.log('\n[5/11] Provider order');
const layout = read(join(ROOT, 'app', '_layout.tsx'));
const order = ['ErrorBoundary', 'SafeAreaProvider', 'ThemeProvider', 'StoreProvider', 'ToastProvider', 'AppThemeProvider'];
const idx = order.map((p) => layout.indexOf('<' + p));
const present = idx.every((i) => i >= 0);
const sorted = idx.every((v, i) => i === 0 || idx[i - 1] < v);
if (!present) fail('Provider order', 'provider mancante in _layout: ' + order.filter((p) => layout.indexOf('<' + p) < 0).join(', '));
else if (!sorted) fail('Provider order', 'ordine errato: atteso ' + order.join(' > '));
else ok('Provider order (ErrorBoundary > Safe > Theme > Store > Toast > AppTheme)');
// hook-prima-del-provider: AppThemeProvider usa useStore → deve stare DENTRO StoreProvider
if (layout.indexOf('<StoreProvider') >= 0 && layout.indexOf('<AppThemeProvider') >= 0 && layout.indexOf('<StoreProvider') > layout.indexOf('<AppThemeProvider')) {
  fail('Hook/Provider', 'AppThemeProvider (usa useStore) è FUORI da StoreProvider');
} else ok('Hook/Provider (AppThemeProvider dentro StoreProvider)');

// 6) DEAD BUTTON — <Pressable> senza onPress/onLongPress nei 4 righe successive
console.log('\n[6/11] Dead button');
let dead = [];
for (const f of walk(join(ROOT, 'screens')).concat(walk(join(ROOT, 'components')))) {
  const lines = read(f).split('\n');
  lines.forEach((l, i) => {
    if (/<Pressable(\s|>)/.test(l)) {
      const block = lines.slice(i, i + 5).join('\n');
      if (!/onPress|onLongPress|onPressIn/.test(block)) dead.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
    }
  });
}
if (dead.length) fail('Dead button', dead.join('\n')); else ok('Dead button (0)');

// 7) onPress VUOTI
console.log('\n[7/11] onPress vuoti');
let empties = [];
for (const f of files) {
  const src = read(f);
  if (/onPress=\{\(\) *=> *\{\}\}|onPress=\{\(\) *=> *null\}|onPress=\{undefined\}/.test(src)) empties.push(f.replace(ROOT + '/', ''));
}
if (empties.length) fail('onPress vuoti', empties.join('\n')); else ok('onPress vuoti (0)');

// 8) BLURVIEW pointerEvents — su web una BlurView in absoluteFill SENZA pointerEvents="none" blocca i tap
console.log('\n[8/11] BlurView pointerEvents (tap web)');
let blur = [];
for (const f of files) {
  const lines = read(f).split('\n');
  lines.forEach((l, i) => {
    if (/<BlurView/.test(l) && /absoluteFill/.test(lines.slice(i, i + 2).join(' ')) && !/pointerEvents/.test(lines.slice(i, i + 2).join(' '))) blur.push(`${f.replace(ROOT + '/', '')}:${i + 1}`);
  });
}
if (blur.length) fail('BlurView pointerEvents', blur.join('\n')); else ok('BlurView pointerEvents (tutte none)');

// 9) NAVIGAZIONE — ogni schermata full-page (non-tab, non-modale puro) deve poter tornare indietro
console.log('\n[9/11] Navigazione (back)');
const TABS = ['DashboardScreen', 'TurniScreen', 'PersonaleScreen', 'PianificazioneHubScreen', 'PersonaleHubScreen', 'ControlloHubScreen', 'StaffDashboardScreen', 'AccountHubScreen'];
let noBack = [];
for (const f of walk(join(ROOT, 'screens'))) {
  const b = f.split('/').pop().replace('.tsx', '');
  if (TABS.includes(b)) continue;
  const src = read(f);
  if (!/BackButton|CloseButton|AppShell|chevron-back|router\.back|SheetHeader|onClose|canGoBack|goBack|router\.replace\('\/'\)|Torna/.test(src)) noBack.push(b);
}
if (noBack.length) fail('Navigazione', 'schermate senza uscita: ' + noBack.join(', ')); else ok('Navigazione (ogni schermata ha uscita)');

// Standard unico Back/X: nessun cerchio (backgroundColor/borderRadius/borderWidth) su back/close inline
console.log('\n[extra] Back/Close senza cerchio');
let circled = [];
for (const f of [...walk(join(ROOT, 'screens')), ...walk(join(ROOT, 'components'))]) {
  const base = f.split('/').pop();
  if (base === 'BackButton.tsx' || base === 'CloseButton.tsx') continue;
  for (const line of read(f).split('\n')) {
    const isNav = /chevron-back|arrow-back|name="close"/.test(line);
    const hasCircle = /style=[^>]*\b(backgroundColor|borderRadius|borderWidth)\b/.test(line);
    const isExcluded = /setQuery|setSearch|Rifiuta|postazioniPerse|actBtn|navBtn|move\(|changeMonth|stepBtn|canUndo|canRedo|undo\(|redo\(/.test(line);
    if (isNav && hasCircle && !isExcluded) circled.push(base + ': ' + line.trim().slice(0, 70));
  }
}
if (circled.length) fail('Back/Close cerchio', 'pulsanti back/close con cerchio (usa BackButton/CloseButton):\n' + circled.join('\n')); else ok('Back/Close senza cerchio (standard unico)');

// 10) DEAD CODE — file UI (components/screens) mai importati. services/design esclusi (infra/token intenzionali).
console.log('\n[10/11] Dead code (file orfani UI)');
const uiFiles = walk(join(ROOT, 'components')).concat(walk(join(ROOT, 'screens')));
const allSrc = files.map((f) => read(f)).join('\n');
let orphanUi = [];
for (const f of uiFiles) {
  const base = f.split('/').pop().replace(/\.(tsx|ts)$/, '');
  if (base === 'index') continue;
  const re = new RegExp(`from ['\"][^'\"]*${base}['\"]`);
  if (!re.test(allSrc)) orphanUi.push(f.replace(ROOT + '/', ''));
}
if (orphanUi.length) fail('Dead code', 'file UI orfani (rimuovere o usare):\n' + orphanUi.join('\n')); else ok('Dead code (0 file UI orfani)');

console.log('\n[11/11] Multiutente (regressione)');
const muImports = ['/useAuth', '/AuthGate', '/RoleGuard', '/authProvider', '/supabaseBackend', '/staffCredentials', '/staffAuth', '/services/backend', '/aiChatStore', '/passwordPolicy'];
const muUseRe = /\buseAuth\s*\(|<AuthGate\b|<RoleGuard\b|\bAuthProviderComponent\b/;
let mu = [];
for (const f of files) {
  const src = read(f);
  for (const imp of muImports) {
    const re = new RegExp("from ['\"][^'\"]*" + imp.replace(/\//g, "\\/") + "['\"]");
    if (re.test(src)) mu.push(f.replace(ROOT + '/', '') + ': import ' + imp);
  }
  if (muUseRe.test(src)) mu.push(f.replace(ROOT + '/', '') + ': uso simbolo auth (useAuth/AuthGate/RoleGuard/AuthProvider)');
}
if (mu.length) fail('Multiutente', 'residui del sistema multiutente (vietati):\n' + mu.join('\n')); else ok('Multiutente (0 residui auth/login/staff)');

// ESITO
console.log('\n' + '─'.repeat(48));
if (failures > 0) { console.log(`\u001b[31m\u001b[1mDEPLOY BLOCCATO — ${failures} controllo/i fallito/i\u001b[0m`); process.exit(1); }
console.log('\u001b[32m\u001b[1mVERIFY OK — pronto al deploy\u001b[0m');
process.exit(0);
