// services/familyConstraint.ts — Vincolo Familiare (Inverse Engine). Servizio PURO, no engine mod.
// Genera preferenze COMPLEMENTARI (non speculari) rispetto alla matrice del convivente, così da
// aumentare la probabilità che almeno un adulto sia a casa. Calcola il Family Coverage Score.
// Il vincolo è SOFT: priorità più bassa di sicurezza/copertura/legge/riposi/equità/matrice operatore.
import { Turno, Piano, FamilyConstraint, FamilyRelation, FamilyPriority, FamilyRules } from '../types';

export type { FamilyConstraint, FamilyRelation, FamilyPriority, FamilyRules } from '../types';

export const RELATION_LABEL: Record<FamilyRelation, string> = { CONIUGE: 'Coniuge', PARTNER: 'Partner', GENITORE: 'Genitore', ALTRO: 'Altro' };
export const PRIORITY_LABEL: Record<FamilyPriority, string> = { BASSA: 'Bassa', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Critica' };
export const PRIORITY_WEIGHT: Record<FamilyPriority, number> = { BASSA: 1, MEDIA: 2, ALTA: 3, CRITICA: 4 };

// Preferenze COMPLEMENTARI per un turno del convivente (non inversione matematica):
// Convivente Mattina → operatore meglio Pomeriggio/Riposo/Ferie; Pomeriggio → Mattina/Riposo;
// Notte → Mattina/Pomeriggio (a casa di giorno); Riposo/Ferie/Smonto → nessun vincolo.
export function complementaryPreferences(partnerShift: Turno): Turno[] {
  switch (partnerShift) {
    case 'M': return ['P', 'R', 'F'];
    case 'P': return ['M', 'R'];
    case 'N': return ['M', 'P'];
    default: return []; // R, F, S → vincolo ignorato
  }
}

// Un giorno ha "copertura familiare" se NON entrambi sono fuori casa nella stessa fascia.
// Semplificazione robusta: si considera "scoperto" il giorno in cui entrambi lavorano turni che
// li tengono fuori in modo sovrapposto (M&M, P&P, e qualsiasi combinazione con N che copre la notte).
export function dayHasFamilyCoverage(opShift: Turno, partnerShift: Turno): boolean {
  const out = (t: Turno) => t === 'M' || t === 'P' || t === 'N';
  if (!out(opShift) || !out(partnerShift)) return true; // almeno uno a casa/ferie/riposo
  // entrambi lavorano: scoperto solo se le fasce si sovrappongono (stessa fascia) o entrambi coprono sera/notte
  if (opShift === partnerShift) return false;            // stessa fascia → entrambi fuori insieme
  const nightPair = (a: Turno, b: Turno) => (a === 'N' && b === 'P') || (a === 'P' && b === 'N') || (a === 'N' && b === 'N');
  if (nightPair(opShift, partnerShift)) return false;    // sera+notte → bambino scoperto la sera/notte
  return true;                                           // fasce complementari (es. M & P/N gestibile) → coperto
}

export interface FamilyCoverageScore {
  score: number;          // 0..100 (% giorni con almeno un adulto presente)
  giorniTotali: number;
  giorniCoperti: number;
  giorniCritici: number;  // giorni scoperti
  giorniScoperti: number[]; // indici (1-based) dei giorni scoperti
}

// Calcola lo score confrontando i turni dell'operatore con quelli del convivente, giorno per giorno.
export function familyCoverageScore(opShifts: Turno[], partnerShifts: Turno[]): FamilyCoverageScore {
  const n = Math.min(opShifts.length, partnerShifts.length);
  let coperti = 0; const scoperti: number[] = [];
  for (let i = 0; i < n; i++) {
    if (dayHasFamilyCoverage(opShifts[i], partnerShifts[i])) coperti++;
    else scoperti.push(i + 1);
  }
  const score = n ? Math.round((coperti / n) * 100) : 100;
  return { score, giorniTotali: n, giorniCoperti: coperti, giorniCritici: scoperti.length, giorniScoperti: scoperti };
}

// Bonus di preferenza (0..1) per assegnare un certo turno all'operatore in un certo giorno,
// dato il turno del convivente quel giorno. Usato come segnale SOFT (mai vincolante).
export function familyPreferenceBonus(candidateShift: Turno, partnerShiftThatDay: Turno, priority: FamilyPriority): number {
  const prefs = complementaryPreferences(partnerShiftThatDay);
  if (!prefs.length) return 0;
  const idx = prefs.indexOf(candidateShift);
  if (idx < 0) return 0;
  const base = 1 - idx / prefs.length;            // prima preferenza pesa di più
  return base * (PRIORITY_WEIGHT[priority] / 4);  // scala con la priorità
}

// Confronto situazione attuale vs simulata (per "Impatto Familiare" nel Centro Decisionale).
export function familyImpact(before: Turno[], after: Turno[], partner: Turno[]): { prima: number; dopo: number; delta: number } {
  const prima = familyCoverageScore(before, partner).score;
  const dopo = familyCoverageScore(after, partner).score;
  return { prima, dopo, delta: dopo - prima };
}

// Espande il ciclo (matrice) del convivente su N giorni, con offset iniziale.
export function expandMatrix(cycle: Turno[], days: number, offset = 0): Turno[] {
  if (!cycle || !cycle.length) return [];
  const out: Turno[] = [];
  for (let i = 0; i < days; i++) out.push(cycle[(i + offset) % cycle.length]);
  return out;
}

// Estrae la sequenza turni effettiva di un operatore dal piano (giorni 1..days).
export function operatorShiftsFromPiano(piano: Piano, infId: string, days: number): Turno[] {
  const row = (piano && piano[infId]) || {};
  const out: Turno[] = [];
  for (let d = 1; d <= days; d++) { const c = row[d]; out.push((c && c.turno) ? (c.turno as Turno) : 'R'); }
  return out;
}

// ── INVERTED MATRIX (operatore↔operatore) ────────────────────────────────────
// Genera lo schema COMPLEMENTARE di un operatore a partire dai turni dell'altro:
// per ogni giorno sceglie la prima preferenza complementare (es. l'altro M → questo R),
// così almeno un adulto è a casa. Non è specularità: è copertura familiare.
export function generateInverseShifts(sourceShifts: Turno[]): Turno[] {
  return sourceShifts.map((t) => { const p = complementaryPreferences(t); return p.length ? p[0] : 'R'; });
}
export function inverseCycle(cycle: Turno[]): Turno[] { return generateInverseShifts(cycle); }

// Turni del "partner" per il calcolo: da operatore COLLEGATO (piano reale) o da matrice esterna.
export function partnerShiftsFor(fc: FamilyConstraint, piano: Piano, days: number, offsetOf: (id: string) => number): Turno[] {
  if (fc.source === 'linked' && fc.linkedStaffId) return operatorShiftsFromPiano(piano, fc.linkedStaffId, days);
  if (fc.inverseMatrix && fc.inverseMatrix.length) return expandMatrix(fc.inverseMatrix, days, offsetOf(fc.staffId) || 0);
  return [];
}

// Verifica una regola configurabile su un giorno (giorni/weekend/notti).
export function ruleSatisfied(rule: keyof FamilyRules, value: string, a: Turno, b: Turno, isWeekend: boolean): boolean {
  const work = (t: Turno) => t === 'M' || t === 'P' || t === 'N';
  if (rule === 'giorni') {
    if (value === 'insieme') return (!work(a) && !work(b)) || (work(a) && work(b));
    if (value === 'separati') return work(a) !== work(b);
    return true;
  }
  if (rule === 'weekend') {
    if (!isWeekend) return true;
    if (value === 'condivisi') return !work(a) && !work(b);
    if (value === 'alternati') return work(a) !== work(b);
    return true;
  }
  if (rule === 'notti') { if (value === 'alternate') return !(a === 'N' && b === 'N'); return true; }
  return true;
}

// Punteggio conformità regole (0..100) su due sequenze, dato year/month per i weekend.
export function rulesComplianceScore(a: Turno[], b: Turno[], rules: FamilyRules, year: number, month: number): number {
  const n = Math.min(a.length, b.length); if (!n) return 100;
  let ok = 0, tot = 0;
  for (let i = 0; i < n; i++) {
    const dow = new Date(year, month, i + 1).getDay(); const we = dow === 0 || dow === 6;
    for (const [rule, val] of Object.entries(rules) as [keyof FamilyRules, string][]) {
      if (val === 'indifferente') continue;
      tot++; if (ruleSatisfied(rule, val, a[i], b[i], we)) ok++;
    }
  }
  return tot ? Math.round((ok / tot) * 100) : 100;
}
