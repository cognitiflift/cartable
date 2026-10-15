// Vue parent (spec #49, ticket #77) : ce que le parent voit d'un Élève, agrégé à partir des données existantes
// (journal des Questions, scores, Objectifs, dates de contrôle, coût). Aucun tour du prof, rien d'enregistré en plus.
// Module pur : il reçoit les Leçons déjà lues par lireLecon à `maintenant` et le coût lu par lireCouts.

import { jourLocal } from './jour.js';
import { horsPretest } from './store.js';
import { estDue } from './revisions.js';
import { indicateurs } from './indicateurs.js';

export const JOURS_VUE_PARENT = 7; // « ces derniers jours » : aujourd'hui et les 6 jours d'avant, en jours locaux

// Les `nombre` derniers jours locaux jusqu'à `maintenant` compris, du plus ancien au plus récent (AAAA-MM-JJ).
function derniersJours(maintenant, nombre) {
  const d = new Date(maintenant);
  return Array.from({ length: nombre }, (_, i) => jourLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (nombre - 1 - i), 12)));
}

// Activité jour par jour : réponses aux Révisions du jour (dont justes) et quiz de page faits (hors Pré-test).
function activiteParJour(lecons, maintenant) {
  const jours = derniersJours(maintenant, JOURS_VUE_PARENT).map((jour) => ({ jour, revisions: 0, justes: 0, quiz: 0 }));
  const parJour = new Map(jours.map((j) => [j.jour, j]));
  for (const lecon of lecons) {
    for (const q of lecon.questions ?? []) {
      for (const r of q.journal ?? []) {
        const j = r.origine === 'revision' && parJour.get(jourLocal(r.date));
        if (!j) continue;
        j.revisions += 1;
        if (r.juste) j.justes += 1;
      }
    }
    for (const s of horsPretest(lecon.scores)) {
      const j = s.date && parJour.get(jourLocal(s.date));
      if (j) j.quiz += 1;
    }
  }
  return jours;
}

// Objectifs Retenus, et fragiles : atteints mais pas (ou plus) Retenus, là où l'Élève a besoin d'aide pour retenir.
function objectifsDesLecons(lecons) {
  const avecLecon = (lecon) => (o) => ({ lecon: lecon.id, titreLecon: lecon.titre, texte: o.texte });
  return {
    retenus: lecons.flatMap((l) => (l.objectifs ?? []).filter((o) => o.retenu).map(avecLecon(l))),
    fragiles: lecons.flatMap((l) => (l.objectifs ?? []).filter((o) => o.atteint && !o.retenu).map(avecLecon(l))),
  };
}

// Questions fragiles : moins de SEUIL_FRAGILE de chances de s'en souvenir aujourd'hui (le seuil du palier « acquis » de
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
    jours: activiteParJour(lecons, maintenant),
    objectifs: objectifsDesLecons(lecons),
    questionsFragiles: questionsFragiles(lecons),
    controles: controlesAVenir(lecons, maintenant),
    cout: coutDesLecons(couts),
    indicateurs: indicateurs(evenements, { maintenant }),
  };
}
