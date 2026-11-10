// L'esquisse de l'attente d'une carte de ligne (ticket #197, décision du prototype #198), sans DOM : un SVG 200 × 280
// qui se dessine au trait (CSS, `.att-in`, public/style.css), mêmes zones que la carte composée. Jetons uniquement.
// Aucun héros (la carte finale a un héros propre à la Leçon, il n'apparaît qu'avec elle) et trois jalons pleins, qui ne
// se lisent pas comme un décompte (la vraie carte a autant de stations que d'Objectifs). Un motif d'atelier par Catégorie.
// Chaque tracé porte pathLength=1 : il se dessine au trait.

import { cleCategorieCarte } from './categories-carte.js';

const trait = (d, classe = '', i = 0) => `<path class="trait ${classe}" pathLength="1" d="${d}" style="--i:${i}"/>`;
const point = (x, y, r, i) => `<circle class="point" cx="${x}" cy="${y}" r="${r}" style="--i:${i}"/>`;

const MOTIFS = {
  // Français : la plume écrit trois lignes d'écriture ondulée
  francais: () => trait('M16 214 q9 -13 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0', '', 0)
    + trait('M16 232 q9 -13 18 0 t18 0 t18 0 t18 0 t18 0', '', 1)
    + trait('M16 250 q9 -13 18 0 t18 0 t18 0', '', 2)
    + trait('M168 196 l-22 34 m22 -34 l6 10 l-8 2', 'couleur', 3)
    + point(146, 232, 2.6, 0),
  // Mathématiques : une grille, une équerre, un arc de compas
  mathematiques: () => trait('M30 40 H170 M30 70 H170 M30 100 H170 M50 24 V124 M100 24 V124 M150 24 V124', '', 0)
    + trait('M54 250 L100 204 L146 250 Z', 'couleur', 1)
    + trait('M70 232 a30 30 0 0 1 60 0', '', 2)
    + point(100, 204, 3, 0) + point(54, 250, 3, 1) + point(146, 250, 3, 2),
  // Sciences : des orbites autour d'un noyau, remontées au-dessus de la ligne
  sciences: () => '<g transform="translate(100 58) scale(.6) translate(-100 -110)"><g class="orbite">'
    + trait('M30 110 a70 26 0 1 0 140 0 a70 26 0 1 0 -140 0', '', 0)
    + trait('M42 74 a70 26 60 1 0 116 72 a70 26 60 1 0 -116 -72', '', 1)
    + point(170, 110, 4, 0) + point(42, 74, 3.4, 1) + '</g></g>',
  // Autres Catégories : une constellation reliée point à point
  autre: () => trait('M20 40 L56 66 L90 36 L130 70 L172 44', '', 0) + trait('M56 66 L70 112 L130 70', '', 1)
    + point(56, 66, 3, 0) + point(130, 70, 3, 1) + point(70, 112, 3, 2),
};

// Les Catégories sans motif propre prennent la constellation.
export const motifDe = (categorie) => (MOTIFS[cleCategorieCarte(categorie)] ?? MOTIFS.autre)();

const ETOILES = [[60, 30], [126, 24], [150, 60], [40, 70]];

// Le dessin et son reflet, prêts à poser dans `.att-in`. `--ligne` vient de la carte qui le porte.
export function esquisseCarte(categorie) {
  const etoiles = ETOILES.map(([x, y], i) => `<circle class="point etoile" cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.5}" style="--i:${i}"/>`).join('');
  const jalons = [34, 100, 168].map((x, i) => `<circle class="jalon" cx="${x}" cy="162" r="5" style="--i:${i}"/>`).join('');
  return `<svg viewBox="0 0 200 280" aria-hidden="true" focusable="false"><defs><radialGradient id="att-halo"><stop offset="0" stop-color="var(--ligne)" stop-opacity=".6"/><stop offset="1" stop-color="var(--ligne)" stop-opacity="0"/></radialGradient></defs>`
    + '<circle class="halo" cx="100" cy="105" r="64" fill="url(#att-halo)"/>'
    + trait('M20 8 H180 a12 12 0 0 1 12 12 V260 a12 12 0 0 1 -12 12 H20 a12 12 0 0 1 -12 -12 V20 a12 12 0 0 1 12 -12 Z', 'cadre couleur')
    + etoiles
    + trait('M8 150 Q48 112 96 138 T192 128', 'colline', 0) + trait('M8 172 Q60 140 110 164 T192 158', 'colline', 1)
    + '<path class="remplit colline-f" d="M8 150 Q48 112 96 138 T192 128 V272 H8 Z"/>'
    + trait('M8 162 H192', 'rail couleur') + jalons
    + `<g class="motif">${motifDe(categorie)}</g></svg><div class="att-reflet" aria-hidden="true"></div>`;
}
