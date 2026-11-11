// Filtre des calques SVG d'une carte de ligne (spec #182, ticket #184) : l'agent compose, l'appli ne stocke que ce qui
// passe cette liste blanche. Un calque refusé n'est pas réparé : il fait échouer la tentative (voir lib/cartes.js).
// Module pur. Liste blanche : éléments de dessin, attributs de dessin, couleurs seulement en `var(--jeton)` ou `none`
// (ou un dégradé du calque), classes d'animation fermées, `style` limité ; ni texte, image, filtre, masque, script, URL
// ni commentaire ; identifiants préfixés par l'identifiant de la carte ; taille bornée.

export const TAILLE_MAX = 12000; // caractères : un calque, et les trois calques ensemble
export const CALQUES = ['l1', 'l2', 'heros'];
export const VIEWBOX = '0 0 200 280';

const ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'defs', 'linearGradient', 'radialGradient', 'stop']);
// Jetons de couleur permis : ceux de la Trousse (docs/DESIGN.md, :root de public/style.css).
export const JETONS = ['nuit', 'encre-noire', 'sur-nuit', 'sur-nuit-doux', 'station-vide', 'bord', 'nouveau', 'retenu', 'vert', 'rouge', 'orange', 'accent',
  'palier-bronze', 'palier-argent', 'palier-or', 'palier-diamant', 'palier-unique',
  'ligne-francais', 'ligne-mathematiques', 'ligne-sciences', 'ligne-histoire', 'ligne-geographie', 'ligne-langues', 'ligne-arts', 'ligne-numerique', 'ligne-autre'];
export const CLASSES = ['pc-a-tourne', 'pc-a-flamme', 'pc-a-flotte', 'pc-a-eclair', 'pc-a-scintille', 'pc-a-trace', 'pc-a-braise'];

const NOMBRES = /^[-+0-9.eE\s,]*$/;
const NOMBRE_OU_POURCENT = /^[-+]?[0-9.]+(e[-+]?[0-9]+)?%?$/i;
const TRANSFORMATION = /^(\s*(translate|rotate|scale|skewX|skewY|matrix)\([-+0-9.eE\s,]*\))+\s*$/;
const CHEMIN = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]*$/;
const STYLE = /^(transform-origin:\s*-?[\d.]+px\s+-?[\d.]+px|animation-delay:\s*[\d.]+s|--x:\s*-?[\d.]+px)$/;
const COULEUR = new Set(['fill', 'stroke', 'stop-color']);
const NOMBREUX = new Set(['width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'offset', 'pathLength', 'stroke-dashoffset']);
const AUTRES = {
  d: (v) => CHEMIN.test(v), points: (v) => NOMBRES.test(v), 'stroke-dasharray': (v) => NOMBRES.test(v), viewBox: (v) => NOMBRES.test(v),
  transform: (v) => TRANSFORMATION.test(v), gradientTransform: (v) => TRANSFORMATION.test(v),
  'stroke-linecap': (v) => ['butt', 'round', 'square'].includes(v), 'stroke-linejoin': (v) => ['miter', 'round', 'bevel'].includes(v),
  xmlns: (v) => v === 'http://www.w3.org/2000/svg',
};
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Balise : <nom attr="valeur"…> ou </nom> ; les valeurs sont entre guillemets doubles, sans < ni >.
const BALISE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z][a-zA-Z0-9:-]*="[^"<>]*")*)\s*(\/?)>/y;
const ATTRIBUT = /([a-zA-Z][a-zA-Z0-9:-]*)="([^"]*)"/g;

