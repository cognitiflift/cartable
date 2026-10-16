// Rythme de l'Élève (spec #49, ticket #75) : Objectif du jour, série de jours avec jokers et récapitulatif de la
// semaine. Tout est calculé à partir de l'historique (réponses aux Révisions du jour, pages terminées), en jours
// locaux (voir lib/jour.js). Jamais de comparaison entre Élèves : chaque calcul ne reçoit que les Leçons d'un Élève.
// Module pur : il reçoit les Leçons déjà lues (lireLecon) et la date « maintenant ».

import { jourLocal, minuitDu } from './jour.js';
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
  const jour = (date) => (activite[jourLocal(Date.parse(date))] ??= { revisions: 0, justes: 0, pages: 0, quiz: 0 });
  for (const l of lecons) {
    for (const r of (l.questions ?? []).flatMap((q) => q.journal ?? [])) {
      if (r.origine !== 'revision' || !valide(r.date)) continue;
      jour(r.date).revisions++;
      if (r.juste === true) jour(r.date).justes++;
    }
    const pages = new Set();
    for (const s of horsPretest(l.scores)) {
      if (!valide(s.date)) continue;
      jour(s.date).quiz++;
      if (typeof s.page !== 'string') continue;
      const cle = `${jourLocal(Date.parse(s.date))}/${s.page}`;
      if (pages.has(cle)) continue;
      pages.add(cle);
      jour(s.date).pages++;
    }
  }
  return activite;
}

const valide = (date) => !Number.isNaN(Date.parse(date));

export const atteint = ({ revisions = 0, pages = 0 } = {}) => revisions >= REVISIONS_VISEES || pages >= PAGES_VISEES;

// Objectif du jour à `maintenant` : ce qui est fait aujourd'hui, ce qui est visé, et s'il est atteint.
export function objectifDuJour(activite = {}, maintenant) {
  const { revisions = 0, pages = 0 } = activite[jourLocal(maintenant)] ?? {};
  return { revisions, revisionsVisees: REVISIONS_VISEES, pages, pagesVisees: PAGES_VISEES, atteint: atteint({ revisions, pages }) };
}

export const JOURS_PAR_JOKER = 7; // une semaine complète de Série de jours rapporte un joker…
export const JOKERS_MAX = 2; // … deux au plus en réserve

// Jour local qui suit le jour AAAA-MM-JJ (au calendrier : un jour de changement d'heure compte pour un).
const lendemain = (jour) => jourLocal(minuitDu(jour, 1));

// Série de jours à `maintenant` : { jours, jokers, jokersUtilises, aujourdhui }.
// `jours` : jours où l'Objectif du jour a été atteint depuis le début de la Série de jours en cours ; `aujourdhui` :
// Objectif du jour atteint aujourd'hui.
// Aujourd'hui, pas encore atteint, ne casse rien : la journée n'est pas finie. Chaque fois que la Série de jours compte une
// semaine complète de jours atteints (7, 14…), elle rapporte un joker, JOKERS_MAX au plus en réserve. Des jours
// manqués sont couverts tout seuls par les jokers (`jokersUtilises` : ceux qui protègent la Série de jours en cours) ;
// une pause plus longue que la réserve la fait repartir, sans gaspiller les jokers : ils restent pour la suivante.
export function serieDeJours(activite = {}, maintenant) {
  const aujourdhui = jourLocal(maintenant);
  const atteints = Object.keys(activite).filter((j) => j <= aujourdhui && atteint(activite[j])).sort();
  let jours = 0;
  let jokers = 0;
  let jokersUtilises = 0;
  let manques = 0; // jours manqués depuis le dernier jour atteint
  const couvrir = () => {
    if (!manques) return;
    if (manques <= jokers) {
      jokers -= manques;
      jokersUtilises += manques;
    } else {
      jours = 0;
      jokersUtilises = 0;
    }
    manques = 0;
  };
  for (let jour = atteints[0]; jour && jour <= aujourdhui; jour = lendemain(jour)) {
    if (atteint(activite[jour])) {
      couvrir();
      jours++;
      if (jours % JOURS_PAR_JOKER === 0) jokers = Math.min(JOKERS_MAX, jokers + 1);
    } else if (jour < aujourdhui) manques++;
  }
  couvrir();
  return { jours, jokers, jokersUtilises, aujourdhui: atteint(activite[aujourdhui]) };
}

// Objectifs Retenus d'une Leçon à l'instant `instant` (ms), d'après ce qui s'était passé avant lui : scores et
// réponses antérieurs seulement, mémoire des Questions rejouée sur cette partie de leur journal (voir etatObjectifs).
// `lecon` : { mode, objectifs: [{ texte }], scores, questions: [{ contenu, journal }] } (voir lireLecon).
export function retenusA(lecon, instant) {
  const avant = (x) => Date.parse(x.date) < instant;
  const questions = (lecon.questions ?? [])
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
