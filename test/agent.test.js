import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consignesPropositions, consignesLecon, extraireChoix, actionApresQuiz, actionRetourQuiz, promptRetourQuiz, promptDemarrageLibre, REBONDS } from '../lib/agent.js';

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

test('action après un quiz : Revoir sous 80 %, sinon Défi (révision) ou Étape suivante (libre)', () => {
  assert.equal(actionApresQuiz(79, 'revision'), 'revoir');
  assert.equal(actionApresQuiz(40, 'libre'), 'revoir');
  assert.equal(actionApresQuiz(80, 'revision'), 'defi');
  assert.equal(actionApresQuiz(95, 'libre'), 'suivante');
});

test('Retour de quiz : un Défi réussi en révision termine la Leçon, sinon même action qu\'après un quiz', () => {
  assert.equal(actionRetourQuiz(80, 'revision', true), 'terminee');
  assert.equal(actionRetourQuiz(100, 'revision', true), 'terminee');
  assert.equal(actionRetourQuiz(79, 'revision', true), 'revoir'); // Défi raté
  assert.equal(actionRetourQuiz(90, 'revision', false), 'defi'); // quiz ordinaire réussi
  assert.equal(actionRetourQuiz(90, 'libre', true), 'suivante'); // une Leçon libre n'est jamais terminée
  assert.equal(actionRetourQuiz(50, 'libre', false), 'revoir');
});

test('Retour de quiz d\'un Défi réussi : le prof sait que la Leçon est terminée', () => {
  const retour = promptRetourQuiz({ score: 90, page: 'defi.html', action: 'terminee' });
  assert.match(retour, /Leçon est terminée/);
  assert.match(retour, /nouveau défi/);
  assert.doesNotMatch(retour, /undefined/);
});

test('Rebonds : une phrase lisible de l\'Élève et une consigne au prof par action fermée', () => {
  assert.deepEqual(Object.keys(REBONDS), ['revoir', 'defi', 'suivante']);
  assert.match(REBONDS.revoir.consigne, /Rebond : Revoir/);
  assert.match(REBONDS.revoir.consigne, /raté/);
  assert.match(REBONDS.defi.consigne, /Rebond : Défi/);
  assert.match(REBONDS.defi.consigne, /plus difficile/);
  assert.match(REBONDS.suivante.consigne, /Rebond : Étape suivante/);
  assert.match(REBONDS.suivante.consigne, /même Leçon/);
  for (const { phrase, consigne } of Object.values(REBONDS)) {
    assert.ok(phrase.length > 0);
    assert.match(consigne, /Crée/);
    assert.doesNotMatch(phrase + consigne, /leçon suivante/i);
  }
});

test('ni les consignes de Leçon ni le retour de quiz ne parlent de « Leçon suivante »', () => {
  assert.doesNotMatch(consignesLecon(profil), /leçon suivante/i);
  assert.match(consignesLecon(profil), /Étape suivante/);
  const retour = promptRetourQuiz({ score: 90, page: 'p.html', action: 'suivante' });
  assert.doesNotMatch(retour, /leçon suivante/i);
  assert.match(retour, /étape suivante/);
});

test('consignes de Leçon : pas de saisie libre, Réponses proposées sur une ligne CHOIX', () => {
  const consignes = consignesLecon(profil);
  assert.match(consignes, /ne peut pas écrire/);
  assert.match(consignes, /CHOIX: /);
  assert.doesNotMatch(consignes, /panneau de droite/);
});

test('démarrage d\'une Leçon libre : le sujet, puis la consigne de cadrage avec des sujets voisins en CHOIX', () => {
  const prompt = promptDemarrageLibre('les volcans');
  assert.ok(prompt.startsWith('les volcans\n'));
  assert.match(prompt, /inadapté à l'âge/);
  assert.match(prompt, /choquant/);
  assert.match(prompt, /ni page ni lesson\.json/);
  assert.match(prompt, /une phrase bienveillante/);
  assert.match(prompt, /CHOIX: .*3 ou 4 sujets voisins/);
  assert.match(prompt, /Je ne sais pas/);
});

test('consignes de Leçon : pas de consigne de cadrage du sujet', () => {
  assert.doesNotMatch(consignesLecon(profil), /choquant/);
});

test('consignes des Propositions : uniquement des originaux sans Leçon, au nombre réglé', () => {
  const consignes = consignesPropositions({ ...profil, nombrePropositions: 6 }, []);
  assert.match(consignes, /11 ans/);
  assert.match(consignes, /Primaire 6/);
  assert.match(consignes, /6 sujets originaux/);
  assert.doesNotMatch(consignes, /"suite"/);
});

test('consignes des Propositions : suites et originaux répartis par l\'agent, d\'après le titre, la Catégorie et la Maîtrise des Leçons', () => {
  const consignes = consignesPropositions({ ...profil, nombrePropositions: 5 }, [
    { titre: 'Les volcans', categorie: 'Sciences', maitrise: { pourcentage: 85, palier: 'acquis' } },
    { titre: 'Les fractions', categorie: 'Mathématiques', maitrise: null },
  ]);
  assert.match(consignes, /5 sujets de nouvelles Leçons/);
  assert.doesNotMatch(consignes, /\b4 sujets/);
  assert.match(consignes, /Les volcans \(Sciences\) : Maîtrise 85 %, acquis/);
  assert.match(consignes, /Les fractions \(Mathématiques\) : Maîtrise pas encore évaluée/);
  assert.match(consignes, /"suite"/);
});

test('consignes des Propositions : 2 au programme scolaire du Niveau de scolarité, même quand il n\'y en a que 2', () => {
  for (const lecons of [[], [{ titre: 'Les volcans', categorie: 'Sciences', maitrise: null }]]) {
    const consignes = consignesPropositions({ ...profil, nombrePropositions: 2 }, lecons);
    assert.match(consignes, /2 sujets/);
    assert.match(consignes, /Exactement 2 d'entre eux sont au programme scolaire officiel de Primaire 6/);
    assert.match(consignes, /"auProgramme": true ou false/);
  }
});

test('consignes des Propositions : sans titres déjà proposés, pas de consigne de variété', () => {
  for (const dejaProposes of [undefined, []]) {
    assert.doesNotMatch(consignesPropositions({ ...profil, nombrePropositions: 4 }, [], dejaProposes), /déjà proposés/);
  }
});

test('consignes des Propositions : « D\'autres idées » liste les titres déjà proposés et demande d\'autres matières et d\'autres angles, suites comprises', () => {
  const consignes = consignesPropositions({ ...profil, nombrePropositions: 4 }, [{ titre: 'Les volcans', categorie: 'Sciences', maitrise: null }], ['Les dinosaures', 'Les pyramides']);
  assert.match(consignes, /déjà proposés/);
  assert.match(consignes, /- Les dinosaures\n- Les pyramides/);
  assert.match(consignes, /même reformulé/);
  assert.match(consignes, /d'autres matières/);
  assert.match(consignes, /d'autres angles/);
  assert.match(consignes, /suites/);
});
