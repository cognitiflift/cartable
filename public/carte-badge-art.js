// Le dessin des cartes de Badge (spec #182, ticket #186) : trois calques SVG (l1 fond, l2 décor, héros qui déborde), un
// par Famille et un pour les surprises, dessinés à la main, sans image ni police. `rang` (1 à 4) est le Palier : il allume
// des stations, ajoute des étoiles et des halos. Couleurs : `var(--jeton)` seulement. Sans DOM.

import { CATEGORIES_CARTE } from './categories-carte.js';

const sv = (c) => `<svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">${c}</svg>`;
const graine = (s) => { let h = 1779033703 ^ s.length; for (const c of s) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
const n1 = (x) => x.toFixed(1);
const gare = (cx, cy, etat, r = 7, vide = 'var(--nuit)') => etat === 'retenu' ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--retenu)" stroke="var(--sur-nuit)" stroke-width="1.5"/>`
  : etat === 'atteint' ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--station-atteinte)" stroke="var(--sur-nuit-doux)" stroke-width="3"/>`
  : etat === 'hachure' ? `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="${vide}" stroke="var(--station-vide)" stroke-width="2" stroke-dasharray="3 2.5"/>`
  : `<circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="var(--nuit)" stroke="var(--station-vide)" stroke-width="2"/>`;
