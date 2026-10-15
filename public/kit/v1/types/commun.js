// Kit v1 — outils communs à la validation de tous les types de questions (sans DOM, importés aussi par le serveur).

// Limites communes : au-delà, un texte est tronqué (jamais écarté) et les questions en trop sont ignorées.
export const QUESTIONS_MAX = 50;
export const ID_MAX = 100;
export const TEXTE_MAX = 500;

// Texte non vide, sans espaces autour, tronqué à `max` caractères ; null sinon.
export const texte = (v, max = TEXTE_MAX) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max).trim() : null);

// Numéros entiers de 1 à `max`, sans doublon.
export const numeros = (v, max = Infinity) => (Array.isArray(v) ? [...new Set(v.filter((n) => Number.isInteger(n) && n >= 1 && n <= max))] : []);

// Index entier valide dans une liste de `longueur` éléments.
export const estIndex = (i, longueur) => Number.isInteger(i) && i >= 0 && i < longueur;

// Permutation d'index tous différents, chacun valide dans une liste de `longueur` éléments, de `nombre` éléments.
export const indexDistincts = (r, nombre, longueur) =>
  Array.isArray(r) && r.length === nombre && r.every((i) => estIndex(i, longueur)) && new Set(r).size === r.length;

// Liste de textes valides (tronqués à `max`), au plus `nombreMax`, ou null si un élément n'en est pas un.
export function textes(v, { max = TEXTE_MAX, nombreMax = Infinity } = {}) {
  if (!Array.isArray(v) || v.length > nombreMax) return null;
  const lus = v.map((t) => texte(t, max));
  return lus.every(Boolean) ? lus : null;
}
