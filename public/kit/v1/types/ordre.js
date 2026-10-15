// Kit v1 — type `ordre` (spec #48, ticket #70) : remettre dans l'ordre les étapes d'un processus, les événements d'une
// histoire ou les mots d'une phrase. Le Kit les montre mélangés ; l'Élève les déplace en touchant (ou en glissant).
// Écrit par le prof : { elements: [texte…] }, de 3 à 10 éléments tous différents, dans le BON ordre.
// Réponse de l'Élève : les index des éléments (dans `elements`) dans l'ordre qu'il propose.
// Crédit partiel : part des éléments à leur place exacte. Un ordre mélangé au hasard n'en place qu'un en moyenne : un
// bon score est difficile à obtenir par hasard (spec #48, US20). Détail transmis : { ordre: [élément…] }, l'ordre proposé.
import { textes, indexDistincts } from './commun.js';

export const ELEMENTS_A_ORDONNER_MIN = 3;
export const ELEMENTS_A_ORDONNER_MAX = 10;
export const SEPARATEUR = ' → ';

// Positions (dans `reponse`) des éléments à leur place exacte ; les autres sont mal placés (le rendu les marque).
export const bienPlaces = (reponse) => reponse.flatMap((v, i) => (v === i ? [i] : []));

export const ordre = {
  valider(q) {
    const elements = textes(q.elements, { nombreMax: ELEMENTS_A_ORDONNER_MAX });
    if (!elements || elements.length < ELEMENTS_A_ORDONNER_MIN || new Set(elements).size !== elements.length) return null;
    return { elements };
  },
  corriger(q, reponse) {
    const bonne = q.elements.join(SEPARATEUR);
    if (!indexDistincts(reponse, q.elements.length, q.elements.length)) return { points: 0, bonne, choisie: null };
    const propose = reponse.map((i) => q.elements[i]);
    return { points: bienPlaces(reponse).length / q.elements.length, bonne, choisie: propose.join(SEPARATEUR), detail: { ordre: propose } };
  },
  lireDetail(brut) {
    const elements = textes(brut?.ordre, { nombreMax: ELEMENTS_A_ORDONNER_MAX });
    return elements?.length ? { ordre: elements } : null;
  },
};
