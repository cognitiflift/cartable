// Rythme de l'Élève (spec #49, ticket #75 ; Jokers hebdomadaires : #93) : Objectif du jour, série de jours avec jokers et récapitulatif de la
// semaine. Tout est calculé à partir de l'historique (réponses aux Révisions du jour, pages terminées), en jours
// locaux (voir lib/jour.js). Jamais de comparaison entre Élèves : chaque calcul ne reçoit que les Leçons d'un Élève.
// Module pur : il reçoit les Leçons déjà lues (lireLecon) et la date « maintenant ».

import { dateValide, jourDe, jourLocal, minuitDu } from './jour.js';
import { etatMemoire } from './memoire.js';
import { etatObjectifs, horsPretest } from './store.js';

export const REVISIONS_VISEES = 5; // Révisions du jour répondues dans la journée…
export const PAGES_VISEES = 1; // … ou Pages de leçon terminées (quiz fait) : l'un ou l'autre suffit

// Activité de chaque jour local : { 'AAAA-MM-JJ': { revisions, justes, pages, quiz } }, seule source de l'activité
// pour le rythme et la vue parent (lib/parent.js). `revisions` : réponses en Révision du jour (journal des Questions,
// origine « revision »), dont `justes` ; `pages` : pages dont le quiz a été fait ce jour-là, chacune une fois par jour ;
// `quiz` : quiz de page faits, un même quiz refait comptant chaque fois ; ni l'un ni l'autre ne compte le Pré-test.
// `lecons` : [{ scores, questions }] (voir lireLecon).
export function activiteParJour(lecons = []) {
  const activite = {};
  const jour = (date) => (activite[jourDe(date)] ??= { revisions: 0, justes: 0, pages: 0, quiz: 0 });
  for (const l of lecons) {
    for (const r of reponsesDeRevision(l)) {
      jour(r.date).revisions++;
      if (r.juste === true) jour(r.date).justes++;
    }
    const pages = new Set();
    for (const s of horsPretest(l.scores)) {
      if (!dateValide(s.date)) continue;
      jour(s.date).quiz++;
      if (typeof s.page !== 'string') continue;
      const cle = `${jourDe(s.date)}/${s.page}`;
      if (pages.has(cle)) continue;
      pages.add(cle);
      jour(s.date).pages++;
    }
  }
  return activite;
}

// Réponses d'une Leçon, bien datées (`lecon` : { scores, questions }, voir lireLecon) : `reponsesDeLecon`, tous ses
// scores (quiz de page et Pré-test) et tout le journal de ses Questions ; `reponsesDeRevision`, les réponses de ce journal
// données en Révision du jour (origine « revision »).
const journal = (lecon) => (lecon.questions ?? []).flatMap((q) => q.journal ?? []);
export const reponsesDeLecon = (lecon) => [...(lecon.scores ?? []), ...journal(lecon)].filter((x) => dateValide(x.date));
export const reponsesDeRevision = (lecon) => journal(lecon).filter((r) => r.origine === 'revision' && dateValide(r.date));

// Jours travaillés (spec #89) : jours locaux (AAAA-MM-JJ, triés, chacun une fois) qui comptent au moins une réponse,
// à un quiz de page, à un Pré-test ou à une Révision du jour (scores et journal des Questions), toutes Leçons.
// Sert aux badges surprise (« Content de te revoir ») et au calendrier de Mes badges.
// `lecons` : [{ scores, questions }] (voir lireLecon).
export function joursTravailles(lecons = []) {
  return [...new Set(lecons.flatMap(reponsesDeLecon).map((x) => jourDe(x.date)))].sort();
}

export const atteint = ({ revisions = 0, pages = 0 } = {}) => revisions >= REVISIONS_VISEES || pages >= PAGES_VISEES;

