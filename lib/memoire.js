// Mémoire de l'Élève par Question (spec #47, ticket #65 ; ADR 0006) : planificateur FSRS-5 (Free Spaced Repetition
// Scheduler, Jarrett Ye / open-spaced-repetition), avec ses 19 paramètres par défaut publiés et une rétention visée
// de 90 %. Tout se recalcule depuis le journal de la Question (voir lib/banque.js) : rien n'est rangé en double.
// Module pur : la date « maintenant » est toujours reçue, jamais lue à l'horloge.

import { minuitDu } from './jour.js';
import { estPartiel } from '../public/kit/v1/quiz-logique.js';

// Notes FSRS d'une réponse (FSRS en a 4 ; « facile » n'est jamais donnée ici).
export const NOTES = { aRevoir: 1, difficile: 2, bien: 3 };

// Correspondance réponse → note : faux ou « Je ne sais pas » → à revoir ; juste en partie (crédit partiel des formats
// à plusieurs éléments, spec #48) ou juste mais pas sûr (Confiance) → difficile ; juste et sûr, ou sans Confiance
// demandée → bien.
export function noteDeReponse({ juste, points, sur, jeNeSaisPas }) {
  if (jeNeSaisPas) return NOTES.aRevoir;
  if (!juste) return estPartiel({ juste, points }) ? NOTES.difficile : NOTES.aRevoir;
  return sur === false ? NOTES.difficile : NOTES.bien;
}

// Planificateurs (#161) : FSRS-5 (19 paramètres) et FSRS-6 (21 paramètres, dont la forme de la courbe d'oubli w20),
// chacun avec ses paramètres par défaut publiés (py-fsrs / fsrs-rs). Les deux sont des fonctions pures du journal :
// changer de planificateur ne migre rien, tout se recalcule.
export const PARAMETRES_FSRS5 = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]);
export const PARAMETRES_FSRS6 = Object.freeze([
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
]);
export const RETENTION = 0.9; // probabilité visée de se souvenir au moment de la révision
export const PLANIFICATEUR_DEFAUT = 'fsrs5';
export const PLANIFICATEURS = ['fsrs5', 'fsrs6'];

const JOUR_MS = 86_400_000;
const STABILITE_MIN = 0.001;

// Modèle d'un planificateur : paramètres, courbe d'oubli (R = (1 + facteur·t/S)^decroissance, R(S, S) = 90 %) et
// variante de la stabilité à court terme (FSRS-6 : jamais en dessous de la stabilité d'une réponse réussie, et freinée
// par S^-w19).
const modele = (nom, w, decroissance, courtTermeFsrs6) => ({
  nom, w, decroissance, facteur: 0.9 ** (1 / decroissance) - 1, courtTermeFsrs6,
});
const MODELES = {
  fsrs5: modele('fsrs5', PARAMETRES_FSRS5, -0.5, false),
  fsrs6: modele('fsrs6', PARAMETRES_FSRS6, -PARAMETRES_FSRS6[20], true),
};
const modeleDe = (planificateur) => MODELES[planificateur] ?? MODELES[PLANIFICATEUR_DEFAUT];

// Courbe d'oubli FSRS : probabilité de se souvenir `jours` après la dernière réponse, pour une stabilité donnée.
export const probabiliteDeRappel = (jours, stabilite, planificateur = PLANIFICATEUR_DEFAUT) => {
  const { facteur, decroissance } = modeleDe(planificateur);
  return (1 + facteur * Math.max(0, jours) / stabilite) ** decroissance;
};

// Intervalle (jours entiers, au moins 1) au bout duquel la probabilité de se souvenir tombe à `retention`.
const intervalle = (stabilite, retention, { facteur, decroissance }) =>
  Math.max(1, Math.round((stabilite / facteur) * (retention ** (1 / decroissance) - 1)));

const borner = (d) => Math.min(10, Math.max(1, d));
const difficulteInitiale = (w, note) => w[4] - Math.exp(w[5] * (note - 1)) + 1;

