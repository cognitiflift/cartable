import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consignesPropositions, consignesLecon, extraireChoix, extraireEnsuite, actionApresQuiz, actionRetourQuiz, promptRetourQuiz, promptDemarrageLibre, consigneRebond, REBONDS } from '../lib/agent.js';

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

test('Annonce de la suite : la ligne ENSUITE est retirée du texte et donne le titre', () => {
  assert.deepEqual(extraireEnsuite('Bravo !\nTu as tout compris.\nENSUITE:  Les volcans endormis '), {
    texte: 'Bravo !\nTu as tout compris.',
    ensuite: 'Les volcans endormis',
  });
});

test('Annonce de la suite : rien sans ligne ENSUITE, casse et ** tolérés, titre vide ignoré', () => {
  assert.deepEqual(extraireEnsuite('Bravo !'), { texte: 'Bravo !' });
  assert.deepEqual(extraireEnsuite('Bravo !\n**Ensuite :** Les laves'), { texte: 'Bravo !', ensuite: 'Les laves' });
  assert.deepEqual(extraireEnsuite('Bravo !\nENSUITE:'), { texte: 'Bravo !' });
});

test('action après un quiz : en révision Revoir sous 80 %, sinon Défi ; en Leçon libre toujours Étape suivante', () => {
  assert.equal(actionApresQuiz(79, 'revision'), 'revoir');
  assert.equal(actionApresQuiz(40, 'libre'), 'suivante');
  assert.equal(actionApresQuiz(0, 'libre'), 'suivante');
  assert.equal(actionApresQuiz(79, 'libre'), 'suivante');
  assert.equal(actionApresQuiz(80, 'revision'), 'defi');
  assert.equal(actionApresQuiz(95, 'libre'), 'suivante');
});

test('Retour de quiz : un Défi réussi en révision termine la Leçon, sinon même action qu\'après un quiz', () => {
  assert.equal(actionRetourQuiz(80, 'revision', true), 'terminee');
  assert.equal(actionRetourQuiz(100, 'revision', true), 'terminee');
  assert.equal(actionRetourQuiz(79, 'revision', true), 'revoir'); // Défi raté
  assert.equal(actionRetourQuiz(90, 'revision', false), 'defi'); // quiz ordinaire réussi
  assert.equal(actionRetourQuiz(90, 'libre', true), 'suivante'); // une Leçon libre n'est jamais terminée
  assert.equal(actionRetourQuiz(50, 'libre', false), 'suivante'); // pas de Revoir en Leçon libre
  assert.equal(actionRetourQuiz(50, 'libre', true), 'suivante');
});

test('Retour de quiz en phase Réviser d\'une Leçon libre : règles d\'une révision, puis Étape suivante après le Défi réussi', () => {
  assert.equal(actionRetourQuiz(79, 'libre', false, true), 'revoir');
  assert.equal(actionRetourQuiz(80, 'libre', false, true), 'defi');
  assert.equal(actionRetourQuiz(60, 'libre', true, true), 'revoir'); // Défi raté
  assert.equal(actionRetourQuiz(80, 'libre', true, true), 'suivante'); // Défi réussi : fin de la phase
  // Leçon de révision : la phase Réviser ne change rien, un Défi réussi la termine toujours.
  assert.equal(actionRetourQuiz(90, 'revision', true, true), 'terminee');
  assert.equal(actionRetourQuiz(50, 'revision', false, true), 'revoir');
});

test('Retour de quiz d\'un Défi réussi : le prof sait que la Leçon est terminée', () => {
  const retour = promptRetourQuiz({ score: 90, page: 'defi.html', action: 'terminee' });
  assert.match(retour, /Leçon est terminée/);
  assert.match(retour, /réviser/);
  assert.doesNotMatch(retour, /nouveau défi/i);
  assert.doesNotMatch(retour, /undefined/);
});

test('Retour de quiz en Leçon libre : le prof finit par une ligne ENSUITE, pas en révision', () => {
  assert.match(promptRetourQuiz({ score: 40, page: 'p.html', action: 'revoir', mode: 'libre' }), /ENSUITE: <titre court>/);
  assert.doesNotMatch(promptRetourQuiz({ score: 85, page: 'p.html', action: 'defi', mode: 'revision' }), /ENSUITE/);
});

test('consigne d\'Étape suivante : rappelle au prof le titre annoncé, s\'il est connu', () => {
  const consigne = consigneRebond('suivante', { ensuite: 'Les volcans endormis' });
  assert.match(consigne, /Rebond : Étape suivante/);
  assert.match(consigne, /« Les volcans endormis »/);
  assert.equal(consigneRebond('suivante', { ensuite: null }), REBONDS.suivante.consigne);
  assert.equal(consigneRebond('revoir', { ensuite: 'Les volcans endormis' }), REBONDS.revoir.consigne);
});

test('consigne de Réviser en Leçon libre : une page de révision des pages déjà vues, avec son quiz et son Dépassement', () => {
  const consigne = consigneRebond('reviser', { mode: 'libre' });
  assert.match(consigne, /Rebond : Réviser/);
  assert.match(consigne, /page de révision des pages déjà vues/);
  assert.match(consigne, /mini-quiz/);
  assert.doesNotMatch(consigne, /ni Dépassement|pas de Dépassement/);
  assert.match(consigne, /Pour aller plus loin/);
  assert.doesNotMatch(consigne, /Document source/);
  assert.equal(consigneRebond('reviser', { mode: 'revision' }), REBONDS.reviser.consigne);
});

test('Rebonds : une phrase lisible de l\'Élève et une consigne au prof par action fermée', () => {
  assert.deepEqual(Object.keys(REBONDS), ['revoir', 'defi', 'suivante', 'reviser']);
  assert.match(REBONDS.revoir.consigne, /Rebond : Revoir/);
  assert.match(REBONDS.revoir.consigne, /raté/);
  assert.match(REBONDS.defi.consigne, /Rebond : Défi/);
  assert.match(REBONDS.defi.consigne, /plus difficile/);
  assert.match(REBONDS.suivante.consigne, /Rebond : Étape suivante/);
  assert.match(REBONDS.suivante.consigne, /même Leçon/);
  assert.equal(REBONDS.reviser.phrase, '📚 Je veux réviser.');
  assert.match(REBONDS.reviser.consigne, /Rebond : Réviser/);
  assert.match(REBONDS.reviser.consigne, /page de révision/);
  assert.match(REBONDS.reviser.consigne, /fidèle au Document source/);
  assert.match(REBONDS.reviser.consigne, /sources\//);
  assert.match(REBONDS.reviser.consigne, /tous ses Objectifs/);
  assert.match(REBONDS.reviser.consigne, /Pour aller plus loin/);
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

test('consignes : Étape suivante est une page nouvelle choisie selon la zone proximale ; Revoir est réservé à la révision', () => {
  const consignes = consignesLecon(profil);
  assert.match(consignes, /Étape suivante[^.]*page nouvelle[^.]*zone proximale/);
  assert.match(consignes, /Leçon libre[^.]*toujours[^.]*Étape suivante/);
  assert.match(consignes, /Revoir[^.]*Leçon de révision/);
  assert.match(REBONDS.suivante.consigne, /page nouvelle/);
  assert.match(REBONDS.suivante.consigne, /zone proximale/);
  assert.match(REBONDS.suivante.consigne, /raté/);
});