// Jours (AAAA-MM-JJ, triés) où l'Objectif du jour est atteint, jusqu'au jour de `maintenant` compris.
export const joursAtteints = (activite = {}, maintenant) => {
  const aujourdhui = jourLocal(maintenant);
  return Object.keys(activite).filter((j) => j <= aujourdhui && atteint(activite[j])).sort();
};

// Objectif du jour à `maintenant` : ce qui est fait aujourd'hui, ce qui est visé, et s'il est atteint.
export function objectifDuJour(activite = {}, maintenant) {
  const { revisions = 0, pages = 0 } = activite[jourLocal(maintenant)] ?? {};
  return { revisions, revisionsVisees: REVISIONS_VISEES, pages, pagesVisees: PAGES_VISEES, atteint: atteint({ revisions, pages }) };
}

export const JOKERS_PAR_SEMAINE = 3; // reçus sans condition chaque lundi, sans report sur la semaine suivante

// Jour local qui suit le jour AAAA-MM-JJ (au calendrier : un jour de changement d'heure compte pour un).
const lendemain = (jour) => jourLocal(minuitDu(jour, 1));

// Lundi (AAAA-MM-JJ) de la semaine du jour AAAA-MM-JJ : la semaine va du lundi au dimanche, en jours locaux.
const lundiDe = (jour) => jourLocal(minuitDu(jour, -((new Date(minuitDu(jour)).getDay() + 6) % 7)));

// Réparation d'une Série de jours (spec #145, ticket #159) : quand la série repart parce qu'une pause dépasse les Jokers
// d'UN SEUL jour non couvert, le premier jour de retour est un jour de réparation. Si l'Objectif du jour y est atteint
// DEUX FOIS, la série d'avant reprend et le jour manqué est « réparé ». Les deux valeurs (« deux fois », « un seul
// jour ») sont des hypothèses à mesurer (docs/cadres-scientifiques.md).
export const FACTEUR_REPARATION = 2;
export const REVISIONS_REPARATION = REVISIONS_VISEES * FACTEUR_REPARATION;
export const PAGES_REPARATION = PAGES_VISEES * FACTEUR_REPARATION;
export const atteintDeuxFois = ({ revisions = 0, pages = 0 } = {}) => revisions >= REVISIONS_REPARATION || pages >= PAGES_REPARATION;

