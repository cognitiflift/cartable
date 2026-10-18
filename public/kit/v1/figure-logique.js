// Kit v1 — copie d'une figure du Kit gardée avec une Question (spec #123, ticket #126). Logique pure, sans DOM du
// navigateur : l'appli l'importe pour faire la copie (lib/banque.js), le Kit pour la rendre (construireFigure).
//
// La figure vient d'une page écrite par le prof, et la Révision du jour la rend dans l'appli elle-même. La copie n'est
// donc jamais du HTML : c'est un arbre { balise, attributs, enfants } (un texte est une chaîne), passé par une liste
// blanche à la copie (extraireFigure) puis encore au rendu (construireFigure), qui le reconstruit élément par élément
// (createElementNS, setAttribute, createTextNode), sans jamais interpréter de balisage. Hors liste blanche : script,
// style, gestionnaire d'évènement (on…), attribut style, lien (javascript: ou autre), contenu étranger (foreignObject,
// iframe…) et toute image qui n'est pas rapatriée dans la Leçon. Une balise inconnue est retirée mais son texte reste ;
// un élément dangereux est retiré avec tout son contenu. Une figure sans visuel sûr garde sa légende.
import { IMAGE_LOCALE_RE } from './quiz-logique.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HTML_NS = 'http://www.w3.org/1999/xhtml';
export const NOEUDS_MAX = 3000; // au-delà, le visuel n'est pas gardé (la légende reste)

// Balises gardées, sous leur nom canonique (le SVG a des majuscules), et attributs gardés par chacune en plus des communs.
const HTML = {
  figure: [], figcaption: [], blockquote: [], p: [], br: [], em: [], strong: [], i: [], b: [], small: [], span: [],
  cite: [], q: [], sub: [], sup: [], abbr: [], ul: [], ol: [], li: [], img: ['src', 'alt', 'width', 'height'],
};
const PRESENTATION = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'stroke-miterlimit', 'opacity', 'transform', 'font-size',
  'font-weight', 'font-style', 'font-family', 'text-anchor', 'dominant-baseline', 'letter-spacing', 'marker-start',
  'marker-mid', 'marker-end', 'clip-path', 'vector-effect', 'paint-order'];
const SVG = {
  svg: ['viewBox', 'width', 'height', 'preserveAspectRatio'], g: [], defs: [], title: [], desc: [], symbol: ['viewBox'],
  path: ['d', 'pathLength'], line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'], ellipse: ['cx', 'cy', 'rx', 'ry'],
  text: ['x', 'y', 'dx', 'dy', 'rotate', 'textLength'], tspan: ['x', 'y', 'dx', 'dy'],
  marker: ['viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'markerUnits', 'orient'],
  use: ['href', 'x', 'y', 'width', 'height'], clipPath: ['clipPathUnits'],
  linearGradient: ['x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform'],
  radialGradient: ['cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform'], stop: ['offset', 'stop-color', 'stop-opacity'],
};
const COMMUNS = ['class', 'id', 'lang', 'title', 'role', 'aria-label', 'aria-hidden', 'aria-describedby', 'aria-labelledby'];
const CANONIQUE = Object.fromEntries([...Object.keys(HTML), ...Object.keys(SVG)].map((b) => [b.toLowerCase(), b]));
const ATTRIBUTS = Object.fromEntries([
  ...Object.entries(HTML).map(([b, a]) => [b, new Set([...COMMUNS, ...a])]),
  ...Object.entries(SVG).map(([b, a]) => [b, new Set([...COMMUNS, ...PRESENTATION, ...a])]),
]);
const NOMS_ATTRIBUTS = Object.fromEntries([...new Set(Object.values(ATTRIBUTS).flatMap((s) => [...s]))].map((a) => [a.toLowerCase(), a]));
// Retirés avec tout leur contenu : du code, du style, ou du contenu étranger.
const DANGEREUX = new Set(['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'foreignobject',
  'template', 'noscript', 'noembed', 'noframes', 'textarea', 'xmp', 'math', 'svg:script', 'animate', 'animatemotion',
  'animatetransform', 'set', 'image', 'audio', 'video', 'canvas', 'form', 'input', 'button', 'select', 'link', 'meta', 'base']);
const BRUTS = new Set(['script', 'style', 'textarea', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'title']);
const VIDES = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'base', 'col', 'area', 'embed', 'source', 'track', 'wbr', 'param']);
// Où un texte fait seulement de blancs ne compte pas (entre les éléments d'un dessin, d'une liste ou de la figure).
const SANS_BLANCS = new Set(['figure', 'ul', 'ol', ...Object.keys(SVG).filter((b) => !['text', 'tspan', 'title', 'desc'].includes(b))]);
const ESTSVG = new Set(Object.keys(SVG));

