import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireQuiz, corriger, messageScore, melanger, lireResultats, questionsIgnorees, JE_NE_SAIS_PAS } from '../public/kit/v1/quiz-logique.js';

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

test('Kit : corriger donne juste, les points, la réponse choisie, la bonne réponse et l\'explication', () => {
  const [q1] = lireQuiz(quiz).questions;
  assert.deepEqual(corriger(q1, 0), { juste: true, points: 1, choisie: 'Le cratère', bonne: 'Le cratère', explication: 'Par le cratère.' });
  assert.deepEqual(corriger(q1, 2), { juste: false, points: 0, choisie: 'Le nuage', bonne: 'Le cratère', explication: 'Par le cratère.' });
  assert.equal(corriger(q1, 3).choisie, null);
  assert.deepEqual(corriger(q1, JE_NE_SAIS_PAS), { juste: false, points: 0, choisie: 'Je ne sais pas', bonne: 'Le cratère', explication: 'Par le cratère.', jeNeSaisPas: true });
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

test('Kit : une question dont l\'énoncé commence par 🚀 est une question bonus, même sans "bonus": true', () => {
  const quiz = lireQuiz({
    objectifs: [1],
    questions: [
      { id: 'q1', type: 'qcm', enonce: 'Question comptée', reponses: ['a', 'b'], bonne: 0 },
      { id: 'b1', type: 'qcm', enonce: '🚀 Pour aller plus loin', reponses: ['a', 'b'], bonne: 0 },
    ],
  });
  assert.equal(quiz.questions[1].bonus, true);
  assert.equal(quiz.questions[1].enonce, 'Pour aller plus loin', 'le 🚀 est affiché par le Kit, pas répété');
  const message = messageScore(quiz, { q1: 0, b1: 1 }, 'p.html');
  assert.equal(message.score, 100);
  assert.deepEqual(message.bonus, { reussies: 0, total: 1 });
});

test('Kit : la Confiance (« sûr / pas sûr ») est portée par chaque résultat, sans changer le score', () => {
  const lu = lireQuiz(quiz);
  const choix = { q1: 0, q2: 0, q3: 0 };
  const avec = messageScore(lu, choix, 'p.html', { q1: true, q2: true, q3: false });
  assert.deepEqual(avec.questions.map((q) => q.sur), [true, true, false]);
  assert.equal(avec.score, messageScore(lu, choix, 'p.html').score);
  assert.equal(avec.score, 50);
  // Sans Confiance donnée pour une question, le résultat n'a pas de champ `sur`.
  assert.equal(Object.hasOwn(messageScore(lu, choix, 'p.html', { q1: false }).questions[1], 'sur'), false);
});

test('Kit : un quiz en mode Pré-test porte le marqueur dans son message ; un quiz ordinaire non', () => {
  const choix = { q1: 0, q2: 1, q3: 0 };
  const pretest = lireQuiz({ ...quiz, pretest: true });
  assert.equal(pretest.pretest, true);
  assert.equal(messageScore(pretest, choix, '0001-devine.html').pretest, true);
  assert.equal(messageScore(pretest, choix, '0001-devine.html').score, 100); // même score qu'un quiz ordinaire
  assert.equal(Object.hasOwn(messageScore(lireQuiz(quiz), choix, 'p.html'), 'pretest'), false);
  assert.equal(Object.hasOwn(messageScore(lireQuiz({ ...quiz, pretest: 'oui' }), choix, 'p.html'), 'pretest'), false);
});

test('Kit : « Je ne sais pas » compte comme une réponse fausse, sans Confiance, et passe la validation de l\'appli', () => {
  const lu = lireQuiz(quiz);
  const message = messageScore(lu, { q1: JE_NE_SAIS_PAS, q2: 1, q3: 0 }, 'p.html', { q2: true });
  assert.equal(message.score, 50);
  assert.deepEqual(message.questions[0], { id: 'q1', enonce: 'Où sort la lave ?', choisie: 'Je ne sais pas', bonne: 'Le cratère', juste: false, jeNeSaisPas: true, bonus: false, objectifs: [1] });
  assert.equal(Object.hasOwn(message.questions[1], 'jeNeSaisPas'), false);
  assert.deepEqual(lireResultats(message.questions)[0], message.questions[0]);
  // Une question annoncée « Je ne sais pas » mais juste est corrigée en fausse.
  assert.equal(lireResultats([{ ...message.questions[0], juste: true }])[0].juste, false);
});

test('Kit : une question peut porter une image (adresse et texte alternatif), écartée seule si elle est mal formée', () => {
  const q = (image) => ({ id: 'q1', type: 'qcm', enonce: 'Où sort la lave ?', reponses: ['Le cratère', 'Les racines'], bonne: 0, explication: '', image });
  const image = (brut) => lireQuiz({ questions: [q(brut)] }).questions[0].image;
  assert.deepEqual(image({ src: '../images/cratere.png', alt: ' Le cratère ' }), { src: '../images/cratere.png', alt: 'Le cratère' });
  assert.deepEqual(image({ src: 'https://upload.wikimedia.org/a.png', alt: 'Un volcan' }), { src: 'https://upload.wikimedia.org/a.png', alt: 'Un volcan' });
  const malformees = [undefined, 'cratere.png', { src: '../images/a.png' }, { src: 'data:image/png;base64,AAAA', alt: 'x' }, { src: '/etc/passwd', alt: 'x' }, { src: '../images/../etat.json', alt: 'x' }];
  for (const malformee of malformees) assert.equal(image(malformee), undefined, JSON.stringify(malformee));
});

// Formats de rappel actif (spec #48, ticket #70) : texte à trous avec banque de mots, remettre dans l'ordre.
const trous = {
  id: 't1', type: 'trous', enonce: 'Complète la phrase.',
  texte: 'La lave sort par le [cratère] du [volcan].', intrus: ['nuage', 'racine'],
  explication: 'Le cratère est en haut du volcan.',
};

test('Kit : un texte à trous a une banque de mots plus grande que ses trous ; mal formé, il est écarté', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [trous] }).questions;
  assert.equal(q.type, 'trous');
  assert.deepEqual(q.segments, ['La lave sort par le ', ' du ', '.']);
  assert.deepEqual(q.trous, ['cratère', 'volcan']);
  assert.deepEqual(q.intrus, ['nuage', 'racine']);
  const malformes = [
    { ...trous, intrus: [] }, // autant de mots que de trous : on trouverait par élimination
    { ...trous, intrus: ['cratère'] }, // un intrus qui est déjà un mot attendu n'en est pas un
    { ...trous, texte: 'Aucun trou ici.' },
    { ...trous, texte: 'Un trou [vide] et un [].' },
    { ...trous, texte: undefined },
  ];
  for (const m of malformes) assert.equal(lireQuiz({ questions: [quiz.questions[0], m] }).questions.length, 1, JSON.stringify(m));
});

