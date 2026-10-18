import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renvoieAUnVisuel, raccrocherFigures, pagesARaccrocher, ajouterReponsesDuQuiz } from '../lib/banque.js';

test('Visuel désigné : un énoncé qui nomme un visuel (schéma, frise, case…) y renvoie, au singulier comme au pluriel', () => {
  for (const enonce of ['Regarde le schéma : où est le cratère ?', 'Sur la frise, quelle date vient en premier ?',
    'Sur la carte de la leçon, où est Paris ?', 'Que contient la case B ?', 'D\'après le TABLEAU, combien ?',
    'Dans le texte, qui parle ?', 'Observe la photo.', 'Sur l\'image, que voit-on ?', 'Ce dessin montre…',
    'La figure 2 montre quoi ?', 'Compare les deux schémas.', 'Lis les tableaux.', 'Regarde le schema']) {
    assert.equal(renvoieAUnVisuel(enonce), true, enonce);
  }
});

test('Visuel désigné : « regarde » seul, un mot qui en contient un autre ou un énoncé absent n\'y renvoient pas', () => {
  for (const enonce of ['Pourquoi Persée regarde-t-il Méduse dans son bouclier ?', 'Combien font 3 × 4 ?',
    'Quel est le contexte ?', 'Qui est le cartographe ?', 'Que signifie « imagination » ?', 'Il se casse ?', '', undefined, 42]) {
    assert.equal(renvoieAUnVisuel(enonce), false, String(enonce));
  }
});

const FIGURE = (legende) => `<figure class="kit-figure"><svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg><figcaption>${legende}</figcaption></figure>`;
const PAGES = {
  'une.html': `<h1>Volcans</h1>${FIGURE('Coupe du volcan')}<p>Fin</p>`,
  'zero.html': '<h1>Rien à voir</h1><figure><figcaption>hors Kit</figcaption></figure>',
  'deux.html': `${FIGURE('A')}${FIGURE('B')}`,
};
const JOURNAL = [{ date: '2026-10-01T10:00:00.000Z', juste: true, origine: 'quiz' }];
const question = (page, id, enonce, contenu = {}) => ({ id, page, contenu: { enonce, reponses: ['a', 'b'], bonne: 0, explication: 'x', objectifs: [1], ...contenu }, journal: JOURNAL });
const banque = () => ({
  'une.html#q1': question('une.html', 'q1', 'Regarde le schéma : où est le cratère ?'),
  'une.html#q2': question('une.html', 'q2', 'Combien font 3 × 4 ?'),
  'zero.html#q1': question('zero.html', 'q1', 'Sur la frise, quelle date ?'),
  'deux.html#q1': question('deux.html', 'q1', 'Que contient la case B ?'),
  'absente.html#q1': question('absente.html', 'q1', 'Observe la photo.'),
});

test('Raccrocher les figures : une page à une seule figure la donne à la Question qui renvoie à un visuel', () => {
  const apres = raccrocherFigures(banque(), PAGES);
  const q = apres['une.html#q1'];
  assert.deepEqual(q.contenu.figure, {
    balise: 'figure', attributs: { class: 'kit-figure' }, enfants: [
      { balise: 'svg', attributs: { viewBox: '0 0 10 10' }, enfants: [{ balise: 'path', attributs: { d: 'M0 0 L10 10' }, enfants: [] }] },
      { balise: 'figcaption', attributs: {}, enfants: ['Coupe du volcan'] },
    ],
  });
  assert.equal(q.horsRevision, undefined);
  assert.deepEqual(q.journal, JOURNAL);
});

test('Raccrocher les figures : zéro ou deux figures, ou page disparue, la Question est écartée des Révisions, rien d\'autre ne change', () => {
  const avant = banque();
  const apres = raccrocherFigures(avant, PAGES);
  for (const cle of ['zero.html#q1', 'deux.html#q1', 'absente.html#q1']) {
    assert.deepEqual(apres[cle], { ...avant[cle], horsRevision: true }, cle);
  }
});

test('Raccrocher les figures : une Question qui ne renvoie à aucun visuel, ou qui a déjà son visuel, n\'est pas touchée', () => {
  const avant = {
    ...banque(),
    'une.html#q3': question('une.html', 'q3', 'Regarde la photo', { image: { src: '../images/a.png', alt: 'A' } }),
    'une.html#q4': question('une.html', 'q4', 'Regarde le schéma', { figure: { balise: 'figure', attributs: {}, enfants: ['déjà'] } }),
  };
  const apres = raccrocherFigures(avant, PAGES);
  for (const cle of ['une.html#q2', 'une.html#q3', 'une.html#q4']) assert.equal(apres[cle], avant[cle], cle);
});

test('Raccrocher les figures : la relancer ne change plus rien (même Banque, rien à réécrire)', () => {
  const une = raccrocherFigures(banque(), PAGES);
  assert.equal(raccrocherFigures(une, PAGES), une);
  const sansRien = { 'une.html#q2': banque()['une.html#q2'] };
  assert.equal(raccrocherFigures(sansRien, PAGES), sansRien);
});

test('Raccrocher les figures : une Question écartée puis rejouée au quiz reprend sa page et sera réexaminée', () => {
  const ecartee = raccrocherFigures(banque(), PAGES);
  const quiz = { objectifs: [1], questions: [{ id: 'q1', type: 'qcm', enonce: 'Que contient la case B ?', reponses: ['a', 'b'], bonne: 0, explication: 'x', figure: 'grille' }] };
  const html = '<figure class="kit-figure" id="grille"><figcaption>Grille</figcaption></figure>';
  const apres = ajouterReponsesDuQuiz(ecartee, { page: 'deux.html', quiz, html, resultats: [{ id: 'q1', juste: true }], date: '2026-10-02T10:00:00.000Z' });
  assert.equal(apres['deux.html#q1'].horsRevision, undefined);
  assert.equal(apres['deux.html#q1'].journal.length, 2);
  assert.ok(apres['deux.html#q1'].contenu.figure);
});

test('Raccrocher les figures : seules les pages des Questions encore à examiner sont à lire', () => {
  assert.deepEqual(pagesARaccrocher(banque()).sort(), ['absente.html', 'deux.html', 'une.html', 'zero.html']);
  assert.deepEqual(pagesARaccrocher(raccrocherFigures(banque(), PAGES)), []);
});
