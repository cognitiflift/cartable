// La carte de ligne à l'écran (spec #182, ticket #185), sans DOM : textes, stations et scène générique, partagés par
// l'appli et testés à part.
//
// Une carte de ligne est celle que renvoie GET …/badges dans `cartesLigne` :
// { lecon, titre, categorie, objectifs, jourAcquisition, etat, calques: { l1, l2, heros } | null, retourne, … }.
// `calques` : trois chaînes SVG (viewBox 0 0 200 280), déjà filtrées par le serveur ; null pour une scène générique.

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

const CATEGORIES = ['francais', 'mathematiques', 'sciences', 'histoire', 'geographie', 'langues', 'arts'];

// « Géographie » → « geographie » ; une Catégorie inconnue prend la couleur « autre ».
export function cleCategorieCarte(categorie) {
  const cle = String(categorie ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return CATEGORIES.includes(cle) ? cle : 'autre';
}

// Les Objectifs d'une carte, pour `ligneLecon` : une station par Objectif, tous Retenus (la Leçon est Acquise). La
// carte ne garde que leur nombre ; une carte sans compte garde une station, pour que la ligne existe.
export function objectifsDeCarte(nombre) {
  return Array.from({ length: Math.max(1, nombre ?? 0) }, (_, i) => ({ texte: `Objectif ${i + 1}`, atteint: true, retenu: true }));
}

// `dire(jour)` met le jour en mots (« le 11 novembre 2026 »).
export function libelleCarteLigne(c, dire) {
  return `Carte de la ligne « ${c.titre} », ${c.categorie} : Leçon acquise ${dire(c.jourAcquisition)}, ${pluriel(c.objectifs, 'Objectif')} Retenu${c.objectifs > 1 ? 's' : ''}.`;
}

// Le dos : ce que la carte salue, sans chiffre ni pourcentage.
export const dosCarteLigne = (c, dire) => ({
  cartouche: c.categorie, nom: c.titre,
  salue: 'Tous les Objectifs sont Retenus : la ligne est allée jusqu\'au terminus.',
  date: `Acquise ${dire(c.jourAcquisition)}.`,
});

export const calquesDeCarte = (c) => (c.calques?.l1 && c.calques?.l2 && c.calques?.heros ? c.calques : sceneGenerique(c));

// ---------- la scène générique : composée en code, même Leçon, même carte ----------

const graine = (texte) => {
  let h = 1779033703 ^ texte.length;
  for (const ch of texte) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
};
const sv = (contenu) => `<svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">${contenu}</svg>`;
const n1 = (x) => x.toFixed(1);

export function sceneGenerique(c) {
  const r = graine(`${c.lecon}|${c.titre}`), cle = cleCategorieCarte(c.categorie), couleur = `var(--ligne-${cle})`;
  const id = `${String(c.lecon).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const stations = Math.max(1, c.objectifs ?? 1);

  // Ciel : dégradé de la nuit vers la couleur de la Catégorie, étoiles semées par la graine.
  const etoiles = Array.from({ length: 26 }, () => `<circle cx="${n1(r() * 200)}" cy="${n1(r() * 130)}" r="${n1(0.7 + r() * 1.3)}" fill="var(--sur-nuit)" opacity="${n1(0.35 + r() * 0.5)}"/>`).join('');
  const l1 = sv(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--nuit)"/><stop offset="1" stop-color="${couleur}"/></linearGradient></defs>`
    + `<rect width="200" height="280" fill="url(#${id})"/>${etoiles}`
    + `<circle cx="${n1(40 + r() * 120)}" cy="${n1(40 + r() * 30)}" r="20" fill="var(--sur-nuit-doux)" opacity=".85"/>`);

  // Décor : deux collines et quelques pylônes, loin derrière la ligne.
  const colline = (haut, opacite) => { const a = 150 + r() * 25, b = 140 + r() * 30, d = 160 + r() * 20; return `<path d="M-10 ${n1(haut + 40)} C30 ${n1(haut - a / 6)} 70 ${n1(haut - b / 6)} 110 ${n1(haut + 10)} S190 ${n1(haut - d / 12)} 214 ${n1(haut + 20)} V290 H-10Z" fill="var(--nuit)" opacity="${opacite}"/>`; };
  const l2 = sv(`${colline(150, '.55')}${colline(176, '.8')}${Array.from({ length: 4 }, () => { const x = 14 + r() * 172, y = 150 + r() * 24; return `<path d="M${n1(x)} ${n1(y)} v-${n1(14 + r() * 12)}" stroke="var(--sur-nuit-doux)" stroke-width="2" stroke-linecap="round" opacity=".6"/>`; }).join('')}`);

  // Héros : le signal de la station, un anneau de la couleur de la Catégorie et une étoile à autant de pointes que d'Objectifs (de 5 à 9).
  const pointes = Math.min(9, Math.max(5, stations + 2)), cx = 100, cy = 92, ext = 40, int = 17;
  const pts = Array.from({ length: pointes * 2 }, (_, i) => { const a = (i / (pointes * 2)) * Math.PI * 2 - Math.PI / 2, rayon = i % 2 ? int : ext; return `${n1(cx + Math.cos(a) * rayon)},${n1(cy + Math.sin(a) * rayon)}`; }).join(' ');
  const heros = sv(`<circle cx="${cx}" cy="${cy}" r="52" fill="none" stroke="var(--sur-nuit)" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity=".7"/>`
    + `<polygon points="${pts}" fill="var(--nouveau)" stroke="var(--sur-nuit)" stroke-width="3" stroke-linejoin="round"/>`
    + `<circle cx="${cx}" cy="${cy}" r="9" fill="${couleur}" stroke="var(--sur-nuit)" stroke-width="2"/>`);
  return { l1, l2, heros };
}
