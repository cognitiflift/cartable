import { test } from 'node:test';
import assert from 'node:assert/strict';
import { objectifsAtteints, etatObjectifs, niveauLecon, calculerMaitrise, etoilesLecon, depassementLecon } from '../lib/store.js';

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

// Retenu : deux quiz réussis qui couvrent l'Objectif, à au moins 24 heures d'intervalle.
const le = (date, valeur, couverts, marques = {}) => ({ score: valeur, date, objectifs: couverts, ...marques });
const retenus = (scores, mode) => etatObjectifs(objectifs, scores, mode).map((o) => o.retenu);

test('Retenu : deux succès le même jour ne suffisent pas', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-01T20:00:00.000Z', 100, [1])]), [false, false, false]);
});

test('Retenu : deux succès à 25 heures d’écart suffisent, pour les seuls Objectifs couverts les deux fois', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 85, [1, 2]), le('2026-10-02T10:00:00.000Z', 80, [1, 3])]), [true, false, false]);
});

test('Retenu : exactement 24 heures d’écart suffisent, pas une minute de moins', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 85, [1]), le('2026-10-02T09:00:00.000Z', 85, [1])]), [true, false, false]);
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 85, [1]), le('2026-10-02T08:59:00.000Z', 85, [1])]), [false, false, false]);
});

test('Retenu : un quiz raté ne compte pas', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-03T09:00:00.000Z', 79, [1])]), [false, false, false]);
});

test('Retenu : acquis pour toujours, même après des quiz ratés', () => {
  assert.deepEqual(retenus([
    le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-05T09:00:00.000Z', 95, [1]), le('2026-10-09T09:00:00.000Z', 10, [1]),
  ]), [true, false, false]);
});

test('Retenu : les quiz faits en Révisant comptent, le Pré-test non', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 90, [1, 2]), le('2026-10-03T09:00:00.000Z', 90, [1], { reviser: true })]), [true, false, false]);
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 100, [2], { pretest: true }), le('2026-10-03T09:00:00.000Z', 90, [2])]), [false, false, false]);
});

test('Retenu : jamais sans être atteint (deux quiz faits en Révisant une Leçon libre n’atteignent rien)', () => {
  const revises = [le('2026-10-01T09:00:00.000Z', 90, [1], { reviser: true }), le('2026-10-03T09:00:00.000Z', 90, [1], { reviser: true })];
  assert.deepEqual(retenus(revises, 'libre'), [false, false, false]);
  assert.deepEqual(retenus(revises, 'revision'), [true, false, false]);
});

test('Objectifs : l’état de chaque Objectif réunit texte, atteint, Retenu et « à confirmer »', () => {
  assert.deepEqual(etatObjectifs(objectifs, [le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-03T09:00:00.000Z', 90, [1, 2])], 'libre')[0],
    { texte: 'Nommer les parties d’un volcan', atteint: true, retenu: true, aConfirmer: false });
});

test('Retenu : scores anciens sans Objectifs ignorés', () => {
  assert.deepEqual(retenus([{ score: 100, date: '2026-10-01T09:00:00.000Z' }, { score: 100, date: '2026-10-05T09:00:00.000Z' }]), [false, false, false]);
});

// Pré-test : résultats par question, chacune couvrant ses Objectifs.
const question = (juste, couverts, autres = {}) => ({ id: `q${couverts.join('-')}`, enonce: 'Q ?', choisie: 'a', bonne: 'a', juste, bonus: false, objectifs: couverts, ...autres });
const pretest = (...questions) => ({ score: 50, date: '2026-10-01T09:00:00.000Z', pretest: true, questions });
const aConfirmer = (scores, mode = 'libre') => etatObjectifs(objectifs, scores, mode).map((o) => o.aConfirmer);

test('Pré-test : son score n’atteint aucun Objectif, même à 100 %', () => {
  assert.deepEqual(atteints([{ ...score(100, [1, 2]), pretest: true }]), [false, false, false]);
});

test('Pré-test : hors Maîtrise, hors Étoiles et hors Dépassement', () => {
  assert.equal(calculerMaitrise([{ ...score(100), pretest: true }]), null);
  assert.equal(calculerMaitrise([score(60), { ...score(100), pretest: true }], Date.parse('2026-10-02')).pourcentage, 60);
  assert.equal(etoilesLecon([{ ...score(100), pretest: true, bonus: { reussies: 2, total: 2 } }], null, 'revision').quiz, false);
  assert.equal(etoilesLecon([{ ...score(100), pretest: true, bonus: { reussies: 2, total: 2 } }], null, 'revision').bonus, false);
  assert.equal(depassementLecon([{ ...score(100), pretest: true, bonus: { reussies: 2, total: 2 } }], 'libre'), false);
});

test('À confirmer : les Objectifs couverts par une question réussie au Pré-test', () => {
  assert.deepEqual(aConfirmer([pretest(question(true, [2]), question(false, [1]), question(false, [3]))]), [false, true, false]);
});

test('À confirmer : rien sans Pré-test, ni pour une question réussie dans un quiz ordinaire', () => {
  assert.deepEqual(aConfirmer([]), [false, false, false]);
  assert.deepEqual(aConfirmer([{ ...score(50), questions: [question(true, [1])] }]), [false, false, false]);
});

test('À confirmer : plus dès qu’un vrai quiz a atteint l’Objectif', () => {
  assert.deepEqual(aConfirmer([pretest(question(true, [1]), question(true, [2])), score(90, [1])]), [false, true, false]);
});

test('À confirmer : une question bonus réussie ou un Pré-test sans résultats par question ne confirme rien', () => {
  assert.deepEqual(aConfirmer([pretest(question(true, [1], { bonus: true }))]), [false, false, false]);
  assert.deepEqual(aConfirmer([{ ...score(100, [1, 2]), pretest: true }]), [false, false, false]);
});
