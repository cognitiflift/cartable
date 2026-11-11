// Vue parent (spec #49, ticket #77) : ce que le parent voit d'un Élève, agrégé à partir des données existantes
// (journal des Questions, scores, Objectifs, dates de contrôle, coût). Aucun tour du prof, rien d'enregistré en plus.
// Module pur : il reçoit les Leçons déjà lues par lireLecon à `maintenant` et le coût lu par lireCouts.

import { jourLocal, minuitDu } from './jour.js';
import { activiteParJour } from './rythme.js';
import { estDue } from './revisions.js';
import { indicateurs } from './indicateurs.js';
import { SEUIL_BIEN_EN_TETE } from './store.js';
import { calculerBadges, fusionnerBadges, paliersObtenus, PALIERS } from './badges.js';
import { vueParentCartes } from './cartes.js';
import { totauxRecompenses } from './recompenses.js';
import { questionsSuspectes } from './suspectes.js';
import { corriger, raisonSignalement, reponseAttendue } from '../public/kit/v1/quiz-logique.js';
import { questionDuContenu, estActive } from './banque.js';

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

// « Pour en parler avec lui » (#158) : des invitations à poser des questions ouvertes à l'enfant, composées d'une phrase
// préparée et d'un Objectif Retenu d'une Leçon travaillée ces JOURS_VUE_PARENT derniers jours (activité la plus récente
// de la Leçon), au plus INVITATIONS_MAX, la Leçon la plus récente d'abord. Rien d'inventé sans activité récente.
export const INVITATIONS_MAX = 3;
export const PHRASE_AUTONOMIE = 'Le plus utile : l’encourager à s’organiser et à expliquer ce qu’il a compris, plutôt que de refaire les exercices avec lui.';
function pourEnParler(lecons, maintenant) {
  const depuis = jourLocal(minuitDu(jourLocal(maintenant), 1 - JOURS_VUE_PARENT));
  const invitations = lecons
    .filter((l) => typeof l.derniereActivite === 'string' && jourLocal(Date.parse(l.derniereActivite)) >= depuis)
    .sort((a, b) => b.derniereActivite.localeCompare(a.derniereActivite))
    .flatMap((l) => (l.objectifs ?? []).filter((o) => o.retenu)
      .map((o) => ({ lecon: l.id, titreLecon: l.titre, texte: `Demande-lui de t’expliquer : ${o.texte}` })))
    .slice(0, INVITATIONS_MAX);
  return { invitations, autonomie: PHRASE_AUTONOMIE };
}

// Questions fragiles : moins de SEUIL_FRAGILE de chances de s'en souvenir aujourd'hui (le seuil du palier de Maîtrise
// « bien en tête », lib/store.js), la plus fragile d'abord, toutes Leçons confondues, au plus QUESTIONS_FRAGILES_MAX.
export const SEUIL_FRAGILE = SEUIL_BIEN_EN_TETE / 100;
export const QUESTIONS_FRAGILES_MAX = 10;
function questionsFragiles(lecons) {
  return lecons
    .flatMap((l) => (l.questions ?? [])
      .filter((q) => estActive(q) && Number.isFinite(q.rappel) && q.rappel < SEUIL_FRAGILE)
      .map((q) => ({ lecon: l.id, titreLecon: l.titre, page: q.page, id: q.id, enonce: q.contenu?.enonce ?? '', rappel: q.rappel })))
    .sort((a, b) => a.rappel - b.rappel)
    .slice(0, QUESTIONS_FRAGILES_MAX)
    .map(({ rappel, ...q }) => ({ ...q, pourcentage: Math.round(rappel * 100) }));
}

