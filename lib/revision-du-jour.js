// Révision du jour menée jusqu'au bout (spec #89, ticket #94) : quand l'Élève a répondu à chaque Question d'une série,
// l'appli enregistre l'événement daté { type: 'revision-terminee', date }. La première de la journée rapporte une
// Étoile à l'Élève (pas à une Leçon), quel que soit le score. Les jours qui en ont une servent aussi aux Badges et au
// calendrier. Module pur : il reçoit les Leçons déjà lues (lireLecon) et les événements de l'Élève (lireEvenements).

import { dateValide, jourDe, jourLocal } from './jour.js';
import { reponsesDeRevision } from './rythme.js';

// Événements `revision-terminee` bien datés de l'Élève.
const terminees = (evenements = []) => evenements.filter((e) => e.type === 'revision-terminee' && dateValide(e.date));

// Jours locaux (AAAA-MM-JJ, triés, chacun une fois) où l'Élève a mené une Révision du jour jusqu'au bout.
// Un jour compte s'il a un événement `revision-terminee`. Pour le passé, avant que l'appli ne les enregistre : les jours
// strictement antérieurs au tout premier événement ET au jour de `maintenant` (ms) comptent s'ils ont au moins une
// réponse de Révision du jour (journal des Questions, origine « revision »). Aujourd'hui ne compte que par l'événement :
// une série commencée mais pas finie ne compte pas, ni avant ni après le premier événement.
export function joursDeRevisionTerminee(lecons = [], evenements = [], maintenant) {
  const jours = new Set(terminees(evenements).map((e) => jourDe(e.date)));
  const limite = [jourLocal(maintenant), ...jours].sort()[0];
  for (const jour of lecons.flatMap(reponsesDeRevision).map((r) => jourDe(r.date))) {
    if (jour < limite) jours.add(jour);
  }
  return [...jours].sort();
}

// Étoile de la Révision du jour : la série menée jusqu'au bout à `maintenant` en rapporte une si aucun événement
// `revision-terminee` n'est encore noté ce jour-là (les réponses du jour, sans événement, ne l'ont pas encore donnée).
export const etoileDuJour = (evenements = [], maintenant) =>
  !terminees(evenements).some((e) => jourDe(e.date) === jourLocal(maintenant));
