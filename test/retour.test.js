import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteRetourQuiz } from '../lib/retour.js';

test('Retour de quiz : la phrase du score dépend du palier, toujours encourageante', () => {
  assert.equal(texteRetourQuiz({ score: 100, action: 'suivante' }), 'Parfait, 100 % : tout est juste ! 🎉');
  assert.equal(texteRetourQuiz({ score: 85, action: 'defi' }), 'Bravo, 85 % : quiz réussi ! 👏');
  assert.equal(texteRetourQuiz({ score: 60, action: 'revoir' }), 'Bien joué, 60 % : tu es sur la bonne voie ! 💪');
  assert.equal(texteRetourQuiz({ score: 20, action: 'revoir' }), "20 %, c'est un début : chaque erreur t'apprend quelque chose. 🌱");
});

test('Retour de quiz : cite ce qui est réussi quand les résultats par question sont connus (hors bonus)', () => {
  const questions = [
    { id: 'q1', juste: true, bonus: false },
    { id: 'q2', juste: false, bonus: false },
    { id: 'q3', juste: true, bonus: false },
    { id: 'b1', juste: true, bonus: true },
  ];
  assert.equal(
    texteRetourQuiz({ score: 67, action: 'revoir', questions }),
    'Bien joué, 67 % : tu es sur la bonne voie ! 💪\nTu as trouvé 2 réponses sur 3.',
  );
  assert.match(texteRetourQuiz({ score: 100, action: 'suivante', questions: [{ id: 'q1', juste: true, bonus: false }] }), /1 réponse sur 1\./);
});

test('Retour de quiz : annonce les Étoiles nouvelles', () => {
  assert.match(texteRetourQuiz({ score: 90, action: 'defi', nouvellesEtoiles: ['quiz'] }), /⭐ Nouvelle Étoile : quiz réussi !/);
  assert.match(
    texteRetourQuiz({ score: 90, action: 'terminee', nouvellesEtoiles: ['bonus', 'defi'] }),
    /⭐ Nouvelles Étoiles : questions bonus réussies, Défi réussi !/,
  );
  assert.doesNotMatch(texteRetourQuiz({ score: 90, action: 'defi' }), /Étoile/);
});

test('Retour de quiz : le Dépassement est salué s\'il est réussi, encouragé sinon, absent sans questions bonus', () => {
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 2, total: 3 } }), /🚀 Dépassement réussi : 2 questions bonus sur 3 !/);
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 1, total: 3 } }), /🚀 1 question bonus sur 3 : bravo d'avoir tenté d'aller plus loin !/);
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 0, total: 2 } }), /🚀 Les questions bonus allaient plus loin que la leçon : elles ne comptent pas dans ton score\./);
  assert.doesNotMatch(texteRetourQuiz({ score: 70, action: 'suivante' }), /🚀/);
});

test('Retour de quiz : un Défi réussi qui termine la Leçon est fêté', () => {
  assert.match(texteRetourQuiz({ score: 90, action: 'terminee' }), /🏁 Défi réussi : ta Leçon est terminée !/);
  assert.doesNotMatch(texteRetourQuiz({ score: 90, action: 'defi' }), /terminée/);
});