// Questions signalées (#148), à vérifier par le parent : énoncé, bonne réponse attendue, raison, auteur et date, la plus
// récemment signalée d'abord. Le parent les rétablit (retire le signalement) ou, ailleurs, signale lui-même une Question.
function questionsSignalees(lecons) {
  return lecons
    .flatMap((l) => (l.questions ?? []).filter((q) => q.signalement).map((q) => {
      const attendue = questionDuContenu(q.contenu);
      return {
        lecon: l.id, titreLecon: l.titre, page: q.page, id: q.id, enonce: q.contenu?.enonce ?? '',
        bonne: corriger(attendue, reponseAttendue(attendue)).bonne,
        raison: q.signalement.raison, libelleRaison: raisonSignalement(q.signalement.raison)?.libelle ?? q.signalement.raison,
        auteur: q.signalement.auteur, date: q.signalement.date,
      };
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// Titre d'une Leçon dans la Vue parent : une Leçon archivée (#203) y reste visible, avec la mention « Archivée ».
const titreParent = (l) => (l.archivee ? `${l.titre} (Archivée)` : l.titre);

// Questions de chaque Leçon que le parent peut signaler : toutes celles de la Banque qui ne le sont pas encore.
function questionsSignalables(lecons) {
  return lecons.map((l) => ({
    lecon: l.id, titreLecon: titreParent(l),
    questions: (l.questions ?? []).filter(estActive).map((q) => ({ page: q.page, id: q.id, enonce: q.contenu?.enonce ?? '' })),
  })).filter((l) => l.questions.length);
}

// Contrôles à venir (aujourd'hui compris), le plus proche d'abord, avec leur préparation : la Maîtrise de la Leçon et
// le nombre de ses Questions dues aujourd'hui dans les Révisions du jour.
function controlesAVenir(lecons, maintenant) {
  return lecons
    .filter((l) => Number.isInteger(l.joursAvantControle) && l.joursAvantControle >= 0)
    .sort((a, b) => a.joursAvantControle - b.joursAvantControle)
    .map((l) => ({
      lecon: l.id, titreLecon: titreParent(l), dateControle: l.dateControle, joursAvant: l.joursAvantControle,
      maitrise: l.maitrise, questionsDues: l.archivee ? 0 : (l.questions ?? []).filter((q) => estActive(q) && estDue(q, maintenant)).length,
    }));
}

// Coût des Leçons (Coût d'un tour cumulé) : le total de l'Élève, Propositions et Variantes comprises, et le total de
// chaque Leçon, la plus coûteuse d'abord. `couts` : tel que lireCouts le renvoie.
function coutDesLecons(couts) {
  return {
    total: couts.total,
    lecons: couts.lecons.map(({ id, titre, archivee, total }) => ({ id, titre: archivee ? `${titre} (Archivée)` : titre, ...total })).sort((a, b) => b.coutUsd - a.coutUsd),
  };
}

// Badges (#100) : les Paliers atteints ces JOURS_VUE_PARENT derniers jours locaux, { id, emoji, nom, palier, jour }, du
// plus ancien au plus récent, et le total d'Étoiles et de Fusées de l'Élève. `fichier` : son fichier de Badges (null s'il
// n'existe pas encore), fusionné ici avec le calcul depuis l'historique sans être enregistré : la Vue parent ne change
// jamais le fichier, donc rien de ce qui est « Nouveau » dans Mes badges.
function badgesRecents(lecons, evenements, fichier, maintenant) {
  const contexte = { lecons, evenements, maintenant };
  const calcul = calculerBadges(contexte);
  const fichierFusionne = fusionnerBadges(fichier, calcul, maintenant).fichier;
  const depuis = jourLocal(minuitDu(jourLocal(maintenant), 1 - JOURS_VUE_PARENT));
  const recents = paliersObtenus(fichierFusionne, calcul)
    .map(({ ajoute, ...b }) => b)
    .filter((b) => b.jour >= depuis)
    .sort((x, y) => x.jour.localeCompare(y.jour) || PALIERS.indexOf(x.palier) - PALIERS.indexOf(y.palier));
  return { recents, ...totauxRecompenses(contexte) };
}

// Agrégats de la vue parent. `lecons` : Leçons complètes (lireLecon) ; `couts` : coût de l'Élève (lireCouts) ;
// `evenements` : événements datés de l'Élève (lireEvenements), pour les indicateurs (#78) sur leur période par défaut ;
// `badges` : fichier de Badges de l'Élève (lireBadges, null s'il n'existe pas), lu seulement ;
// `maintenant` : ms. Chaque section est une clé de l'objet renvoyé : une section de plus s'y ajoute sans toucher aux autres.
export function vueParent(lecons, { couts, maintenant, evenements = [], badges = null, cartes = null }) {
  return {
    jours: derniersJours(lecons, maintenant),
    objectifs: objectifsDesLecons(lecons),
    pourEnParler: pourEnParler(lecons, maintenant),
    questionsFragiles: questionsFragiles(lecons),
    questionsSignalees: questionsSignalees(lecons),
    questionsSignalables: questionsSignalables(lecons),
    questionsSuspectes: questionsSuspectes(lecons),
    controles: controlesAVenir(lecons, maintenant),
    cout: coutDesLecons(couts),
    indicateurs: indicateurs(evenements, { maintenant, lecons, cartes, couts }),
    badges: badgesRecents(lecons, evenements, badges, maintenant),
    cartes: vueParentCartes(cartes, lecons.map((l) => l.id)),
  };
}
