// Questions suspectes (spec #145, ticket #148) : des Questions que l'appli juge peut-être fausses ou ambiguës, montrées
// au parent pour vérification. Calcul pur, jamais stocké : une Question suspecte n'est jamais retirée d'office, c'est le
// parent qui décide (la signaler). Deux règles, lues dans le journal des Questions :
//   1. la même réponse fausse choisie « sûr » au moins FOIS_MEME_REPONSE fois, à des jours différents, alors qu'au moins
//      un Objectif que la Question couvre est Retenu (l'Élève sait la matière, mais retombe sur la même réponse « fausse ») ;
//   2. une Variante ratée nettement plus souvent que sa Question d'origine (ECART_VARIANTE de plus, sur au moins
//      REPONSES_MIN réponses de chaque côté) : la Variante ne teste peut-être pas la même chose.
// Les seuils sont des hypothèses à mesurer (docs/cadres-scientifiques.md, « Décisions sans fondement écrit »).
// Module pur : `lecons` sont des Leçons lues par lireLecon (objectifs[].retenu, questions[] avec contenu, journal, signalement).

import { corriger, reponseAttendue } from '../public/kit/v1/quiz-logique.js';
import { questionDuContenu } from './banque.js';
import { jourLocal } from './jour.js';

export const FOIS_MEME_REPONSE = 2;
export const REPONSES_MIN = 2;
export const ECART_VARIANTE = 0.5;

const bonneReponse = (contenu) => {
  const q = questionDuContenu(contenu);
  return corriger(q, reponseAttendue(q)).bonne;
};

// Réponses fausses « sûr » identiques (même texte, même Variante), à au moins FOIS_MEME_REPONSE jours locaux différents.
function reponseFausseSure(question, couvreUnRetenu) {
  if (!couvreUnRetenu) return [];
  const groupes = new Map();
  for (const r of question.journal ?? []) {
    if (r.juste !== false || r.sur !== true || r.jeNeSaisPas === true || typeof r.choisie !== 'string' || Number.isNaN(Date.parse(r.date))) continue;
    const cle = JSON.stringify([r.variante ?? null, r.choisie]);
    if (!groupes.has(cle)) groupes.set(cle, { choisie: r.choisie, jours: new Set() });
    groupes.get(cle).jours.add(jourLocal(r.date));
  }
  return [...groupes.values()].filter((g) => g.jours.size >= FOIS_MEME_REPONSE)
    .map((g) => ({ type: 'reponse-fausse-sure', choisie: g.choisie, jours: g.jours.size }));
}

// Une Variante ratée nettement plus souvent que la Question d'origine.
function varianteTropRatee(question) {
  const parIndex = new Map(); // null : la Question d'origine
  for (const r of question.journal ?? []) {
    if (typeof r.juste !== 'boolean') continue;
    const cle = Number.isInteger(r.variante) ? r.variante : null;
    const c = parIndex.get(cle) ?? { reponses: 0, ratees: 0 };
    c.reponses += 1;
    if (!r.juste) c.ratees += 1;
    parIndex.set(cle, c);
  }
  const origine = parIndex.get(null);
  if (!origine || origine.reponses < REPONSES_MIN) return [];
  return [...parIndex].filter(([cle, c]) => cle !== null && c.reponses >= REPONSES_MIN
    && c.ratees / c.reponses - origine.ratees / origine.reponses >= ECART_VARIANTE)
    .map(([variante, c]) => ({ type: 'variante', variante, ratees: c.ratees, reponses: c.reponses, origine: { ratees: origine.ratees, reponses: origine.reponses } }));
}

// Questions suspectes de `lecons` (celles déjà signalées n'en sont pas), les plus douteuses d'abord (le plus de motifs),
// puis dans l'ordre des Leçons : [{ lecon, titreLecon, page, id, enonce, bonne, motifs }].
export function questionsSuspectes(lecons = []) {
  return lecons.flatMap((l) => (l.questions ?? [])
    .filter((q) => !q.signalement)
    .map((q) => {
      const couvreUnRetenu = (q.contenu?.objectifs ?? []).some((n) => l.objectifs?.[n - 1]?.retenu === true);
      const motifs = [...reponseFausseSure(q, couvreUnRetenu), ...varianteTropRatee(q)];
      return motifs.length && {
        lecon: l.id, titreLecon: l.titre, page: q.page, id: q.id, enonce: q.contenu?.enonce ?? '', bonne: bonneReponse(q.contenu), motifs,
      };
    }).filter(Boolean))
    .sort((a, b) => b.motifs.length - a.motifs.length);
}
