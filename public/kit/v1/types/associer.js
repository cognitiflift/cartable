// Kit v1 — type `associer` (spec #48, ticket #71) : relier deux colonnes (dieu et domaine, mot et définition, pays et
// capitale). Le Kit mélange chaque colonne ; l'Élève touche un élément de gauche puis celui de droite qui va avec.
// Écrit par le prof : { paires: [[gauche, droite]…] }, de 3 à 8 paires, sans doublon dans une même colonne.
// Réponse de l'Élève : pour chaque élément de gauche (dans l'ordre des paires), l'index (dans `paires`) de l'élément de
// droite qu'il lui a relié, chacun une fois. Crédit partiel : part des paires justes.
// Détail transmis : { paires: [[gauche, droite reliée]…] }.
import { textes, indexDistincts } from './commun.js';

export const PAIRES_MIN = 3;
export const PAIRES_MAX = 8;

// Paires lisibles [[gauche, droite]…] (au plus PAIRES_MAX, sans doublon dans une colonne), ou null.
function lirePaires(v) {
  if (!Array.isArray(v) || v.length > PAIRES_MAX) return null;
  const paires = v.map((p) => (Array.isArray(p) && p.length === 2 ? textes(p) : null));
  if (!paires.every(Boolean)) return null;
  for (const colonne of [0, 1]) if (new Set(paires.map((p) => p[colonne])).size !== paires.length) return null;
  return paires;
}

// Paires en texte, pour le prof et les lecteurs de résultats : « Zeus : le ciel ; Poséidon : la mer ».
const texteDes = (paires) => paires.map((p) => p.join(' : ')).join(' ; ');

export const associer = {
  valider(q) {
    const paires = lirePaires(q.paires);
    return paires && paires.length >= PAIRES_MIN ? { paires } : null;
  },
  corriger(q, reponse) {
    const bonne = texteDes(q.paires);
    if (!indexDistincts(reponse, q.paires.length, q.paires.length)) return { points: 0, bonne, choisie: null };
    const paires = q.paires.map(([gauche], i) => [gauche, q.paires[reponse[i]][1]]);
    const points = reponse.filter((j, i) => j === i).length / q.paires.length;
    return { points, bonne, choisie: texteDes(paires), detail: { paires } };
  },
  lireDetail(brut) {
    const paires = lirePaires(brut?.paires);
    return paires?.length ? { paires } : null;
  },
};