const astres = (r, n) => Array.from({ length: n }, () => `<circle cx="${n1(r() * 200)}" cy="${n1(r() * 280)}" r="${n1(0.5 + r() * 1.1)}" fill="var(--sur-nuit)" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`).join('');
const fond = (r, n, teinte, extra = '') => `<rect width="200" height="280" fill="var(--nuit)"/><circle cx="150" cy="70" r="${60 + n * 10}" fill="${teinte}" opacity="${(0.1 + n * 0.03).toFixed(2)}"/>${astres(r, 18 + n * 12)}${extra}`;
const etoile = (cx, cy, R, fill, trait = 3) => `<polygon points="${Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? R * 0.45 : R; return `${n1(cx + Math.cos(a) * rr)},${n1(cy + Math.sin(a) * rr)}`; }).join(' ')}" fill="${fill}" stroke="var(--sur-nuit)" stroke-width="${trait}" stroke-linejoin="round"/>`;
const CATEGORIES = CATEGORIES_CARTE.slice(0, 6); // l'Explorateur compte six Catégories : les Arts n'y sont pas
// Un tampon : un rectangle et une coche, sans texte (la carte dit les mots en HTML).
const tampon = (x, y, w, fill, coche) => `<g transform="rotate(-5 ${x + w / 2} ${y + 20})"><rect x="${x}" y="${y}" width="${w}" height="40" rx="8" fill="${fill}" stroke="var(--sur-nuit)" stroke-width="3"/><path d="M${x + w / 2 - 14} ${y + 21} l9 9 l19 -20" fill="none" stroke="${coche}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const FAMILLES = {
  // Mémoire : un phare, ce qui reste et tient. La lampe reste allumée ; un halo de plus et une fenêtre allumée par Palier.
  memoire: (r, n) => ({ l1: sv(fond(r, n, 'var(--retenu)')),
    l2: sv('<path d="M100 98 L0 -10 H200Z" fill="var(--sur-nuit)" opacity=".16"/><path d="M0 250 H200" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".35"/>'),
    heros: sv(`<path d="M80 250 L88 112 H112 L120 250Z" fill="var(--sur-nuit)" stroke="var(--nuit)" stroke-width="3" stroke-linejoin="round"/>${[0, 1, 2].map((i) => gare(100, 150 + i * 36, i < n - 1 ? 'retenu' : 'hachure', 8, 'var(--sur-nuit)')).join('')}${Array.from({ length: n }, (_, i) => `<circle cx="100" cy="98" r="${26 + i * 17}" fill="none" stroke="var(--retenu)" stroke-width="3" opacity="${(0.8 - i * 0.17).toFixed(2)}"/>`).join('')}<rect x="72" y="108" width="56" height="9" rx="3" fill="var(--sur-nuit)" stroke="var(--nuit)" stroke-width="3"/><circle cx="100" cy="98" r="17" fill="var(--retenu)" stroke="var(--sur-nuit)" stroke-width="3"/><circle cx="100" cy="98" r="6" fill="var(--sur-retenu)"/>`) }),
  regulier: (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-diamant)', '<circle cx="100" cy="130" r="95" fill="none" stroke="var(--palier-diamant)" stroke-dasharray="2 5" opacity=".6"/>')),
    l2: sv(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2, x = n1(100 + Math.cos(a) * 66), y = n1(130 + Math.sin(a) * 66); return i < 3 + n * 2 ? `<circle cx="${x}" cy="${y}" r="9" fill="var(--sur-nuit)" opacity=".85"/>` : `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="var(--station-vide)" stroke-dasharray="3 3" stroke-width="2"/>`; }).join('')),
    heros: sv(`<circle cx="100" cy="130" r="38" fill="var(--nouveau)" stroke="var(--sur-nuit)" stroke-width="3"/><path d="M82 130 l13 13 l25 -28" fill="none" stroke="var(--sur-nouveau)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>${tampon(56, 196, 104, 'var(--sur-nuit)', 'var(--nuit)')}`) }),
  revisions: (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-argent)')),
    l2: sv('<circle cx="100" cy="125" r="78" fill="none" stroke="var(--sur-nuit-doux)" stroke-dasharray="2 6" opacity=".5"/><circle cx="100" cy="125" r="58" fill="none" stroke="var(--palier-diamant)" stroke-width="6" opacity=".35"/>'),
    heros: sv(`<g fill="none" stroke="var(--nouveau)" stroke-width="11" stroke-linecap="round"><path d="M52 112 A52 52 0 0 1 140 82"/><path d="M148 138 A52 52 0 0 1 60 168"/></g><path d="M130 62 L152 90 L118 94Z" fill="var(--nouveau)"/><path d="M70 188 L48 160 L82 156Z" fill="var(--nouveau)"/>${gare(100, 125, 'retenu', 14)}${n > 2 ? '<circle cx="100" cy="125" r="26" fill="none" stroke="var(--retenu)" stroke-width="3" opacity=".6"/>' : ''}${n > 3 ? '<circle cx="100" cy="125" r="96" fill="none" stroke="var(--nouveau)" stroke-width="2" stroke-dasharray="3 7" opacity=".7"/>' : ''}`) }),
  // Retour gagnant : une boucle, l'erreur reprise puis réussie. La gare de la boucle est hachurée jusqu'au Palier 3.
  'retour-gagnant': (r, n) => ({ l1: sv(fond(r, n, 'var(--palier-bronze)')),
    l2: sv('<path d="M0 250 H200" stroke="var(--sur-nuit-doux)" stroke-dasharray="2 7" opacity=".4" stroke-width="2"/>'),
    heros: sv(`${[[14, 'var(--sur-nuit-doux)'], [10, 'var(--palier-bronze)']].map(([w, c]) => `<path d="M-10 214 H48 C120 214 160 190 148 142 C136 94 70 98 76 146 C80 184 140 168 158 120 L182 88 L232 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}${n > 2 ? '<circle cx="76" cy="146" r="22" fill="none" stroke="var(--retenu)" stroke-width="3" opacity=".7"/>' : ''}${gare(40, 214, 'retenu', 9)}${gare(76, 146, n > 2 ? 'retenu' : 'hachure', 13)}${gare(158, 120, 'retenu', 9)}${n > 1 ? gare(182, 88, 'retenu', 9) : ''}${n > 3 ? etoile(168, 38, 14, 'var(--nouveau)') : ''}`) }),
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

// Un dessin par surprise (ticket #219) : le cadre violet « unique » est commun, le héros et le décor sont propres à
// chaque badge. `ARTS_SURPRISES[id](r)` rend les trois calques ; un identifiant inconnu retombe sur `surprise`.
const TRAIT = 'stroke="var(--sur-nuit)" stroke-width="3" stroke-linejoin="round"'; // le trait des héros
const carte = (r, l2, heros) => ({ l1: sv(fond(r, 3, 'var(--palier-unique)')), l2: sv(l2), heros: sv(heros) });
const polaire = (cx, cy, rayon, degres) => [cx + Math.cos(degres * Math.PI / 180) * rayon, cy + Math.sin(degres * Math.PI / 180) * rayon];
const pointille = (y) => `<path d="M20 ${y} H180" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".4"/>`;
const cercle = (r, attrs) => `<circle cx="100" cy="135" r="${r}" fill="none" stroke="var(--palier-unique)" stroke-width="2" ${attrs}/>`;

export const ARTS_SURPRISES = {
  // 👋 Content de te revoir : une porte entrouverte, la lumière sur le seuil.
  'content-de-te-revoir': (r) => carte(r,
    '<polygon points="64,224 136,224 190,262 10,262" fill="var(--palier-or)" opacity=".28"/>',
    `<rect x="54" y="62" width="92" height="166" rx="6" fill="var(--sur-nuit-doux)" ${TRAIT}/><rect x="62" y="70" width="76" height="154" fill="var(--nouveau)"/><polygon points="62,70 106,86 106,214 62,224" fill="var(--palier-unique)" ${TRAIT}/><circle cx="96" cy="150" r="5" fill="var(--nouveau)" ${TRAIT}/><rect x="74" y="236" width="52" height="12" rx="4" fill="var(--palier-bronze)" ${TRAIT}/>`),
  // 🗺️ Mission élargie : une carte dépliée en trois volets, son itinéraire et la croix du but.
  'mission-elargie': (r) => carte(r,
    `${cercle(70, 'opacity=".8"')}${cercle(92, 'stroke-dasharray="3 6" opacity=".8"')}${pointille(238)}`,
    `<polygon points="30,112 80,100 80,200 30,212" fill="var(--sur-nuit)" ${TRAIT}/><polygon points="80,100 130,114 130,214 80,200" fill="var(--sur-nuit-doux)" ${TRAIT}/><polygon points="130,114 176,100 176,200 130,214" fill="var(--sur-nuit)" ${TRAIT}/><path d="M44 190 C70 150 100 196 122 154 S150 140 158 124" fill="none" stroke="var(--palier-unique)" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M150 116 l16 16 M166 116 l-16 16" stroke="var(--palier-bronze)" stroke-width="6" stroke-linecap="round"/>${gare(44, 190, 'atteint', 7)}`),
  // 🎯 Prêt pour le contrôle : une copie annotée, un crayon posé en travers, une grande coche.
  'pret-pour-le-controle': (r) => carte(r,
    cercle(92, 'stroke-dasharray="3 6" opacity=".8"'),
    `<g transform="rotate(-6 100 140)"><rect x="44" y="68" width="100" height="142" rx="6" fill="var(--sur-nuit)" ${TRAIT}/>${[96, 112, 128, 144].map((y, i) => `<path d="M60 ${y} H${128 - i * 12}" stroke="var(--nuit)" stroke-width="4" stroke-linecap="round" opacity=".45"/>`).join('')}<path d="M54 68 V210" stroke="var(--palier-bronze)" stroke-width="2.5"/><path d="M78 178 l16 16 l38 -44" fill="none" stroke="var(--retenu)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></g><g transform="rotate(28 156 120)"><rect x="150" y="62" width="14" height="86" rx="3" fill="var(--palier-or)" ${TRAIT}/><rect x="150" y="54" width="14" height="14" rx="3" fill="var(--nouveau)" ${TRAIT}/><polygon points="150,148 164,148 157,168" fill="var(--sur-nuit)" ${TRAIT}/></g>`),
  // 🔥 Sept d'un coup : sept flammes de plus en plus hautes sur une même ligne.
  'sept-d-un-coup': (r) => carte(r, pointille(240),
    `${Array.from({ length: 7 }, (_, i) => { const cx = 34 + i * 22, h = 38 + i * 10, b = 214; return `<path d="M${cx} ${b - h} C${cx + 11} ${b - h * 0.55} ${cx + 12} ${b - h * 0.3} ${cx + 10} ${b - 10} A10 10 0 0 1 ${cx - 10} ${b - 10} C${cx - 12} ${b - h * 0.35} ${cx - 4} ${b - h * 0.55} ${cx} ${b - h}Z" fill="${i === 6 ? 'var(--nouveau)' : 'var(--palier-bronze)'}" ${TRAIT}/>`; }).join('')}<rect x="20" y="214" width="160" height="10" rx="5" fill="var(--sur-nuit)" ${TRAIT}/>${etoile(166, 100, 11, 'var(--nouveau)', 2)}`),
  // 🗓️ Mois complet : les phases de la lune, du nouveau croissant à la pleine lune.
  'mois-complet': (r) => carte(r,
    '<path d="M-6 150 A106 106 0 0 1 206 150" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="2" stroke-dasharray="2 7" opacity=".5"/>',
    `${[[32, 196, 'vide'], [58, 140, 'croissant'], [100, 112, 'moitie'], [142, 140, 'gibbeuse'], [156, 196, 'pleine']].map(([cx, cy, phase], i) => { const R = i === 2 ? 22 : 18; const bord = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="2" opacity=".55"/>`; const forme = { vide: '', croissant: `<path d="M${cx} ${cy - R} A${R} ${R} 0 0 1 ${cx} ${cy + R} A${R * 0.5} ${R} 0 0 0 ${cx} ${cy - R}Z" fill="var(--sur-nuit)" ${TRAIT}/>`, moitie: `<path d="M${cx} ${cy - R} A${R} ${R} 0 0 1 ${cx} ${cy + R}Z" fill="var(--sur-nuit)" ${TRAIT}/>`, gibbeuse: `<path d="M${cx} ${cy - R} A${R} ${R} 0 0 1 ${cx} ${cy + R} A${R * 0.5} ${R} 0 0 1 ${cx} ${cy - R}Z" fill="var(--sur-nuit)" ${TRAIT}/>`, pleine: `<circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="var(--palier-or)" ${TRAIT}/><circle cx="${cx - 6}" cy="${cy - 5}" r="4" fill="var(--nouveau)"/><circle cx="${cx + 7}" cy="${cy + 6}" r="3" fill="var(--nouveau)"/>` }[phase]; return bord + forme; }).join('')}<circle cx="156" cy="196" r="38" fill="none" stroke="var(--nouveau)" stroke-width="2" stroke-dasharray="3 7" opacity=".7"/>`),
  // 📆 Semaine pleine : un semainier, sept lignes cochées, dimanche en étoile.
  'semaine-pleine': (r) => carte(r,
    '<rect x="30" y="52" width="140" height="196" rx="22" fill="none" stroke="var(--palier-unique)" stroke-width="2" stroke-dasharray="3 6" opacity=".6"/>',
    `<rect x="48" y="68" width="104" height="168" rx="14" fill="var(--sur-nuit)" ${TRAIT}/>${Array.from({ length: 7 }, (_, i) => `<rect x="56" y="${76 + i * 22.5}" width="88" height="18" rx="7" fill="${i === 6 ? 'var(--nouveau)' : 'var(--nuit)'}"/>${gare(70, 85 + i * 22.5, i === 6 ? 'atteint' : 'retenu', 6)}`).join('')}${etoile(124, 85 + 6 * 22.5, 8, 'var(--sur-nuit)', 2)}`),
  // 🩹 Reparti ! : un pansement posé sur la fissure d'une ligne.
  reparti: (r) => carte(r,
    `${cercle(56, 'stroke-dasharray="2 6" opacity=".8"')}<path d="M10 196 L58 170 L86 184 L118 150 L148 164 L190 132" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>`,
    `<g transform="rotate(-35 100 140)"><rect x="32" y="114" width="136" height="52" rx="26" fill="var(--palier-bronze)" ${TRAIT}/><rect x="78" y="114" width="44" height="52" fill="var(--sur-nuit)" ${TRAIT}/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${48 + (i % 3) * 12}" cy="${128 + Math.floor(i / 3) * 24}" r="2.4" fill="var(--nuit)"/><circle cx="${128 + (i % 3) * 12}" cy="${128 + Math.floor(i / 3) * 24}" r="2.4" fill="var(--nuit)"/>`).join('')}<path d="M88 140 h24 M100 128 v24" stroke="var(--palier-bronze)" stroke-width="4" stroke-linecap="round"/></g>`),
  // 💯 Centenaire : une rosette, un médaillon à graduations, deux rubans.
  centenaire: (r) => carte(r,
    Array.from({ length: 12 }, (_, i) => { const [x1, y1] = polaire(100, 128, 66, i * 30), [x2, y2] = polaire(100, 128, 96, i * 30); return `<path d="M${n1(x1)} ${n1(y1)} L${n1(x2)} ${n1(y2)}" stroke="var(--palier-unique)" stroke-width="2" opacity=".5"/>`; }).join(''),
    `<polygon points="72,170 102,170 96,246 78,228 56,240" fill="var(--palier-diamant)" ${TRAIT}/><polygon points="98,170 128,170 144,240 122,228 104,246" fill="var(--palier-bronze)" ${TRAIT}/>${Array.from({ length: 16 }, (_, i) => { const [x, y] = polaire(100, 128, 54, i * 22.5); return `<circle cx="${n1(x)}" cy="${n1(y)}" r="10" fill="var(--palier-or)" ${TRAIT}/>`; }).join('')}<circle cx="100" cy="128" r="54" fill="var(--palier-or)" ${TRAIT}/><circle cx="100" cy="128" r="40" fill="var(--sur-nuit)" ${TRAIT}/>${Array.from({ length: 20 }, (_, i) => { const [x1, y1] = polaire(100, 128, 30, i * 18), [x2, y2] = polaire(100, 128, 36, i * 18); return `<path d="M${n1(x1)} ${n1(y1)} L${n1(x2)} ${n1(y2)}" stroke="var(--nuit)" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}${etoile(100, 128, 21, 'var(--nouveau)', 2.5)}`),
  // 🎒 Rentrée : un cartable, son rabat, sa poche et un crayon qui dépasse.
  rentree: (r) => carte(r,
    `<g stroke="var(--sur-nuit-doux)" stroke-width="2" opacity=".18">${[60, 90, 120, 150, 180, 210, 240].map((y) => `<path d="M0 ${y} H200"/>`).join('')}</g>`,
    `<path d="M82 104 V88 Q100 70 118 88 V104" fill="none" stroke="var(--sur-nuit)" stroke-width="7" stroke-linecap="round"/><rect x="56" y="100" width="88" height="116" rx="26" fill="var(--palier-bronze)" ${TRAIT}/><path d="M56 128 Q100 168 144 128 V126 A26 26 0 0 0 118 100 H82 A26 26 0 0 0 56 126Z" fill="var(--palier-or)" ${TRAIT}/><circle cx="100" cy="150" r="7" fill="var(--sur-nuit)" ${TRAIT}/><rect x="70" y="168" width="60" height="38" rx="10" fill="var(--nouveau)" ${TRAIT}/><path d="M80 187 h40" stroke="var(--sur-nuit)" stroke-width="4" stroke-linecap="round"/>`),
  // Groupe « Curiosité et exploration » (#221).
  // 🔀 Correspondance : deux voies de Catégories différentes qui se croisent, une gare à chaque bout.
  correspondance: (r) => carte(r,
    `${cercle(70, 'stroke-dasharray="3 6" opacity=".8"')}${pointille(244)}`,
    `<path d="M26 82 C80 82 120 188 174 188" fill="none" stroke="var(--ligne-francais)" stroke-width="22" stroke-linecap="round"/><path d="M26 188 C80 188 120 82 174 82" fill="none" stroke="var(--ligne-sciences)" stroke-width="22" stroke-linecap="round"/><path d="M26 82 C80 82 120 188 174 188 M26 188 C80 188 120 82 174 82" fill="none" stroke="var(--sur-nuit)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/><polygon points="164,160 196,188 160,210" fill="var(--ligne-francais)" ${TRAIT}/><polygon points="164,110 196,82 160,60" fill="var(--ligne-sciences)" ${TRAIT}/>${gare(26, 82, 'atteint', 11)}${gare(26, 188, 'atteint', 11)}`),
  // 🚀 Trois d'un coup : trois fusées en formation, la plus grande devant, hautes sur la carte.
  'trois-d-un-coup': (r) => {
    const fusee = (x, y, k, couleur) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 -62 C20 -40 22 -4 14 34 H-14 C-22 -4 -20 -40 0 -62Z" fill="var(--sur-nuit)" ${TRAIT}/><circle cx="0" cy="-16" r="9" fill="${couleur}" ${TRAIT}/><path d="M-14 12 L-34 40 L-14 34Z M14 12 L34 40 L14 34Z" fill="${couleur}" ${TRAIT}/><path d="M-8 42 Q0 78 8 42Z" fill="var(--palier-or)"/></g>`;
    return carte(r,
      `<path d="M100 250 L20 40 M100 250 L180 40" stroke="var(--sur-nuit-doux)" stroke-width="2" stroke-dasharray="2 8" opacity=".5"/>${cercle(88, 'stroke-dasharray="3 6" opacity=".6"')}`,
      `${fusee(46, 130, 0.8, 'var(--palier-bronze)')}${fusee(154, 130, 0.8, 'var(--palier-diamant)')}${fusee(100, 150, 1.2, 'var(--nouveau)')}`);
  },
  // 🌍 Curieux de tout : un globe cerclé d'une orbite, trois repères de Catégories différentes.
  'curieux-de-tout': (r) => carte(r,
    `<ellipse cx="100" cy="135" rx="96" ry="30" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="2" opacity=".5" transform="rotate(-18 100 135)"/>`,
    `<circle cx="100" cy="135" r="62" fill="var(--sur-nuit)" ${TRAIT}/><path d="M64 112 C76 92 96 96 98 112 C100 128 80 130 82 150 C72 150 62 134 64 112Z M112 150 C130 138 144 150 138 170 C128 186 114 176 112 150Z" fill="var(--ligne-geographie)"/><path d="M100 73 C70 110 70 160 100 197 M100 73 C130 110 130 160 100 197 M40 135 H160" fill="none" stroke="var(--nuit)" stroke-width="2" opacity=".6"/>${[[58, 100, 'var(--ligne-histoire)'], [150, 104, 'var(--ligne-mathematiques)'], [112, 190, 'var(--ligne-arts)']].map(([x, y, c]) => `<path d="M${x} ${y} l-9 -24 a11 11 0 1 1 18 0Z" fill="${c}" ${TRAIT}/><circle cx="${x}" cy="${y - 28}" r="4" fill="var(--sur-nuit)"/>`).join('')}`),
  // 🔟 Série pleine : dix quilles-gares rangées en triangle (4, 3, 2, 1), toutes allumées.
  'serie-pleine': (r) => carte(r,
    `<polygon points="100,44 188,230 12,230" fill="none" stroke="var(--palier-unique)" stroke-width="2" stroke-dasharray="3 6" opacity=".7"/>${pointille(250)}`,
    `<polygon points="100,62 176,214 24,214" fill="var(--palier-unique)" ${TRAIT}/>${[4, 3, 2, 1].flatMap((n, rang) => Array.from({ length: n }, (_, i) => gare(100 + (i - (n - 1) / 2) * 34, 196 - rang * 38, 'retenu', 12))).join('')}${etoile(100, 44, 20, 'var(--nouveau)')}`),
  // 📸 Cliché ! : un appareil photo, son objectif et la photo qui en sort, en paysage.
  cliche: (r) => carte(r,
    `<polygon points="100,150 10,40 190,40" fill="var(--palier-or)" opacity=".12"/>${cercle(90, 'stroke-dasharray="3 6" opacity=".7"')}`,
    `<g transform="rotate(8 150 200)"><rect x="118" y="188" width="62" height="74" rx="4" fill="var(--sur-nuit-doux)" ${TRAIT}/><rect x="126" y="196" width="46" height="46" fill="var(--ligne-geographie)"/></g><path d="M52 112 L68 90 H112 L128 112" fill="var(--sur-nuit)" ${TRAIT}/><rect x="22" y="108" width="156" height="104" rx="18" fill="var(--sur-nuit)" ${TRAIT}/><rect x="22" y="126" width="156" height="14" fill="var(--palier-unique)"/><circle cx="100" cy="168" r="38" fill="var(--nuit)" ${TRAIT}/><circle cx="100" cy="168" r="26" fill="var(--nouveau)" ${TRAIT}/><circle cx="90" cy="158" r="7" fill="var(--sur-nuit)" opacity=".8"/><circle cx="154" cy="124" r="6" fill="var(--palier-or)"/>`),
};

// Repli : un identifiant de surprise sans dessin propre. Violette, unique ; son emoji est le héros.
const surprise = (b, r) => ({ l1: sv(fond(r, 3, 'var(--palier-unique)')),
  l2: sv('<g fill="none" stroke="var(--palier-unique)" stroke-width="2" opacity=".8"><circle cx="100" cy="125" r="60"/><circle cx="100" cy="125" r="82" stroke-dasharray="3 6"/></g>'),
  heros: sv(`<path d="M-15 236 Q40 196 90 236 T215 214" fill="none" stroke="var(--palier-unique)" stroke-width="8" stroke-linecap="round"/><text x="100" y="152" text-anchor="middle" font-size="84">${b.emoji}</text>`) });

export const IDS_FAMILLES = Object.keys(FAMILLES);

// Les calques d'une carte de Badge : { l1, l2, heros } (chaînes SVG). `rang` : de 1 à 4.
export function artDeBadge(b, rang) {
  const r = graine(b.id + rang);
  if (b.surprise) return (ARTS_SURPRISES[b.id] ?? ((r2) => surprise(b, r2)))(r);
  return FAMILLES[b.id] ? FAMILLES[b.id](r, rang) : surprise(b, r);
}