// Valeur d'attribut sûre pour cet attribut, ou null. Une adresse n'est gardée que pour une image rapatriée (`src`) ou
// une référence interne au dessin (`href="#…"`, `url(#…)`) ; rien qui puisse appeler du code ou charger du dehors.
const IMAGE_SERVIE_RE = /^\/fichiers\/[\w-]+\/[\w-]+\/images\/[\w-]+(\.[\w-]+)*$/;
const REFERENCE_RE = /^#[A-Za-z][\w-]*$/;
const URL_INTERNE_RE = /^url\(\s*#[A-Za-z][\w-]*\s*\)$/;
function valeurSure(balise, nom, valeur) {
  const v = String(valeur);
  if (v.length > 20000) return null;
  if (nom === 'src') return IMAGE_LOCALE_RE.test(v) || IMAGE_SERVIE_RE.test(v) ? v : null;
  if (nom === 'href') return REFERENCE_RE.test(v) ? v : null;
  if (nom === 'class') return v.split(/\s+/).filter((c) => /^kit-[\w-]+$/.test(c)).join(' ') || null;
  if (nom === 'id') return /^[A-Za-z][\w-]*$/.test(v) ? v : null;
  // Une valeur de présentation peut citer une adresse (fill="url(…)") : seulement une référence interne.
  const compacte = v.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
  if (/url\(/.test(compacte) && !URL_INTERNE_RE.test(v.trim())) return null;
  if (/javascript:|vbscript:|data:|expression\(|[<>]/.test(compacte)) return null;
  return v;
}

// Nœud de copie passé par la liste blanche : { balise, attributs, enfants } ou texte, ou null s'il ne reste rien.
// `dansSvg` : sous un <svg> (le SVG n'est accepté que là, le HTML que hors de lui). `compte` : nœuds déjà gardés.
function nettoyerNoeud(n, dansSvg, compte) {
  if (typeof n === 'string') return n;
  if (!n || typeof n !== 'object' || typeof n.balise !== 'string') return null;
  const basse = n.balise.toLowerCase();
  if (DANGEREUX.has(basse)) return null;
  const balise = CANONIQUE[basse];
  const permise = balise && (dansSvg ? ESTSVG.has(balise) : Object.hasOwn(HTML, balise) || balise === 'svg');
  const enSvg = dansSvg || balise === 'svg';
  const enfants = (Array.isArray(n.enfants) ? n.enfants : [])
    .flatMap((e) => {
      if (++compte.n > NOEUDS_MAX) return [];
      const propre = nettoyerNoeud(e, permise ? enSvg : dansSvg, compte);
      return propre == null ? [] : Array.isArray(propre) ? propre : [propre];
    })
    .filter((e) => !(typeof e === 'string' && (e === '' || (permise && SANS_BLANCS.has(balise) && !e.trim()))));
  if (!permise) return enfants; // balise inconnue : son contenu reste, à la place de l'élément
  const attributs = {};
  for (const [brut, valeur] of Object.entries(n.attributs ?? {})) {
    const nom = NOMS_ATTRIBUTS[brut.toLowerCase().replace(/^xlink:/, '')];
    if (!nom || !ATTRIBUTS[balise].has(nom)) continue;
    const sure = valeurSure(balise, nom, valeur);
    if (sure != null) attributs[nom] = sure;
  }
  if (balise === 'img' && !attributs.src) return null; // image distante ou sans adresse : retirée, la légende reste
  return { balise, attributs, enfants: VIDES.has(basse) ? [] : enfants };
}

// Copie passée par la liste blanche (voir en tête) : une figure, ou null. Au-delà de NOEUDS_MAX nœuds, seule la légende
// est gardée. Idempotente : l'appli la fait à la copie, le Kit la refait avant de rendre.
export function nettoyerFigure(copie) {
  if (!copie || typeof copie !== 'object' || String(copie.balise).toLowerCase() !== 'figure') return null;
  const compte = { n: 0 };
  const propre = nettoyerNoeud(copie, false, compte);
  if (compte.n <= NOEUDS_MAX) return propre;
  const legende = (copie.enfants ?? []).find((e) => e?.balise?.toLowerCase?.() === 'figcaption');
  return { ...propre, enfants: legende ? [nettoyerNoeud(legende, false, { n: 0 })] : [] };
}

// --- Lecture du HTML de la page (côté appli : pas de DOM). Un petit analyseur qui suffit à des figures du Kit ; s'il
// lit mal une page tordue, le pire est une copie incomplète, jamais du code : la copie repasse par nettoyerFigure.

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', hellip: '…', mdash: '—', ndash: '–', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
const decoder = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (tout, e) => {
  if (e[0] === '#') {
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
  }
  return Object.hasOwn(ENTITES, e.toLowerCase()) ? ENTITES[e.toLowerCase()] : tout;
});

// Jetons du HTML : { texte } | { ouvre, attributs, ferme? } | { fin }.
function* jetons(html) {
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { yield { texte: decoder(html.slice(i)) }; return; }
    if (lt > i) yield { texte: decoder(html.slice(i, lt)) };
    if (html.startsWith('<!--', lt)) {
      const fin = html.indexOf('-->', lt + 4);
      i = fin < 0 ? html.length : fin + 3;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const fin = html.indexOf('>', lt);
      i = fin < 0 ? html.length : fin + 1;
      continue;
    }
    const fermante = /^<\/([A-Za-z][^\s/>]*)[^>]*>/.exec(html.slice(lt, lt + 300));
    if (fermante) {
      yield { fin: fermante[1].toLowerCase() };
      i = lt + fermante[0].length;
      continue;
    }
    const nom = /^<([A-Za-z][^\s/>]*)/.exec(html.slice(lt, lt + 300));
    if (!nom) { yield { texte: '<' }; i = lt + 1; continue; }
    // Attributs, jusqu'au « > » qui n'est pas dans une valeur entre guillemets.
    let j = lt + nom[0].length;
    const attributs = {};
    let ferme = false;
    const ATTR = /\s*([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?|\s*(\/)|\s*(>)/y;
    for (;;) {
      ATTR.lastIndex = j;
      const m = ATTR.exec(html);
      if (!m) { j = html.length; break; }
      j = ATTR.lastIndex;
      if (m[6]) break;
      if (m[5]) { ferme = html[j] === '>' || /^\s*>/.test(html.slice(j, j + 50)); continue; }
      if (!Object.hasOwn(attributs, m[1])) attributs[m[1]] = decoder(m[2] ?? m[3] ?? m[4] ?? '');
    }
    const balise = nom[1].toLowerCase();
    yield { ouvre: nom[1], attributs, ferme };
    i = j;
    // Contenu brut (script, style…) : rien n'y est une balise jusqu'à sa fermeture.
    if (BRUTS.has(balise) && !ferme) {
      const re = new RegExp(`</${balise}\\s*>`, 'i');
      const m = re.exec(html.slice(i));
      const contenu = m ? html.slice(i, i + m.index) : html.slice(i);
      if (balise === 'title') yield { texte: decoder(contenu) };
      if (m) yield { fin: balise };
      i = m ? i + m.index + m[0].length : html.length;
    }
  }
}

// Copie de la figure du Kit (`<figure class="kit-figure" id="<id>">`) d'une Page de leçon, passée par la liste
// blanche ; null si la page n'a pas de figure du Kit avec cet id.
export function extraireFigure(html, id) {
  if (typeof html !== 'string' || typeof id !== 'string' || !id) return null;
  const pile = [];
  let racine = null;
  for (const j of jetons(html)) {
    if (!racine) {
      if (j.ouvre?.toLowerCase() === 'figure' && j.attributs.id === id && /(^|\s)kit-figure(\s|$)/.test(j.attributs.class ?? '')) {
        racine = { balise: 'figure', attributs: j.attributs, enfants: [] };
        pile.push(racine);
      }
      continue;
    }
    const parent = pile[pile.length - 1];
    if (j.texte != null) {
      const dernier = parent.enfants[parent.enfants.length - 1];
      if (typeof dernier === 'string') parent.enfants[parent.enfants.length - 1] = dernier + j.texte;
      else parent.enfants.push(j.texte);
    } else if (j.ouvre) {
      const noeud = { balise: j.ouvre, attributs: j.attributs, enfants: [] };
      parent.enfants.push(noeud);
      if (!j.ferme && !VIDES.has(j.ouvre.toLowerCase())) pile.push(noeud);
    } else if (j.fin) {
      const k = pile.map((n) => n.balise.toLowerCase()).lastIndexOf(j.fin);
      if (k >= 0) pile.length = k;
      if (!pile.length) break;
    }
  }
  if (!racine) return null;
  const { id: _, ...attributs } = racine.attributs; // l'id resterait en double dans l'écran qui montre la copie
  return nettoyerFigure({ ...racine, attributs });
}

// Copie dont les images rapatriées ont une autre adresse : `adresse(src)` (l'appli sert les images de la Leçon
// ailleurs que la page, voir server.js).
export function avecAdressesDImages(copie, adresse) {
  const parcourir = (n) => (typeof n === 'string' ? n : {
    ...n,
    attributs: n.balise === 'img' && n.attributs.src ? { ...n.attributs, src: adresse(n.attributs.src) } : n.attributs,
    enfants: n.enfants.map(parcourir),
  });
  return copie && parcourir(copie);
}

// Texte de la légende d'une copie, sans le crédit : ce que le prof reçoit pour décrire la figure (variantes).
export function legendeDeFigure(copie) {
  const texte = (n) => (typeof n === 'string' ? n : /(^|\s)kit-credit(\s|$)/.test(n.attributs?.class ?? '') ? '' : (n.enfants ?? []).map(texte).join(''));
  const legende = (copie?.enfants ?? []).find((e) => e?.balise === 'figcaption');
  return legende ? texte(legende).replace(/\s+/g, ' ').trim() : '';
}

// Élément construit dans `doc` d'après une copie (repassée par la liste blanche), sans jamais interpréter de balisage :
// une figure du Kit (`kit-figure kit-quiz-figure`) prête pour revoirFigure (figure.js) ; null si la copie n'en est pas une.
export function construireFigure(doc, copie) {
  const propre = nettoyerFigure(copie);
  if (!propre) return null;
  const construire = (n, dansSvg) => {
    if (typeof n === 'string') return doc.createTextNode(n);
    const enSvg = dansSvg || n.balise === 'svg';
    const e = doc.createElementNS(enSvg ? SVG_NS : HTML_NS, n.balise);
    for (const [nom, valeur] of Object.entries(n.attributs)) if (nom !== 'id' || enSvg) e.setAttribute(nom, valeur);
    e.append(...n.enfants.map((c) => construire(c, enSvg)));
    return e;
  };
  const figure = construire(propre, false);
  figure.setAttribute('class', 'kit-figure kit-quiz-figure');
  return figure;
}
