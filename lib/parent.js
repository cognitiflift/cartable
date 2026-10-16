// Vue parent (spec #49, ticket #77) : ce que le parent voit d'un Élève, agrégé à partir des données existantes
// (journal des Questions, scores, Objectifs, dates de contrôle, coût). Aucun tour du prof, rien d'enregistré en plus.
// Module pur : il reçoit les Leçons déjà lues par lireLecon à `maintenant` et le coût lu par lireCouts.

import { jourLocal, minuitDu } from './jour.js';
import { activiteParJour } from './rythme.js';
import { estDue } from './revisions.js';
import { indicateurs } from './indicateurs.js';

export const JOURS_VUE_PARENT = 7; // « ces derniers jours » : aujourd'hui et les 6 jours d'avant, en jours locaux

// Activité des JOURS_VUE_PARENT derniers jours locaux jusqu'à `maintenant` compris, du plus ancien au plus récent :
// réponses aux Révisions du jour (dont justes) et quiz de page faits (hors Pré-test), d'après activiteParJour.
function derniersJours(lecons, maintenant) {
  const activite = activiteParJour(lecons);
  const aujourdhui = jourLocal(maintenant);
  return Array.from({ length: JOURS_VUE_PARENT }, (_, i) => {
    const jour = jourLocal(minuitDu(aujourdhui, i + 1 - JOURS_VUE_PARENT));
    const { revisions = 0, justes = 0, quiz = 0 } = activite[jour] ?? {};
    return { jour, revisions, justes, quiz };
  });
}

// Objectifs Retenus, et fragiles : atteints mais pas (ou plus) Retenus, là où l'Élève a besoin d'aide pour retenir.
function objectifsDesLecons(lecons) {
  const avecLecon = (lecon) => (o) => ({ lecon: lecon.id, titreLecon: lecon.titre, texte: o.texte });
  return {
    retenus: lecons.flatMap((l) => (l.objectifs ?? []).filter((o) => o.retenu).map(avecLecon(l))),
    fragiles: lecons.flatMap((l) => (l.objectifs ?? []).filter((o) => o.atteint && !o.retenu).map(avecLecon(l))),
  };
}

// Questions fragiles : moins de SEUIL_FRAGILE de chances de s'en souvenir aujourd'hui (le seuil du palier « bien en tête » de
// la Maîtrise), la plus fragile d'abord, toutes Leçons confondues, au plus QUESTIONS_FRAGILES_MAX.
export const SEUIL_FRAGILE = 0.8;
export const QUESTIONS_FRAGILES_MAX = 10;
function questionsFragiles(lecons) {
  return lecons
    .flatMap((l) => (l.questions ?? [])
      .filter((q) => Number.isFinite(q.rappel) && q.rappel < SEUIL_FRAGILE)
      .map((q) => ({ lecon: l.id, titreLecon: l.titre, page: q.page, id: q.id, enonce: q.contenu?.enonce ?? '', rappel: q.rappel })))
    .sort((a, b) => a.rappel - b.rappel)
    .slice(0, QUESTIONS_FRAGILES_MAX)
    .map(({ rappel, ...q }) => ({ ...q, pourcentage: Math.round(rappel * 100) }));
}

// Contrôles à venir (aujourd'hui compris), le plus proche d'abord, avec leur préparation : la Maîtrise de la Leçon et
// le nombre de ses Questions dues aujourd'hui dans les Révisions du jour.
function controlesAVenir(lecons, maintenant) {
  return lecons
    .filter((l) => Number.isInteger(l.joursAvantControle) && l.joursAvantControle >= 0)
    .sort((a, b) => a.joursAvantControle - b.joursAvantControle)
    .map((l) => ({
      lecon: l.id, titreLecon: l.titre, dateControle: l.dateControle, joursAvant: l.joursAvantControle,
      maitrise: l.maitrise, questionsDues: (l.questions ?? []).filter((q) => estDue(q, maintenant)).length,
    }));
}

// Coût des Leçons (Coût d'un tour cumulé) : le total de l'Élève, Propositions et Variantes comprises, et le total de
// chaque Leçon, la plus coûteuse d'abord. `couts` : tel que lireCouts le renvoie.
function coutDesLecons(couts) {
  return {
    total: couts.total,
    lecons: couts.lecons.map(({ id, titre, total }) => ({ id, titre, ...total })).sort((a, b) => b.coutUsd - a.coutUsd),
  };
}

// Agrégats de la vue parent. `lecons` : Leçons complètes (lireLecon) ; `couts` : coût de l'Élève (lireCouts) ;
// `evenements` : événements datés de l'Élève (lireEvenements), pour les indicateurs (#78) sur leur période par défaut ;
// `maintenant` : ms. Chaque section est une clé de l'objet renvoyé : une section de plus s'y ajoute sans toucher aux autres.
export function vueParent(lecons, { couts, maintenant, evenements = [] }) {
  return {
    jours: derniersJours(lecons, maintenant),
    objectifs: objectifsDesLecons(lecons),
    questionsFragiles: questionsFragiles(lecons),
    controles: controlesAVenir(lecons, maintenant),
    cout: coutDesLecons(couts),
    indicateurs: indicateurs(evenements, { maintenant }),
  };
}
