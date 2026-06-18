// services/storage.ts — local persistence via AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backup, PersistedData, ThemeMode } from '../types';
import { STORAGE_KEY, THEME_KEY, LEGACY_STORAGE_KEY, LEGACY_THEME_KEY, APP_NAME } from '../utils/constants';
import { migrateFerie, migratePianos, sanitizeStaff } from '../utils/helpers';

const BACKUP_VERSION = 1;

export function checksum(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

export async function loadData(): Promise<PersistedData | null> {
  try {
    let raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrazione automatica dati storici (TurniAI → TURNOVER)
      const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) { raw = legacy; await AsyncStorage.setItem(STORAGE_KEY, legacy); }
    }
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return {
      reparti: Array.isArray(d.reparti) ? d.reparti : [],
      staff: Array.isArray(d.staff) ? d.staff.map(sanitizeStaff) : [],
      ferie: migrateFerie(Array.isArray(d.ferie) ? d.ferie : []),
      pianos: migratePianos(d.pianos && typeof d.pianos === 'object' ? d.pianos : {}),
      month: typeof d.month === 'number' ? d.month : new Date().getMonth(),
      year: typeof d.year === 'number' ? d.year : new Date().getFullYear(),
      audit: Array.isArray(d.audit) ? d.audit : [],
      history: Array.isArray(d.history) ? d.history : [],
      future: Array.isArray(d.future) ? d.future : [],
      desiderata: Array.isArray(d.desiderata) ? d.desiderata : [],
      mode: d.mode === 'rigida' || d.mode === 'operativa' ? d.mode : 'operativa',
      aiMode: d.aiMode === 'rapida' || d.aiMode === 'equa' || d.aiMode === 'coordinatore' ? d.aiMode : 'coordinatore',
      matriciCustom: Array.isArray(d.matriciCustom) ? d.matriciCustom : [],
      matriceMese: d.matriceMese && typeof d.matriceMese === 'object' ? d.matriceMese : {},
      profile: d.profile && typeof d.profile === 'object' ? d.profile : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveData(data: PersistedData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore write errors
  }
}

// --- Backup professionale (formato JSON leggibile, con checksum di integrità) ---
export function serializeBackup(data: PersistedData): string {
  const core: PersistedData = {
    reparti: data.reparti,
    staff: data.staff,
    ferie: data.ferie,
    pianos: data.pianos,
    month: data.month,
    year: data.year,
    audit: data.audit || [],
    desiderata: data.desiderata || [],
    mode: data.mode || 'operativa',
    aiMode: data.aiMode || 'coordinatore',
    matriciCustom: data.matriciCustom || [],
    matriceMese: data.matriceMese || {},
    profile: data.profile,
  };
  const backup: Backup = {
    app: APP_NAME,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    checksum: checksum(JSON.stringify(core)),
    data: core,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(text: string): { ok: boolean; backup?: Backup; error?: string } {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON non valido' };
  }
  const b = obj as Partial<Backup>;
  if (!b || typeof b !== 'object' || (b.app !== 'TURNOVER' && b.app !== 'TurniAI')) return { ok: false, error: 'Non è un backup TURNOVER' };
  if (typeof b.version !== 'number') return { ok: false, error: 'Versione mancante' };
  const d = b.data as Partial<PersistedData> | undefined;
  if (!d || !Array.isArray(d.reparti) || !Array.isArray(d.staff) || !Array.isArray(d.ferie) || typeof d.pianos !== 'object') {
    return { ok: false, error: 'Struttura dati non valida' };
  }
  const core: PersistedData = {
    reparti: d.reparti,
    staff: d.staff,
    ferie: d.ferie,
    pianos: d.pianos as PersistedData['pianos'],
    month: typeof d.month === 'number' ? d.month : new Date().getMonth(),
    year: typeof d.year === 'number' ? d.year : new Date().getFullYear(),
    audit: Array.isArray(d.audit) ? d.audit : [],
    desiderata: Array.isArray(d.desiderata) ? d.desiderata : [],
    mode: d.mode === 'rigida' || d.mode === 'operativa' ? d.mode : undefined,
    aiMode: d.aiMode === 'rapida' || d.aiMode === 'equa' || d.aiMode === 'coordinatore' ? d.aiMode : undefined,
    matriciCustom: Array.isArray(d.matriciCustom) ? d.matriciCustom : [],
    matriceMese: d.matriceMese && typeof d.matriceMese === 'object' ? d.matriceMese : {},
  };
  // Verifica integrità sul payload COME RICEVUTO (`d`): per qualunque backup prodotto
  // dall'app `JSON.stringify(d)` coincide con il `core` originariamente firmato, ed è
  // robusto a campi mancanti (es. backup vecchi senza `audit`) o aggiunti in futuro.
  if (typeof b.checksum === 'number' && b.checksum !== checksum(JSON.stringify(d))) {
    return { ok: false, error: 'Checksum non corrispondente: backup corrotto' };
  }
  return { ok: true, backup: { app: b.app || APP_NAME, version: b.version, createdAt: b.createdAt || '', checksum: b.checksum || 0, data: core } };
}

export async function loadThemeMode(): Promise<ThemeMode | null> {
  try {
    let raw = await AsyncStorage.getItem(THEME_KEY);
    if (!raw) { const lg = await AsyncStorage.getItem(LEGACY_THEME_KEY); if (lg) { raw = lg; await AsyncStorage.setItem(THEME_KEY, lg); } }
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {
    // ignore
  }
}

// Persistenza palette tema (Theme Engine). Sopravvive a riavvio/logout/aggiornamento.
// Preferenze ESTETICHE per-utente: la chiave include lo userId/email → isolamento totale tra account.
// App single-user: namespace fisso 'guest' (il parametro userId resta nella firma per
// retrocompatibilità con le preferenze già salvate; non esiste piu' login/multiutente).
const themeKey = (userId?: string) => `turnover.theme.palette.${(userId || 'guest').toLowerCase()}`;
export async function loadThemePalette(userId?: string): Promise<any | null> {
  try { const r = await AsyncStorage.getItem(themeKey(userId)); return r ? JSON.parse(r) : null; } catch { return null; }
}
export async function saveThemePalette(p: any, userId?: string): Promise<void> {
  try { await AsyncStorage.setItem(themeKey(userId), JSON.stringify(p)); } catch { /* no-op */ }
}
// ID del tema Liquid Glass attivo (7 temi), isolamento per-utente.
const themeIdKey = (userId?: string) => `turnover.theme.id.${(userId || 'guest').toLowerCase()}`;
export async function loadThemeId(userId?: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(themeIdKey(userId)); } catch { return null; }
}
export async function saveThemeId(id: string, userId?: string): Promise<void> {
  try { await AsyncStorage.setItem(themeIdKey(userId), id); } catch { /* no-op */ }
}
// Preferenze accessibilità (testo/card/densità), isolamento per-utente.
const a11yKey = (userId?: string) => `turnover.a11y.${(userId || 'guest').toLowerCase()}`;
export async function loadA11y(userId?: string): Promise<any | null> {
  try { const r = await AsyncStorage.getItem(a11yKey(userId)); return r ? JSON.parse(r) : null; } catch { return null; }
}
export async function saveA11y(prefs: any, userId?: string): Promise<void> {
  try { await AsyncStorage.setItem(a11yKey(userId), JSON.stringify(prefs)); } catch { /* no-op */ }
}
// Sfondo personalizzato per-utente (P3 spec: import immagine + overlay), stesso isolamento.
const bgKey = (userId?: string) => `turnover.theme.background.${(userId || 'guest').toLowerCase()}`;
export async function loadUserBackground(userId?: string): Promise<any | null> {
  try { const r = await AsyncStorage.getItem(bgKey(userId)); return r ? JSON.parse(r) : null; } catch { return null; }
}
export async function saveUserBackground(cfg: any, userId?: string): Promise<void> {
  try { await AsyncStorage.setItem(bgKey(userId), JSON.stringify(cfg)); } catch { /* no-op */ }
}


// --- Personalizzazione (tema + accessibilità + sfondo) per backup/ripristino ---
export interface PersonalizationSnapshot { themeId?: string | null; a11y?: any; palette?: any; mode?: any; background?: any; }
export async function exportPersonalization(userId?: string): Promise<PersonalizationSnapshot> {
  const [themeId, a11y, palette, mode, background] = await Promise.all([
    loadThemeId(userId), loadA11y(userId), loadThemePalette(userId), loadThemeMode(), loadUserBackground(userId),
  ]);
  return { themeId, a11y, palette, mode, background };
}
export async function importPersonalization(p: PersonalizationSnapshot, userId?: string): Promise<void> {
  if (!p) return;
  const tasks: Promise<void>[] = [];
  if (p.themeId) tasks.push(saveThemeId(p.themeId, userId));
  if (p.a11y) tasks.push(saveA11y(p.a11y, userId));
  if (p.palette) tasks.push(saveThemePalette(p.palette, userId));
  if (p.mode) tasks.push(saveThemeMode(p.mode));
  if (p.background) tasks.push(saveUserBackground(p.background, userId));
  await Promise.all(tasks);
}
