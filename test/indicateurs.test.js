import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indicateurs } from '../lib/indicateurs.js';

// Événements datés à dates maîtrisées : jours locaux d'octobre 2026, à midi (heure locale).
const a = (jour, heure = 12, minute = 0, seconde = 0) => new Date(2026, 9, jour, heure, minute, seconde).getTime();
const iso = (...args) => new Date(a(...args)).toISOString();
const revision = (jour, juste) => ({ type: 'revision', date: iso(jour), lecon: 'l', juste });
const ouverture = (jour, lecon = 'l') => ({ type: 'ouverture', date: iso(jour), lecon });
const tour = (jour, secondes) => ({ type: 'tour', lecon: 'l', debut: iso(jour), fin: iso(jour, 12, 0, secondes) });

test('Taux de souvenir : part des réponses justes aux Révisions du jour sur la période', () => {
  const evenements = [revision(1, true), revision(2, false), revision(2, true), revision(3, true), ouverture(2)];
  const { souvenir } = indicateurs(evenements, { maintenant: a(3), du: '2026-10-02', au: '2026-10-03' });
  assert.deepEqual(souvenir, { reponses: 3, justes: 2, pourcentage: 67 });
});

test('Taux de souvenir : sans réponse aux Révisions du jour, pas de pourcentage', () => {
  assert.deepEqual(indicateurs([ouverture(2)], { maintenant: a(3) }).souvenir, { reponses: 0, justes: 0, pourcentage: null });
});

test('Période : par défaut les 28 derniers jours locaux, aujourd\'hui compris ; elle est rendue avec les indicateurs', () => {
  const evenements = [revision(2, true), revision(3, false), revision(30, true)];
  const { periode, souvenir } = indicateurs(evenements, { maintenant: a(30, 8) });
  assert.deepEqual(periode, { du: '2026-10-03', au: '2026-10-30' });
  assert.deepEqual(souvenir, { reponses: 2, justes: 1, pourcentage: 50 });
});

test('Retour à 7 jours : pour chaque Leçon ouverte la première fois sur la période, l\'Élève revient-il la semaine d\'après (J+7 à J+13) ?', () => {
  const evenements = [
    ouverture(0, 'D'), ouverture(3, 'D'), // ouverte avant la période : pas comptée
    ouverture(1, 'A'), revision(8, true), // A : revenu à J+7
    ouverture(2, 'B'), ouverture(5, 'B'), // B : revenu à J+3 et J+6 seulement, rien de J+7 à J+13 : pas revenu
    ouverture(16, 'C'), // C : sa semaine d'après n'est pas encore passée, en attente
  ];
  const { retour } = indicateurs(evenements, { maintenant: a(20), du: '2026-10-01', au: '2026-10-20' });
  assert.deepEqual(retour, { lecons: 2, revenus: 1, enAttente: 1, pourcentage: 50 });
});

test('Retour à 7 jours : un retour déjà venu compte même avant la fin de la semaine d\'après ; sans Leçon mesurée, pas de pourcentage', () => {
  const { retour } = indicateurs([ouverture(1, 'A'), ouverture(9, 'B')], { maintenant: a(10), du: '2026-10-01', au: '2026-10-10' });
  assert.deepEqual(retour, { lecons: 1, revenus: 1, enAttente: 1, pourcentage: 100 });
  assert.deepEqual(indicateurs([ouverture(9, 'B')], { maintenant: a(10) }).retour, { lecons: 0, revenus: 0, enAttente: 1, pourcentage: null });
});

test('Attente du prof : nombre de tours commencés sur la période, attente moyenne, médiane et la plus longue (secondes)', () => {
  const evenements = [tour(1, 300), tour(2, 20), tour(2, 40), tour(3, 90), tour(3, 41)];
  const { attente } = indicateurs(evenements, { maintenant: a(3), du: '2026-10-02', au: '2026-10-03' });
  assert.deepEqual(attente, { tours: 4, moyenneSecondes: 48, medianeSecondes: 41, maxSecondes: 90 });
});

test('Attente du prof : sans tour, pas de durée ; un tour mal daté est écarté', () => {
  const malDate = { type: 'tour', lecon: 'l', debut: iso(2), fin: 'pas une date' };
  assert.deepEqual(indicateurs([malDate, ouverture(2)], { maintenant: a(3) }).attente,
    { tours: 0, moyenneSecondes: null, medianeSecondes: null, maxSecondes: null });
});

