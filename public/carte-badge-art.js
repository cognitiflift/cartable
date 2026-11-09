// Le dessin des cartes de Badge (spec #182, ticket #186) : trois calques SVG (l1 fond, l2 décor, héros qui déborde), un
// par Famille et un pour les surprises, dessinés à la main, sans image ni police. `rang` (1 à 4) est le Palier : il allume
// des stations, ajoute des étoiles et des halos. Couleurs : `var(--jeton)` seulement. Sans DOM.

const sv = (c) => `<svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">${c}</svg>`;
const graine = (s) => { let h = 1779033703 ^ s.length; for (const c of s) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
const n1 = (x) => x.toFixed(1);
const gare = (cx, cy, etat, r = 7) => etat === 'retenu' ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--retenu)" stroke="var(--sur-nuit)" stroke-width="1.5"/>`
  : etat === 'atteint' ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--station-atteinte)" stroke="var(--sur-nuit-doux)" stroke-width="3"/>`
  : etat === 'hachure' ? `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="var(--nuit)" stroke="var(--station-vide)" stroke-width="2" stroke-dasharray="3 2.5"/>`
  : `<circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="var(--nuit)" stroke="var(--station-vide)" stroke-width="2"/>`;
const astres = (r, n) => Array.from({ length: n }, () => `<circle cx="${n1(r() * 200)}" cy="${n1(r() * 280)}" r="${n1(0.5 + r() * 1.1)}" fill="var(--sur-nuit)" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`).join('');
const fond = (r, n, teinte, extra = '') => `<rect width="200" height="280" fill="var(--nuit)"/><circle cx="150" cy="70" r="${60 + n * 10}" fill="${teinte}" opacity="${(0.1 + n * 0.03).toFixed(2)}"/>${astres(r, 18 + n * 12)}${extra}`;
const etoile = (cx, cy, R, fill, trait = 3) => `<polygon points="${Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? R * 0.45 : R; return `${n1(cx + Math.cos(a) * rr)},${n1(cy + Math.sin(a) * rr)}`; }).join(' ')}" fill="${fill}" stroke="var(--sur-nuit)" stroke-width="${trait}" stroke-linejoin="round"/>`;
const CATEGORIES = ['francais', 'mathematiques', 'sciences', 'histoire', 'geographie', 'langues'];
// Un tampon : un rectangle et une coche, sans texte (la carte dit les mots en HTML).
const tampon = (x, y, w, fill, coche) => `<g transform="rotate(-5 ${x + w / 2} ${y + 20})"><rect x="${x}" y="${y}" width="${w}" height="40" rx="8" fill="${fill}" stroke="var(--sur-nuit)" stroke-width="3"/><path d="M${x + w / 2 - 14} ${y + 21} l9 9 l19 -20" fill="none" stroke="${coche}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const FAMILLES = {
  memoire: (r, n) => ({ l1: sv(fond(r, n, 'var(--retenu)')),
    l2: sv(`<g fill="none" stroke="var(--sur-nuit-doux)" stroke-width="5" opacity=".35" stroke-linecap="round"><path d="M20 170 H70 L95 195 H180"/><path d="M40 120 L70 150 H150 L175 125"/><path d="M60 230 H120 L140 210"/></g>${gare(70, 170, 'retenu', 6)}${gare(150, 150, n > 2 ? 'retenu' : 'hachure', 6)}${gare(120, 230, 'atteint', 6)}${gare(175, 125, n > 1 ? 'retenu' : 'hachure', 6)}`),
    heros: sv(`<path d="M-10 190 H60 L100 150 H150 L190 110 L230 60" fill="none" stroke="var(--retenu)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>${[[30, 190], [100, 150], [150, 150], [190, 110]].map(([x, y], i) => gare(x, y, i < n ? 'retenu' : 'hachure', 9)).join('')}<circle cx="190" cy="110" r="18" fill="none" stroke="var(--retenu)" stroke-width="3" opacity=".6"/><circle cx="230" cy="60" r="9" fill="var(--nouveau)"/>`) }),
  regulier: (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-diamant)', '<circle cx="100" cy="130" r="95" fill="none" stroke="var(--palier-diamant)" stroke-dasharray="2 5" opacity=".6"/>')),
    l2: sv(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2, x = n1(100 + Math.cos(a) * 66), y = n1(130 + Math.sin(a) * 66); return i < 3 + n * 2 ? `<circle cx="${x}" cy="${y}" r="9" fill="var(--sur-nuit)" opacity=".85"/>` : `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="var(--station-vide)" stroke-dasharray="3 3" stroke-width="2"/>`; }).join('')),
    heros: sv(`<circle cx="100" cy="130" r="38" fill="var(--nouveau)" stroke="var(--sur-nuit)" stroke-width="3"/><path d="M82 130 l13 13 l25 -28" fill="none" stroke="var(--sur-nouveau)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>${tampon(56, 196, 104, 'var(--sur-nuit)', 'var(--nuit)')}`) }),
  revisions: (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-argent)')),
    l2: sv('<circle cx="100" cy="125" r="78" fill="none" stroke="var(--sur-nuit-doux)" stroke-dasharray="2 6" opacity=".5"/><circle cx="100" cy="125" r="58" fill="none" stroke="var(--palier-diamant)" stroke-width="6" opacity=".35"/>'),
    heros: sv(`<g fill="none" stroke="var(--nouveau)" stroke-width="11" stroke-linecap="round"><path d="M52 112 A52 52 0 0 1 140 82"/><path d="M148 138 A52 52 0 0 1 60 168"/></g><path d="M130 62 L152 90 L118 94Z" fill="var(--nouveau)"/><path d="M70 188 L48 160 L82 156Z" fill="var(--nouveau)"/>${gare(100, 125, 'retenu', 14)}${n > 2 ? '<circle cx="100" cy="125" r="26" fill="none" stroke="var(--retenu)" stroke-width="3" opacity=".6"/>' : ''}${n > 3 ? '<circle cx="100" cy="125" r="96" fill="none" stroke="var(--nouveau)" stroke-width="2" stroke-dasharray="3 7" opacity=".7"/>' : ''}`) }),
  'retour-gagnant': (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-bronze)')),
    l2: sv(`<path d="M0 235 H200" stroke="var(--sur-nuit-doux)" stroke-dasharray="2 7" opacity=".4" stroke-width="2"/>${gare(40, 235, 'hachure', 6)}`),
    heros: sv(`<path d="M-10 120 H40 L78 170 H108 L146 110 H170 L230 30" fill="none" stroke="var(--palier-bronze)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>${gare(40, 120, 'retenu', 9)}${gare(93, 170, 'hachure', 9)}${gare(146, 110, 'retenu', 9)}${n > 1 ? gare(190, 70, 'retenu', 9) : ''}${n > 2 ? gare(93, 170, 'retenu', 9) : ''}<path d="M93 196 V232" stroke="var(--nouveau)" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>`) }),
  curieux: (r, n) => ({ l1: sv(fond(r, n, 'var(--nouveau)')),
    l2: sv('<circle cx="40" cy="210" r="26" fill="var(--palier-bronze)" opacity=".7"/><circle cx="46" cy="204" r="26" fill="var(--nuit)" opacity=".35"/><ellipse cx="40" cy="210" rx="44" ry="8" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="2" opacity=".6" transform="rotate(-18 40 210)"/>'),
    heros: sv(`<path d="M30 250 C60 200 90 190 120 140 S170 40 215 -20" fill="none" stroke="var(--nouveau)" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/><g transform="translate(135 110) rotate(35)"><path d="M0 -42 C14 -26 14 6 8 24 H-8 C-14 6 -14 -26 0 -42Z" fill="var(--sur-nuit)"/><circle cy="-12" r="7" fill="var(--palier-diamant)"/><path d="M-8 14 L-22 32 L-8 28Z M8 14 L22 32 L8 28Z" fill="var(--palier-bronze)"/><path d="M-6 26 Q0 ${40 + n * 8} 6 26Z" fill="var(--nouveau)"/></g>`) }),
  etoiles: (r, n) => ({ l1: sv(fond(r, n, 'var(--nouveau)')),
    l2: sv(Array.from({ length: n * 3 }, () => etoile(10 + r() * 180, 20 + r() * 240, 5 + r() * 7, 'var(--sur-nuit)', 0).replace('<polygon', '<polygon opacity=".55"')).join('')),
    heros: sv(`${etoile(100, 125, 62, 'var(--nouveau)')}<circle cx="100" cy="125" r="${72 + n * 4}" fill="none" stroke="var(--nouveau)" stroke-width="2" stroke-dasharray="3 7" opacity=".7"/>${n > 2 ? etoile(160, 52, 18, 'var(--nouveau)') : ''}${n > 3 ? etoile(36, 196, 14, 'var(--nouveau)') : ''}`) }),
  'jusquau-bout': (r, n) => ({ l1: sv(fond(r, n, 'var(--retenu)')),
    l2: sv(`<path d="M20 120 H80 L110 150 H180" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="5" opacity=".35" stroke-linecap="round"/>${gare(80, 120, 'retenu', 6)}${gare(180, 150, 'retenu', 6)}`),
    heros: sv(`<path d="M-10 190 H50 L84 156 H150" fill="none" stroke="var(--retenu)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>${gare(40, 190, 'retenu', 9)}${gare(110, 156, 'retenu', 9)}${tampon(62, 78, 140, 'var(--retenu)', 'var(--sur-retenu)')}${n > 2 ? etoile(176, 40, 16, 'var(--nouveau)') : ''}`) }),
  explorateur: (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-diamant)', '<circle cx="100" cy="125" r="80" fill="none" stroke="var(--sur-nuit-doux)" opacity=".4"/><circle cx="100" cy="125" r="55" fill="none" stroke="var(--sur-nuit-doux)" stroke-dasharray="2 4" opacity=".4"/>')),
    l2: sv(CATEGORIES.map((c, i) => { const a = i / 6 * Math.PI * 2 - Math.PI / 2; return `<path d="M100 125 L${n1(100 + Math.cos(a) * 82)} ${n1(125 + Math.sin(a) * 82)}" stroke="var(--ligne-${c})" stroke-width="7" stroke-linecap="round" opacity="${i < n + 1 ? 0.95 : 0.3}"/>`; }).join('')),
    heros: sv(`<circle cx="100" cy="125" r="30" fill="var(--sur-nuit)" stroke="var(--nouveau)" stroke-width="4"/><path d="M100 100 L110 125 L100 150 L90 125Z" fill="var(--palier-bronze)"/><circle cx="100" cy="125" r="4" fill="var(--nuit)"/>${CATEGORIES.map((c, i) => { const a = i / 6 * Math.PI * 2 - Math.PI / 2; return gare(+n1(100 + Math.cos(a) * 82), +n1(125 + Math.sin(a) * 82), i < n + 1 ? 'atteint' : 'vide', 8); }).join('')}`) }),
};

// Une surprise : violette, unique ; son emoji est le héros.
const surprise = (b, r) => ({ l1: sv(fond(r, 3, 'var(--palier-unique)')),
  l2: sv('<g fill="none" stroke="var(--palier-unique)" stroke-width="2" opacity=".8"><circle cx="100" cy="125" r="60"/><circle cx="100" cy="125" r="82" stroke-dasharray="3 6"/></g>'),
  heros: sv(`<path d="M-15 236 Q40 196 90 236 T215 214" fill="none" stroke="var(--palier-unique)" stroke-width="8" stroke-linecap="round"/><text x="100" y="152" text-anchor="middle" font-size="84">${b.emoji}</text>`) });

export const IDS_FAMILLES = Object.keys(FAMILLES);

// Les calques d'une carte de Badge : { l1, l2, heros } (chaînes SVG). `rang` : de 1 à 4.
export function artDeBadge(b, rang) {
  const r = graine(b.id + rang);
  return b.surprise || !FAMILLES[b.id] ? surprise(b, r) : FAMILLES[b.id](r, rang);
}
