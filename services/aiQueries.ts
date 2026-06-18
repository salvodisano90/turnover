// services/aiQueries.ts — motore domande deterministiche dell'Assistente (riusa fairness/engine, NO nuovo provider).
// Ogni risposta ha formato uniforme. PURO e testabile. Le domande "operative" sono calcolate sui dati reali;
// quelle normative (CCNL) restituiscono riferimenti informativi statici (nessuna invenzione runtime).
import { Staff, Piano } from '../types';
import { fairnessReport, FairnessRow } from './fairness';

export type AICategory =
  | 'turni' | 'matrici' | 'personale' | 'assenze' | 'ferie' | 'reperibilita'
  | 'bancaore' | 'formazione' | 'contratti' | 'copertura' | 'direzione' | 'analisi';

export interface AIQueryResult {
  titolo: string;
  risultato: string;
  spiegazione: string;
  criticita?: string;
  suggerimento?: string;
  azione?: { label: string; route?: string };
}

export interface AIQueryCtx {
  staff: Staff[];
  piano: Piano;
  year: number;
  month: number;
  rep?: Record<string, number>;       // reperibilità per operatore
  ferie?: { infId: string; from: number; to: number; month: number; year: number; motivo?: string }[];
}

const EMPTY = (titolo: string): AIQueryResult => ({
  titolo, risultato: 'Dati non disponibili', spiegazione: 'Genera prima un piano e inserisci il personale per ottenere questa analisi.',
});

function rows(c: AIQueryCtx): FairnessRow[] {
  if (!c.staff || !c.staff.length || !c.piano) return [];
  return fairnessReport(c.staff, c.piano, c.year, c.month, { rep: c.rep || {} }).operatori;
}

// estremi su una metrica numerica di FairnessRow
function extreme(c: AIQueryCtx, key: keyof FairnessRow, dir: 'max' | 'min', label: string, unit: string): AIQueryResult {
  const r = rows(c); if (!r.length) return EMPTY(label);
  const sorted = [...r].sort((a, b) => (dir === 'max' ? (b[key] as number) - (a[key] as number) : (a[key] as number) - (b[key] as number)));
  const top = sorted[0]; const v = top[key] as number;
  const media = r.reduce((s, x) => s + (x[key] as number), 0) / r.length;
  const crit = dir === 'max' && v > media * 1.5 ? `${top.nome} è ben oltre la media (${media.toFixed(1)} ${unit}).` : undefined;
  return {
    titolo: label,
    risultato: `${top.nome}: ${v} ${unit}`,
    spiegazione: `Su ${r.length} operatori, ${top.nome} ha il valore ${dir === 'max' ? 'più alto' : 'più basso'} di ${unit} (media ${media.toFixed(1)}).`,
    criticita: crit,
    suggerimento: crit ? 'Valuta un riequilibrio nella prossima generazione turni.' : undefined,
    azione: { label: 'Apri equità', route: '/direzione' },
  };
}

function equilibrio(c: AIQueryCtx, dir: 'max' | 'min'): AIQueryResult {
  const r = rows(c); if (!r.length) return EMPTY('Equilibrio del carico');
  const sorted = [...r].sort((a, b) => (dir === 'max' ? Math.abs(b.scostamentoPct) - Math.abs(a.scostamentoPct) : Math.abs(a.scostamentoPct) - Math.abs(b.scostamentoPct)));
  const top = sorted[0];
  return {
    titolo: dir === 'max' ? 'Operatore meno equilibrato' : 'Operatore più equilibrato',
    risultato: `${top.nome}: scostamento ${top.scostamentoPct > 0 ? '+' : ''}${top.scostamentoPct.toFixed(0)}%`,
    spiegazione: `Scostamento dal carico medio di reparto. ${dir === 'max' ? 'Il più distante dalla media.' : 'Il più vicino alla media.'}`,
    criticita: dir === 'max' && Math.abs(top.scostamentoPct) > 25 ? 'Squilibrio significativo (>25%).' : undefined,
    azione: { label: 'Apri equità', route: '/direzione' },
  };
}

