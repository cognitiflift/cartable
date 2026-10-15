// Mémoire de l'Élève par Question (spec #47, ticket #65 ; ADR 0006) : planificateur FSRS-5 (Free Spaced Repetition
// Scheduler, Jarrett Ye / open-spaced-repetition), avec ses 19 paramètres par défaut publiés et une rétention visée
// de 90 %. Tout se recalcule depuis le journal de la Question (voir lib/banque.js) : rien n'est rangé en double.
// Module pur : la date « maintenant » est toujours reçue, jamais lue à l'horloge.

import { minuitDu } from './jour.js';

// Notes FSRS d'une réponse (FSRS en a 4 ; « facile » n'est jamais donnée ici).
export const NOTES = { aRevoir: 1, difficile: 2, bien: 3 };

// Correspondance réponse → note : faux ou « Je ne sais pas » → à revoir ; juste mais pas sûr (Confiance) → difficile ;
// juste et sûr, ou sans Confiance demandée → bien.
export function noteDeReponse({ juste, sur, jeNeSaisPas }) {
  if (!juste || jeNeSaisPas) return NOTES.aRevoir;
  return sur === false ? NOTES.difficile : NOTES.bien;
}

// Paramètres par défaut publiés de FSRS-5 (w0…w18, py-fsrs / fsrs-rs v5).
export const PARAMETRES_FSRS5 = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]);
export const RETENTION = 0.9; // probabilité visée de se souvenir au moment de la révision

const JOUR_MS = 86_400_000;
const DECROISSANCE = -0.5;
const FACTEUR = 19 / 81; // tel que R(S, S) = 90 %
const w = PARAMETRES_FSRS5;

// Courbe d'oubli FSRS : probabilité de se souvenir `jours` après la dernière réponse, pour une stabilité donnée.
export const probabiliteDeRappel = (jours, stabilite) => (1 + FACTEUR * Math.max(0, jours) / stabilite) ** DECROISSANCE;

// Intervalle (jours entiers, au moins 1) au bout duquel la probabilité de se souvenir tombe à `retention`.
const intervalle = (stabilite, retention) => Math.max(1, Math.round((stabilite / FACTEUR) * (retention ** (1 / DECROISSANCE) - 1)));

const borner = (d) => Math.min(10, Math.max(1, d));
const difficulteInitiale = (note) => w[4] - Math.exp(w[5] * (note - 1)) + 1;

// État de mémoire d'une Question, recalculé en rejouant son journal dans l'ordre des dates : stabilité (jours),
// difficulté (1 à 10) et date de la dernière réponse. null pour un journal vide.
export function etatMemoire(journal = []) {
  const reponses = [...journal].sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
  let etat = null;
  for (const r of reponses) {
    const note = noteDeReponse(r);
    const date = Date.parse(r.date);
    etat = etat
      ? etatApres(etat, note, (date - etat.derniere) / JOUR_MS)
      : { stabilite: w[note - 1], difficulte: borner(difficulteInitiale(note)), derniere: date };
    etat.derniere = date;
  }
  return etat;
}

// État après une nouvelle réponse notée `note`, donnée `jours` après la précédente (formules FSRS-5).
function etatApres({ stabilite: s, difficulte: d }, note, jours) {
  // Difficulté : variation amortie vers 10, puis retour lent vers la difficulté initiale d'une réponse « facile ».
  const variation = -w[6] * (note - 3);
  const amortie = d + (variation * (10 - d)) / 9;
  const difficulte = borner(w[7] * difficulteInitiale(4) + (1 - w[7]) * amortie);
  let stabilite;
  if (jours < 1) {
    // Même jour : stabilité à court terme, sans profiter d'un vrai intervalle.
    stabilite = s * Math.exp(w[17] * (note - 3 + w[18]));
  } else {
    const r = probabiliteDeRappel(jours, s);
    stabilite = note === NOTES.aRevoir
      // Oubli : nouvelle stabilité, jamais plus haute que l'ancienne réduite par le terme court terme.
      ? Math.min(w[11] * d ** -w[12] * ((s + 1) ** w[13] - 1) * Math.exp(w[14] * (1 - r)), s / Math.exp(w[17] * w[18]))
      // Rappel : croissance d'autant plus forte que la Question est facile, la stabilité basse et le rappel incertain.
      : s * (1 + Math.exp(w[8]) * (11 - d) * s ** -w[9] * (Math.exp(w[10] * (1 - r)) - 1) * (note === NOTES.difficile ? w[15] : 1));
  }
  return { stabilite, difficulte };
}

// Ce que la Leçon expose d'une Question à la date `maintenant` (ms ou date ISO) : stabilité, difficulté, probabilité
// de se souvenir aujourd'hui (`rappel`, 0 à 1) et date ISO de la prochaine révision (dernière réponse + intervalle).
// Options : `retention` visée (défaut 90 %) ; `dateControle` (AAAA-MM-JJ) d'une Leçon de révision, qui resserre la
// prochaine révision (voir avantLeControle). null sans réponse.
export function memoireDeQuestion(journal = [], { maintenant, retention = RETENTION, dateControle = null } = {}) {
  const etat = etatMemoire(journal);
  if (!etat) return null;
  const instant = typeof maintenant === 'string' ? Date.parse(maintenant) : maintenant;
  const prevue = etat.derniere + intervalle(etat.stabilite, retention) * JOUR_MS;
  return {
    stabilite: etat.stabilite,
    difficulte: etat.difficulte,
    rappel: probabiliteDeRappel((instant - etat.derniere) / JOUR_MS, etat.stabilite),
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
