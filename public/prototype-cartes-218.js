// PROTOTYPE jetable (ticket #218) : trois propositions de silhouette par carte (Mémoire, Retour gagnant).
// Ne va jamais dans main : la gagnante est reprise proprement dans carte-badge-art.js. Jetons seulement.
import { artDeBadge } from './carte-badge-art.js';

const sv = (c) => `<svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">${c}</svg>`;
const gare = (cx, cy, etat, r = 7, vide = 'var(--nuit)') => etat === 'retenu' ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--retenu)" stroke="var(--sur-nuit)" stroke-width="1.5"/>`
  : `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="${vide}" stroke="var(--station-vide)" stroke-width="2" stroke-dasharray="3 2.5"/>`;
const hachures = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--nuit)" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="5 4"/>`;
const plein = (cx, cy, r, f = 'var(--retenu)') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" stroke="var(--sur-nuit)" stroke-width="3"/>`;
function etoileJ(cx, cy, R = 14) {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? R * 0.45 : R; return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
  return `<polygon points="${pts}" fill="var(--nouveau)" stroke="var(--sur-nuit)" stroke-width="3" stroke-linejoin="round"/>`;
}
const sol = (y, o = 0.35) => `<path d="M0 ${y} H200" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity="${o}"/>`;

export const VARIANTES = {
  memoire: {
    A: { nom: 'Phare : une tour, sa lampe, des halos', f: (n) => ({
      l2: sv(`<path d="M100 108 L10 -10 H190Z" fill="var(--sur-nuit)" opacity=".07"/>${sol(250)}`),
      heros: sv(`<path d="M80 250 L88 112 H112 L120 250Z" fill="var(--sur-nuit)" stroke="var(--nuit)" stroke-width="3" stroke-linejoin="round"/>${[0, 1, 2].map((i) => gare(100, 150 + i * 36, i < n - 1 ? 'retenu' : 'hachure', 8, 'var(--sur-nuit)')).join('')}${Array.from({ length: n }, (_, i) => `<circle cx="100" cy="98" r="${26 + i * 17}" fill="none" stroke="var(--retenu)" stroke-width="3" opacity="${(0.8 - i * 0.17).toFixed(2)}"/>`).join('')}${plein(100, 98, 17)}<circle cx="100" cy="98" r="6" fill="var(--sur-retenu)"/>`) }) },
    B: { nom: 'Borne : une pile de gares allumées', f: (n) => ({
      l2: sv('<path d="M100 0 V280" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".4"/>'),
      heros: sv(`<rect x="62" y="34" width="76" height="212" rx="38" fill="var(--sur-nuit)" stroke="var(--nuit)" stroke-width="3"/>${[0, 1, 2, 3].map((i) => { const y = 78 + i * 48, allume = i >= 4 - n; return `${allume ? `<circle cx="100" cy="${y}" r="21" fill="var(--retenu)" opacity=".25"/>` : ''}${gare(100, y, allume ? 'retenu' : 'hachure', 13, 'var(--sur-nuit)')}`; }).join('')}`) }) },
    C: { nom: 'Ondes : une gare, des arcs qui s\'élargissent', f: (n) => ({
      l2: sv(`${sol(262, 0.3)}<path d="M0 262 L200 62" stroke="var(--sur-nuit-doux)" stroke-width="2" stroke-dasharray="2 7" opacity=".35"/>`),
      heros: sv(`${[0, 1, 2, 3].map((i) => { const R = 40 + i * 38; return `<path d="M${36 + R} 232 A${R} ${R} 0 0 0 36 ${232 - R}" fill="none" stroke="${i < n ? 'var(--retenu)' : 'var(--station-vide)'}" stroke-width="${i < n ? 9 : 3}" stroke-linecap="round" ${i < n ? '' : 'stroke-dasharray="3 6"'}/>`; }).join('')}${plein(36, 232, 20)}<circle cx="36" cy="232" r="7" fill="var(--sur-retenu)"/>`) }) },
  },
  'retour-gagnant': {
    A: { nom: 'Boucle : le tracé revient sur lui-même', f: (n) => ({
      l2: sv(sol(250, 0.4)),
      heros: sv(`<path d="M-10 214 H48 C120 214 160 190 148 142 C136 94 70 98 76 146 C80 184 140 168 158 120 L196 66 L232 20" fill="none" stroke="var(--palier-bronze)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>${gare(40, 214, 'retenu', 9)}${gare(76, 146, n > 2 ? 'retenu' : 'hachure', 9)}${gare(158, 120, 'retenu', 9)}${n > 1 ? gare(196, 66, 'retenu', 9) : ''}${n > 3 ? etoileJ(168, 38) : ''}`) }) },
    B: { nom: 'Rebond : tomber, puis remonter plus haut', f: (n) => ({
      l2: sv(sol(246, 0.4)),
      heros: sv(`<path d="M10 40 L82 196 Q100 232 118 196 C136 150 144 100 176 56 L226 -6" fill="none" stroke="var(--palier-bronze)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>${gare(36, 94, 'retenu', 9)}${gare(100, 218, n > 2 ? 'retenu' : 'hachure', 10)}${gare(150, 110, 'retenu', 9)}${n > 1 ? gare(176, 56, 'retenu', 9) : ''}${n > 3 ? etoileJ(204, 28) : ''}`) }) },
    C: { nom: 'Disque coupé : de hachuré à plein', f: (n) => ({
      l2: sv('<path d="M30 140 H170" stroke="var(--sur-nuit-doux)" stroke-width="3" opacity=".3"/>'),
      heros: sv(`${hachures(54, 150, 34)}${plein(150, 110, 34 + (n > 2 ? 4 : 0))}<path d="M138 98 l9 9 l19 -20" fill="none" stroke="var(--sur-retenu)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 100 C70 40 120 34 134 56" fill="none" stroke="var(--nouveau)" stroke-width="7" stroke-linecap="round"/><path d="M126 38 L148 60 L118 68Z" fill="var(--nouveau)"/>${n > 1 ? '<circle cx="150" cy="110" r="52" fill="none" stroke="var(--retenu)" stroke-width="3" opacity=".6"/>' : ''}${n > 2 ? '<circle cx="150" cy="110" r="68" fill="none" stroke="var(--retenu)" stroke-width="2" stroke-dasharray="3 6" opacity=".6"/>' : ''}${n > 3 ? etoileJ(60, 214) : ''}`) }) },
  },
};

const IDS = { memoire: { id: 'memoire', emoji: '🧠' }, 'retour-gagnant': { id: 'retour-gagnant', emoji: '💪' } };
export function calques(id, variante, rang) {
  const base = artDeBadge(IDS[id] || { id, emoji: '?' }, rang);
  if (!variante || !VARIANTES[id]) return base;
  const v = VARIANTES[id][variante].f(rang);
  return { l1: base.l1, l2: v.l2, heros: v.heros };
}