function inFerie(c: AIQueryCtx): AIQueryResult {
  const f = (c.ferie || []).filter((x) => x.month === c.month && x.year === c.year);
  if (!c.staff || !c.staff.length) return EMPTY('Chi è in ferie');
  const nomi = f.map((x) => { const s = c.staff.find((p) => p.id === x.infId); return s ? `${s.nome} (${x.from}–${x.to})` : null; }).filter(Boolean);
  return {
    titolo: 'Chi è in ferie/assente',
    risultato: nomi.length ? `${nomi.length} operatori` : 'Nessuno nel mese corrente',
    spiegazione: nomi.length ? nomi.join(', ') : 'Nessuna assenza registrata per il mese selezionato.',
    azione: { label: 'Apri assenze', route: '/ferie-wizard' },
  };
}

// ── Catalogo: domande operative (calcolate) ────────────────────────────────
export interface AIQuestion { id: string; categoria: AICategory; testo: string; run: (c: AIQueryCtx) => AIQueryResult; }

const Q = (id: string, categoria: AICategory, testo: string, run: (c: AIQueryCtx) => AIQueryResult): AIQuestion => ({ id, categoria, testo, run });

export const OPERATIONAL_QUESTIONS: AIQuestion[] = [
  // TURNI
  Q('t_notti_max', 'turni', 'Chi ha più notti?', (c) => extreme(c, 'notti', 'max', 'Più notti', 'notti')),
  Q('t_notti_min', 'turni', 'Chi ha meno notti?', (c) => extreme(c, 'notti', 'min', 'Meno notti', 'notti')),
  Q('t_turni_max', 'turni', 'Chi ha più turni?', (c) => extreme(c, 'turniLavorati', 'max', 'Più turni', 'turni')),
  Q('t_turni_min', 'turni', 'Chi ha meno turni?', (c) => extreme(c, 'turniLavorati', 'min', 'Meno turni', 'turni')),
  Q('t_weekend_max', 'turni', 'Chi ha più weekend?', (c) => extreme(c, 'weekend', 'max', 'Più weekend', 'weekend')),
  Q('t_weekend_min', 'turni', 'Chi ha meno weekend?', (c) => extreme(c, 'weekend', 'min', 'Meno weekend', 'weekend')),
  Q('t_festivi_max', 'turni', 'Chi ha più festivi?', (c) => extreme(c, 'festivi', 'max', 'Più festivi', 'festivi')),
  Q('t_pesanti_max', 'turni', 'Chi ha più turni pesanti?', (c) => extreme(c, 'turniPesanti', 'max', 'Più turni pesanti', 'pesanti')),
  Q('t_carico_max', 'turni', 'Chi lavora di più?', (c) => extreme(c, 'carico', 'max', 'Carico più alto', 'punti')),
  Q('t_carico_min', 'turni', 'Chi lavora di meno?', (c) => extreme(c, 'carico', 'min', 'Carico più basso', 'punti')),
  Q('t_equi_max', 'turni', 'Chi è più equilibrato?', (c) => equilibrio(c, 'min')),
  Q('t_equi_min', 'turni', 'Chi è meno equilibrato?', (c) => equilibrio(c, 'max')),
  // PERSONALE
  Q('p_ferie', 'personale', 'Chi è in ferie?', inFerie),
  Q('p_rep_max', 'personale', 'Chi ha più reperibilità?', (c) => extreme(c, 'reperibilita', 'max', 'Più reperibilità', 'turni')),
  // ASSENZE / FERIE
  Q('a_ferie', 'assenze', 'Chi è assente nel mese?', inFerie),
  Q('f_ferie', 'ferie', 'Chi è in ferie nel mese?', inFerie),
  // REPERIBILITÀ
  Q('r_max', 'reperibilita', 'Chi ha più reperibilità?', (c) => extreme(c, 'reperibilita', 'max', 'Più reperibilità', 'turni')),
  Q('r_min', 'reperibilita', 'Chi ha meno reperibilità?', (c) => extreme(c, 'reperibilita', 'min', 'Meno reperibilità', 'turni')),
  // BANCA ORE (proxy: carico)
  Q('b_max', 'bancaore', 'Chi ha il carico più alto?', (c) => extreme(c, 'carico', 'max', 'Carico più alto', 'punti')),
];