// Calque `svg` (une chaîne) de la carte `idCarte` : { ok, svg, erreurs } ; `svg` est rendu tel quel quand il est conforme.
export function filtrerCalque(svg, idCarte) {
  if (typeof svg !== 'string') return { ok: false, svg: null, erreurs: ['le calque n’est pas une chaîne'] };
  const erreurs = [];
  if (svg.length > TAILLE_MAX) erreurs.push(`taille : ${svg.length} caractères, ${TAILLE_MAX} au plus`);
  const idValide = new RegExp(`^${echapper(idCarte)}-[A-Za-z0-9_-]+$`);
  const refDegrade = new RegExp(`^url\\(#(${echapper(idCarte)}-[A-Za-z0-9_-]+)\\)$`);
  const definis = new Set();
  const references = [];
  const pile = [];
  let racines = 0;
  let pos = 0;
  while (pos < svg.length && erreurs.length < 20) {
    if (svg[pos] !== '<') {
      const fin = svg.indexOf('<', pos);
      const texte = svg.slice(pos, fin < 0 ? svg.length : fin);
      if (texte.trim()) { erreurs.push(`texte hors balise : « ${texte.trim().slice(0, 30)} »`); break; }
      pos = fin < 0 ? svg.length : fin;
      continue;
    }
    BALISE.lastIndex = pos;
    const m = BALISE.exec(svg);
    if (!m) { erreurs.push(`balise illisible (commentaire, CDATA, guillemets simples ou syntaxe) : « ${svg.slice(pos, pos + 30)} »`); break; }
    pos = BALISE.lastIndex;
    const [, ferme, nom, attributs, autoFermee] = m;
    if (!ELEMENTS.has(nom)) { erreurs.push(`élément interdit <${nom}>`); continue; }
    if (ferme) {
      if (pile.pop() !== nom) { erreurs.push(`imbrication : </${nom}> ne ferme pas la balise ouverte`); break; }
      continue;
    }
    if (nom === 'svg') {
      if (pile.length || racines) { erreurs.push('élément interdit <svg> imbriqué ou répété'); continue; }
      racines += 1;
    } else if (!pile.length) { erreurs.push('la racine du calque doit être <svg>'); break; }
    if (!autoFermee) pile.push(nom);
    for (const [, a, v] of attributs.matchAll(ATTRIBUT)) {
      if (a === 'class') {
        for (const c of v.split(/\s+/).filter(Boolean)) if (!CLASSES.includes(c)) erreurs.push(`classe interdite : ${c}`);
      } else if (a === 'id') {
        if (!idValide.test(v)) erreurs.push(`id mal préfixé : ${v} (attendu ${idCarte}-…)`); else definis.add(v);
      } else if (a === 'style') {
        for (const d of v.split(';').map((x) => x.trim()).filter(Boolean)) if (!STYLE.test(d)) erreurs.push(`style interdit : ${d}`);
      } else if (COULEUR.has(a)) {
        const jeton = /^var\(--([a-z-]+)\)$/.exec(v);
        const degrade = a !== 'stop-color' && refDegrade.exec(v);
        if (degrade) references.push(degrade[1]);
        else if (v !== 'none' && !(jeton && JETONS.includes(jeton[1]))) erreurs.push(`couleur hors jetons : ${a}="${v}"`);
      } else if (NOMBREUX.has(a)) {
        if (!NOMBRE_OU_POURCENT.test(v.trim())) erreurs.push(`valeur non numérique : ${a}="${v}"`);
      } else if (a in AUTRES) {
        if (!AUTRES[a](v)) erreurs.push(`valeur interdite pour ${a} : « ${v.slice(0, 30)} »`);
      } else erreurs.push(`attribut interdit ${a} sur <${nom}>`);
    }
    if (nom === 'svg' && !/\bviewBox="0 0 200 280"/.test(attributs)) erreurs.push(`viewBox : ${VIEWBOX} attendu`);
    if (!pile.length && racines && pos < svg.length && svg.slice(pos).trim()) { erreurs.push('contenu après la racine'); break; }
  }
  if (!erreurs.length) {
    if (!racines) erreurs.push('aucune racine <svg>');
    else if (pile.length) erreurs.push(`imbrication : <${pile.at(-1)}> jamais fermée`);
  }
  for (const r of new Set(references)) if (!definis.has(r)) erreurs.push(`dégradé introuvable dans le calque : ${r}`);
  const fautes = [...new Set(erreurs)];
  return { ok: !fautes.length, svg: fautes.length ? null : svg, erreurs: fautes };
}

// Réponse de l'agent (texte : un seul objet JSON { l1, l2, heros }, éventuellement dans un bloc de code Markdown) lue
// pour la carte `idCarte` : { ok, calques, erreurs }. Les trois calques sont filtrés ; leur total reste borné.
export function lireCalques(reponse, idCarte) {
  const refus = (erreurs) => ({ ok: false, calques: null, erreurs });
  if (typeof reponse !== 'string') return refus(['réponse absente']);
  const debut = reponse.indexOf('{');
  const fin = reponse.lastIndexOf('}');
  let objet;
  try {
    objet = JSON.parse(reponse.slice(debut, fin + 1));
  } catch {
    return refus(['réponse illisible : un seul objet JSON attendu']);
  }
  if (!objet || typeof objet !== 'object' || Array.isArray(objet)) return refus(['réponse illisible : un objet JSON attendu']);
  const erreurs = [];
  const calques = {};
  for (const nom of CALQUES) {
    const r = filtrerCalque(objet[nom], idCarte);
    if (r.ok) calques[nom] = r.svg; else erreurs.push(...r.erreurs.map((e) => `${nom} : ${e}`));
  }
  const total = CALQUES.reduce((n, nom) => n + (typeof objet[nom] === 'string' ? objet[nom].length : 0), 0);
  if (total > TAILLE_MAX) erreurs.push(`taille : ${total} caractères pour les trois calques, ${TAILLE_MAX} au plus`);
  return erreurs.length ? refus(erreurs) : { ok: true, calques, erreurs: [] };
}
