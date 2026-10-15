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
