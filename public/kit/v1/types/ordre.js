// Kit v1 — type `ordre` (spec #48, ticket #70) : remettre dans l'ordre les étapes d'un processus, les événements d'une
// histoire ou les mots d'une phrase. Le Kit les montre mélangés ; l'Élève les déplace en touchant (ou en glissant).
// Écrit par le prof : { elements: [texte…] }, de 3 à 10 éléments tous différents, dans le BON ordre.
// Réponse de l'Élève : les index des éléments (dans `elements`) dans l'ordre qu'il propose.
// Crédit partiel : part des éléments déjà dans le bon ordre entre eux (plus longue suite croissante), c'est-à-dire tous
// sauf ceux qu'il faudrait déplacer. Détail transmis : { ordre: [élément…] }, l'ordre proposé.
import { textes, indexDistincts } from './commun.js';

export const ELEMENTS_MIN = 3;
export const ELEMENTS_MAX = 10;
export const SEPARATEUR = ' → ';

// Positions (dans `reponse`) des éléments déjà dans le bon ordre entre eux : une plus longue suite croissante.
// Les autres sont ceux à déplacer (le rendu les marque).
export function bienPlaces(reponse) {
  const fins = []; // fins[k] : position de la fin de la meilleure suite de longueur k + 1
  const precedent = [];
  reponse.forEach((v, i) => {
    let k = fins.findIndex((j) => reponse[j] >= v);
    if (k < 0) k = fins.length;
    fins[k] = i;
    precedent[i] = k > 0 ? fins[k - 1] : -1;
  });
  const positions = [];
  for (let i = fins.at(-1) ?? -1; i >= 0; i = precedent[i]) positions.unshift(i);
  return positions;
}

export const ordre = {
  valider(q) {
    const elements = textes(q.elements, { nombreMax: ELEMENTS_MAX });
    if (!elements || elements.length < ELEMENTS_MIN || new Set(elements).size !== elements.length) return null;
    return { elements };
  },
  corriger(q, reponse) {
    const bonne = q.elements.join(SEPARATEUR);
    if (!indexDistincts(reponse, q.elements.length, q.elements.length)) return { points: 0, bonne, choisie: null };
    const propose = reponse.map((i) => q.elements[i]);
    return { points: bienPlaces(reponse).length / q.elements.length, bonne, choisie: propose.join(SEPARATEUR), detail: { ordre: propose } };
  },
  lireDetail(brut) {
    const elements = textes(brut?.ordre, { nombreMax: ELEMENTS_MAX });
    return elements?.length ? { ordre: elements } : null;
  },
};
