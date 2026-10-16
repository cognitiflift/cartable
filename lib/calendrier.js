// Calendrier de Mes badges (spec #89, ticket #99) : les Jours travaillés de l'Élève, pâles quand il a travaillé,
// pleins quand l'Objectif du jour est atteint, avec 🛡️ quand un Joker a couvert le jour ; pour chaque jour, ce qui a
// été fait (Leçons travaillées, nombre de quiz et de Révisions du jour) et gagné (Étoiles, Fusées, Paliers de Badge).
// Il raconte les efforts, pas les notes : aucun score ni pourcentage n'en sort.
// Module pur : il reçoit les Leçons déjà lues (lireLecon), les événements de l'Élève et la date « maintenant » (ms).

import { jourLocal } from './jour.js';
import { activiteParJour, atteint, joursCouvertsParJoker, joursTravailles } from './rythme.js';
import { joursDeRevisionTerminee } from './revision-du-jour.js';
import { recompensesDeLEleve } from './recompenses.js';

const valide = (date) => typeof date === 'string' && !Number.isNaN(Date.parse(date));
const jourDe = (date) => jourLocal(Date.parse(date));

// Calendrier à `maintenant` : { aujourdhui, jours }. `jours` : un par jour qui a quelque chose à montrer, dans l'ordre,
// { jour, etat, joker, lecons, quiz, revisions } ; `etat` : « plein » (Objectif du jour atteint), « pale » (Jour
// travaillé) ou « vide » ; `joker` : jour couvert par un Joker (voir joursCouvertsParJoker) ; `lecons` : Leçons
// travaillées ce jour-là, [{ id, titre }] ; `quiz` : quiz faits (Pré-test compris, un quiz refait comptant chaque fois) ;
// `revisions` : Révisions du jour menées jusqu'au bout (événements `revision-terminee` ; une pour un jour d'avant ces
// événements, voir joursDeRevisionTerminee) ; `gains` : { etoiles, fusees, paliers } gagnés ce jour-là, `paliers` étant
// les Paliers de Badge obtenus [{ id, emoji, nom, palier }].
// `paliers` : Paliers de Badge obtenus, [{ id, emoji, nom, palier, jour }] (voir paliersObtenus).
export function calendrier({ lecons = [], evenements = [], paliers = [], maintenant }) {
  const aujourdhui = jourLocal(maintenant);
  const activite = activiteParJour(lecons);
  const jours = new Map();
  const jour = (j) => {
    if (!jours.has(j)) jours.set(j, { jour: j, etat: 'vide', joker: false, lecons: [], quiz: 0, revisions: 0, gains: { etoiles: 0, fusees: 0, paliers: [] } });
    return jours.get(j);
  };
  for (const l of lecons) {
    // Réponses de l'Élève : quiz (scores, Pré-test compris) et réponses de Révision du jour (journal des Questions).
    const reponses = [
      ...(l.scores ?? []).map((s) => ({ date: s.date, quiz: true })),
      ...(l.questions ?? []).flatMap((q) => q.journal ?? []).filter((r) => r.origine === 'revision').map((r) => ({ date: r.date, quiz: false })),
    ];
    for (const r of reponses.filter((x) => valide(x.date) && jourDe(x.date) <= aujourdhui)) {
      const d = jour(jourDe(r.date));
      if (!d.lecons.some((x) => x.id === l.id)) d.lecons.push({ id: l.id, titre: l.titre });
      if (r.quiz) d.quiz++;
    }
  }
  // Jours travaillés (au moins une réponse, voir joursTravailles) : pâles, pleins quand l'Objectif du jour est atteint.
  for (const j of joursTravailles(lecons).filter((x) => x <= aujourdhui)) jour(j).etat = atteint(activite[j]) ? 'plein' : 'pale';
  const terminees = evenements.filter((e) => e.type === 'revision-terminee' && valide(e.date)).map((e) => jourDe(e.date));
  for (const j of joursDeRevisionTerminee(lecons, evenements, maintenant).filter((j) => j <= aujourdhui)) {
    jour(j).revisions = Math.max(1, terminees.filter((t) => t === j).length);
  }
  // Étoiles (Leçons et Révisions du jour) et Fusées, chacune au jour où elle a été gagnée (voir recompensesDeLEleve).
  const { etoiles, fusees } = recompensesDeLEleve({ lecons, evenements, maintenant });
  for (const j of etoiles.filter((x) => x <= aujourdhui)) jour(j).gains.etoiles++;
  for (const j of fusees.filter((x) => x <= aujourdhui)) jour(j).gains.fusees++;
  for (const { id, emoji, nom, palier, jour: j } of paliers) {
    if (j <= aujourdhui) jour(j).gains.paliers.push({ id, emoji, nom, palier });
  }
  for (const j of joursCouvertsParJoker(activite, maintenant)) jour(j).joker = true;
  return { aujourdhui, jours: [...jours.values()].sort((x, y) => x.jour.localeCompare(y.jour)) };
}

// Paliers de Badge obtenus d'après le fichier de Badges (jamais retirés), nommés d'après le calcul (calculerBadges) :
// [{ id, emoji, nom, palier, jour }], pour les gains du calendrier.
export const paliersObtenus = (fichier, calcul) => calcul.flatMap(({ id, emoji, nom }) =>
  Object.entries(fichier?.badges?.[id] ?? {}).map(([palier, { jour }]) => ({ id, emoji, nom, palier, jour })));