// Retenu à 30 jours et calibration (#151) : calculés sur les Leçons (scores, journal des Questions).
const A = (mois, jour, heure = 12) => new Date(2026, mois - 1, jour, heure).toISOString();
const quiz = (date) => ({ date, score: 100, objectifs: [1] });
const lecon = (scores, retenu) => ({ mode: 'libre', objectifs: [{ texte: 'o', retenu }], scores, questions: [] });
const maintenant30 = new Date(2026, 10, 30, 12).getTime(); // 30 novembre ; il y a 30 jours : le 31 octobre

test('Retenu à 30 jours : part des Objectifs Retenus il y a au moins 30 jours qui le sont encore', () => {
  const lecons = [
    lecon([quiz(A(10, 1)), quiz(A(10, 3))], true),
    lecon([quiz(A(10, 1)), quiz(A(10, 3))], false), // oublié depuis
    lecon([quiz(A(11, 5)), quiz(A(11, 7))], true), // Retenu depuis moins de 30 jours : pas encore mesurable
  ];
  assert.deepEqual(indicateurs([], { maintenant: maintenant30, lecons }).retenu30, { objectifs: 2, encoreRetenus: 1, pourcentage: 50 });
});

test('Retenu à 30 jours : devenu Retenu le jour d\'il y a 30 jours compte, le lendemain non', () => {
  const [tard, tot] = [lecon([quiz(A(10, 30)), quiz(A(10, 31, 23))], true), lecon([quiz(A(10, 30)), quiz(A(11, 1, 0))], true)];
  assert.equal(indicateurs([], { maintenant: maintenant30, lecons: [tard] }).retenu30.objectifs, 1);
  assert.equal(indicateurs([], { maintenant: maintenant30, lecons: [tot] }).retenu30.objectifs, 0);
});

test('Retenu à 30 jours : sans Objectif Retenu depuis 30 jours, pas de pourcentage', () => {
  assert.deepEqual(indicateurs([], { maintenant: maintenant30 }).retenu30, { objectifs: 0, encoreRetenus: 0, pourcentage: null });
});

const rev = (date, juste) => ({ date, juste, origine: 'revision' });
const avecJournal = (journal) => ({ objectifs: [], scores: [], questions: [{ contenu: {}, journal }] });

test('Calibration : probabilité prédite avant chaque réponse en Révision du jour, comparée au résultat, par tranches', () => {
  // Réponse du quiz le 1er (1re réponse), puis révisions : 2 jours après (prédit ~ 90 %), 40 jours après (prédit bas).
  const journal = [{ date: A(10, 1), juste: true, origine: 'quiz' }, rev(A(10, 3), true), rev(A(11, 12), false)];
  const { calibration } = indicateurs([], { maintenant: maintenant30, du: '2026-10-01', au: '2026-11-30', lecons: [avecJournal(journal)] });
  assert.deepEqual(calibration.map((t) => [t.de, t.a]), [[0, 60], [60, 70], [70, 80], [80, 90], [90, 100]]);
  assert.deepEqual(calibration.map((t) => t.reponses), [0, 1, 0, 0, 1]);
  assert.deepEqual(calibration[1], { de: 60, a: 70, reponses: 1, justes: 0, predit: 69, pourcentage: 0 });
  assert.deepEqual(calibration[4], { de: 90, a: 100, reponses: 1, justes: 1, predit: 93, pourcentage: 100 });
});

test('Calibration : tranche vide sans pourcentage ; réponse hors période et première réponse écartées', () => {
  const journal = [rev(A(10, 1), true), rev(A(10, 3), true)];
  const { calibration } = indicateurs([], { maintenant: maintenant30, du: '2026-11-01', au: '2026-11-30', lecons: [avecJournal(journal)] });
  for (const t of calibration) assert.deepEqual([t.reponses, t.pourcentage, t.predit], [0, null, null]);
  const dedans = indicateurs([], { maintenant: maintenant30, du: '2026-10-01', au: '2026-10-31', lecons: [avecJournal(journal)] }).calibration;
  assert.equal(dedans.reduce((t, x) => t + x.reponses, 0), 1); // la première réponse n'a pas de prédiction
});
