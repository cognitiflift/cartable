import { figuresLuesDuKit } from '../public/kit/v1/figure-logique.js';

// Schémas SVG des figures du Kit d'une Page de leçon (ticket #134) : après un tour, l'appli relève ceux qui seront mal
// lus et les signale au prof au tour suivant, une fois, sans toucher à la page. Repères donnés au prof dans la consigne
// « Visuels » (lib/agent.js) et la section « Figure » du LISEZMOI du Kit.
//
// Taille rendue estimée d'un texte, sur un écran de 360 px : font-size effectif × largeur rendue / largeur de la viewBox.
// La largeur rendue est celle de la figure, 300 px, sauf si le <svg> impose une largeur plus petite (base.css du Kit :
// `width: auto; max-width: 100%`) ou s'il est assez haut pour buter sur sa hauteur maximale (`max-height: 70vh`, soit
// 448 px sur un écran de 360 × 640). Le font-size effectif est celui du texte, ou hérité d'un groupe ou du <svg> (attribut
// ou style en ligne) ; sans valeur déclarée, la taille du texte de la page, 18 px, elle aussi en unités de viewBox.
// Ne sont pas pris en compte : les `transform` (scale), un <svg> dans un autre (il prend le rapport du premier) et une
// feuille <style> dans le dessin (son contenu n'est pas lu).
const TEXTE_MIN_PX = 14;
const LARGEUR_FIGURE_PX = 300;
const HAUTEUR_FIGURE_PX = 448;
const TEXTE_PAGE_PX = 18; // `font: 18px` du body, public/kit/v1/base.css

const BALISES_TEXTE = new Set(['text', 'tspan', 'textpath']);

// Propriétés du style en ligne : { 'font-size': '12px', … }, noms en minuscules.
const lireStyle = (style = '') => Object.fromEntries(String(style).split(';')
  .map((d) => d.split(':'))
  .filter((d) => d.length >= 2)
  .map(([nom, ...valeur]) => [nom.trim().toLowerCase(), valeur.join(':').trim()]));

// Attributs en minuscules, le style en ligne l'emportant sur l'attribut de présentation (comme dans le navigateur).
const proprietes = (n) => ({
  ...Object.fromEntries(Object.entries(n.attributs ?? {}).map(([nom, v]) => [nom.toLowerCase(), v])),
  ...lireStyle(n.attributs?.style),
});

// Font-size en unités de viewBox, d'après la valeur déclarée et celle héritée ; valeur illisible : l'héritée.
function tailleDeclaree(valeur, heritee) {
  const m = /^\s*([\d.]+)\s*(px|em|rem|%)?\s*$/i.exec(valeur ?? '');
  if (!m || !Number.isFinite(Number(m[1]))) return heritee;
  const n = Number(m[1]);
  const unite = (m[2] ?? 'px').toLowerCase();
  if (unite === 'em') return n * heritee;
  if (unite === '%') return (n / 100) * heritee;
  if (unite === 'rem') return n * TEXTE_PAGE_PX;
  return n;
}

// Largeur rendue (px) du <svg>, et le rapport px rendu / unité de viewBox. Sans viewBox, l'unité est le px.
function echelle(p) {
  const vb = String(p.viewbox ?? '').trim().split(/[\s,]+/).map(Number);
  const largeurVb = vb.length === 4 && vb[2] > 0 ? vb[2] : null;
  const m = /^\s*([\d.]+)\s*(px|%)?\s*$/i.exec(p.width ?? '');
  let largeur = largeurVb && vb[3] > 0 ? Math.min(LARGEUR_FIGURE_PX, (HAUTEUR_FIGURE_PX * largeurVb) / vb[3]) : LARGEUR_FIGURE_PX;
  if (m) largeur = Math.min(largeur, m[2] === '%' ? (Number(m[1]) / 100) * LARGEUR_FIGURE_PX : Number(m[1]));
  return largeurVb ? largeur / largeurVb : 1;
}

