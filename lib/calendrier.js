// Calendrier de Mes badges (spec #89, ticket #99) : les Jours travaillés de l'Élève, pâles quand il a travaillé,
// pleins quand l'Objectif du jour est atteint, avec 🛡️ quand un Joker a couvert le jour ; pour chaque jour, ce qui a
// été fait (Leçons travaillées, nombre de quiz et de Révisions du jour) et gagné (Étoiles, Fusées, Paliers de Badge).
// Il raconte les efforts, pas les notes : aucun score ni pourcentage n'en sort.
// Module pur : il reçoit les Leçons déjà lues (lireLecon), les événements de l'Élève et la date « maintenant » (ms).

import { jourLocal } from './jour.js';
import { activiteParJour, atteint, joursCouvertsParJoker } from './rythme.js';
import { joursDeRevisionTerminee } from './revision-du-jour.js';
import { QUIZ_REUSSI, depassementReussi, etoilesDesPages, fuseesDesPages, horsPretest } from './store.js';

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
      d.etat = atteint(activite[d.jour]) ? 'plein' : 'pale';
      if (!d.lecons.some((x) => x.id === l.id)) d.lecons.push({ id: l.id, titre: l.titre });
      if (r.quiz) d.quiz++;
    }
  }
  const terminees = evenements.filter((e) => e.type === 'revision-terminee' && valide(e.date)).map((e) => jourDe(e.date));
  for (const j of joursDeRevisionTerminee(lecons, evenements).filter((j) => j <= aujourdhui)) {
    jour(j).revisions = Math.max(1, terminees.filter((t) => t === j).length);
    jour(j).gains.etoiles++; // l'Étoile de la Révision du jour, une au plus par jour
  }
  const gagne = (date, cle) => {
    if (valide(date) && jourDe(date) <= aujourdhui) jour(jourDe(date)).gains[cle]++;
  };
  for (const l of lecons) {
    for (const { date } of etoilesDatees(l)) gagne(date, 'etoiles');
    for (const { date } of fuseesDesPages(l.scores, l.mode)) gagne(date, 'fusees');
  }
  for (const { id, emoji, nom, palier, jour: j } of paliers) {
    if (j <= aujourdhui) jour(j).gains.paliers.push({ id, emoji, nom, palier });
  }
  for (const j of joursCouvertsParJoker(activite, maintenant)) jour(j).joker = true;
  return { aujourdhui, jours: [...jours.values()].sort((x, y) => x.jour.localeCompare(y.jour)) };
}

// Étoiles d'une Leçon, chacune datée : [{ date }]. En Leçon libre, une par page réussie (etoilesDesPages) ; en Leçon de
// révision, les 3 Étoiles nommées (voir etoilesLecon) : le premier quiz réussi hors Défi, le premier Dépassement réussi
// et la fin de la Leçon (Défi réussi).
function etoilesDatees({ scores = [], mode, terminee }) {
  if (mode === 'libre') return etoilesDesPages(scores, mode);
  const hors = horsPretest(scores);
  return [
    hors.find((s) => s.defi !== true && s.score >= QUIZ_REUSSI),
    hors.find((s) => depassementReussi(s.bonus)),
    terminee ? { date: terminee } : undefined,
  ].filter(Boolean).map(({ date }) => ({ date }));
}

// Paliers de Badge obtenus d'après le fichier de Badges (jamais retirés), nommés d'après le calcul (calculerBadges) :
// [{ id, emoji, nom, palier, jour }], pour les gains du calendrier.
export const paliersObtenus = (fichier, calcul) => calcul.flatMap(({ id, emoji, nom }) =>
  Object.entries(fichier?.badges?.[id] ?? {}).map(([palier, { jour }]) => ({ id, emoji, nom, palier, jour })));