test('Kit : corriger un texte à trous donne juste, faux ou un crédit partiel, avec la phrase choisie et la bonne', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [trous] }).questions;
  // Mots de la banque, avant mélange : les mots attendus dans l'ordre des trous, puis les intrus.
  assert.deepEqual(corriger(q, [0, 1]), {
    juste: true, points: 1, choisie: 'La lave sort par le [cratère] du [volcan].', bonne: 'La lave sort par le [cratère] du [volcan].',
    explication: 'Le cratère est en haut du volcan.', detail: { places: ['cratère', 'volcan'] },
  });
  const partiel = corriger(q, [0, 2]);
  assert.equal(partiel.juste, false);
  assert.equal(partiel.points, 0.5);
  assert.equal(partiel.choisie, 'La lave sort par le [cratère] du [nuage].');
  assert.deepEqual(partiel.detail, { places: ['cratère', 'nuage'] });
  assert.equal(corriger(q, [3, 2]).points, 0);
  // Réponse impossible (mot réutilisé, index hors banque, trou oublié) : pas de réponse choisie.
  for (const r of [[0, 0], [0, 9], [0], 'cratère', null]) assert.equal(corriger(q, r).choisie, null, JSON.stringify(r));
});

const ordre = {
  id: 'o1', type: 'ordre', enonce: 'Remets les étapes de l’éruption dans l’ordre.',
  elements: ['Le magma monte', 'La pression augmente', 'La lave sort', 'La lave refroidit'],
  explication: 'Le magma monte d’abord, puis tout s’enchaîne.',
};

