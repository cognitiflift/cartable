import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lectureActivee, choisirVoix, texteDeQuestion, morceaux } from '../public/kit/v1/lecture-logique.js';
import { lireQuiz, corriger } from '../public/kit/v1/quiz-logique.js';

const questions = lireQuiz({
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Par où sort la lave ?', reponses: ['Par le cratère', 'Par les racines', 'Par les nuages'], bonne: 0, explication: 'Par la cheminée puis le cratère.' },
    { id: 'q2', type: 'trous', enonce: 'Complète la phrase.', texte: 'La lave sort par le [cratère] et coule sur les [flancs].', intrus: ['racines'], explication: 'x' },
    { id: 'q3', type: 'ordre', enonce: 'Remets dans l\'ordre.', elements: ['Le magma monte', 'La pression augmente', 'La lave sort'], explication: 'x' },
    { id: 'q4', type: 'associer', enonce: 'Relie.', paires: [['Zeus', 'le ciel'], ['Poséidon', 'la mer'], ['Hadès', 'les Enfers']], explication: 'x' },
    { id: 'q5', type: 'classer', enonce: 'Range.', categories: [{ nom: 'Mammifères', elements: ['la baleine'] }, { nom: 'Oiseaux', elements: ['le manchot', 'l\'autruche'] }], explication: 'x' },
    { id: 'q6', type: 'etapes', enonce: 'Complète le calcul.', etapes: [{ texte: 'On cherche 12' }, { texte: '3/4 = 9/12', intrus: ['3/4 = 3/12'] }], explication: 'x' },
    { id: 'q7', type: 'devoile', enonce: 'Qu\'est-ce que le magma ?', reponse: 'De la roche fondue.', explication: 'x' },
    { id: 'b1', type: 'qcm', enonce: 'Un volcan sur Mars ?', reponses: ['Olympus Mons', 'Etna'], bonne: 0, explication: 'x', bonus: true },
  ],
}).questions;
const question = (id) => questions.find((q) => q.id === id);

test('Lecture à voix haute : activée seulement quand l\'appli l\'indique dans l\'adresse de la page', () => {
  assert.equal(lectureActivee('?lecture=1'), true);
  assert.equal(lectureActivee('?autre=2&lecture=1'), true);
  assert.equal(lectureActivee(''), false);
  assert.equal(lectureActivee('?lecture=0'), false);
});

test('Lecture à voix haute : une voix de l\'appareil, française de préférence ; jamais une voix en ligne', () => {
  const voix = (lang, localService = true, nom = lang) => ({ name: nom, lang, localService });
  const enLigne = voix('fr-FR', false, 'Google français');
  const anglaise = voix('en-US');
  const belge = voix('fr-BE');
  const francaise = voix('fr-FR');
  assert.equal(choisirVoix([anglaise, enLigne, belge, francaise]), francaise);
  assert.equal(choisirVoix([anglaise, enLigne, belge]), belge);
  assert.equal(choisirVoix([enLigne, voix('FR_fr')]).lang, 'FR_fr', 'code de langue écrit autrement');
  // Sans voix française sur l'appareil, une autre voix de l'appareil plutôt que la française en ligne.
  assert.equal(choisirVoix([enLigne, anglaise]), anglaise);
  // Aucune voix de l'appareil : pas de lecture (rien ne doit sortir de l'appareil).
  assert.equal(choisirVoix([enLigne]), null);
  assert.equal(choisirVoix([]), null);
  assert.equal(choisirVoix(undefined), null);
});

test('Lecture à voix haute : une question est lue avec ses propositions, dans l\'ordre alphabétique pour ne pas trahir la réponse', () => {
  assert.equal(texteDeQuestion(question('q1')), 'Par où sort la lave ? Les réponses : Par le cratère. Par les nuages. Par les racines.');
  assert.equal(texteDeQuestion(question('q2')), 'Complète la phrase. La lave sort par le … et coule sur les …. Les mots : cratère. flancs. racines.');
  assert.equal(texteDeQuestion(question('q3')), 'Remets dans l\'ordre. Les éléments : La lave sort. La pression augmente. Le magma monte.');
  assert.equal(texteDeQuestion(question('q4')), 'Relie. À gauche : Hadès. Poséidon. Zeus. À droite : la mer. le ciel. les Enfers.');
  assert.equal(texteDeQuestion(question('q5')), 'Range. Les catégories : Mammifères. Oiseaux. Les éléments : l\'autruche. la baleine. le manchot.');
  assert.equal(texteDeQuestion(question('q6')), 'Complète le calcul. Étape 1 : On cherche 12. Étape 2 : à compléter. Les propositions : 3/4 = 3/12. 3/4 = 9/12.');
  assert.equal(texteDeQuestion(question('q7')), 'Qu\'est-ce que le magma ?', 'la réponse à dévoiler n\'est pas lue');
  assert.equal(texteDeQuestion(question('b1')), 'Question bonus. Un volcan sur Mars ? Les réponses : Etna. Olympus Mons.');
});

test('Lecture à voix haute : une fois la question corrigée, on lit aussi la bonne réponse et l\'explication', () => {
  const q = question('q1');
  assert.equal(texteDeQuestion(q, corriger(q, 0)),
    'Par où sort la lave ? Les réponses : Par le cratère. Par les nuages. Par les racines. Bravo ! Par la cheminée puis le cratère.');
  assert.equal(texteDeQuestion(q, corriger(q, 1)),
    'Par où sort la lave ? Les réponses : Par le cratère. Par les nuages. Par les racines. La bonne réponse : Par le cratère. Par la cheminée puis le cratère.');
});

test('Lecture à voix haute : le texte est lu par phrases courtes, sans les émojis ni les blancs en trop', () => {
  assert.deepEqual(morceaux('  Le magma\n\n  monte.   🌋 Il sort par le cratère !  Puis il refroidit…', 30),
    ['Le magma monte.', 'Il sort par le cratère !', 'Puis il refroidit…']);
  // Des phrases courtes sont regroupées, une phrase trop longue est coupée entre deux mots.
  assert.deepEqual(morceaux('Un. Deux. Trois.', 30), ['Un. Deux. Trois.']);
  assert.deepEqual(morceaux('une phrase bien trop longue pour un seul morceau', 20), ['une phrase bien trop', 'longue pour un seul', 'morceau']);
  assert.deepEqual(morceaux(' 🚀 \n '), []);
});
