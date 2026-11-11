// Scène générique d'une carte de ligne (spec #182, ticket #184) : la carte d'une Leçon dont la composition par l'agent
// a échoué deux fois. Composée en code, jamais d'appel à l'agent : même Leçon, même carte. Elle passe le filtre
// (lib/carte-svg.js) comme n'importe quel calque. Un ciel dégradé à la couleur de la Catégorie, des collines, un astre
// à gauche (haut à gauche calme, y > 40 à peu près) et un grand héros qui déborde du cadre ; le bas de la carte reste un
// sol calme pour la pastille de stations (#232).
// Module pur.

import { cleCategorieCarte } from '../public/categories-carte.js';

const entete = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280">';

// Graine stable tirée de l'identifiant de la Leçon (FNV-1a), puis suite pseudo-aléatoire déterministe (mulberry32).
function suite(texte) {
  let h = 2166136261;
  for (const c of texte) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n = (x) => Math.round(x * 10) / 10;

// { l1, l2, heros } pour la Leçon `lecon` (identifiant) de Catégorie `categorie` (inconnue ou absente : « autre »).
export function sceneGenerique({ lecon, categorie }) {
  const alea = suite(lecon);
  const ligne = `var(--ligne-${cleCategorieCarte(categorie)})`;
  const ciel = `${lecon}-ciel`;
  const halo = `${lecon}-halo`;

  const etoiles = Array.from({ length: 9 }, () => `<circle cx="${n(60 + alea() * 130)}" cy="${n(8 + alea() * 90)}" r="${n(0.6 + alea() * 1.1)}" fill="var(--sur-nuit)" opacity="${n(0.4 + alea() * 0.5)}"/>`).join('');
  const l1 = `${entete}<defs><linearGradient id="${ciel}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--nuit)"/><stop offset="1" stop-color="${ligne}"/></linearGradient>`
    + `<radialGradient id="${halo}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="var(--sur-nuit)" stop-opacity="0.45"/><stop offset="1" stop-color="var(--sur-nuit)" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="200" height="280" fill="url(#${ciel})"/>${etoiles}<circle cx="${n(150 + alea() * 30)}" cy="${n(70 + alea() * 25)}" r="34" fill="url(#${halo})"/></svg>`;

  const colline = (y, couleur, opacite) => {
    const a = n(y + alea() * 16);
    const b = n(y - 6 - alea() * 22);
    return `<path d="M0 ${a} Q${n(50 + alea() * 30)} ${b} ${n(100 + alea() * 20)} ${n(y + 4)} T200 ${n(y - alea() * 12)} L200 180 L0 180 Z" fill="${couleur}" opacity="${opacite}"/>`;
  };
  const l2 = `${entete}${colline(130, 'var(--nuit)', 0.55)}${colline(150, 'var(--encre-noire)', 0.4)}<rect y="178" width="200" height="102" fill="var(--nuit)" opacity="0.5"/></svg>`;

  // Héros : un cristal à facettes, grand (plus du tiers de la carte), dont le cristal sort du cadre par la droite ; l'orbe à son côté reste dans le cadre (un disque flottant hors de la carte se voyait à côté d'elle dans Mon réseau).
  const cx = n(125 + alea() * 25);
  const cy = n(95 + alea() * 15);
  const pointes = [[cx - 30, cy + 62], [cx - 8, cy - 70], [cx + 28, cy - 40], [cx + 70, cy + 20], [cx + 40, cy + 70]].map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
  const heros = `${entete}<polygon points="${pointes}" fill="${ligne}" stroke="var(--sur-nuit)" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<polygon points="${n(cx - 8)},${n(cy - 70)} ${n(cx + 28)},${n(cy - 40)} ${n(cx + 12)},${n(cy + 14)}" fill="var(--sur-nuit)" opacity="0.28"/>`
    + `<path d="M${n(cx - 30)} ${n(cy + 62)} L${n(cx + 12)} ${n(cy + 14)} L${n(cx + 40)} ${n(cy + 70)}" fill="none" stroke="var(--sur-nuit)" stroke-width="1" opacity="0.5"/>`
    + `<circle cx="${n(cx - 80)}" cy="${n(cy - 8)}" r="22" fill="${ligne}" opacity="0.5" class="pc-a-flotte"/></svg>`;
  return { l1, l2, heros };
}