test('Kit : remettre dans l\'ordre demande de 3 à 10 éléments différents ; mal formé, il est écarté', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [ordre] }).questions;
  assert.equal(q.type, 'ordre');
  assert.deepEqual(q.elements, ordre.elements);
  const malformes = [
    { ...ordre, elements: ['a', 'b'] },
    { ...ordre, elements: ['a', 'b', 'a'] },
    { ...ordre, elements: ['a', 'b', ''] },
    { ...ordre, elements: Array.from({ length: 11 }, (_, i) => `e${i}`) },
    { ...ordre, elements: 'a, b, c' },
  ];
  for (const m of malformes) assert.equal(lireQuiz({ questions: [quiz.questions[0], m] }).questions.length, 1, JSON.stringify(m));
});

test('Kit : corriger un ordre compte les éléments déjà dans le bon ordre entre eux (il suffit de déplacer les autres)', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [ordre] }).questions;
  // Réponse : les index des éléments dans l'ordre proposé par l'Élève.
  const juste = corriger(q, [0, 1, 2, 3]);
  assert.equal(juste.juste, true);
  assert.equal(juste.points, 1);
  assert.equal(juste.bonne, 'Le magma monte → La pression augmente → La lave sort → La lave refroidit');
  assert.deepEqual(juste.detail, { ordre: ordre.elements });
  // Une seule étape mal placée : 3 sur 4.
  const partiel = corriger(q, [1, 2, 3, 0]);
  assert.equal(partiel.juste, false);
  assert.equal(partiel.points, 0.75);
  assert.equal(partiel.choisie, 'La pression augmente → La lave sort → La lave refroidit → Le magma monte');
  assert.equal(corriger(q, [1, 0, 3, 2]).points, 0.5);
  for (const r of [[0, 1, 2], [0, 1, 2, 2], [0, 1, 2, 4], null]) assert.equal(corriger(q, r).choisie, null, JSON.stringify(r));
});

test('Kit : le score compte le crédit partiel ; une question n\'est « juste » qu\'entièrement, et son détail passe la validation de l\'appli', () => {
  const lu = lireQuiz({ objectifs: [1], questions: [quiz.questions[0], trous, ordre] });
  const message = messageScore(lu, { q1: 0, t1: [0, 2], o1: [1, 2, 3, 0] }, 'p.html', { t1: true, o1: false });
  // (1 + 0,5 + 0,75) / 3 = 75 %.
  assert.equal(message.score, 75);
  const [, t1, o1] = message.questions;
  assert.deepEqual(t1, {
    id: 't1', type: 'trous', enonce: 'Complète la phrase.', choisie: 'La lave sort par le [cratère] du [nuage].',
    bonne: 'La lave sort par le [cratère] du [volcan].', juste: false, points: 0.5, detail: { places: ['cratère', 'nuage'] },
    bonus: false, objectifs: [1], sur: true,
  });
  assert.equal(o1.juste, false);
  assert.deepEqual(lireResultats(message.questions), message.questions);
  // Recalculé par l'appli à partir des résultats validés.
  assert.equal(messageScore(lu, { q1: 0, t1: [0, 1], o1: [0, 1, 2, 3] }, 'p.html').score, 100);
  // Un résultat incohérent est remis d'aplomb : pas de crédit partiel pour une question juste ou « Je ne sais pas »,
  // pas de détail d'un type inconnu ou mal formé.
  const [lu1, lu2, lu3, lu4] = lireResultats([{ ...t1, id: 'a', juste: true }, { ...t1, id: 'b', jeNeSaisPas: true }, { ...t1, id: 'c', type: 'inconnu' }, { ...t1, id: 'd', detail: { places: 'x' } }]);
  assert.equal(Object.hasOwn(lu1, 'points'), false);
  assert.equal(Object.hasOwn(lu2, 'points'), false);
  assert.equal(Object.hasOwn(lu2, 'detail'), false);
  assert.equal(Object.hasOwn(lu3, 'type'), false);
  assert.equal(Object.hasOwn(lu3, 'detail'), false);
  assert.equal(Object.hasOwn(lu4, 'detail'), false);
});

