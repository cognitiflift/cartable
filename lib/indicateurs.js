// Indicateurs (spec #49, ticket #78) : de quoi juger si l'appli marche, avant et après chaque changement. Calculés sur
// une période (jours locaux, bornes comprises) à partir des événements datés que l'appli enregistre pour chaque Élève :
//   { type: 'tour', lecon, debut, fin }        une attente de l'Élève : tour du prof, ou page préparée attendue (ISO) ;
//   { type: 'revision', date, lecon, juste }   une réponse à une Révision du jour ;
//   { type: 'ouverture', date, lecon }         l'ouverture d'une Leçon par l'Élève, dans sa Séance (pas par le parent) ;
//   { type: 'accueil', date }                  l'accueil de l'Élève affiché (voir lib/rythme.js, récapitulatif).
//   { type: 'signalement', date, lecon, raison }  une Question signalée (#146, #148) ; { type: 'retablissement', date, lecon } rétablie ;
//   { type: 'revision-terminee', date }        une série de Révision du jour menée jusqu'au bout (lib/revision-du-jour.js).
//   { type: 'prediction', date, lecon, juste } une Prédiction du Kit faite par l'Élève (#157), hors score et hors Banque.
// Retenu à 30 jours et calibration (#151) se lisent dans les Leçons (scores, journal des Questions), pas dans ces événements.
// Mesures de la spec #145 (ticket #147) : lues dans les Leçons de l'Élève (`lecons` : scores et journal des Questions, voir
// lireLecon), qui gardent déjà ces réponses, sans nouvel événement.
// Module pur : `maintenant` (ms) est toujours reçu.

import { dateValide, finDuJour, jourDe, jourLocal, minuitDu } from './jour.js';
import { etatMemoire, memoireDeQuestion, probabiliteDeRappel, comparerPlanificateurs } from './memoire.js';
import { reponsesDeRevision, retenusA } from './rythme.js';
import { horsPretest } from './store.js';
import { questionsSuspectes } from './suspectes.js';

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
// Jours locaux (AAAA-MM-JJ) où l'Élève a laissé un événement, chacun une fois ; un événement mal daté est écarté.
export const joursDesEvenements = (evenements) =>
  new Set(evenements.map((e) => e.date ?? e.debut).filter((d) => !Number.isNaN(Date.parse(d))).map(jourLocal));