// ── Domande normative (CCNL Sanità): riferimenti informativi statici, MAI inventati a runtime ──
export interface AINormativa { id: string; categoria: 'contratti'; testo: string; riferimento: string; }
export const CONTRACT_QUESTIONS: AINormativa[] = [
  { id: 'c_riposo_giornaliero', categoria: 'contratti', testo: 'Quante ore di riposo tra due turni?', riferimento: 'CCNL Sanità: minimo 11 ore consecutive di riposo nelle 24 ore (salvo deroghe per pronta disponibilità).' },
  { id: 'c_riposo_settimanale', categoria: 'contratti', testo: 'Quante ore di riposo settimanale?', riferimento: 'Riposo settimanale: almeno 24 ore consecutive ogni 7 giorni, di norma in coincidenza con la domenica.' },
  { id: 'c_notti_max', categoria: 'contratti', testo: 'Quante notti massime al mese?', riferimento: 'Le notti massime dipendono dal profilo orario/FTE e dagli accordi aziendali; il sistema applica un tetto ∝ contratto.' },
  { id: 'c_straordinario', categoria: 'contratti', testo: 'Come funziona lo straordinario?', riferimento: 'Lo straordinario è prestazione oltre l’orario d’obbligo, autorizzata; compensato con maggiorazione o recupero secondo accordi.' },
  { id: 'c_pd', categoria: 'contratti', testo: 'Come funziona la pronta disponibilità?', riferimento: 'La pronta disponibilità prevede indennità e, in caso di chiamata, il tempo lavorato è retribuito/recuperato come da CCNL.' },
  { id: 'c_maternita', categoria: 'contratti', testo: 'Quali tutele per la maternità?', riferimento: 'Congedo di maternità obbligatorio e divieto di turni notturni nei periodi tutelati dalla normativa (D.Lgs. 151/2001).' },
  { id: 'c_104', categoria: 'contratti', testo: 'Come funzionano i permessi 104?', riferimento: 'La Legge 104 prevede permessi mensili retribuiti per assistenza; vanno pianificati salvaguardando la copertura.' },
  { id: 'c_partime', categoria: 'contratti', testo: 'Come si gestisce il part-time?', riferimento: 'Il part-time riduce l’orario d’obbligo e proporzionalmente i tetti (notti, monte ore); il motore ne tiene conto via FTE.' },
  { id: 'c_festivi', categoria: 'contratti', testo: 'Come sono retribuiti i festivi?', riferimento: 'Il lavoro nei festivi prevede maggiorazione o riposo compensativo secondo gli accordi aziendali.' },
  { id: 'c_cambio', categoria: 'contratti', testo: 'È possibile il cambio turno?', riferimento: 'Il cambio turno è ammesso previo accordo tra operatori e validazione del coordinatore, nel rispetto dei riposi.' },
];

export const CATEGORIES: { key: AICategory; label: string }[] = [
  { key: 'turni', label: 'Turni' }, { key: 'matrici', label: 'Matrici' }, { key: 'personale', label: 'Personale' },
  { key: 'assenze', label: 'Assenze' }, { key: 'ferie', label: 'Ferie' }, { key: 'reperibilita', label: 'Reperibilità' },
  { key: 'bancaore', label: 'Banca Ore' }, { key: 'formazione', label: 'Formazione' }, { key: 'contratti', label: 'Contratti' },
  { key: 'copertura', label: 'Copertura' }, { key: 'direzione', label: 'Direzione' }, { key: 'analisi', label: 'Analisi' },
];

export function questionsByCategory(cat: AICategory): AIQuestion[] {
  return OPERATIONAL_QUESTIONS.filter((q) => q.categoria === cat);
}
export function quickQuestions(): AIQuestion[] {
  return ['t_notti_max', 't_notti_min', 'p_ferie', 'p_rep_max', 't_carico_max', 't_carico_min', 't_weekend_max', 't_equi_min']
    .map((id) => OPERATIONAL_QUESTIONS.find((q) => q.id === id)).filter(Boolean) as AIQuestion[];
}
