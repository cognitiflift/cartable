import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireQuiz, corriger, messageScore, melanger } from '../public/kit/v1/quiz-logique.js';

const quiz = {
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Où sort la lave ?', reponses: ['Le cratère', 'La racine', 'Le nuage'], bonne: 0, explication: 'Par le cratère.' },
    { id: 'q2', type: 'qcm', enonce: 'Le magma est…', reponses: ['froid', 'de la roche fondue'], bonne: 1, explication: 'Roche fondue.', objectifs: [2] },
    { id: 'q3', type: 'qcm', enonce: 'Un volcan sur Mars ?', reponses: ['Olympus Mons', 'Etna'], bonne: 0, explication: 'Le plus grand.', bonus: true },
  ],
};

test('Kit : le message envoyé porte le score hors bonus, le bonus, les Objectifs et les résultats par question', () => {
  const message = messageScore(lireQuiz(quiz), { q1: 0, q2: 0, q3: 0 }, '0002-magma.html');
  assert.deepEqual(message, {
    type: 'cartable-score',
    score: 50,
    page: '0002-magma.html',
    objectifs: [1, 2],
    bonus: { reussies: 1, total: 1 },
    questions: [
      { id: 'q1', enonce: 'Où sort la lave ?', choisie: 'Le cratère', bonne: 'Le cratère', juste: true, bonus: false, objectifs: [1] },
      { id: 'q2', enonce: 'Le magma est…', choisie: 'froid', bonne: 'de la roche fondue', juste: false, bonus: false, objectifs: [2] },
      { id: 'q3', enonce: 'Un volcan sur Mars ?', choisie: 'Olympus Mons', bonne: 'Olympus Mons', juste: true, bonus: true, objectifs: [1] },
    ],
  });
});

test('Kit : les questions mal formées ou en double sont écartées ; sans question hors bonus, pas de quiz', () => {
  const lu = lireQuiz({
    objectifs: [1, 'deux', 1],
    questions: [
      ...quiz.questions,
      { id: 'q1', enonce: 'Doublon', reponses: ['a', 'b'], bonne: 0 },
      { id: 'q4', enonce: 'Une seule réponse', reponses: ['a'], bonne: 0 },
      { id: 'q5', enonce: 'Bonne hors bornes', reponses: ['a', 'b'], bonne: 2 },
      { id: 'q6', type: 'vrai-faux', enonce: 'Autre format', reponses: ['a', 'b'], bonne: 0 },
      { enonce: 'Sans id', reponses: ['a', 'b'], bonne: 0 },
      'pas une question',
    ],
  });
  assert.deepEqual(lu.questions.map((q) => q.id), ['q1', 'q2', 'q3']);
  assert.deepEqual(lu.objectifs, [1]);
  assert.equal(lireQuiz({ questions: [quiz.questions[2]] }), null);
  assert.equal(lireQuiz(null), null);
  assert.equal(lireQuiz({ questions: 'aucune' }), null);
});

test('Kit : corriger donne juste, la bonne réponse et l\'explication', () => {
  const [q1] = lireQuiz(quiz).questions;
  assert.deepEqual(corriger(q1, 0), { juste: true, bonne: 'Le cratère', explication: 'Par le cratère.' });
  assert.equal(corriger(q1, 2).juste, false);
});

test('Kit : les réponses sont mélangées en une permutation de leurs index', () => {
  assert.deepEqual(melanger(3, () => 0), [1, 2, 0]);
  assert.deepEqual(melanger(4).toSorted(), [0, 1, 2, 3]);
});

test('Kit : un quiz tout juste vaut 100 %, sans champ bonus quand il n\'a pas de question bonus', () => {
  const sansBonus = lireQuiz({ objectifs: [3], questions: quiz.questions.slice(0, 1) });
  const message = messageScore(sansBonus, { q1: 0 }, 'p.html');
  assert.equal(message.score, 100);
  assert.equal(message.bonus, undefined);
  assert.deepEqual(message.objectifs, [3]);
});
