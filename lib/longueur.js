// Longueur des Pages de leçon (ticket #156, spec #145 point 7) : après un tour, l'appli relève dans les pages écrites
// celles de plus de MOTS_PAGE_MAX mots et les parties de plus de MOTS_PARTIE_MAX mots sans titre, et les signale au
// prof au tour suivant, une fois, sans toucher à la page (comme les schémas, lib/schemas.js). Bornes données au prof
// dans la consigne « Pages » (lib/agent.js). Fondement : segmentation (Rey et al. 2019) ; les valeurs 800 et 200 sont
// des hypothèses à mesurer (docs/cadres-scientifiques.md).
export const MOTS_PAGE_MAX = 800;
export const MOTS_PARTIE_MAX = 200;

// Éléments dont le contenu n'est pas compté : le quiz (déclaré dans un <script>), les figures (légende et crédit
// compris), l'encart du Dépassement, le style, l'en-tête.
const EXCLUS = new Set(['script', 'style', 'head', 'noscript', 'template', 'svg', 'figure', 'aside', 'button', 'select', 'textarea']);
// Contenu brut : rien n'y est une balise jusqu'à sa fermeture.
const BRUTS = new Set(['script', 'style', 'noscript', 'template', 'textarea']);
const TITRE = /^h[1-6]$/;

const compterMots = (texte) => texte
  .replace(/&(nbsp|#160|#xa0);/gi, ' ')
  .replace(/&[#\w]+;/g, 'x')
  .split(/\s+/)
  .filter((m) => /[\p{L}\p{N}]/u.test(m)).length;

// Mots de la page, par partie : [{ titre, mots }], la première (titre null) étant ce qui précède le premier titre.
// Une partie s'arrête à chaque titre (h1 à h6), dont le texte ne compte pas.
function partiesDe(html) {
  const source = String(html ?? '').replace(/<!--[\s\S]*?-->/g, ' ');
  const parties = [{ titre: null, mots: 0 }];
  const exclus = []; // pile des éléments non comptés où l'on se trouve
  let enTitre = null; // texte du titre en cours de lecture
  const re = /<(\/?)([A-Za-z][^\s/>]*)[^>]*?(\/?)>|([^<]+|<)/g;
  for (let m; (m = re.exec(source));) {
    if (m[4] != null) {
      if (exclus.length) continue;
      if (enTitre != null) enTitre += m[4];
      else parties.at(-1).mots += compterMots(m[4]);
      continue;
    }
    const nom = m[2].toLowerCase();
    const autoferme = m[3] === '/';
    if (m[1]) {
      const k = exclus.lastIndexOf(nom);
      if (k >= 0) exclus.length = k;
      else if (TITRE.test(nom) && enTitre != null && !exclus.length) {
        parties.push({ titre: enTitre.replace(/\s+/g, ' ').trim(), mots: 0 });
        enTitre = null;
      }
      continue;
    }
    if (autoferme) continue;
    if (BRUTS.has(nom) && !exclus.length) {
      const fin = new RegExp(`</${nom}\\s*>`, 'ig');
      fin.lastIndex = re.lastIndex;
      re.lastIndex = fin.exec(source) ? fin.lastIndex : source.length;
    } else if (EXCLUS.has(nom)) exclus.push(nom);
    else if (TITRE.test(nom) && !exclus.length) enTitre = '';
  }
  return parties;
}

// Problèmes de longueur d'une page : [{ raison, detail }], `raison` valant 'page-trop-longue' ou 'partie-trop-longue'.
// Une partie trop longue est citée avec le titre qui la précède.
export function problemesDeLongueur(html) {
  const parties = partiesDe(html);
  const problemes = [];
  const total = parties.reduce((s, p) => s + p.mots, 0);
  if (total > MOTS_PAGE_MAX) {
    problemes.push({ raison: 'page-trop-longue', detail: `${total} mots (au plus ${MOTS_PAGE_MAX}, hors quiz, légendes, crédits et encart)` });
  }
  for (const p of parties) {
    if (p.mots > MOTS_PARTIE_MAX) {
      problemes.push({ raison: 'partie-trop-longue', detail: `${p.mots} mots d'un seul tenant ${p.titre ? `sous « ${p.titre} »` : 'avant le premier titre'} (au plus ${MOTS_PARTIE_MAX} sans titre)` });
    }
  }
  return problemes;
}
