import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lirePrediction, lirePredictions, messagePrediction, texteDeRevelation, texteDePrediction } from '../public/kit/v1/prediction-logique.js';

// Prédiction (spec #145, ticket #157) : ajout compatible du Kit v1, hors score, hors Banque, hors Maîtrise.
const brute = { id: 'p1', enonce: 'Que fait la lave en refroidissant ?', reponses: ['Elle durcit', 'Elle disparaît'], bonne: 0, revelation: 'La lave refroidie devient de la roche.' };

test('Prédiction : une déclaration bien formée est lue, avec 2 ou 3 réponses', () => {
  assert.deepEqual(lirePrediction(brute), brute);
  assert.equal(lirePrediction({ ...brute, reponses: ['a', 'b', 'c'] }).reponses.length, 3);
});

test('Prédiction : une déclaration mal formée est ignorée', () => {
  for (const mauvaise of [
    null, 'texte', {}, { ...brute, id: '' }, { ...brute, id: 'avec espace' }, { ...brute, enonce: ' ' }, { ...brute, revelation: '' },
    { ...brute, reponses: ['seule'] }, { ...brute, reponses: ['a', 'b', 'c', 'd'] }, { ...brute, reponses: ['a', ''] }, { ...brute, reponses: 'ab' },
    { ...brute, bonne: 2 }, { ...brute, bonne: -1 }, { ...brute, bonne: '0' }, { ...brute, bonne: undefined },
  ]) assert.equal(lirePrediction(mauvaise), null, JSON.stringify(mauvaise));
});

test('Prédiction : une liste garde les valides, sans doublon d\'identifiant', () => {
  const lues = lirePredictions([brute, { ...brute }, { ...brute, id: 'p2' }, { id: 'x' }]);
  assert.deepEqual(lues.map((p) => p.id), ['p1', 'p2']);
  assert.deepEqual(lirePredictions('rien'), []);
});

test('Prédiction : le résultat envoyé à l\'appli ne porte ni choix ni score', () => {
  assert.deepEqual(messagePrediction(lirePrediction(brute), 0, '0002-magma.html'), { type: 'cartable-prediction', page: '0002-magma.html', id: 'p1', juste: true });
  assert.equal(messagePrediction(lirePrediction(brute), 1, 'p.html').juste, false);
});

test('Prédiction : la révélation dit ce que l\'Élève avait pensé, puis ce qu\'il en est', () => {
  const p = lirePrediction(brute);
  assert.equal(texteDeRevelation(p, 1), 'Tu avais pensé « Elle disparaît » ; en fait, c’était « Elle durcit ». La lave refroidie devient de la roche.');
  assert.equal(texteDeRevelation(p, 0), 'Tu avais pensé « Elle durcit » ; en fait, tu avais raison. La lave refroidie devient de la roche.');
});

test('Prédiction : la Lecture à voix haute lit l\'énoncé et les réponses, puis la révélation une fois montrée', () => {
  const p = lirePrediction(brute);
  assert.equal(texteDePrediction(p), 'Que fait la lave en refroidissant ? Elle durcit. Elle disparaît.');
  assert.match(texteDePrediction(p, 1), /Tu avais pensé « Elle disparaît »/);
});
