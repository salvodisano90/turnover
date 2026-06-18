// services/decisionCenter.ts — Centro Decisionale: layer di SIMULAZIONE sopra l'engine esistente.
// NON modifica engine.ts: riusa simulateScenario/computeCoverage/evalCandidate/countTurno/monteTurni.
// Ogni simulazione crea uno scenario VIRTUALE e NON tocca il piano reale. Produce un verdetto
// (semaforo) e una classifica di sostituti con motivazione. (Direttiva V3 — Coordinatore intelligente)
import {
  simulateScenario, computeCoverage, evalCandidate, countTurno, monteTurni, ScenarioResult,
} from './engine';
import { cloneDeep } from '../utils/helpers';
import { EngineContext, Piano, Staff, Turno, TurnoLavoro } from '../types';
import { STD_ORARI } from '../utils/constants';

export type DecisionVerdict = 'green' | 'yellow' | 'red';
export interface Verdict { level: DecisionVerdict; label: string; reasons: string[]; }

export type DecisionScenarioType = 'ferie' | 'assenza' | 'ferieMultiple' | 'cambioTurno' | 'riposo';

export interface DecisionInput {
  tipo: DecisionScenarioType;
  infIds: string[];          // uno o più operatori (ferie multiple)
  dayFrom?: number;
  dayTo?: number;
  day?: number;              // per cambioTurno / riposo
  turnoNuovo?: Turno;        // per cambioTurno
}

export interface SubstituteRank {
  rank: number; infId: string; nome: string;
  compatibilita: number;     // 0..100
  oreAggiuntive: number;     // ore monte stimate
  nottiAttuali: number;
  impatto: 'basso' | 'medio' | 'alto';
  motivazione: string;
}

export interface DecisionResult {
  scenario: DecisionScenarioType;
  coperturaAttuale: number;
  coperturaPrevista: number;
  differenza: number;        // negativo = peggioramento
  turniScoperti: number;
  giorniCritici: number;
  notti: { scoperte: number; critiche: number };
  sicurezzaPrima: number;
  sicurezzaDopo: number;
  vincoli: string[];
  stazioniScoperte: string[];
  sostituti: SubstituteRank[];
  verdetto: Verdict;
  nota: string;
}

// ── Verdetto semaforo ────────────────────────────────────────────────────────
export function computeVerdict(r: { coperturaPrevista: number; differenza: number; turniScoperti: number; sicurezzaDopo: number; vincoliCritici: number }): Verdict {
  const reasons: string[] = [];
  let level: DecisionVerdict = 'green';
  if (r.coperturaPrevista < 85 || r.turniScoperti > 0 || r.sicurezzaDopo < 60) {
    level = 'red';
    if (r.coperturaPrevista < 85) reasons.push(`Copertura prevista ${r.coperturaPrevista}% sotto la soglia di sicurezza.`);
    if (r.turniScoperti > 0) reasons.push(`${r.turniScoperti} turni resterebbero scoperti.`);
    if (r.sicurezzaDopo < 60) reasons.push('Indice di sicurezza assistenziale troppo basso.');
  } else if (r.differenza <= -4 || r.coperturaPrevista < 95 || r.vincoliCritici > 0) {
    level = 'yellow';
    if (r.differenza <= -4) reasons.push(`Copertura in calo di ${Math.abs(r.differenza)} punti.`);
    if (r.coperturaPrevista < 95) reasons.push('Copertura accettabile ma non ottimale.');
    if (r.vincoliCritici > 0) reasons.push('Presenti avvisi da valutare.');
  } else {
    reasons.push('Nessun impatto critico: copertura e sicurezza mantenute.');
  }
  const label = level === 'green' ? 'APPROVABILE' : level === 'yellow' ? 'APPROVABILE CON MODIFICHE' : 'NON CONSIGLIATO';
  return { level, label, reasons };
}

// ── Classifica sostituti con motivazione ─────────────────────────────────────
// Riusa evalCandidate (compatibilità reale col settore/turno) + countTurno (notti) + monteTurni (ore).
export function rankSubstitutes(ctx: EngineContext, piano: Piano, infId: string, dayFrom: number, dayTo: number, max = 5): SubstituteRank[] {
  const dim = ctx ? (new Date(ctx.year, ctx.month + 1, 0)).getDate() : 31;
  const from = Math.max(1, dayFrom || 1); const to = Math.min(dim, dayTo && dayTo >= from ? dayTo : from);
  const target = ctx.staff.find((s) => s.id === infId);
  // celle di lavoro lasciate scoperte dall'assente
  const gaps: { day: number; turno: TurnoLavoro; settore: string; repartoId: string }[] = [];
  if (piano[infId]) for (let d = from; d <= to; d++) {
    const c = piano[infId][d];
    if (c && c.turno && c.turno !== 'R' && c.turno !== 'F' && c.turno !== 'S' && c.settore && c.repartoId) {
      gaps.push({ day: d, turno: c.turno as TurnoLavoro, settore: c.settore, repartoId: c.repartoId });
    }
  }
  const scores: Record<string, { hits: number; tries: number; nights: number; hours: number; nome: string }> = {};
  for (const cand of ctx.staff) {
    if (cand.id === infId) continue;
    let hits = 0; let tries = 0;
    for (const g of gaps) {
      const rep = ctx.reparti.find((r) => r.id === g.repartoId); if (!rep) continue;
      const occ = piano[cand.id] && piano[cand.id][g.day];
      if (occ && occ.turno && occ.turno !== 'R') continue; // già occupato
      tries++;
      const ev = evalCandidate(ctx, piano, cand, g.day, g.turno, rep, g.settore);
      if (ev) hits++;
    }
    if (tries === 0) continue;
    scores[cand.id] = { hits, tries, nights: countTurno(piano, cand.id, 'N' as Turno, dim), hours: monteTurni(cand), nome: cand.nome };
  }
  const ranked = Object.entries(scores)
    .map(([id, s]) => {
      const compat = s.tries ? Math.round((s.hits / s.tries) * 100) : 0;
      const oreAgg = Math.round((s.hits) * 6.5); // stima ore coperte
      const impatto: 'basso' | 'medio' | 'alto' = compat >= 80 ? 'basso' : compat >= 50 ? 'medio' : 'alto';
      const motiv = `Copre ${s.hits}/${s.tries} turni scoperti (${compat}% compatibilità), ${s.nights} notti nel mese, monte ${s.hours}h. ${compat >= 80 ? 'Mantiene equilibrio e copertura.' : compat >= 50 ? 'Copertura parziale, valutare carico.' : 'Compatibilità limitata.'}`;
      return { infId: id, nome: s.nome, compatibilita: compat, oreAggiuntive: oreAgg, nottiAttuali: s.nights, impatto, motivazione: motiv };
    })
    .sort((a, b) => b.compatibilita - a.compatibilita || a.nottiAttuali - b.nottiAttuali || a.oreAggiuntive - b.oreAggiuntive)
    .slice(0, max)
    .map((r, i) => ({ rank: i + 1, ...r }));
  return ranked;
}

