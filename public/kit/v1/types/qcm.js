// Kit v1 — type `qcm` : choisir la bonne réponse parmi 2 à 5 (format d'origine de la v1).
//   { reponses: [texte…], bonne: <index dans reponses> }
// Réponse de l'Élève : index de la réponse choisie (avant mélange).
import { texte, estIndex } from './commun.js';

export const qcm = {
  valider(q) {
    if (!Array.isArray(q.reponses) || q.reponses.length < 2) return null;
    const reponses = q.reponses.map((r) => texte(r));
    if (!reponses.every(Boolean) || !estIndex(q.bonne, reponses.length)) return null;
    return { reponses, bonne: q.bonne };
  },
  corriger(q, reponse) {
    const bonne = q.reponses[q.bonne];
    if (!estIndex(reponse, q.reponses.length)) return { points: 0, bonne, choisie: null };
    return { points: reponse === q.bonne ? 1 : 0, bonne, choisie: q.reponses[reponse] };
  },
};
