import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomEtPalier, morceauxRecompensesLecon } from '../public/recompenses-texte.js';

const texte = (morceaux) => morceaux.map((m) => m.texte).join('');

test('Badge nommé avec son Palier : « Régulier, argent » ; un badge surprise, par son seul nom', () => {
  assert.equal(nomEtPalier({ nom: 'Régulier', palier: 'argent' }), 'Régulier, argent');
  assert.equal(nomEtPalier({ nom: 'Content de te revoir', palier: 'unique' }), 'Content de te revoir');
});

test('Carte d\'une Leçon libre : « ⭐ n » toujours, même à 0, puis « · 🚀 n » seulement avec des Fusées', () => {
  assert.equal(texte(morceauxRecompensesLecon({ mode: 'libre', etoiles: 0, fusees: 0 })), '⭐ 0');
  assert.equal(texte(morceauxRecompensesLecon({ mode: 'libre', etoiles: 3, fusees: 0 })), '⭐ 3');
  assert.equal(texte(morceauxRecompensesLecon({ mode: 'libre', etoiles: 3, fusees: 2 })), '⭐ 3 · 🚀 2');
});

test('Carte d\'une Leçon de révision : ses trois Étoiles nommées pleines ou vides, puis « · 🚀 n » seulement avec des Fusées', () => {
  const morceaux = morceauxRecompensesLecon({ mode: 'revision', etoiles: { quiz: true, bonus: false, defi: false }, fusees: 1 });
  assert.equal(texte(morceaux), '⭐☆☆ · 🚀 1');
  assert.deepEqual(morceaux.slice(0, 3).map((m) => m.titre), ['Quiz réussi', 'Questions bonus réussies', 'Défi réussi']);
  assert.equal(texte(morceauxRecompensesLecon({ mode: 'revision', etoiles: { quiz: false, bonus: false, defi: false }, fusees: 0 })), '☆☆☆');
});
