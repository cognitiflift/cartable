// Kit v1 — type `classer` (spec #48, ticket #71) : ranger des éléments dans deux à quatre catégories, pour apprendre
// ce qui les distingue. Le Kit mélange les éléments ; l'Élève touche un élément puis la catégorie où il le range.
// Écrit par le prof : { categories: [{ nom, elements: [texte…] }…] }, de 2 à 4 catégories aux noms différents, au
// moins deux non vides (une catégorie vide est un piège permis), de 3 à 12 éléments en tout, tous différents.
// Réponse de l'Élève : pour chaque élément (dans l'ordre de elementsDe), l'index de la catégorie choisie.
// Crédit partiel : part des éléments bien rangés. Détail transmis : { categories: [{ nom, elements }…] }, son rangement.
import { texte, textes, estIndex } from './commun.js';

export const CATEGORIES_MIN = 2;
export const CATEGORIES_MAX = 4;
export const CATEGORIES_NON_VIDES_MIN = 2; // une catégorie vide est un piège permis, pas toutes
export const ELEMENTS_A_CLASSER_MIN = 3;
export const ELEMENTS_A_CLASSER_MAX = 12;

// Catégories lisibles [{ nom, elements }…] (au plus CATEGORIES_MAX, ELEMENTS_A_CLASSER_MAX éléments en tout, sans
// doublon de nom ni d'élément), ou null.
function lireCategories(v) {
  if (!Array.isArray(v) || v.length > CATEGORIES_MAX) return null;
  const categories = v.map((c) => {
    const [nom, elements] = [texte(c?.nom), textes(c?.elements, { nombreMax: ELEMENTS_A_CLASSER_MAX })];
    return nom && elements ? { nom, elements } : null;
  });
  if (!categories.every(Boolean)) return null;
  const tous = categories.flatMap((c) => c.elements);
  if (tous.length > ELEMENTS_A_CLASSER_MAX || new Set(tous).size !== tous.length) return null;
  if (new Set(categories.map((c) => c.nom)).size !== categories.length) return null;
  return categories;
}

// Éléments à ranger, avant mélange : [{ texte, categorie }…], catégorie par catégorie, dans l'ordre écrit par le prof.
export const elementsDe = (q) => q.categories.flatMap((c, categorie) => c.elements.map((t) => ({ texte: t, categorie })));

// Rangement en texte, pour le prof et les lecteurs de résultats : « Mammifères : la baleine ; Oiseaux : — ».
const texteDe = (categories) => categories.map((c) => `${c.nom} : ${c.elements.join(', ') || '—'}`).join(' ; ');

export const classer = {
  valider(q) {
    const categories = lireCategories(q.categories);
    if (!categories || categories.length < CATEGORIES_MIN) return null;
    if (categories.filter((c) => c.elements.length).length < CATEGORIES_NON_VIDES_MIN) return null;
    if (categories.flatMap((c) => c.elements).length < ELEMENTS_A_CLASSER_MIN) return null;
    return { categories };
  },
  reponseAttendue: (q) => elementsDe(q).map((e) => e.categorie),
  corriger(q, reponse) {
    const elements = elementsDe(q);
    const bonne = texteDe(q.categories);
    if (!Array.isArray(reponse) || reponse.length !== elements.length || !reponse.every((c) => estIndex(c, q.categories.length))) {
      return { points: 0, bonne, choisie: null };
    }
    const categories = q.categories.map(({ nom }, c) => ({ nom, elements: elements.filter((_, i) => reponse[i] === c).map((e) => e.texte) }));
    const points = elements.filter((e, i) => reponse[i] === e.categorie).length / elements.length;
    return { points, bonne, choisie: texteDe(categories), detail: { categories } };
  },
  lireDetail(brut) {
    const categories = lireCategories(brut?.categories);
    return categories?.length ? { categories } : null;
  },
};
