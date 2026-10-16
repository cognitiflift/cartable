import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joursDeRevisionTerminee } from '../lib/revision-du-jour.js';

// Dates en heure locale : les jours de l'Élève sont ceux de sa machine (voir lib/jour.js).
const iso = (jour, heure = 12) => { const [an, mois, j] = jour.split('-').map(Number); return new Date(an, mois - 1, j, heure).toISOString(); };

// Une Leçon telle que lireLecon la renvoie, réduite au journal de ses Questions.
const lecon = ({ revisions = [], quiz = [] } = {}) => ({
  questions: [{ journal: [
    ...quiz.map((jour) => ({ date: iso(jour), juste: true, origine: 'quiz' })),
    ...revisions.map((jour) => ({ date: iso(jour), juste: false, origine: 'revision' })),
  ] }],
});
// Un « maintenant » bien après les jours des exemples.
const APRES = Date.parse(iso('2026-11-01'));
const terminee = (jour, heure) => ({ type: 'revision-terminee', date: iso(jour, heure) });

test('Révision du jour menée jusqu\'au bout : historique sans événement, chaque jour avec une réponse de Révision du jour compte, une fois', () => {
  const lecons = [
    lecon({ revisions: ['2026-10-13', '2026-10-12', '2026-10-12'], quiz: ['2026-10-14'] }),
    lecon({ revisions: ['2026-10-13'] }),
  ];
  assert.deepEqual(joursDeRevisionTerminee(lecons, [], APRES), ['2026-10-12', '2026-10-13']);
});

test('Révision du jour menée jusqu\'au bout : depuis le premier événement, seuls les jours avec un événement comptent', () => {
  const lecons = [lecon({ revisions: ['2026-10-10', '2026-10-12', '2026-10-13', '2026-10-15'] })];
  const evenements = [
    { type: 'revision', date: iso('2026-10-12'), lecon: 'x', juste: true },
    terminee('2026-10-12', 18), terminee('2026-10-14'), terminee('2026-10-14', 15), terminee('2026-10-15'),
  ];
  // Le 10 : avant le premier événement, une réponse suffit ; le 13 : série abandonnée, rien.
  assert.deepEqual(joursDeRevisionTerminee(lecons, evenements, APRES), ['2026-10-10', '2026-10-12', '2026-10-14', '2026-10-15']);
});

test('Révision du jour menée jusqu\'au bout : dates illisibles écartées, rien sans Leçon ni événement', () => {
  assert.deepEqual(joursDeRevisionTerminee([], [], APRES), []);
  assert.deepEqual(joursDeRevisionTerminee([{ questions: [{ journal: [{ date: 'n/a', origine: 'revision' }] }] }], [{ type: 'revision-terminee', date: 'n/a' }], APRES), []);
});

test('Révision du jour menée jusqu\'au bout : aujourd\'hui ne compte que par l\'événement, jamais par la règle du passé', () => {
  const lecons = [lecon({ revisions: ['2026-10-12', '2026-10-16'] })];
  const maintenant = Date.parse(iso('2026-10-16', 15));
  // Série du jour commencée, pas finie, sans aucun événement : le 16 ne compte pas encore.
  assert.deepEqual(joursDeRevisionTerminee(lecons, [], maintenant), ['2026-10-12']);
  // Une fois menée jusqu'au bout : le 16 compte, par l'événement.
  assert.deepEqual(joursDeRevisionTerminee(lecons, [terminee('2026-10-16', 15)], maintenant), ['2026-10-12', '2026-10-16']);
});