test('Kit : une question d\'un type inconnu ou mal formée est ignorée, le quiz reste utilisable, et la raison est donnée pour le prof', () => {
  const donnees = { objectifs: [1], questions: [quiz.questions[0], { ...ordre, elements: ['a'] }, { id: 'x1', type: 'mystere', enonce: '?' }, quiz.questions[0], 'pas une question'] };
  assert.deepEqual(lireQuiz(donnees).questions.map((q) => q.id), ['q1']);
  assert.deepEqual(questionsIgnorees(donnees), [
    { id: 'o1', raison: 'question « ordre » mal formée (voir son format dans LISEZMOI.md)' },
    { id: 'x1', raison: 'type inconnu « mystere »' },
    { id: 'q1', raison: 'identifiant déjà utilisé par une autre question' },
    { position: 5, raison: 'ce n’est pas une question' },
  ]);
  assert.deepEqual(questionsIgnorees(quiz), []);
  assert.equal(questionsIgnorees({ questions: [{ id: 'x', type: 'mystere', enonce: '?' }] }).length, 2, 'le quiz qui ne s\'affiche plus est signalé aussi');
});

// Formats « réfléchis puis dévoile » et « meilleure explication » (spec #48, ticket #72).
const devoile = {
  id: 'd1', type: 'devoile', enonce: 'Pourquoi la lave refroidit-elle en sortant ?',
  reponse: 'Elle perd sa chaleur au contact de l’air.', explication: 'L’air est bien plus froid que la lave.',
};

test('Kit : « réfléchis puis dévoile » a une réponse à dévoiler ; sans elle, il est écarté', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [devoile, quiz.questions[0], quiz.questions[1]] }).questions;
  assert.equal(q.type, 'devoile');
  assert.equal(q.reponse, devoile.reponse);
  for (const mal of [{ ...devoile, reponse: '' }, { ...devoile, reponse: undefined }, { ...devoile, reponse: ['a'] }]) {
    assert.deepEqual(lireQuiz({ objectifs: [1], questions: [mal, quiz.questions[0]] }).questions.map((x) => x.id), ['q1']);
  }
});

test('Kit : « réfléchis puis dévoile » vaut juste si l\'Élève l\'avait, 0,5 à moitié, faux sinon', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [devoile, quiz.questions[0], quiz.questions[1]] }).questions;
  const avais = corriger(q, 'avais');
  assert.equal(avais.juste, true);
  assert.equal(avais.points, 1);
  assert.equal(avais.choisie, 'Je l’avais');
  assert.equal(avais.bonne, devoile.reponse);
  const moitie = corriger(q, 'moitie');
  assert.equal(moitie.juste, false);
  assert.equal(moitie.points, 0.5);
  assert.equal(moitie.choisie, 'À moitié');
  const pas = corriger(q, 'pas');
  assert.equal(pas.juste, false);
  assert.equal(pas.points, 0);
  assert.equal(pas.choisie, 'Je ne l’avais pas');
  for (const r of ['oui', 1, null, ['avais'], 'toString']) assert.equal(corriger(q, r).choisie, null, JSON.stringify(r));
});

