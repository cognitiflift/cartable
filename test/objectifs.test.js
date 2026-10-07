import { test } from 'node:test';
import assert from 'node:assert/strict';
import { objectifsAtteints, niveauLecon } from '../lib/store.js';

const objectifs = ['Nommer les parties d’un volcan', 'Expliquer une éruption', 'Situer trois volcans'];
const score = (valeur, couverts) => ({ score: valeur, date: '2026-10-01T10:00:00.000Z', ...(couverts && { objectifs: couverts }) });
const atteints = (scores) => objectifsAtteints(objectifs, scores).map((o) => o.atteint);

test('Objectifs atteints : aucun sans score', () => {
  assert.deepEqual(objectifsAtteints(objectifs, []), [
    { texte: 'Nommer les parties d’un volcan', atteint: false },
    { texte: 'Expliquer une éruption', atteint: false },
    { texte: 'Situer trois volcans', atteint: false },
  ]);
});

test('Objectifs atteints : un score de 80 % ou plus atteint les Objectifs qu’il couvre', () => {
  assert.deepEqual(atteints([score(80, [1, 3])]), [true, false, true]);
});

test('Objectifs atteints : un quiz raté n’atteint rien', () => {
  assert.deepEqual(atteints([score(79, [1, 2])]), [false, false, false]);
});

test('Objectifs atteints : un Objectif atteint le reste après un quiz raté', () => {
  assert.deepEqual(atteints([score(90, [2]), score(10, [2])]), [false, true, false]);
});

test('Objectifs atteints : scores anciens sans Objectifs et numéros inexistants ignorés', () => {
  assert.deepEqual(atteints([score(100), score(100, [7, 0])]), [false, false, false]);
});

test('Niveau de Leçon : Objectifs atteints + 1, en commençant au niveau 1', () => {
  const niveau = (scores) => niveauLecon(objectifsAtteints(objectifs, scores), 'libre');
  assert.equal(niveau([]), 1);
  assert.equal(niveau([score(85, [1])]), 2);
  // Un quiz réussi qui ne couvre qu'un Objectif déjà atteint ne change pas le Niveau.
  assert.equal(niveau([score(85, [1]), score(95, [1])]), 2);
  assert.equal(niveau([score(85, [1]), score(40, [2])]), 2);
  assert.equal(niveau([score(85, [1, 2, 3])]), 4);
});

test('Niveau de Leçon : null sans Objectifs ou pour une Leçon de révision', () => {
  assert.equal(niveauLecon([], 'libre'), null);
  assert.equal(niveauLecon(objectifsAtteints(objectifs, []), 'revision'), null);
});

test('Objectifs atteints : en Leçon libre, un quiz fait en Révisant n’atteint rien et ne change pas le Niveau', () => {
  const revise = { ...score(100, [2, 3]), reviser: true };
  const libre = objectifsAtteints(objectifs, [score(85, [1]), revise], 'libre');
  assert.deepEqual(libre.map((o) => o.atteint), [true, false, false]);
  assert.equal(niveauLecon(libre, 'libre'), 2);
  // Leçon de révision : la phase Réviser compte comme une révision ordinaire.
  assert.deepEqual(objectifsAtteints(objectifs, [revise], 'revision').map((o) => o.atteint), [false, true, true]);
});