// ── Simulazione completa di una decisione ────────────────────────────────────
export function simulateDecision(ctx: EngineContext, piano: Piano, input: DecisionInput): DecisionResult {
  const dim = (new Date(ctx.year, ctx.month + 1, 0)).getDate();
  const from = input.dayFrom || input.day || 1;
  const to = input.dayTo || input.day || from;

  let sr: ScenarioResult;
  if (input.tipo === 'cambioTurno' && input.infIds[0] && input.day && input.turnoNuovo) {
    // scenario virtuale: cambio cella, ricalcolo copertura (riuso computeCoverage, no engine mod)
    const simPiano: Piano = cloneDeep(piano);
    const id = input.infIds[0];
    if (simPiano[id] && simPiano[id][input.day]) simPiano[id][input.day] = { ...simPiano[id][input.day], turno: input.turnoNuovo, settore: input.turnoNuovo === 'R' || input.turnoNuovo === 'F' ? null : simPiano[id][input.day].settore };
    const covA = computeCoverage(ctx, piano).globalPct;
    const cov = computeCoverage(ctx, simPiano);
    sr = { coperturaAttuale: covA, coperturaPrevista: cov.globalPct, giorniCritici: 0, turniScoperti: cov.uncovered.length, impatto: 'basso', sostituti: [], vincoli: [], stazioniScoperte: [], indiceSicurezzaPrima: 0, indiceSicurezzaDopo: 0, postazioniRecuperate: [], postazioniPerse: [], nota: '' };
  } else {
    // ferie / assenza / riposo / ferie multiple → riuso engine.simulateScenario per ogni operatore
    const tipoEngine = input.tipo === 'assenza' ? 'malattia' : 'ferie';
    let acc: ScenarioResult | null = null;
    let workPiano: Piano = piano;
    for (const id of input.infIds) {
      acc = simulateScenario({ ...ctx }, workPiano, { tipo: tipoEngine as any, infId: id, dayFrom: from, dayTo: to });
    }
    sr = acc || simulateScenario(ctx, piano, { tipo: tipoEngine as any, infId: input.infIds[0], dayFrom: from, dayTo: to });
  }

  const differenza = sr.coperturaPrevista - sr.coperturaAttuale;
  const vincoliCritici = sr.vincoli.filter((v) => /rischio|insufficiente|sbilanc/i.test(v)).length;
  const verdetto = computeVerdict({ coperturaPrevista: sr.coperturaPrevista, differenza, turniScoperti: sr.turniScoperti, sicurezzaDopo: sr.indiceSicurezzaDopo || 100, vincoliCritici });
  const sostituti = input.infIds[0] ? rankSubstitutes(ctx, piano, input.infIds[0], from, to) : [];

  return {
    scenario: input.tipo,
    coperturaAttuale: sr.coperturaAttuale,
    coperturaPrevista: sr.coperturaPrevista,
    differenza,
    turniScoperti: sr.turniScoperti,
    giorniCritici: sr.giorniCritici,
    notti: { scoperte: sr.stazioniScoperte.length, critiche: sr.giorniCritici },
    sicurezzaPrima: sr.indiceSicurezzaPrima,
    sicurezzaDopo: sr.indiceSicurezzaDopo,
    vincoli: sr.vincoli,
    stazioniScoperte: sr.stazioniScoperte,
    sostituti,
    verdetto,
    nota: sr.nota,
  };
}

// ── Storico simulazioni ──────────────────────────────────────────────────────
export interface DecisionSimulation {
  id: string; data: string; scenario: DecisionScenarioType;
  operatori: string[]; verdetto: DecisionVerdict; coperturaPrevista: number; nota: string;
}
export function toSimulationRecord(input: DecisionInput, result: DecisionResult, nomeOf: (id: string) => string): DecisionSimulation {
  return {
    id: 'sim_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data: new Date().toISOString(),
    scenario: input.tipo,
    operatori: input.infIds.map(nomeOf),
    verdetto: result.verdetto.level,
    coperturaPrevista: result.coperturaPrevista,
    nota: result.nota || result.verdetto.label,
  };
}