test('Kit : « réfléchis puis dévoile » reste minoritaire dans le score ; les questions en trop sont ignorées et signalées au prof', () => {
  const d = (n, extra = {}) => ({ ...devoile, id: `d${n}`, ...extra });
  const q = (n) => ({ ...quiz.questions[0], id: `q${n}` });
  // 3 questions vérifiables : au plus 2 « dévoile » comptées dans le score, les premières du quiz.
  const donnees = { objectifs: [1], questions: [d(1), q(1), d(2), q(2), d(3), q(3), d(4)] };
  assert.deepEqual(lireQuiz(donnees).questions.map((x) => x.id), ['d1', 'q1', 'd2', 'q2', 'q3']);
  const raison = 'trop de questions « devoile » : elles doivent rester moins nombreuses que les autres questions comptées dans le score';
  assert.deepEqual(questionsIgnorees(donnees), [{ id: 'd3', raison }, { id: 'd4', raison }]);
  // Une question bonus est hors score : elle n'est pas limitée et ne compte pas parmi les autres.
  assert.deepEqual(lireQuiz({ objectifs: [1], questions: [d(1, { bonus: true }), d(2, { bonus: true }), q(1), d(3)] }).questions.map((x) => x.id), ['d1', 'd2', 'q1']);
  // À égalité, ce n'est plus une minorité.
  assert.deepEqual(lireQuiz({ objectifs: [1], questions: [d(1), q(1)] }).questions.map((x) => x.id), ['q1']);
  // Seulement des « dévoile » : aucune question comptée, pas de quiz.
  assert.equal(lireQuiz({ objectifs: [1], questions: [d(1)] }), null);
  assert.deepEqual(questionsIgnorees({ objectifs: [1], questions: [d(1)] }).map((x) => x.id ?? null), ['d1', null]);
});

const explication = {
  id: 'e1', type: 'explication', enonce: 'Pourquoi la lave devient-elle noire en refroidissant ?',
  reponses: ['Elle se solidifie en roche', 'Elle brûle', 'La pluie la salit'], bonne: 0, explication: 'En refroidissant, elle devient une roche.',
};

test('Kit : « choisis la meilleure explication » se valide et se corrige comme un QCM, et garde son type', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [explication] }).questions;
  assert.equal(q.type, 'explication');
  assert.deepEqual(q.reponses, explication.reponses);
  assert.deepEqual(corriger(q, 0), { juste: true, points: 1, bonne: 'Elle se solidifie en roche', choisie: 'Elle se solidifie en roche', explication: explication.explication });
  assert.equal(corriger(q, 2).juste, false);
  assert.equal(corriger(q, 3).choisie, null);
  assert.equal(lireQuiz({ objectifs: [1], questions: [{ ...explication, bonne: 5 }] }), null);
});

test('Kit : dévoile et meilleure explication passent dans le message et la validation de l\'appli, sans Confiance pour dévoile', () => {
  const lu = lireQuiz({ objectifs: [1], questions: [explication, devoile, quiz.questions[0]] });
  const message = messageScore(lu, { e1: 0, d1: 'moitie', q1: 1 }, 'p.html', { e1: true, d1: true, q1: false });
  // L'auto-évaluation remplace la Confiance : une Confiance reçue pour dévoile est ignorée.
  // (1 + 0,5 + 0) / 3 = 50 %.
  assert.equal(message.score, 50);
  const [e1, d1] = message.questions;
  assert.deepEqual(e1, { id: 'e1', type: 'explication', enonce: explication.enonce, choisie: 'Elle se solidifie en roche', bonne: 'Elle se solidifie en roche', juste: true, bonus: false, objectifs: [1], sur: true });
  assert.deepEqual(d1, { id: 'd1', type: 'devoile', enonce: devoile.enonce, choisie: 'À moitié', bonne: devoile.reponse, juste: false, points: 0.5, bonus: false, objectifs: [1] });
  assert.deepEqual(lireResultats(message.questions), message.questions);
});
