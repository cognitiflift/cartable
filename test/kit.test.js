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

// Formats de rappel actif (spec #48, ticket #71) : associer deux colonnes, classer dans des catégories.
const associer = {
  id: 'a1', type: 'associer', enonce: 'Relie chaque dieu à son domaine.',
  paires: [['Zeus', 'le ciel'], ['Poséidon', 'la mer'], ['Hadès', 'les Enfers'], ['Héphaïstos', 'la forge']],
  explication: 'Les trois frères se partagent le monde ; Héphaïstos est le forgeron.',
};

test('Kit : associer demande de 3 à 8 paires, sans doublon dans une colonne ; mal formé, il est écarté', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [associer] }).questions;
  assert.equal(q.type, 'associer');
  assert.deepEqual(q.paires, associer.paires);
  const malformes = [
    { ...associer, paires: associer.paires.slice(0, 2) },
    { ...associer, paires: [...associer.paires, ['Zeus', 'la foudre']] }, // même élément à gauche
    { ...associer, paires: [...associer.paires, ['Arès', 'la mer']] }, // même élément à droite
    { ...associer, paires: [...associer.paires, ['Arès']] },
    { ...associer, paires: [...associer.paires, ['Arès', '']] },
    { ...associer, paires: Array.from({ length: 9 }, (_, i) => [`g${i}`, `d${i}`]) },
    { ...associer, paires: 'Zeus : le ciel' },
  ];
  for (const m of malformes) assert.equal(lireQuiz({ questions: [quiz.questions[0], m] }).questions.length, 1, JSON.stringify(m));
});

test('Kit : corriger associer compte les paires justes, avec les paires choisies et les bonnes', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [associer] }).questions;
  // Réponse : pour chaque élément de gauche, l'index de l'élément de droite relié.
  assert.deepEqual(corriger(q, [0, 1, 2, 3]), {
    juste: true, points: 1,
    choisie: 'Zeus : le ciel ; Poséidon : la mer ; Hadès : les Enfers ; Héphaïstos : la forge',
    bonne: 'Zeus : le ciel ; Poséidon : la mer ; Hadès : les Enfers ; Héphaïstos : la forge',
    explication: associer.explication, detail: { paires: associer.paires },
  });
  // Deux paires inversées : 2 sur 4.
  const partiel = corriger(q, [1, 0, 2, 3]);
  assert.equal(partiel.juste, false);
  assert.equal(partiel.points, 0.5);
  assert.equal(partiel.choisie, 'Zeus : la mer ; Poséidon : le ciel ; Hadès : les Enfers ; Héphaïstos : la forge');
  assert.deepEqual(partiel.detail.paires[0], ['Zeus', 'la mer']);
  assert.equal(corriger(q, [3, 2, 1, 0]).points, 0);
  // Réponse impossible (élément de droite relié deux fois, paire oubliée, index hors colonne) : pas de réponse choisie.
  for (const r of [[0, 0, 2, 3], [0, 1, 2], [0, 1, 2, 4], 'Zeus', null]) assert.equal(corriger(q, r).choisie, null, JSON.stringify(r));
});

const classer = {
  id: 'c1', type: 'classer', enonce: 'Range chaque animal dans sa classe.',
  categories: [
    { nom: 'Mammifères', elements: ['la baleine', 'la chauve-souris'] },
    { nom: 'Oiseaux', elements: ['le manchot', "l'autruche"] },
    { nom: 'Poissons', elements: ['le requin'] },
  ],
  explication: 'La baleine allaite ses petits ; le manchot a des plumes ; le requin respire par des branchies.',
};

test('Kit : classer demande de 2 à 4 catégories et de 3 à 12 éléments tous différents ; mal formé, il est écarté', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [classer] }).questions;
  assert.equal(q.type, 'classer');
  assert.deepEqual(q.categories, classer.categories);
  // Une catégorie peut rester vide (piège : rien n'y va), tant qu'il y en a au moins deux qui ne le sont pas.
  const avecVide = { ...classer, categories: [...classer.categories, { nom: 'Reptiles', elements: [] }] };
  assert.equal(lireQuiz({ questions: [avecVide] }).questions[0].categories.length, 4);
  const malformes = [
    { ...classer, categories: [classer.categories[0]] },
    { ...classer, categories: [...avecVide.categories, { nom: 'Insectes', elements: ['la fourmi'] }] }, // 5 catégories
    { ...classer, categories: [{ nom: 'A', elements: ['x', 'y', 'z'] }, { nom: 'B', elements: [] }] }, // une seule non vide
    { ...classer, categories: [{ nom: 'A', elements: ['x'] }, { nom: 'B', elements: ['y'] }] }, // 2 éléments
    { ...classer, categories: [...classer.categories, { nom: 'Mammifères', elements: ['le chat'] }] }, // même nom
    { ...classer, categories: [...classer.categories, { nom: 'Reptiles', elements: ['le requin'] }] }, // même élément
    { ...classer, categories: [...classer.categories, { nom: '', elements: ['le lézard'] }] },
    { ...classer, categories: [...classer.categories, { nom: 'Reptiles', elements: 'le lézard' }] },
    { ...classer, categories: [{ nom: 'A', elements: Array.from({ length: 7 }, (_, i) => `a${i}`) }, { nom: 'B', elements: Array.from({ length: 6 }, (_, i) => `b${i}`) }] },
    { ...classer, categories: { Mammifères: ['la baleine'] } },
  ];
  for (const m of malformes) assert.equal(lireQuiz({ questions: [quiz.questions[0], m] }).questions.length, 1, JSON.stringify(m));
});

