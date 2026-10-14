import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultatQuiz } from '../lib/resultats.js';
import { lireQuiz, messageScore } from '../public/kit/v1/quiz-logique.js';

const long = (n) => 'x'.repeat(n);
const qcm = (id, autres = {}) => ({ id, type: 'qcm', enonce: `Question ${id} ?`, reponses: ['oui', 'non'], bonne: 0, explication: '', ...autres });

test('Résultats : tout ce que le Kit envoie est accepté par l\'appli, le score enregistré est celui de la page', () => {
  // Une question très longue ratée : l'écarter ferait monter le score.
  const quiz = lireQuiz({
    objectifs: [1],
    questions: [qcm('q1'), qcm(long(150), { enonce: long(800), reponses: [long(700), 'non'], bonne: 0 })],
  });
  const message = messageScore(quiz, { q1: 0, [quiz.questions[1].id]: 1 }, 'p.html');
  assert.equal(message.score, 50);
  const resultat = resultatQuiz(message);
  assert.equal(resultat.score, 50);
  assert.equal(resultat.questions.length, 2);
});

test('Résultats : les textes trop longs sont tronqués, pas écartés, avec la même limite dans le Kit et dans l\'appli', () => {
  const quiz = lireQuiz({ questions: [qcm('q1', { enonce: long(800), reponses: [long(700), 'non'], explication: long(900) })] });
  const [q] = quiz.questions;
  assert.equal(q.enonce.length, 500);
  assert.equal(q.reponses[0].length, 500);
  assert.equal(q.explication.length, 500);

  const { questions } = resultatQuiz({ questions: [{ id: long(150), enonce: long(800), choisie: long(600), bonne: 'oui', juste: false, bonus: false }] });
  assert.equal(questions.length, 1);
  assert.equal(questions[0].id.length, 100);
  assert.equal(questions[0].enonce.length, 500);
  assert.equal(questions[0].choisie.length, 500);
  assert.equal(resultatQuiz({ questions }).score, 0);
});

test('Résultats : au plus 50 questions, dans le Kit comme dans l\'appli', () => {
  const quiz = lireQuiz({ questions: Array.from({ length: 60 }, (_, i) => qcm(`q${i}`)) });
  assert.equal(quiz.questions.length, 50);
  const message = messageScore(quiz, Object.fromEntries(quiz.questions.map((q) => [q.id, 0])), 'p.html');
  assert.equal(resultatQuiz({ ...message, questions: [...message.questions, ...message.questions.map((q) => ({ ...q, id: `${q.id}-bis` }))] }).questions.length, 50);
});

test('Résultats : avec des résultats par question, le bonus vient des seules questions, jamais de celui envoyé par la page', () => {
  const q = (id, juste, bonus = false) => ({ id, enonce: `${id} ?`, choisie: 'a', bonne: 'a', juste, bonus });
  assert.equal(resultatQuiz({ bonus: { reussies: 3, total: 3 }, questions: [q('q1', true)] }).bonus, null);
  assert.deepEqual(resultatQuiz({ bonus: { reussies: 3, total: 3 }, questions: [q('q1', true), q('b1', true, true), q('b2', false, true)] }).bonus, { reussies: 1, total: 2 });
  // Sans résultats par question (anciennes Leçons), le bonus envoyé fait foi.
  assert.deepEqual(resultatQuiz({ score: 80, bonus: { reussies: 2, total: 3 } }).bonus, { reussies: 2, total: 3 });
});
