import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consignesPropositions } from '../lib/agent.js';

const profil = { pseudo: 'Zoé', age: 11, niveau: 'Primaire 6' };

test('consignes des Propositions : 4 originaux sans Leçon', () => {
  const consignes = consignesPropositions(profil, []);
  assert.match(consignes, /11 ans/);
  assert.match(consignes, /Primaire 6/);
  assert.match(consignes, /4 sujets originaux/);
  assert.doesNotMatch(consignes, /"suite"/);
});

test('consignes des Propositions : 2 suites et 2 originaux, d\'après le titre, la Catégorie et la Maîtrise des Leçons', () => {
  const consignes = consignesPropositions(profil, [
    { titre: 'Les volcans', categorie: 'Sciences', maitrise: { pourcentage: 85, palier: 'acquis' } },
    { titre: 'Les fractions', categorie: 'Mathématiques', maitrise: null },
  ]);
  assert.match(consignes, /2 suites/);
  assert.match(consignes, /2 sujets originaux/);
  assert.match(consignes, /Les volcans \(Sciences\) : Maîtrise 85 %, acquis/);
  assert.match(consignes, /Les fractions \(Mathématiques\) : Maîtrise pas encore évaluée/);
  assert.match(consignes, /"suite"/);
});
