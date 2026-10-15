import { HttpError } from './http-error.js';
import { lireResultats, scoreDesQuestions, bonusDesQuestions } from '../public/kit/v1/quiz-logique.js';

// Résultats par question d'un quiz, tels qu'envoyés par le Kit (`questions` du message `cartable-score`) et enregistrés
// avec le score (`scores[].questions` de etat.json ; absent des scores sans résultats et des anciens scores) :
//   { id: string,            identifiant stable de la question dans sa page
//     enonce: string,        texte de la question
//     choisie: string,       texte de la réponse choisie par l'Élève
//     bonne: string,         texte de la bonne réponse
//     juste: boolean,
//     bonus: boolean,        question bonus du Dépassement (hors score)
//     objectifs: number[],   numéros des Objectifs qu'elle couvre (existants seulement)
//     sur?: boolean }        Confiance : true = « sûr », false = « pas sûr » ; absente des anciens résultats, ignorée si invalide
// Validés par le Kit lui-même (lireResultats), avec les limites de son quiz : une question mal formée est ignorée sans
// erreur, un texte trop long tronqué.

// Score d'un quiz, en % de 0 à 100, arrondi ; absent, vide ou hors bornes = 400.
export function validerScore(score) {
  const valeur = Number(score);
  if (score === null || score === '' || !Number.isFinite(valeur) || valeur < 0 || valeur > 100) {
    throw new HttpError(400, 'Score invalide (0 à 100)');
  }
  return Math.round(valeur);
}

// Résultat des questions bonus du Dépassement, hors score : { reussies, total }, total de 1 à 3,
// reussies de 0 au total. null = absent ou invalide (ignoré sans erreur).
export function validerBonus(bonus) {
  const reussies = Number(bonus?.reussies);
  const total = Number(bonus?.total);
  if (!Number.isInteger(total) || total < 1 || total > 3) return null;
  if (!Number.isInteger(reussies) || reussies < 0 || reussies > total) return null;
  return { reussies, total };
}

// Résultat d'un quiz reçu de la page. Les questions valides font foi : le score est recalculé sur celles hors bonus,
// et le résultat bonus tiré des seules questions bonus (aucun sans question bonus). Sans questions valides, le score
// et le bonus envoyés font foi (anciennes Leçons). Score invalide sans question hors bonus = 400 (validerScore).
export function resultatQuiz({ score, bonus, questions }, nombreObjectifs = Infinity) {
  const valides = lireResultats(questions, nombreObjectifs);
  return {
    score: scoreDesQuestions(valides) ?? validerScore(score),
    bonus: validerBonus(valides.length ? bonusDesQuestions(valides) : bonus),
    questions: valides,
  };
}
