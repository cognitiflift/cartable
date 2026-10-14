import { validerScore, validerBonus } from './store.js';

// Résultats par question d'un quiz, tels qu'envoyés par le Kit (`questions` du message `cartable-score`) et enregistrés
// avec le score (`scores[].questions` de etat.json ; absent des scores sans résultats et des anciens scores) :
//   { id: string,            identifiant stable de la question dans sa page
//     enonce: string,        texte de la question
//     choisie: string,       texte de la réponse choisie par l'Élève
//     bonne: string,         texte de la bonne réponse
//     juste: boolean,
//     bonus: boolean,        question bonus du Dépassement (hors score)
//     objectifs: number[] }  numéros des Objectifs qu'elle couvre (existants seulement)
// Une question mal formée est ignorée sans erreur.

const QUESTIONS_MAX = 50;
const ID_MAX = 100;
const TEXTE_MAX = 500;

const texte = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

function questionValide(q, nombreObjectifs) {
  if (!q || typeof q !== 'object') return null;
  const [id, enonce, choisie, bonne] = [texte(q.id, ID_MAX), texte(q.enonce, TEXTE_MAX), texte(q.choisie, TEXTE_MAX), texte(q.bonne, TEXTE_MAX)];
  if (!id || !enonce || !choisie || !bonne || typeof q.juste !== 'boolean') return null;
  const objectifs = Array.isArray(q.objectifs)
    ? [...new Set(q.objectifs.filter((n) => Number.isInteger(n) && n >= 1 && n <= nombreObjectifs))]
    : [];
  return { id, enonce, choisie, bonne, juste: q.juste, bonus: q.bonus === true, objectifs };
}

export function validerQuestions(brut, nombreObjectifs = Infinity) {
  if (!Array.isArray(brut)) return [];
  const vus = new Set();
  return brut
    .slice(0, QUESTIONS_MAX)
    .map((q) => questionValide(q, nombreObjectifs))
    .filter((q) => q && !vus.has(q.id) && vus.add(q.id));
}

// Résultat d'un quiz reçu de la page : quand des questions hors bonus sont valides, le score en est recalculé
// (% de justes, arrondi) et le résultat bonus tiré des questions bonus ; sinon le score et le bonus envoyés font foi
// (anciennes Leçons). Score invalide sans questions = 400 (validerScore).
export function resultatQuiz({ score, bonus, questions }, nombreObjectifs = Infinity) {
  const valides = validerQuestions(questions, nombreObjectifs);
  const comptees = valides.filter((q) => !q.bonus);
  const bonusPoses = valides.filter((q) => q.bonus);
  return {
    score: comptees.length ? Math.round((100 * comptees.filter((q) => q.juste).length) / comptees.length) : validerScore(score),
    bonus: (bonusPoses.length && validerBonus({ reussies: bonusPoses.filter((q) => q.juste).length, total: bonusPoses.length })) || validerBonus(bonus),
    questions: valides,
  };
}
