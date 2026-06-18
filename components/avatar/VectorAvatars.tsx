// components/avatar/VectorAvatars.tsx — libreria avatar VETTORIALI (SVG, stile Apple).
// Niente emoji, niente foto. Ogni avatar è una funzione (size,color)=>SVG su cerchio pieno.
// Categorie: Sanità, Animali, Professioni, Astratti. Render scalabile 64/128.
import React from 'react';
import Svg, { Circle, Path, Rect, G, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

export type AvatarId = string;
type GlyphProps = { s: number; c: string };

// helper: glifo bianco centrato su viewBox 0..100
const Glyph = ({ d, c = '#fff', sw = 0 }: { d: string; c?: string; sw?: number }) => (
  <Path d={d} fill={sw ? 'none' : c} stroke={sw ? c : 'none'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);

// --- SANITÀ ---
const Nurse = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="38" r="15" fill="#fff" /><Path d="M28 80c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Path d="M50 30v12M44 36h12" stroke={c} strokeWidth="3.5" strokeLinecap="round" /></G>);
const Medico = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="38" r="15" fill="#fff" /><Path d="M28 80c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Circle cx="50" cy="68" r="5" fill={c} /><Path d="M40 58v6a10 10 0 0020 0v-6" stroke="#fff" strokeWidth="3" fill="none" /></G>);
const OSS = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="38" r="15" fill="#fff" /><Path d="M28 80c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Path d="M50 60l4 8h-8z" fill={c} /></G>);
const Coordinatore = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="40" r="15" fill="#fff" /><Path d="M28 82c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Path d="M38 24l5 6 7-9 7 9 5-6 2 12H36z" fill="#fff" /></G>);
const Anestesista = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="38" r="15" fill="#fff" /><Path d="M28 80c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Rect x="44" y="60" width="12" height="14" rx="3" fill={c} /></G>);
const Pediatra = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="40" r="16" fill="#fff" /><Path d="M30 82c0-12 9-20 20-20s20 8 20 20z" fill="#fff" /><Circle cx="44" cy="38" r="2.4" fill={c} /><Circle cx="56" cy="38" r="2.4" fill={c} /><Path d="M44 46a8 8 0 0012 0" stroke={c} strokeWidth="2.6" fill="none" strokeLinecap="round" /></G>);
const Emergenza = ({ c }: GlyphProps) => (<G><Path d="M50 18l28 16v20c0 18-12 28-28 32-16-4-28-14-28-32V34z" fill="#fff" /><Path d="M46 36h8v10h10v8H54v10h-8V54H36v-8h10z" fill={c} /></G>);
const Radiologia = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="50" r="30" fill="#fff" /><Path d="M50 26v48M26 50h48M34 34l32 32M66 34L34 66" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.85" /></G>);

// --- ANIMALI ---
const Cane = ({ c }: GlyphProps) => (<G><Path d="M30 40c-6-4-8-14-4-18 6 2 10 6 12 12M70 40c6-4 8-14 4-18-6 2-10 6-12 12" fill="#fff" /><Circle cx="50" cy="52" r="24" fill="#fff" /><Circle cx="42" cy="48" r="3" fill={c} /><Circle cx="58" cy="48" r="3" fill={c} /><Path d="M50 56l-4 5h8z" fill={c} /></G>);
const Gatto = ({ c }: GlyphProps) => (<G><Path d="M28 30l8 18-14-2zM72 30l-8 18 14-2z" fill="#fff" /><Circle cx="50" cy="54" r="22" fill="#fff" /><Path d="M42 50l4 3-4 3M58 50l-4 3 4 3" stroke={c} strokeWidth="2.6" fill="none" strokeLinecap="round" /><Path d="M50 58v4" stroke={c} strokeWidth="2.6" strokeLinecap="round" /></G>);
const Coniglio = ({ c }: GlyphProps) => (<G><Rect x="38" y="14" width="9" height="30" rx="4.5" fill="#fff" /><Rect x="53" y="14" width="9" height="30" rx="4.5" fill="#fff" /><Circle cx="50" cy="58" r="22" fill="#fff" /><Circle cx="43" cy="56" r="2.6" fill={c} /><Circle cx="57" cy="56" r="2.6" fill={c} /><Path d="M50 62v3" stroke={c} strokeWidth="2.4" strokeLinecap="round" /></G>);
const Panda = ({ c }: GlyphProps) => (<G><Circle cx="34" cy="32" r="9" fill="#fff" /><Circle cx="66" cy="32" r="9" fill="#fff" /><Circle cx="50" cy="54" r="24" fill="#fff" /><Circle cx="42" cy="50" r="5" fill={c} /><Circle cx="58" cy="50" r="5" fill={c} /><Circle cx="50" cy="60" r="3" fill={c} /></G>);
const Volpe = ({ c }: GlyphProps) => (<G><Path d="M26 28l14 14-16 4zM74 28L60 42l16 4z" fill="#fff" /><Path d="M50 34c14 0 24 10 24 22S50 80 50 80 26 68 26 56s10-22 24-22z" fill="#fff" /><Circle cx="42" cy="52" r="2.6" fill={c} /><Circle cx="58" cy="52" r="2.6" fill={c} /><Path d="M50 60l-3 4h6z" fill={c} /></G>);
const Gufo = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="50" r="26" fill="#fff" /><Circle cx="40" cy="46" r="8" fill={c} /><Circle cx="60" cy="46" r="8" fill={c} /><Circle cx="40" cy="46" r="3" fill="#fff" /><Circle cx="60" cy="46" r="3" fill="#fff" /><Path d="M50 54l-4 6h8z" fill={c} /></G>);

