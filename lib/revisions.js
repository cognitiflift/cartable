// Révisions du jour (spec #47, ticket #66 ; ADR 0006) : les Questions de toutes les Leçons d'un Élève dont la
// révision est due, servies par l'appli sans tour du prof, en séries courtes, mélangées entre Leçons.
// Module pur : il reçoit les Leçons déjà lues (avec la mémoire de leurs Questions, voir lib/memoire.js) et la date
// « maintenant » ; la lecture des fichiers est dans lib/store.js.

import { contenuAServir } from './variantes.js';
import { jourLocal, debutDuJour, finDuJour } from './jour.js';

export const SERIE_MAX = 10; // Questions par série : courte, pour pouvoir s'arrêter quand on veut

// Une Question est due quand sa prochaine révision tombe aujourd'hui ou avant. On compare des jours locaux (voir
// lib/jour.js), pas des heures : une Question répondue hier à 16 h est due dès ce matin.
export const estDue = (question, maintenant) =>
  question.prochaineRevision != null && Date.parse(question.prochaineRevision) <= finDuJour(maintenant);

// Question déjà répondue aujourd'hui (quiz de page ou révision) : « continuer » ne la repropose pas.
const repondueAujourdhui = (question, maintenant) =>
  question.journal.some((r) => Date.parse(r.date) >= debutDuJour(maintenant));

// Urgence : la révision la plus en retard d'abord, puis la plus fragile (probabilité de se souvenir la plus basse).
const parUrgence = (a, b) => Date.parse(a.prochaineRevision) - Date.parse(b.prochaineRevision) || (a.rappel ?? 0) - (b.rappel ?? 0);

// Date de contrôle (#68) : une Leçon dont le contrôle est aujourd'hui ou à venir passe avant les autres.
const controleAVenir = (lecon, maintenant) =>
  typeof lecon.dateControle === 'string' && lecon.dateControle >= jourLocal(maintenant);

// Entrelacement : dans l'ordre d'urgence, on prend la plus urgente qui ne vient pas de la même Leçon que la
// précédente, s'il y en a une ; deux Questions de suite d'une même Leçon seulement quand il ne reste qu'elle.
function entrelacer(questions) {
  const restantes = [...questions];
  const serie = [];
  while (restantes.length) {
    const i = Math.max(0, restantes.findIndex((q) => q.lecon !== serie.at(-1)?.lecon));
    serie.push(...restantes.splice(i, 1));
  }
  return serie;
}

// Ce qu'une Révision du jour montre d'une Question : de quoi l'afficher avec le rendu du Kit (la bonne réponse
// comprise, comme dans la Page de leçon ; le serveur corrige quand même lui-même) et ouvrir sa Page de leçon d'origine.
// La Question est servie telle quelle ou sous une de ses Variantes (#69), au hasard ; `variante` (index) est alors
// renvoyé avec la réponse. Toutes partagent la mémoire de la Question.
const aReviser = (lecon, q) => ({
  lecon: lecon.id, titreLecon: lecon.titre, page: q.page, id: q.id,
  ...contenuAServir(q),
  rappel: q.rappel, prochaineRevision: q.prochaineRevision,
});

// Série de Révisions du jour. `lecons` : [{ id, titre, dateControle?, questions }] (questions lues par lireLecon à `maintenant`).
// Renvoie `dues` (nombre de Questions dues aujourd'hui, toutes Leçons) et `questions` : au plus `max` d'entre elles,
// les plus urgentes, entrelacées entre Leçons. `suite: true` (« continuer » après les révisions du jour) : les
// Questions pas encore dues ni répondues aujourd'hui, les plus proches de leur révision d'abord.
// Les Questions des Leçons avec un contrôle à venir (#68) passent en premier, entrelacées entre elles, puis les autres.
export function revisionsDuJour(lecons, { maintenant, suite = false, max = SERIE_MAX }) {
  const toutes = lecons.flatMap((l) => {
    const prioritaire = controleAVenir(l, maintenant);
    return l.questions.filter((q) => q.prochaineRevision != null).map((q) => ({ ...aReviser(l, q), journal: q.journal, prioritaire }));
  });
  const dues = toutes.filter((q) => estDue(q, maintenant));
  const choisies = suite ? toutes.filter((q) => !estDue(q, maintenant) && !repondueAujourdhui(q, maintenant)) : dues;
  const retenues = [...choisies].sort((a, b) => b.prioritaire - a.prioritaire || parUrgence(a, b)).slice(0, max);
  const serie = [...entrelacer(retenues.filter((q) => q.prioritaire)), ...entrelacer(retenues.filter((q) => !q.prioritaire))]
    .map(({ journal, prioritaire, ...q }) => q);
  return { dues: dues.length, questions: serie };
}