// Réponses du journal dans l'ordre des dates (tri stable : à date égale, l'ordre où elles sont rangées).
const parDate = (journal) => [...journal].sort((x, y) => Date.parse(x.date) - Date.parse(y.date));

// État de mémoire d'une Question, recalculé en rejouant son journal dans l'ordre des dates : stabilité (jours),
// difficulté (1 à 10) et date de la dernière réponse. null pour un journal vide.
export function etatMemoire(journal = [], planificateur = PLANIFICATEUR_DEFAUT) {
  const m = modeleDe(planificateur);
  let etat = null;
  for (const r of parDate(journal)) {
    const note = noteDeReponse(r);
    const date = Date.parse(r.date);
    etat = etat
      ? etatApres(m, etat, note, (date - etat.derniere) / JOUR_MS)
      : { stabilite: Math.max(STABILITE_MIN, m.w[note - 1]), difficulte: borner(difficulteInitiale(m.w, note)), derniere: date };
    etat.derniere = date;
  }
  return etat;
}

// La dernière réponse du journal (par date) est-elle « à revoir » : fausse sans crédit partiel, ou « Je ne sais pas » ?
// false pour un journal vide.
export function derniereReponseARevoir(journal = []) {
  const derniere = parDate(journal).at(-1);
  return derniere !== undefined && noteDeReponse(derniere) === NOTES.aRevoir;
}

// État après une nouvelle réponse notée `note`, donnée `jours` après la précédente (formules FSRS-5 ou FSRS-6).
function etatApres(m, { stabilite: s, difficulte: d }, note, jours) {
  const { w } = m;
  // Difficulté : variation amortie vers 10, puis retour lent vers la difficulté initiale d'une réponse « facile ».
  const variation = -w[6] * (note - 3);
  const amortie = d + (variation * (10 - d)) / 9;
  const difficulte = borner(w[7] * difficulteInitiale(w, 4) + (1 - w[7]) * amortie);
  let stabilite;
  if (jours < 1) {
    // Même jour : stabilité à court terme, sans profiter d'un vrai intervalle.
    const gain = Math.exp(w[17] * (note - 3 + w[18])) * (m.courtTermeFsrs6 ? s ** -w[19] : 1);
    stabilite = s * (m.courtTermeFsrs6 && note >= NOTES.difficile ? Math.max(gain, 1) : gain);
  } else {
    const r = probabiliteDeRappel(jours, s, m.nom);
    stabilite = note === NOTES.aRevoir
      // Oubli : nouvelle stabilité, jamais plus haute que l'ancienne réduite par le terme court terme.
      ? Math.min(w[11] * d ** -w[12] * ((s + 1) ** w[13] - 1) * Math.exp(w[14] * (1 - r)), s / Math.exp(w[17] * w[18]))
      // Rappel : croissance d'autant plus forte que la Question est facile, la stabilité basse et le rappel incertain.
      : s * (1 + Math.exp(w[8]) * (11 - d) * s ** -w[9] * (Math.exp(w[10] * (1 - r)) - 1) * (note === NOTES.difficile ? w[15] : 1));
  }
  return { stabilite: m.courtTermeFsrs6 ? Math.max(STABILITE_MIN, stabilite) : stabilite, difficulte };
}

// Ce que la Leçon expose d'une Question à la date `maintenant` (ms ou date ISO) : stabilité, difficulté, probabilité
// de se souvenir aujourd'hui (`rappel`, 0 à 1) et date ISO de la prochaine révision (dernière réponse + intervalle).
// Options : `planificateur` ('fsrs5' par défaut ou 'fsrs6', voir comparerPlanificateurs) ; `retention` visée (défaut 90 %) ; `dateControle` (AAAA-MM-JJ) d'une Leçon de révision, qui resserre la
// prochaine révision (voir avantLeControle). null sans réponse.
export function memoireDeQuestion(journal = [], { maintenant, retention = RETENTION, dateControle = null, planificateur = PLANIFICATEUR_DEFAUT } = {}) {
  const etat = etatMemoire(journal, planificateur);
  if (!etat) return null;
  const instant = typeof maintenant === 'string' ? Date.parse(maintenant) : maintenant;
  const prevue = etat.derniere + intervalle(etat.stabilite, retention, modeleDe(planificateur)) * JOUR_MS;
  return {
    stabilite: etat.stabilite,
    difficulte: etat.difficulte,
    rappel: probabiliteDeRappel((instant - etat.derniere) / JOUR_MS, etat.stabilite, planificateur),
    prochaineRevision: new Date(avantLeControle(prevue, etat.derniere, instant, dateControle)).toISOString(),
  };
}

