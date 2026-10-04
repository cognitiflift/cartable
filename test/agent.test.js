import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consignesPropositions, consignesLecon, extraireChoix, actionApresQuiz } from '../lib/agent.js';

const profil = { pseudo: 'Zoé', age: 11, niveau: 'Primaire 6' };

test('Réponses proposées : la ligne CHOIX est retirée du texte et découpée', () => {
  assert.deepEqual(extraireChoix('Salut !\n\nPourquoi les tornades ?\nCHOIX: Un exposé | Un devoir |  Simple curiosité '), {
    texte: 'Salut !\n\nPourquoi les tornades ?',
    choix: ['Un exposé', 'Un devoir', 'Simple curiosité'],
  });
});

test('Réponses proposées : aucune sans ligne CHOIX, 4 au plus, casse et ** tolérés', () => {
  assert.deepEqual(extraireChoix('Ta page est prête.'), { texte: 'Ta page est prête.' });
  assert.deepEqual(extraireChoix('Alors ?\n**Choix :** a | b | c | d | e | |').choix, ['a', 'b', 'c', 'd']);
  assert.deepEqual(extraireChoix('CHOIX:'), { texte: '' });
});

test('action après un quiz : Revoir sous 80 %, sinon Défi (révision) ou Leçon suivante (libre)', () => {
  assert.equal(actionApresQuiz(79, 'revision'), 'revoir');
  assert.equal(actionApresQuiz(40, 'libre'), 'revoir');
  assert.equal(actionApresQuiz(80, 'revision'), 'defi');
  assert.equal(actionApresQuiz(95, 'libre'), 'suivante');
});

test('consignes de Leçon : pas de saisie libre, Réponses proposées sur une ligne CHOIX', () => {
  const consignes = consignesLecon(profil);
  assert.match(consignes, /ne peut pas écrire/);
  assert.match(consignes, /CHOIX: /);
  assert.doesNotMatch(consignes, /panneau de droite/);
});

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