const arrondi = (x) => Math.round(x * 10) / 10;
const texteDe = (n) => (typeof n === 'string' ? n : (n.enfants ?? []).map(texteDe).join(''));

// Couleur permise : l'encre (currentColor), rien, une couleur du Kit sans repli, ou pour fill et stroke un dégradé du
// dessin (url(#…)), dont les couleurs (stop-color) sont vérifiées à leur tour. `color` fixe celle de currentColor.
const COULEUR_PERMISE = /^\s*(currentcolor|none|inherit|var\(\s*--kit-[\w-]+\s*\))\s*$/i;
const URL_INTERNE = /^\s*url\(\s*#[\w-]+\s*\)\s*$/i;
const PROPRIETES_COULEUR = ['fill', 'stroke', 'stop-color', 'color'];

// Problèmes d'un <svg>, un par raison au plus : le plus petit texte sous le seuil, la première police imposée, la
// première couleur en dur.
function problemesDuSvg(svg) {
  const p = proprietes(svg);
  const rapport = echelle(p);
  const petits = [];
  let police = null;
  let couleur = null;
  const parcourir = (n, taille) => {
    if (typeof n === 'string') return;
    const props = proprietes(n);
    const t = tailleDeclaree(props['font-size'], taille);
    police ??= props['font-family'] ?? props.font ?? null;
    for (const nom of PROPRIETES_COULEUR) {
      const v = props[nom];
      if (v != null && !COULEUR_PERMISE.test(v) && !(['fill', 'stroke'].includes(nom) && URL_INTERNE.test(v))) couleur ??= `${nom}="${v}"`;
    }
    const direct = (n.enfants ?? []).filter((e) => typeof e === 'string').join('').trim();
    if (BALISES_TEXTE.has(n.balise.toLowerCase()) && direct) {
      const rendu = t * rapport;
      if (rendu < TEXTE_MIN_PX) petits.push({ rendu, texte: texteDe(n).replace(/\s+/g, ' ').trim(), taille: t });
    }
    for (const e of n.enfants ?? []) parcourir(e, t);
  };
  parcourir(svg, tailleDeclaree(p['font-size'], TEXTE_PAGE_PX));
  const problemes = [];
  if (petits.length) {
    const plus = petits.reduce((a, b) => (b.rendu < a.rendu ? b : a));
    problemes.push({
      raison: 'texte-trop-petit',
      detail: `${petits.length > 1 ? `${petits.length} textes, dont « ${plus.texte} »` : `texte « ${plus.texte} »`} à environ ${Math.round(plus.rendu)} px sur un écran de 360 px (font-size ${arrondi(plus.taille)}, viewBox de ${arrondi(LARGEUR_FIGURE_PX / rapport)} de large)`,
    });
  }
  if (police) problemes.push({ raison: 'police-imposee', detail: `police « ${police} » imposée, au lieu de celle du Kit` });
  if (couleur) problemes.push({ raison: 'couleur-en-dur', detail: `${couleur}, au lieu de currentColor ou d'une couleur du Kit (var(--kit-accent), var(--kit-accent-doux))` });
  return problemes;
}

// Les <svg> d'un arbre, sans ceux qu'un autre <svg> contient (ils font partie du premier).
const svgsDe = (n) => (typeof n === 'string' ? [] : n.balise.toLowerCase() === 'svg' ? [n] : (n.enfants ?? []).flatMap(svgsDe));

// Problèmes des schémas SVG des figures du Kit d'une page : [{ figure, position, raison, detail }], `figure` étant l'id
// de la figure (null sans id) et `position` son rang parmi les figures du Kit de la page (1 pour la première).
export function problemesDesSchemas(html) {
  return figuresLuesDuKit(html).flatMap((figure, i) => svgsDe(figure).flatMap(problemesDuSvg)
    .map((p) => ({ figure: figure.attributs.id ?? null, position: i + 1, ...p })));
}