// Parcours de l'historique jour par jour, du premier jour où l'Objectif du jour a été atteint jusqu'à `maintenant`.
// Chaque semaine a JOKERS_PAR_SEMAINE Jokers. Tant qu'une Série de jours est en cours, chaque jour manqué (aujourd'hui
// excepté : la journée n'est pas finie) dépense un Joker de sa propre semaine ; un jour manqué qu'aucun Joker ne peut
// plus couvrir fait repartir la série au prochain jour atteint, et les Jokers déjà dépensés pour cette pause le restent
// (sauf si la série est réparée, voir plus haut : elle reprend alors avec eux, et le jour manqué compte comme couvert).
// Renvoie { jours, jokers, jokersUtilises, aujourdhui, couverts, repares, meilleure, reparation } : `couverts`, les jours
// manqués couverts par un Joker dans toutes les pauses que la série a tenues, passées comprises (AAAA-MM-JJ, dans
// l'ordre) ; `repares`, les jours réparés (ni couverts par un Joker, ni atteints) ; `meilleure`, la plus longue Série
// de jours de l'historique ; `reparation`, la réparation à proposer aujourd'hui (voir reparationDeSerie), sinon null.
function parcourir(activite, maintenant) {
  const aujourdhui = jourLocal(maintenant);
  const depenses = {}; // Jokers dépensés par semaine (clé : son lundi)
  const couverts = [];
  const repares = [];
  let jours = 0;
  let meilleure = 0;
  let jokersUtilises = 0;
  let pause = []; // jours manqués couverts depuis le dernier jour atteint
  let cassure = null; // dernière série cassée : { avant, jokersAvant, pause, manque } (jour non couvert)
  const premier = joursAtteints(activite, maintenant)[0];
  for (let jour = premier; jour && jour <= aujourdhui; jour = lendemain(jour)) {
    if (atteint(activite[jour])) {
      couverts.push(...pause);
      jokersUtilises += pause.length;
      pause = [];
      const reparable = jours === 0 && cassure && jour === lendemain(cassure.manque);
      if (reparable && atteintDeuxFois(activite[jour])) {
        jours = cassure.avant;
        couverts.push(...cassure.pause);
        repares.push(cassure.manque);
        jokersUtilises = cassure.jokersAvant + cassure.pause.length + 1; // le jour réparé compte comme couvert
        cassure = null;
      } else if (!(reparable && jour === aujourdhui)) cassure = null; // aujourd'hui, la réparation reste à faire
      jours++;
      meilleure = Math.max(meilleure, jours);
    } else if (jour < aujourdhui && jours > 0) {
      const lundi = lundiDe(jour);
      if ((depenses[lundi] ?? 0) < JOKERS_PAR_SEMAINE) {
        depenses[lundi] = (depenses[lundi] ?? 0) + 1;
        pause.push(jour);
      } else {
        cassure = { avant: jours, jokersAvant: jokersUtilises, pause, manque: jour };
        jours = 0;
        jokersUtilises = 0;
        pause = [];
      }
    }
  }
  couverts.push(...pause); // pause en cours, tenue jusqu'à hier
  jokersUtilises += pause.length;
  const jokers = JOKERS_PAR_SEMAINE - (depenses[lundiDe(aujourdhui)] ?? 0);
  const du = activite[aujourdhui] ?? {};
  const reparation = cassure && aujourdhui === lendemain(cassure.manque)
    ? { jourManque: cassure.manque, serieAvant: cassure.avant, revisions: du.revisions ?? 0, revisionsVisees: REVISIONS_REPARATION, pages: du.pages ?? 0, pagesVisees: PAGES_REPARATION }
    : null;
  return { jours, jokers, jokersUtilises, aujourdhui: atteint(activite[aujourdhui]), couverts, repares, meilleure, reparation };
}

// Série de jours à `maintenant` : { jours, jokers, jokersUtilises, aujourdhui }.
// `jours` : jours où l'Objectif du jour a été atteint depuis le début de la Série de jours en cours (la série d'avant
// reprise, si elle a été réparée) ; `jokers` : Jokers qui restent cette semaine (JOKERS_PAR_SEMAINE pour un Élève qui
// commence) ; `jokersUtilises` : ceux qui protègent la Série de jours en cours, le jour réparé compris ; `aujourdhui` :
// Objectif du jour atteint aujourd'hui.
// Aujourd'hui, pas encore atteint, ne casse rien : la journée n'est pas finie. Des jours manqués sont couverts tout seuls
// par les Jokers de leur semaine ; une pause plus longue que les Jokers de la semaine fait repartir la série (voir parcourir).
export function serieDeJours(activite = {}, maintenant) {
  const { jours, jokers, jokersUtilises, aujourdhui } = parcourir(activite, maintenant);
  return { jours, jokers, jokersUtilises, aujourdhui };
}

// Jours manqués couverts par un Joker (AAAA-MM-JJ, dans l'ordre), dans tout l'historique jusqu'à `maintenant` : ceux des
// pauses que la Série de jours a tenues, pour le calendrier de Mes badges (🛡️).
export function joursCouvertsParJoker(activite = {}, maintenant) {
  return parcourir(activite, maintenant).couverts;
}

// Jours réparés (AAAA-MM-JJ, dans l'ordre) : un jour manqué que l'Élève a réparé en atteignant deux fois l'Objectif du
// jour à son retour. Ils comptent comme couverts par un Joker pour la série, mais ont leur propre marque (🩹).
export function joursReparesDeSerie(activite = {}, maintenant) {
  return parcourir(activite, maintenant).repares;
}

