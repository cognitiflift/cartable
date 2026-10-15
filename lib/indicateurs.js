// Indicateurs (spec #49, ticket #78) : de quoi juger si l'appli marche, avant et après chaque changement. Calculés sur
// une période (jours locaux, bornes comprises) à partir des événements datés que l'appli enregistre pour chaque Élève :
//   { type: 'tour', lecon, debut, fin }        une attente de l'Élève : tour du prof, ou page préparée attendue (ISO) ;
//   { type: 'revision', date, lecon, juste }   une réponse à une Révision du jour ;
//   { type: 'ouverture', date, lecon }         l'ouverture d'une Leçon par l'Élève, dans sa Séance (pas par le parent) ;
//   { type: 'accueil', date }                  l'accueil de l'Élève affiché (voir lib/rythme.js, récapitulatif).
// Module pur : `maintenant` (ms) est toujours reçu.

import { jourLocal, minuitDu } from './jour.js';

const pourcentage = (n, sur) => (sur ? Math.round((100 * n) / sur) : null);
const dansLaPeriode = (date, { du, au }) => {
  const jour = jourLocal(date);
  return jour >= du && jour <= au;
};

// Taux de souvenir : part des réponses justes aux Révisions du jour (une réponse juste en partie n'est pas juste).
function tauxDeSouvenir(evenements, periode) {
  const reponses = evenements.filter((e) => e.type === 'revision' && dansLaPeriode(e.date, periode));
  const justes = reponses.filter((e) => e.juste === true).length;
  return { reponses: reponses.length, justes, pourcentage: pourcentage(justes, reponses.length) };
}

// Retour à 7 jours : pour chaque Leçon ouverte pour la première fois un jour J de la période, l'Élève revient-il
// (n'importe quel événement, toutes Leçons confondues) la semaine d'après, de J+7 à J+13 ? Tant que cette semaine
// n'est pas finie et qu'il n'est pas revenu, la Leçon est en attente, hors pourcentage.
const RETOUR_DEBUT = 7;
const RETOUR_FIN = 13;
const dateDe = (e) => e.date ?? e.debut;
function retourASeptJours(evenements, periode, maintenant) {
  const premiereOuverture = new Map(); // Leçon → jour local de sa première ouverture
  for (const e of evenements) {
    if (e.type !== 'ouverture' || Number.isNaN(Date.parse(e.date))) continue;
    const jour = jourLocal(e.date);
    if (!premiereOuverture.has(e.lecon) || jour < premiereOuverture.get(e.lecon)) premiereOuverture.set(e.lecon, jour);
  }
  const joursActifs = new Set(evenements.map(dateDe).filter((d) => !Number.isNaN(Date.parse(d))).map(jourLocal));
  const aujourdhui = jourLocal(maintenant);
  let revenus = 0;
  let pasRevenus = 0;
  let enAttente = 0;
  for (const jour of premiereOuverture.values()) {
    if (jour < periode.du || jour > periode.au) continue;
    const semaine = Array.from({ length: RETOUR_FIN - RETOUR_DEBUT + 1 }, (_, i) => jourLocal(minuitDu(jour, RETOUR_DEBUT + i)));
    if (semaine.some((j) => joursActifs.has(j))) revenus += 1;
    else if (semaine.at(-1) >= aujourdhui) enAttente += 1;
    else pasRevenus += 1;
  }
  return { lecons: revenus + pasRevenus, revenus, enAttente, pourcentage: pourcentage(revenus, revenus + pasRevenus) };
}

// Attente du prof : durée des tours du prof commencés sur la période (de la demande de l'Élève à la réponse), en
// secondes arrondies : moyenne, médiane et la plus longue. Un tour mal daté est écarté.
function attenteDuProf(evenements, periode) {
  const durees = evenements
    .filter((e) => e.type === 'tour' && !Number.isNaN(Date.parse(e.debut)) && dansLaPeriode(e.debut, periode))
    .map((e) => (Date.parse(e.fin) - Date.parse(e.debut)) / 1000)
    .filter((d) => d >= 0)
    .sort((x, y) => x - y);
  if (!durees.length) return { tours: 0, moyenneSecondes: null, medianeSecondes: null, maxSecondes: null };
  const milieu = Math.floor(durees.length / 2);
  const mediane = durees.length % 2 ? durees[milieu] : (durees[milieu - 1] + durees[milieu]) / 2;
  return {
    tours: durees.length,
    moyenneSecondes: Math.round(durees.reduce((s, d) => s + d, 0) / durees.length),
    medianeSecondes: Math.round(mediane),
    maxSecondes: Math.round(durees.at(-1)),
  };
}

export const JOURS_INDICATEURS = 28; // période par défaut : les 4 dernières semaines, aujourd'hui compris

// Indicateurs d'un Élève sur la période `du`…`au` (AAAA-MM-JJ, déjà validées). Par défaut, `au` est aujourd'hui et
// `du` JOURS_INDICATEURS - 1 jours avant `au`.
export function indicateurs(evenements, { maintenant, du, au = jourLocal(maintenant) }) {
  const periode = { du: du ?? jourLocal(minuitDu(au, 1 - JOURS_INDICATEURS)), au };
  return {
    periode,
    souvenir: tauxDeSouvenir(evenements, periode),
    retour: retourASeptJours(evenements, periode, maintenant),
    attente: attenteDuProf(evenements, periode),
  };
}
