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
const T = 'stroke="var(--sur-nuit)" stroke-width="3" stroke-linejoin="round"'; // le trait des héros
const carte = (r, decor, l2, heros) => ({ l1: sv(fond(r, 3, 'var(--palier-unique)', decor)), l2: sv(l2), heros: sv(heros) });
const arcs = '<g fill="none" stroke="var(--palier-unique)" stroke-width="2" opacity=".8"><circle cx="100" cy="135" r="70"/><circle cx="100" cy="135" r="92" stroke-dasharray="3 6"/></g>';

export const ARTS_SURPRISES = {
  // 👋 Content de te revoir : une main qui salue, et les ondes de son geste.
  'content-de-te-revoir': (r) => carte(r, '',
    `${arcs}<path d="M20 238 H180" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".4"/>`,
    `<g transform="rotate(-14 100 150)">${[[74, 80], [88, 68], [102, 64], [116, 76]].map(([x, y]) => `<rect x="${x}" y="${y}" width="13" height="${150 - y}" rx="6.5" fill="var(--palier-or)" ${T}/>`).join('')}<rect x="52" y="150" width="13" height="40" rx="6.5" fill="var(--palier-or)" ${T} transform="rotate(-48 58 170)"/><rect x="72" y="128" width="58" height="68" rx="26" fill="var(--palier-or)" ${T}/></g><g fill="none" stroke="var(--nouveau)" stroke-width="5" stroke-linecap="round"><path d="M40 96 q-14 22 0 46"/><path d="M26 82 q-24 36 0 74"/><path d="M160 86 q16 24 0 50"/><path d="M176 72 q24 38 0 78"/></g>`),
  // 🗺️ Mission élargie : une carte dépliée en trois volets, son itinéraire et la croix du but.
  'mission-elargie': (r) => carte(r, '',
    `${arcs}<path d="M20 238 H180" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".4"/>`,
    `<polygon points="30,112 80,100 80,200 30,212" fill="var(--sur-nuit)" ${T}/><polygon points="80,100 130,114 130,214 80,200" fill="var(--sur-nuit-doux)" ${T}/><polygon points="130,114 176,100 176,200 130,214" fill="var(--sur-nuit)" ${T}/><path d="M44 190 C70 150 100 196 122 154 S150 140 158 124" fill="none" stroke="var(--palier-unique)" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M150 116 l16 16 M166 116 l-16 16" stroke="var(--palier-bronze)" stroke-width="6" stroke-linecap="round"/>${gare(44, 190, 'atteint', 7)}`),
  // 🎯 Prêt pour le contrôle : une cible, une flèche plantée en plein centre.
  'pret-pour-le-controle': (r) => carte(r, '',
    `${arcs}<path d="M20 238 H180" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".4"/>`,
    `<circle cx="92" cy="140" r="62" fill="var(--sur-nuit)" ${T}/><circle cx="92" cy="140" r="46" fill="var(--palier-unique)" ${T}/><circle cx="92" cy="140" r="30" fill="var(--sur-nuit)" ${T}/><circle cx="92" cy="140" r="14" fill="var(--nouveau)" ${T}/><path d="M92 140 L168 64" stroke="var(--sur-nuit)" stroke-width="6" stroke-linecap="round"/><path d="M92 140 L168 64" stroke="var(--palier-bronze)" stroke-width="2.5" stroke-linecap="round"/><polygon points="150,82 178,54 186,62 170,90" fill="var(--nouveau)" ${T}/><polygon points="160,92 188,64 196,72 180,100" fill="var(--nouveau)" ${T}/>`),
  // 🔥 Sept d'un coup : une flamme, et sept braises alignées dessous.
  'sept-d-un-coup': (r) => carte(r, '',
    `${arcs}<path d="M20 244 H180" stroke="var(--sur-nuit-doux)" stroke-width="3" stroke-dasharray="2 7" opacity=".4"/>`,
    `<path d="M100 62 C132 104 154 128 152 168 C150 206 126 224 100 224 C74 224 50 206 48 168 C46 136 68 120 80 92 C88 114 96 108 100 62Z" fill="var(--palier-bronze)" ${T}/><path d="M102 106 C124 134 136 150 134 174 C132 200 118 212 100 212 C82 212 68 200 66 176 C64 158 78 146 88 128 C94 144 100 138 102 106Z" fill="var(--palier-or)" ${T}/><path d="M100 156 C112 172 118 182 116 194 C114 206 108 208 100 208 C92 208 86 206 84 194 C82 184 92 176 100 156Z" fill="var(--sur-nuit)"/>${Array.from({ length: 7 }, (_, i) => `<circle cx="${52 + i * 16}" cy="246" r="5" fill="${i === 6 ? 'var(--nouveau)' : 'var(--sur-nuit)'}"/>`).join('')}`),
  // 🗓️ Mois complet : un calendrier dont les trente cases sont cochées, la dernière en or.
  'mois-complet': (r) => carte(r, '',
    `${arcs}`,
    `<rect x="38" y="82" width="124" height="136" rx="12" fill="var(--sur-nuit)" ${T}/><rect x="38" y="82" width="124" height="26" rx="12" fill="var(--nouveau)" ${T}/><rect x="62" y="68" width="10" height="24" rx="5" fill="var(--nuit)" ${T}/><rect x="128" y="68" width="10" height="24" rx="5" fill="var(--nuit)" ${T}/>${Array.from({ length: 30 }, (_, i) => `<rect x="${45 + (i % 6) * 19}" y="${116 + Math.floor(i / 6) * 19}" width="16" height="15" rx="3" fill="${i === 29 ? 'var(--palier-or)' : 'var(--retenu)'}"/>`).join('')}`),
  // 📆 Semaine pleine : un semainier, sept lignes cochées, dimanche en étoile.
  'semaine-pleine': (r) => carte(r, '',
    `${arcs}`,
    `<rect x="48" y="68" width="104" height="168" rx="14" fill="var(--sur-nuit)" ${T}/>${Array.from({ length: 7 }, (_, i) => `<rect x="56" y="${76 + i * 22.5}" width="88" height="18" rx="7" fill="${i === 6 ? 'var(--nouveau)' : 'var(--nuit)'}"/>${gare(70, 85 + i * 22.5, i === 6 ? 'atteint' : 'retenu', 6)}`).join('')}${etoile(124, 85 + 6 * 22.5, 8, 'var(--sur-nuit)', 2)}`),
  // 🩹 Reparti ! : un pansement posé sur la fissure d'une ligne.
  reparti: (r) => carte(r, '',
    `${arcs}<path d="M10 196 L58 170 L86 184 L118 150 L148 164 L190 132" fill="none" stroke="var(--sur-nuit-doux)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>`,
    `<g transform="rotate(-35 100 140)"><rect x="32" y="114" width="136" height="52" rx="26" fill="var(--palier-bronze)" ${T}/><rect x="78" y="114" width="44" height="52" fill="var(--sur-nuit)" ${T}/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${48 + (i % 3) * 12}" cy="${128 + Math.floor(i / 3) * 24}" r="2.4" fill="var(--nuit)"/><circle cx="${128 + (i % 3) * 12}" cy="${128 + Math.floor(i / 3) * 24}" r="2.4" fill="var(--nuit)"/>`).join('')}<path d="M88 140 h24 M100 128 v24" stroke="var(--palier-bronze)" stroke-width="4" stroke-linecap="round"/></g>`),
  // 💯 Centenaire : un cent écrit en grand, double soulignement.
  centenaire: (r) => carte(r, '',
    `${arcs}`,
    `<g fill="none" stroke="var(--sur-nuit)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"><path d="M50 108 L72 88 V186"/><ellipse cx="110" cy="138" rx="19" ry="48"/><ellipse cx="154" cy="138" rx="19" ry="48"/></g><g stroke="var(--palier-bronze)" stroke-linecap="round"><path d="M44 208 H176" stroke-width="7"/><path d="M52 224 H168" stroke-width="5"/></g>`),
  // 🎒 Rentrée : un cartable, son rabat, sa poche et un crayon qui dépasse.
  rentree: (r) => carte(r, '',
    `${arcs}`,
    `<path d="M82 104 V88 Q100 70 118 88 V104" fill="none" stroke="var(--sur-nuit)" stroke-width="7" stroke-linecap="round"/><rect x="132" y="150" width="9" height="62" rx="4" fill="var(--sur-nuit)" ${T} transform="rotate(14 136 180)"/><rect x="56" y="100" width="88" height="116" rx="26" fill="var(--palier-bronze)" ${T}/><path d="M56 128 Q100 168 144 128 V126 A26 26 0 0 0 118 100 H82 A26 26 0 0 0 56 126Z" fill="var(--palier-or)" ${T}/><circle cx="100" cy="150" r="7" fill="var(--sur-nuit)" ${T}/><rect x="70" y="168" width="60" height="38" rx="10" fill="var(--nouveau)" ${T}/><path d="M80 187 h40" stroke="var(--sur-nuit)" stroke-width="4" stroke-linecap="round"/>`),
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
