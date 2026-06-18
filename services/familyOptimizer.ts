// services/familyOptimizer.ts — Vincolo Familiare GENERATIVO. Post-processore dopo buildPiano().
// Cerca SCAMBI LOCALI (stesso giorno, due operatori) che migliorano il Family Coverage Score
// SENZA peggiorare copertura/sicurezza/riposi. Ogni scambio è validato con computeCoverage (engine
// invariato). Soft: interviene solo tra soluzioni equivalenti, mai sopra i vincoli superiori.
import { computeCoverage } from './engine';
import { cloneDeep } from '../utils/helpers';
import { EngineContext, Piano, Staff, Turno } from '../types';
import { expandMatrix, operatorShiftsFromPiano, familyCoverageScore } from './familyConstraint';

const isWork = (t?: Turno) => t === 'M' || t === 'P' || t === 'N';

// riposo minimo: dopo una Notte non può esserci M/P il giorno dopo (controllo conservativo)
function restOkForOp(piano: Piano, opId: string, day: number, dim: number): boolean {
  const row = piano[opId]; if (!row) return true;
  const t = (d: number): Turno | undefined => (row[d] && row[d].turno) as Turno | undefined;
  // N oggi → domani non M/P
  if (t(day) === 'N' && (t(day + 1) === 'M' || t(day + 1) === 'P')) return false;
  // ieri N → oggi non M/P
  if (t(day - 1) === 'N' && (t(day) === 'M' || t(day) === 'P')) return false;
  // N domani → oggi non subito prima incompatibile (P oggi + N domani è ammesso; M oggi+N domani ammesso) → nessun extra
  return true;
}

export interface FamilyOptItem { infId: string; nome: string; scoreIniziale: number; scoreFinale: number; variazione: number; }
export interface FamilyOptResult {
  piano: Piano;
  items: FamilyOptItem[];
  swaps: number;
  coperturaPrima: number;
  coperturaDopo: number;
  miglioramentoMedio: number;
  miglioramentoMassimo: number;
  operatoriOttimizzati: number;
}

function partnerSeq(op: Staff, dim: number, piano: Piano, ctx: EngineContext): Turno[] | null {
  if (!op.family?.enabled) return null;
  // INVERTED MATRIX: partner = operatore gestito collegato → turni reali dal piano
  if (op.family.source === 'linked' && op.family.linkedStaffId) return operatorShiftsFromPiano(piano, op.family.linkedStaffId, dim);
  if (!op.family.inverseMatrix?.length) return null;
  return expandMatrix(op.family.inverseMatrix, dim, op.offset || 0);
}
function opFamScore(piano: Piano, op: Staff, dim: number, ctx: EngineContext): number {
  const partner = partnerSeq(op, dim, piano, ctx); if (!partner) return 100;
  return familyCoverageScore(operatorShiftsFromPiano(piano, op.id, dim), partner).score;
}

/** Ottimizza il piano per la copertura familiare con scambi locali sicuri. Non modifica il piano in input. */
export function optimizeFamily(ctx: EngineContext, pianoIn: Piano, opts: { maxPasses?: number } = {}): FamilyOptResult {
  const dim = new Date(ctx.year, ctx.month + 1, 0).getDate();
  const maxPasses = opts.maxPasses ?? 3;
  const piano = cloneDeep(pianoIn);
  const famOps = ctx.staff.filter((o) => o.family?.enabled && ((o.family.source === 'linked' && o.family.linkedStaffId) || o.family.inverseMatrix?.length));
  const coperturaPrima = computeCoverage(ctx, piano).globalPct;

  const initial: Record<string, number> = {};
  famOps.forEach((o) => { initial[o.id] = opFamScore(piano, o, dim, ctx); });

  let swaps = 0;
  if (famOps.length) {
    for (let pass = 0; pass < maxPasses; pass++) {
      let improvedThisPass = false;
      for (const a of famOps) {
        const partnerA = partnerSeq(a, dim, piano, ctx); if (!partnerA) continue;
        for (let d = 1; d <= dim; d++) {
          const ca = piano[a.id] && piano[a.id][d]; if (!ca || !isWork(ca.turno as Turno)) continue;
          // candidati B: stesso reparto, lavorano quel giorno con turno DIVERSO (scambio neutro sul multiset reparto)
          for (const b of ctx.staff) {
            if (b.id === a.id) continue;
            const cb = piano[b.id] && piano[b.id][d]; if (!cb || !isWork(cb.turno as Turno)) continue;
            if (ca.turno === cb.turno) continue;
            if (ca.repartoId && cb.repartoId && ca.repartoId !== cb.repartoId) continue; // stesso reparto
            // punteggio familiare PRIMA (a + eventuale b con vincolo)
            const bFam = b.family?.enabled && ((b.family.source === 'linked' && b.family.linkedStaffId) || b.family.inverseMatrix?.length) ? b : null;
            const beforeA = opFamScore(piano, a, dim, ctx);
            const beforeB = bFam ? opFamScore(piano, bFam, dim, ctx) : 0;
            const uncoveredBefore = computeCoverage(ctx, piano).uncovered.length; // misura PRECISA pre-scambio
            // applica scambio tentativo
            const ta = ca.turno, tb = cb.turno; const sa = ca.settore, sb = cb.settore;
            piano[a.id][d] = { ...ca, turno: tb, settore: sb };
            piano[b.id][d] = { ...cb, turno: ta, settore: sa };
            // validazioni: riposi + copertura (turni scoperti) NON peggiorata
            const restOk = restOkForOp(piano, a.id, d, dim) && restOkForOp(piano, b.id, d, dim);
            const uncoveredAfter = restOk ? computeCoverage(ctx, piano).uncovered.length : Number.MAX_SAFE_INTEGER;
            const afterA = opFamScore(piano, a, dim, ctx);
            const afterB = bFam ? opFamScore(piano, bFam, dim, ctx) : 0;
            const famGain = (afterA + afterB) - (beforeA + beforeB);
            if (restOk && uncoveredAfter <= uncoveredBefore && famGain > 0) {
              swaps++; improvedThisPass = true; // scambio sicuro: copertura non peggiora, famiglia migliora
              break; // cella aggiornata: esci dal ciclo b (evita uso di ca/beforeA ormai stale)
            } else {
              // revert
              piano[a.id][d] = ca; piano[b.id][d] = cb;
            }
          }
        }
      }
      if (!improvedThisPass) break; // converge → niente loop infinito
    }
  }

  const coperturaDopo = computeCoverage(ctx, piano).globalPct;
  const items: FamilyOptItem[] = famOps.map((o) => {
    const fin = opFamScore(piano, o, dim, ctx);
    return { infId: o.id, nome: o.nome, scoreIniziale: initial[o.id], scoreFinale: fin, variazione: fin - initial[o.id] };
  });
  const migliorati = items.filter((i) => i.variazione > 0);
  const miglioramentoMedio = items.length ? Math.round(items.reduce((s, i) => s + i.variazione, 0) / items.length) : 0;
  const miglioramentoMassimo = items.reduce((m, i) => Math.max(m, i.variazione), 0);
  return { piano, items, swaps, coperturaPrima, coperturaDopo, miglioramentoMedio, miglioramentoMassimo, operatoriOttimizzati: migliorati.length };
}