// Plus longue Série de jours de l'historique jusqu'à `maintenant` (réparations comprises), et son contexte pour
// l'accueil : { meilleure, jours } où `jours` est la série en cours.
export function meilleureSerie(activite = {}, maintenant) {
  const { meilleure, jours } = parcourir(activite, maintenant);
  return { meilleure, jours };
}

// Réparation à proposer aujourd'hui, ou null : le jour de retour qui suit un SEUL jour non couvert, tant que la série
// n'est pas réparée. { jourManque, serieAvant, revisions, revisionsVisees, pages, pagesVisees } : ce qui est fait
// aujourd'hui et ce qu'il faut (deux fois l'Objectif du jour). Une pause plus longue ne se répare pas.
export function reparationDeSerie(activite = {}, maintenant) {
  return parcourir(activite, maintenant).reparation;
}

// Objectifs Retenus d'une Leçon à l'instant `instant` (ms), d'après ce qui s'était passé avant lui : scores et
// réponses antérieurs seulement, mémoire des Questions rejouée sur cette partie de leur journal (voir etatObjectifs).
// `lecon` : { mode, objectifs: [{ texte }], scores, questions: [{ contenu, journal }] } (voir lireLecon).
export function retenusA(lecon, instant) {
  const avant = (x) => Date.parse(x.date) < instant;
  const questions = (lecon.questions ?? []).filter((q) => !q.signalement)
    .map((q) => ({ contenu: q.contenu, stabilite: etatMemoire((q.journal ?? []).filter(avant))?.stabilite }))
    .filter((q) => q.stabilite !== undefined); // pas encore répondue : elle n'existait pas
  const textes = (lecon.objectifs ?? []).map((o) => o.texte);
  return etatObjectifs(textes, (lecon.scores ?? []).filter(avant), lecon.mode, questions).map((o) => o.retenu);
}

// Récapitulatif de la semaine passée (du lundi au dimanche, en jours locaux), vu à `maintenant` :
// { du, au, objectifsRetenus, revisions, pages, joursAtteints }. `objectifsRetenus` : Objectifs Retenus à la fin de
// la semaine qui ne l'étaient pas à son début. null quand la semaine passée est vide : rien à reprocher.
// Montré au premier retour de la semaine seulement (le lundi, ou le premier jour où l'Élève revient) : null dès que
// l'Élève est déjà venu un jour précédent de cette semaine, d'après son activité (`lecons`) ou `joursActifs`
// (AAAA-MM-JJ, par exemple ceux où son accueil s'est affiché).
// `lecons` : voir activiteParJour et retenusA.
export function recapitulatifSemaine(lecons = [], maintenant, { joursActifs = [] } = {}) {
  const aujourdhui = jourLocal(maintenant);
  const depuisLundi = (new Date(maintenant).getDay() + 6) % 7; // lundi 0 … dimanche 6
  const debut = minuitDu(aujourdhui, -depuisLundi - 7);
  const fin = minuitDu(aujourdhui, -depuisLundi);
  const du = jourLocal(debut);
  const au = jourLocal(minuitDu(du, 6));
  const activite = activiteParJour(lecons);
  const lundi = jourLocal(fin);
  if ([...Object.keys(activite), ...joursActifs].some((jour) => jour >= lundi && jour < aujourdhui)) return null;
  const semaine = Object.entries(activite).filter(([jour]) => jour >= du && jour <= au).map(([, a]) => a);
  const objectifsRetenus = lecons.reduce((total, l) => {
    const [avant, apres] = [retenusA(l, debut), retenusA(l, fin)];
    return total + apres.filter((r, i) => r && !avant[i]).length;
  }, 0);
  const revisions = semaine.reduce((t, a) => t + a.revisions, 0);
  const pages = semaine.reduce((t, a) => t + a.pages, 0);
  if (!objectifsRetenus && !revisions && !pages) return null;
  return { du, au, objectifsRetenus, revisions, pages, joursAtteints: semaine.filter(atteint).length };
}