test('Kit : corriger classer compte les éléments bien rangés, avec le rangement choisi et le bon', () => {
  const [q] = lireQuiz({ objectifs: [1], questions: [classer] }).questions;
  // Réponse : pour chaque élément, dans l'ordre où le prof les a écrits (catégorie par catégorie), l'index de la
  // catégorie où l'Élève l'a rangé.
  const bonne = 'Mammifères : la baleine, la chauve-souris ; Oiseaux : le manchot, l\'autruche ; Poissons : le requin';
  assert.deepEqual(corriger(q, [0, 0, 1, 1, 2]), {
    juste: true, points: 1, choisie: bonne, bonne, explication: classer.explication, detail: { categories: classer.categories },
  });
  // La chauve-souris chez les oiseaux, le requin aussi : 3 sur 5. Une catégorie laissée vide est notée « — ».
  const partiel = corriger(q, [0, 1, 1, 1, 1]);
  assert.equal(partiel.juste, false);
  assert.equal(partiel.points, 0.6);
  assert.equal(partiel.choisie, 'Mammifères : la baleine ; Oiseaux : la chauve-souris, le manchot, l\'autruche, le requin ; Poissons : —');
  assert.deepEqual(partiel.detail.categories[2], { nom: 'Poissons', elements: [] });
  assert.equal(corriger(q, [2, 2, 0, 0, 1]).points, 0);
  // Réponse impossible (élément oublié, catégorie inexistante) : pas de réponse choisie.
  for (const r of [[0, 0, 1, 1], [0, 0, 1, 1, 3], [0, 0, 1, 1, 0.5], 'Mammifères', null]) assert.equal(corriger(q, r).choisie, null, JSON.stringify(r));
});

test('Kit : associer et classer comptent leur crédit partiel dans le score, et leur détail passe la validation de l\'appli', () => {
  const lu = lireQuiz({ objectifs: [1], questions: [quiz.questions[0], associer, classer] });
  const message = messageScore(lu, { q1: 0, a1: [1, 0, 2, 3], c1: [0, 1, 1, 1, 1] }, 'p.html', { a1: true, c1: false });
  // (1 + 0,5 + 0,6) / 3 = 70 %.
  assert.equal(message.score, 70);
  const [, a1, c1] = message.questions;
  assert.deepEqual(a1, {
    id: 'a1', type: 'associer', enonce: associer.enonce, choisie: 'Zeus : la mer ; Poséidon : le ciel ; Hadès : les Enfers ; Héphaïstos : la forge',
    bonne: 'Zeus : le ciel ; Poséidon : la mer ; Hadès : les Enfers ; Héphaïstos : la forge', juste: false, points: 0.5,
    detail: { paires: [['Zeus', 'la mer'], ['Poséidon', 'le ciel'], ['Hadès', 'les Enfers'], ['Héphaïstos', 'la forge']] },
    bonus: false, objectifs: [1], sur: true,
  });
  assert.equal(c1.type, 'classer');
  assert.equal(c1.points, 0.6);
  assert.deepEqual(lireResultats(message.questions), message.questions);
  // Un détail mal formé est écarté, le résultat reste.
  const malformes = [
    { ...a1, detail: { paires: [['Zeus']] } },
    { ...a1, detail: { paires: 'Zeus : la mer' } },
    { ...c1, detail: { categories: [{ nom: 'Mammifères', elements: 'la baleine' }] } },
    { ...c1, detail: { categories: [{ elements: ['la baleine'] }] } },
  ].map((r, i) => ({ ...r, id: `m${i}` }));
  for (const r of lireResultats(malformes)) assert.equal(Object.hasOwn(r, 'detail'), false, r.id);
});
