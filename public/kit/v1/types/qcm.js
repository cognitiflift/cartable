// Kit v1 — type `qcm` : choisir la bonne réponse parmi 2 à 5 (format d'origine de la v1).
//   { reponses: [texte…], bonne: <index dans reponses>, raisons?: [texte|null…] }
// `raisons` (ajout compatible de la v1, spec #145 ticket #149) : « pourquoi c'est faux », une phrase par réponse fausse,
// dans l'ordre de `reponses` (null ou absente pour la bonne réponse). Une liste qui n'a pas la longueur de `reponses`
// est ignorée en entier, une entrée mal formée (ou attachée à la bonne réponse) seule ; la question reste.
// Réponse de l'Élève : index de la réponse choisie (avant mélange).
import { texte, estIndex } from './commun.js';

// Raisons d'un QCM validé : liste de la longueur de `reponses`, avec null pour la bonne réponse ou une entrée écartée ;
// absente s'il n'en reste aucune.
function raisonsValides(brut, reponses, bonne) {
  if (!Array.isArray(brut) || brut.length !== reponses.length) return {};
  const raisons = brut.map((r, i) => (i === bonne ? null : texte(r)));
  return raisons.some(Boolean) ? { raisons } : {};
}

export const qcm = {
  valider(q) {
    if (!Array.isArray(q.reponses) || q.reponses.length < 2) return null;
    const reponses = q.reponses.map((r) => texte(r));
    if (!reponses.every(Boolean) || !estIndex(q.bonne, reponses.length)) return null;
    return { reponses, bonne: q.bonne, ...raisonsValides(q.raisons, reponses, q.bonne) };
  },
  reponseAttendue: (q) => q.bonne,
  corriger(q, reponse) {
    const bonne = q.reponses[q.bonne];
    if (!estIndex(reponse, q.reponses.length)) return { points: 0, bonne, choisie: null };
    const raison = reponse === q.bonne ? null : q.raisons?.[reponse];
    return { points: reponse === q.bonne ? 1 : 0, bonne, choisie: q.reponses[reponse], ...(raison && { raison }) };
  },
};