// Date de contrôle (#68) : la révision `prevue` (ms) est avancée à la veille du contrôle si elle tomberait après, sauf
// quand la dernière réponse est déjà de l'avant-veille ou plus tard (la révision d'avant le contrôle est faite) ; ainsi
// chaque Question est revue la veille ou l'avant-veille. Jours locaux de l'Élève (voir lib/jour.js). Le contrôle passé (`instant` après son jour), ou sans date
// lisible, le planificateur reprend son cours normal. Seule la date de révision change, jamais la mémoire.
function avantLeControle(prevue, derniere, instant, dateControle) {
  const veille = minuitDu(dateControle, -1);
  if (!Number.isFinite(veille) || instant >= minuitDu(dateControle, 1)) return prevue;
  if (derniere >= minuitDu(dateControle, -2)) return prevue;
  return Math.min(prevue, veille);
}

// Choix du planificateur d'un Élève (#161). On rejoue ses journaux avec chaque planificateur et on mesure la qualité de
// prédiction des réponses en Révision du jour (celles qui suivent une réponse de la même Question) par la perte
// logarithmique moyenne : -ln(p) si la réponse est juste, -ln(1 - p) sinon, p étant la probabilité de se souvenir
// prédite juste avant (une réponse juste en partie n'est pas juste, comme pour la calibration).
// FSRS-6 n'est choisi que s'il a au moins SEUIL_REPONSES réponses à comparer et une perte strictement plus basse.
// Hypothèse à mesurer : aucun cadre ne fixe ce seuil (docs/cadres-scientifiques.md, « Décisions sans fondement écrit »).
export const SEUIL_REPONSES = 200;
const EPSILON = 1e-6; // évite ln(0) quand une probabilité prédite touche 0 ou 1

function perteDe(journaux, planificateur) {
  let somme = 0;
  let reponses = 0;
  for (const brut of journaux) {
    const journal = parDate(brut.filter((r) => !Number.isNaN(Date.parse(r.date))));
    journal.forEach((r, i) => {
      if (r.origine !== 'revision') return;
      const avant = etatMemoire(journal.slice(0, i), planificateur);
      if (!avant) return;
      const predit = probabiliteDeRappel((Date.parse(r.date) - avant.derniere) / JOUR_MS, avant.stabilite, planificateur);
      const p = Math.min(1 - EPSILON, Math.max(EPSILON, predit));
      somme += -Math.log(r.juste === true ? p : 1 - p);
      reponses += 1;
    });
  }
  return { perte: reponses ? somme / reponses : null, reponses };
}

// `journaux` : le journal de chaque Question de l'Élève, toutes Leçons. Renvoie { reponses, seuil, fsrs5: { perte },
// fsrs6: { perte }, choisi } ; les pertes valent null sans réponse à comparer.
export function comparerPlanificateurs(journaux = []) {
  const fsrs5 = perteDe(journaux, 'fsrs5');
  const fsrs6 = perteDe(journaux, 'fsrs6');
  const choisi = fsrs5.reponses >= SEUIL_REPONSES && fsrs6.perte < fsrs5.perte ? 'fsrs6' : 'fsrs5';
  return { reponses: fsrs5.reponses, seuil: SEUIL_REPONSES, fsrs5: { perte: fsrs5.perte }, fsrs6: { perte: fsrs6.perte }, choisi };
}