function retourASeptJours(evenements, periode, maintenant) {
  const premiereOuverture = new Map(); // Leçon → jour local de sa première ouverture
  for (const e of evenements) {
    if (e.type !== 'ouverture' || Number.isNaN(Date.parse(e.date))) continue;
    const jour = jourLocal(e.date);
    if (!premiereOuverture.has(e.lecon) || jour < premiereOuverture.get(e.lecon)) premiereOuverture.set(e.lecon, jour);
  }
  const joursActifs = joursDesEvenements(evenements);
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

// Retenu à 30 jours (#151) : parmi les Objectifs qui étaient Retenus à la fin du jour d'il y a 30 jours (au moins 30
// jours donc), la part qui l'est encore aujourd'hui. Rejoué avec retenusA ; toutes les Leçons, sans la période : un
// Objectif Retenu depuis moins de 30 jours n'est pas encore mesurable. `lecons` : voir retenusA, avec `objectifs[].retenu`.
export const JOURS_RETENU = 30;
function retenuATrenteJours(lecons, maintenant) {
  const limite = minuitDu(jourLocal(maintenant), 1 - JOURS_RETENU); // début du jour qui suit celui d'il y a 30 jours
  let retenusAlors = 0;
  let encoreRetenus = 0;
  for (const lecon of lecons) {
    retenusA(lecon, limite).forEach((retenu, i) => {
      if (!retenu) return;
      retenusAlors += 1;
      if (lecon.objectifs?.[i]?.retenu) encoreRetenus += 1;
    });
  }
  return { objectifs: retenusAlors, encoreRetenus, pourcentage: pourcentage(encoreRetenus, retenusAlors) };
}

// Calibration de la mémoire (#151) : pour chaque réponse en Révision du jour de la période, la probabilité de se
// souvenir que FSRS prédisait juste avant (d'après le journal jusque-là) contre le résultat, par tranches de
// probabilité prédite. La première réponse d'une Question n'a pas de prédiction : écartée. Une tranche sans réponse
// n'a ni pourcentage réel ni prédit. Une réponse juste en partie n'est pas juste (comme le taux de souvenir).
export const TRANCHES_CALIBRATION = [0, 60, 70, 80, 90, 100]; // bornes en % ; la dernière tranche inclut 100
function calibrationDeLaMemoire(lecons, periode, planificateur) {
  const tranches = TRANCHES_CALIBRATION.slice(0, -1).map((de, i) => ({ de, a: TRANCHES_CALIBRATION[i + 1], reponses: 0, justes: 0, somme: 0 }));
  for (const lecon of lecons) {
    for (const question of lecon.questions ?? []) {
      const journal = (question.journal ?? []).filter((r) => !Number.isNaN(Date.parse(r.date))).sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
      journal.forEach((r, i) => {
        if (r.origine !== 'revision' || !dansLaPeriode(r.date, periode)) return;
        const avant = etatMemoire(journal.slice(0, i), planificateur);
        if (!avant) return;
        const predit = 100 * probabiliteDeRappel((Date.parse(r.date) - avant.derniere) / 86_400_000, avant.stabilite, planificateur);
        const tranche = tranches.find((t) => predit < t.a) ?? tranches.at(-1);
        tranche.reponses += 1;
        tranche.somme += predit;
        if (r.juste === true) tranche.justes += 1;
      });
    }
  }
  return tranches.map(({ somme, ...t }) => ({
    ...t, predit: t.reponses ? Math.round(somme / t.reponses) : null, pourcentage: pourcentage(t.justes, t.reponses),
  }));
}

const dansLaPeriodeDe = (date, periode) => dateValide(date) && dansLaPeriode(date, periode);
const part = (reponses, jeNeSaisPas) => ({ reponses, jeNeSaisPas, pourcentage: pourcentage(jeNeSaisPas, reponses) });

// Part de « Je ne sais pas » sur la période, à part pour les quiz de page (réponses par question des scores, Pré-test
// écarté, anciens scores sans résultats par question ignorés) et pour la Révision du jour (journal des Questions).
function jeNeSaisPas(lecons, periode) {
  const quiz = lecons.flatMap((l) => horsPretest(l.scores))
    .filter((s) => dansLaPeriodeDe(s.date, periode)).flatMap((s) => s.questions ?? []);
  const revision = lecons.flatMap(reponsesDeRevision).filter((r) => dansLaPeriode(r.date, periode));
  return {
    quiz: part(quiz.length, quiz.filter((q) => q.jeNeSaisPas === true).length),
    revision: part(revision.length, revision.filter((r) => r.jeNeSaisPas === true).length),
  };
}

// Réussite moyenne des quiz de page selon le Rebond qui a créé la page (`nouvelle`, `revoir`, `defi`, `reviser`).
// Le Rebond est noté sur le score (`rebond`) ; un ancien score sans lui est un Défi s'il porte `defi`, sinon n'est pas
// classé. Le score est déjà hors questions bonus ; le Pré-test est écarté.
export const REBONDS_MESURES = ['nouvelle', 'revoir', 'defi', 'reviser'];
function reussiteParRebond(lecons, periode) {
  const scores = lecons.flatMap((l) => horsPretest(l.scores)).filter((s) => dansLaPeriodeDe(s.date, periode) && Number.isFinite(s.score));
  return Object.fromEntries(REBONDS_MESURES.map((rebond) => {
    const valeurs = scores.filter((s) => (s.rebond ?? (s.defi === true ? 'defi' : null)) === rebond).map((s) => s.score);
    return [rebond, { quiz: valeurs.length, pourcentage: valeurs.length ? Math.round(valeurs.reduce((x, y) => x + y, 0) / valeurs.length) : null }];
  }));
}

// Révisions des jours dus : parmi les jours de la période (jusqu'à aujourd'hui) où au moins une Question était due, ceux
// où au moins une réponse de Révision du jour a été donnée. Une Question est due un jour si, d'après ses réponses d'avant
// ce jour, sa prochaine révision tombe au plus tard ce jour-là (comme lib/revisions.js) ; une Question retirée de la
// Révision n'est jamais due. La date de contrôle d'une Leçon de révision, qui resserre le rythme, n'est pas rejouée.
function revisionsDesJoursDus(lecons, periode, maintenant, planificateur) {
  const questions = lecons.flatMap((l) => l.questions ?? []).filter((q) => !q.horsRevision);
  const faites = new Set(lecons.flatMap(reponsesDeRevision).map((r) => jourDe(r.date)));
  const dernier = jourLocal(maintenant) < periode.au ? jourLocal(maintenant) : periode.au;
  let dus = 0;
  let avecReponse = 0;
  for (let jour = periode.du; jour <= dernier; jour = jourLocal(minuitDu(jour, 1))) {
    const debut = minuitDu(jour);
    const fin = finDuJour(debut);
    const due = questions.some((q) => {
      const avant = (q.journal ?? []).filter((r) => dateValide(r.date) && Date.parse(r.date) < debut);
      const memoire = memoireDeQuestion(avant, { maintenant: fin, planificateur });
      return memoire !== null && Date.parse(memoire.prochaineRevision) <= fin;
    });
    if (!due) continue;
    dus += 1;
    if (faites.has(jour)) avecReponse += 1;
  }
  return { jours: dus, faites: avecReponse, pourcentage: pourcentage(avecReponse, dus) };
}

// Prédictions du Kit (#157) : faites et justes sur la période, d'après les événements `prediction` (hors score et hors
// Banque, l'appli ne les garde nulle part ailleurs). Un événement mal daté est écarté.
function predictionsDeLaPeriode(evenements, periode) {
  const faites = evenements.filter((e) => e.type === 'prediction' && dansLaPeriodeDe(e.date, periode));
  const justes = faites.filter((e) => e.juste === true).length;
  return { faites: faites.length, justes, pourcentage: pourcentage(justes, faites.length) };
}

// Planificateur de mémoire de l'Élève (#161) : celui qui sert, et la comparaison de FSRS-5 et FSRS-6 qui l'a fait
// choisir (perte logarithmique sur toutes ses réponses en Révision du jour, sans la période). Les pertes sont arrondies
// à 4 décimales ; null sans réponse à comparer.
function planificateurs(lecons) {
  const c = comparerPlanificateurs(lecons.flatMap((l) => (l.questions ?? []).map((q) => q.journal ?? [])));
  const arrondi = (x) => (x === null ? null : Math.round(x * 10_000) / 10_000);
  return { utilise: c.choisi, reponses: c.reponses, seuil: c.seuil, fsrs5: { perte: arrondi(c.fsrs5.perte) }, fsrs6: { perte: arrondi(c.fsrs6.perte) } };
}

// Questions signalées et rétablies sur la période (événements `signalement` et `retablissement`, #148), et Questions
// suspectes aujourd'hui (calcul pur de lib/suspectes.js, sans période : ce sont celles à vérifier maintenant).
function questionsSignalees(evenements, periode, lecons) {
  const dans = (type) => evenements.filter((e) => e.type === type && dateValide(e.date) && dansLaPeriode(e.date, periode)).length;
  return { signalees: dans('signalement'), retablies: dans('retablissement'), suspectes: questionsSuspectes(lecons).length };
}

export const JOURS_INDICATEURS = 28; // période par défaut : les 4 dernières semaines, aujourd'hui compris

// Période { du, au } des indicateurs vus à `maintenant` (AAAA-MM-JJ, non validées) : par défaut, `au` est aujourd'hui
// et `du` JOURS_INDICATEURS - 1 jours avant `au`.
export function periodeDesIndicateurs(maintenant, { du, au = jourLocal(maintenant) } = {}) {
  return { du: du ?? jourLocal(minuitDu(au, 1 - JOURS_INDICATEURS)), au };
}

// `lecons` : Leçons lues de l'Élève (Retenu à 30 jours, calibration, mesures du ticket #147).
// Indicateurs d'un Élève sur la période `du`…`au` (AAAA-MM-JJ, déjà validées), par défaut celle de periodeDesIndicateurs.
export function indicateurs(evenements, { maintenant, du, au, lecons = [] }) {
  const periode = periodeDesIndicateurs(maintenant, { du, au });
  const comparaison = planificateurs(lecons);
  const planificateur = comparaison.utilise;
  return {
    periode,
    planificateur: comparaison,
    souvenir: tauxDeSouvenir(evenements, periode),
    retour: retourASeptJours(evenements, periode, maintenant),
    attente: attenteDuProf(evenements, periode),
    retenu30: retenuATrenteJours(lecons, maintenant),
    calibration: calibrationDeLaMemoire(lecons, periode, planificateur),
    jeNeSaisPas: jeNeSaisPas(lecons, periode),
    reussiteParRebond: reussiteParRebond(lecons, periode),
    revisionsDesJoursDus: revisionsDesJoursDus(lecons, periode, maintenant, planificateur),
    predictions: predictionsDeLaPeriode(evenements, periode),
    questionsSignalees: questionsSignalees(evenements, periode, lecons),
  };
}
