import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reussiteRecente, reglageDifficulte, consigneDifficulte, QUIZ_RECENTS, SEUIL_GUIDEE, SEUIL_DURCIR } from '../lib/difficulte.js';

const quiz = (...scores) => scores.map((score) => ({ score }));

test('Difficulté : fenêtre de 5 quiz, seuils 70 et 90 %', () => {
  assert.deepEqual([QUIZ_RECENTS, SEUIL_GUIDEE, SEUIL_DURCIR], [5, 70, 90]);
});

test('Difficulté : la moyenne porte sur les 5 derniers quiz comptés, sans le Pré-test', () => {
  const scores = [...quiz(0, 0), { score: 0, pretest: true }, ...quiz(100, 100, 80, 80, 40)];
  assert.deepEqual(reussiteRecente(scores), { moyenne: 80, quiz: 5 });
});

test('Difficulté : moins de 5 quiz, la moyenne porte sur ceux qui existent ; aucun quiz, rien', () => {
  assert.deepEqual(reussiteRecente(quiz(100, 50)), { moyenne: 75, quiz: 2 });
  assert.equal(reussiteRecente([]), null);
  assert.equal(reussiteRecente([{ score: 10, pretest: true }]), null);
  assert.deepEqual(consigneDifficulte([]), []);
  assert.deepEqual(consigneDifficulte([{ score: 10, pretest: true }]), []);
});

test('Difficulté : plus difficile au-delà de 90 %, plus guidée sous 70 %, inchangée entre les deux (bornes comprises)', () => {
  assert.equal(reglageDifficulte(100), 'durcir');
  assert.equal(reglageDifficulte(91), 'durcir');
  assert.equal(reglageDifficulte(90), 'garder');
  assert.equal(reglageDifficulte(70), 'garder');
  assert.equal(reglageDifficulte(69), 'guider');
  assert.equal(reglageDifficulte(0), 'guider');
});

test('Difficulté : la consigne dit la réussite et le réglage', () => {
  assert.match(consigneDifficulte(quiz(100, 100))[0], /Réussite récente : 100 % en moyenne sur les 2 derniers quiz.*plus difficile/);
  assert.match(consigneDifficulte(quiz(60))[0], /sur le dernier quiz.*plus guidée/);
  assert.match(consigneDifficulte(quiz(80))[0], /inchangée/);
});
