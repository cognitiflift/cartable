// Récompenses de l'Élève (spec #89, ticket #96) : ses Étoiles et ses Fusées, toutes Leçons et Révisions du jour
// confondues, chacune datée du jour local où elle a été gagnée. Elles servent aux Badges ⭐ Collection d'Étoiles et
// 🚀 Curieux, au total de Mes badges et à la Vue parent. Module pur : il reçoit les Leçons déjà lues (lireLecon), les
// événements de l'Élève (lireEvenements) et la date « maintenant » (ms).

import { dateValide as valide, jourLocal } from './jour.js';
import { etoilesDesPages, fuseesDesPages, estPretest, depassementReussi, QUIZ_REUSSI } from './store.js';
import { joursDeRevisionTerminee } from './revision-du-jour.js';

// Étoiles d'une Leçon, chacune datée (date ISO, null pour un ancien score sans date). En Leçon libre : une par page
// réussie. En Leçon de révision, les 3 Étoiles nommées (voir etoilesLecon) : quiz et bonus datés par le premier score
// qui les a gagnées, defi par la fin de la Leçon.
function etoilesDeLecon({ scores = [], mode, terminee }) {
  if (mode === 'libre') return etoilesDesPages(scores, mode).map((e) => e.date);
  const comptes = scores.filter((s) => !estPretest(s));
  const quiz = comptes.find((s) => s.defi !== true && s.score >= QUIZ_REUSSI);
  const bonus = comptes.find((s) => depassementReussi(s.bonus));
  return [quiz, bonus].filter(Boolean).map((s) => s.date ?? null).concat(terminee ? [terminee] : []);
}

// Étoiles et Fusées de l'Élève, sous forme de jours locaux triés (AAAA-MM-JJ), un par récompense :
// { etoiles, fusees }. Étoiles : celles des Leçons, et une par jour de Révision du jour menée jusqu'au bout. Une
// récompense sans date (anciens scores) compte pour aujourd'hui.
export function recompensesDeLEleve({ lecons = [], evenements = [], maintenant }) {
  const jour = (date) => jourLocal(valide(date) ? Date.parse(date) : maintenant);
  const etoiles = [
    ...lecons.flatMap((l) => etoilesDeLecon(l).map(jour)),
    ...joursDeRevisionTerminee(lecons, evenements, maintenant),
  ];
  const fusees = lecons.flatMap((l) => fuseesDesPages(l.scores ?? [], l.mode).map((f) => jour(f.date)));
  return { etoiles: etoiles.sort(), fusees: fusees.sort() };
}

// Total d'Étoiles et de Fusées de l'Élève : { etoiles, fusees } (Mes badges, Vue parent).
export function totauxRecompenses(contexte) {
  const { etoiles, fusees } = recompensesDeLEleve(contexte);
  return { etoiles: etoiles.length, fusees: fusees.length };
}