// --- PROFESSIONI ---
const Manager = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="38" r="14" fill="#fff" /><Path d="M28 82c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Path d="M44 60l6 8 6-8" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" /></G>);
const Tecnico = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="40" r="14" fill="#fff" /><Path d="M28 82c0-13 10-22 22-22s22 9 22 22z" fill="#fff" /><Path d="M58 30l8-8m-3-3l6 6" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" /></G>);
const Ingegnere = ({ c }: GlyphProps) => (<G><Path d="M34 26h32l-4 10H38z" fill="#fff" /><Circle cx="50" cy="46" r="13" fill="#fff" /><Path d="M30 82c0-12 9-20 20-20s20 8 20 20z" fill="#fff" /></G>);
const Docente = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="42" r="14" fill="#fff" /><Path d="M30 82c0-12 9-20 20-20s20 8 20 20z" fill="#fff" /><Path d="M34 30l16-8 16 8-16 8z" fill="#fff" /><Path d="M64 32v8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></G>);
const Avvocato = ({ c }: GlyphProps) => (<G><Path d="M50 20v52M34 72h32" stroke="#fff" strokeWidth="4" strokeLinecap="round" /><Path d="M30 36h40M30 36l-8 14h16zM70 36l-8 14h16z" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinejoin="round" /></G>);
const Designer = ({ c }: GlyphProps) => (<G><Path d="M50 24c14 0 26 10 26 24 0 10-8 14-16 14-5 0-7 3-7 6 0 4-2 8-8 8-12 0-21-12-21-26 0-16 12-26 26-26z" fill="#fff" /><Circle cx="40" cy="44" r="3.5" fill={c} /><Circle cx="52" cy="38" r="3.5" fill={c} /><Circle cx="62" cy="48" r="3.5" fill={c} /></G>);

// --- ASTRATTI (gradiente nel cerchio + glifo) ---
const ShapeRing = ({ c }: GlyphProps) => (<G><Circle cx="50" cy="50" r="24" stroke="#fff" strokeWidth="7" fill="none" /></G>);
const ShapeTri = ({ c }: GlyphProps) => (<Polygon points="50,26 74,72 26,72" fill="#fff" />);
const ShapeHex = ({ c }: GlyphProps) => (<Polygon points="50,24 73,37 73,63 50,76 27,63 27,37" fill="#fff" />);
const ShapeWave = ({ c }: GlyphProps) => (<Path d="M22 56c8-16 12-16 18 0s12 16 20 0 12-16 18 0" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" />);
const ShapeDots = ({ c }: GlyphProps) => (<G><Circle cx="38" cy="38" r="7" fill="#fff" /><Circle cx="62" cy="38" r="7" fill="#fff" /><Circle cx="38" cy="62" r="7" fill="#fff" /><Circle cx="62" cy="62" r="7" fill="#fff" /></G>);

const GLYPHS: Record<string, React.FC<GlyphProps>> = {
  // sanità
  nurse: Nurse, medico: Medico, oss: OSS, coordinatore: Coordinatore, anestesista: Anestesista, pediatra: Pediatra, emergenza: Emergenza, radiologia: Radiologia,
  // animali
  cane: Cane, gatto: Gatto, coniglio: Coniglio, panda: Panda, volpe: Volpe, gufo: Gufo,
  // professioni
  manager: Manager, tecnico: Tecnico, ingegnere: Ingegnere, docente: Docente, avvocato: Avvocato, designer: Designer,
  // astratti
  ring: ShapeRing, tri: ShapeTri, hex: ShapeHex, wave: ShapeWave, dots: ShapeDots,
};

// catalogo per la UI
export const AVATAR_CATALOG: { category: string; items: { id: AvatarId; label: string }[] }[] = [
  { category: 'Sanità', items: [
    { id: 'nurse', label: 'Infermiere' }, { id: 'medico', label: 'Medico' }, { id: 'oss', label: 'OSS' },
    { id: 'coordinatore', label: 'Coordinatore' }, { id: 'anestesista', label: 'Anestesista' }, { id: 'pediatra', label: 'Pediatra' },
    { id: 'emergenza', label: '118' }, { id: 'radiologia', label: 'Radiologia' },
  ]},
  { category: 'Animali', items: [
    { id: 'cane', label: 'Cane' }, { id: 'gatto', label: 'Gatto' }, { id: 'coniglio', label: 'Coniglio' },
    { id: 'panda', label: 'Panda' }, { id: 'volpe', label: 'Volpe' }, { id: 'gufo', label: 'Gufo' },
  ]},
  { category: 'Professioni', items: [
    { id: 'manager', label: 'Manager' }, { id: 'tecnico', label: 'Tecnico' }, { id: 'ingegnere', label: 'Ingegnere' },
    { id: 'docente', label: 'Docente' }, { id: 'avvocato', label: 'Avvocato' }, { id: 'designer', label: 'Designer' },
  ]},
  { category: 'Astratti', items: [
    { id: 'ring', label: 'Anello' }, { id: 'tri', label: 'Triangolo' }, { id: 'hex', label: 'Esagono' },
    { id: 'wave', label: 'Onda' }, { id: 'dots', label: 'Punti' },
  ]},
];

export function isVectorAvatar(id?: string): boolean { return !!id && !!GLYPHS[id]; }

// gradiente derivato dal colore base (per il cerchio)
function shade(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim()); if (!m) return hex;
  const n = parseInt(m[1], 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f);
  return `rgb(${r},${g},${b})`;
}

export default function VectorAvatar({ id, size = 64, color = '#0A84FF' }: { id: AvatarId; size?: number; color?: string }) {
  const G2 = GLYPHS[id] || ShapeRing;
  const gid = `g_${id}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shade(color, 0.18)} />
          <Stop offset="1" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${gid})`} />
      <G2 s={size} c={color} />
    </Svg>
  );
}
