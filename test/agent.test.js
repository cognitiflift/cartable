import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consignesPropositions, consignesLecon, extraireChoix, actionApresQuiz, actionRetourQuiz, promptDemarrageLibre, consignePremierTour, consigneRebond, preambuleRelais, REBONDS, DOSSIER_KIT, FORMATS_RAPPEL_ACTIF, consigneImagesRetirees } from '../lib/agent.js';
import path from 'node:path';

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
  assert.deepEqual(Object.keys(REBONDS), ['revoir', 'defi', 'suivante', 'commencer', 'reviser']);
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

test('les consignes de Leçon ne parlent pas de « Leçon suivante »', () => {
  assert.doesNotMatch(consignesLecon(profil), /leçon suivante/i);
  assert.match(consignesLecon(profil), /Étape suivante/);
});

test('consignes de Leçon : en Leçon libre, le prof écrit dans lesson.json le titre de la page qu\'il prévoit ensuite', () => {
  assert.match(consignesLecon(profil), /En Leçon libre, chaque fois que tu crées une page de leçon, mets aussi à jour dans lesson.json le champ "ensuite"/);
});

test('consignes de Leçon : toute nouvelle page utilise le Kit, documenté, sans quiz ni style de base réécrits', () => {
  const consignes = consignesLecon(profil);
  assert.match(consignes, /\/kit\/v1\/quiz\.js/);
  assert.match(consignes, /\/kit\/v1\/base\.css/);
  assert.match(consignes, /id="cartable-quiz"/);
  assert.ok(consignes.includes(path.join(DOSSIER_KIT, 'v1', 'LISEZMOI.md')));
  assert.match(consignes, /n'écris jamais ton propre quiz/i);
  assert.match(consignes, /propres au sujet/);
  // Le Kit envoie le score : le prof n'a plus à écrire l'envoi.
  assert.doesNotMatch(consignes, /postMessage/);
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
    { titre: 'Les volcans', categorie: 'Sciences', maitrise: { pourcentage: 85, palier: 'bien en tête' } },
    { titre: 'Les fractions', categorie: 'Mathématiques', maitrise: null },
  ]);
  assert.match(consignes, /5 sujets de nouvelles Leçons/);
  assert.doesNotMatch(consignes, /\b4 sujets/);
  assert.match(consignes, /Les volcans \(Sciences\) : Maîtrise 85 %, bien en tête/);
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

test('consignes des Propositions : des accroches qui tutoient l\'Élève, en une phrase courte adaptée à son âge', () => {
  for (const lecons of [[], [{ titre: 'Les volcans', categorie: 'Sciences', maitrise: null }]]) {
    const consignes = consignesPropositions({ ...profil, nombrePropositions: 4 }, lecons);
    assert.match(consignes, /accroche[^\n]*tutoie l'élève/);
    assert.match(consignes, /jamais « vous »/);
    assert.match(consignes, /une phrase courte/);
    assert.match(consignes, /adaptée à son âge/);
  }
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

test('consignes : en mathématiques, exemple résolu, puis étapes retirées une à une, puis exercices mélangés, sans clavier', () => {
  const consignes = consignesLecon(profil);
  const maths = consignes.split('\n').find((l) => l.startsWith('En mathématiques'));
  assert.ok(maths, consignes);
  assert.match(maths, /exemple entièrement résolu[^.]*puis[^.]*étape[^.]*une[^.]*puis[^.]*mélang/);
  assert.match(maths, /"etapes"/);
  assert.match(maths, /erreurs fréquentes/);
  assert.match(maths, /jamais au clavier/);
});

test('consignes : quiz proportionné à la page, une question comptée par idée-clé, de 3 à 6, rappel actif et visuel compris', () => {
  const lignes = consignesLecon(profil).split('\n');
  const nombre = lignes.find((l) => l.startsWith('Nombre de questions'));
  assert.ok(nombre, lignes.join('\n'));
  assert.match(nombre, /une question comptée par idée-clé de la page/);
  assert.match(nombre, /entre 3 et 6/);
  assert.match(nombre, /rappel actif et la question sur le visuel font partie de ce nombre/);
  assert.match(nombre, /une même question peut remplir les deux/);
  assert.match(nombre, /pas[^.]*tous les formats/);
  assert.match(nombre, /pas interrogée deux fois[^.]*Révisions du jour/);
  assert.match(nombre, /chaque Objectif[^.]*au moins une question comptée/i);
  // Les obligations de rappel actif et de visuel renvoient au nombre, sans s'y ajouter.
  assert.match(lignes.find((l) => l.startsWith('Rappel actif')), /parmi les questions comptées/);
  assert.match(lignes.find((l) => l.startsWith('Visuels')), /parmi les questions comptées/);
});

test('consignes : le Dépassement demande 1 question bonus, partout où il est demandé ; plus jamais « 2 ou 3 questions bonus »', () => {
  const avecDepassement = [
    consignesLecon(profil),
    consigneRebond('commencer', { mode: 'revision' }),
    consigneRebond('reviser', { mode: 'revision' }),
    consigneRebond('reviser', { mode: 'libre' }),
  ];
  for (const consigne of avecDepassement) assert.match(consigne, /1 question bonus/, consigne);
  const toutes = [
    ...avecDepassement,
    ...Object.keys(REBONDS).flatMap((action) => [consigneRebond(action, { mode: 'libre' }), consigneRebond(action, { mode: 'revision' })]),
    consignePremierTour('libre'),
    consignePremierTour('revision'),
  ];
  for (const consigne of toutes) assert.doesNotMatch(consigne, /2 ou 3 questions bonus|questions bonus \(🚀\) hors score/, consigne);
});

test('consignes : Revoir, une question par question ratée, reformulée, entre 2 et 6 ; Défi, plus difficile sans plus de questions', () => {
  assert.match(REBONDS.revoir.consigne, /une question par question ratée du dernier quiz \(hors bonus\), reformulée, entre 2 et 6/);
  assert.match(REBONDS.revoir.consigne, /pas de Dépassement/);
  assert.match(REBONDS.defi.consigne, /entre 3 et 6 questions comptées/);
  assert.match(REBONDS.defi.consigne, /pas plus de questions/);
});

test('consigne du premier tour : le Pré-test garde ses trois questions', () => {
  for (const mode of ['libre', 'revision']) assert.match(consignePremierTour(mode), /de trois questions/);
});

test('Préambule de relais : la session neuve reçoit l\'état de la Leçon et la consigne de relire les fichiers de teach', () => {
  const texte = preambuleRelais({
    objectifs: [{ texte: 'Nommer les parties d’un volcan', atteint: true }, { texte: 'Expliquer une éruption', atteint: false }],
    scores: [
      { score: 50, page: '0001-volcans.html', date: '2026-10-01T10:00:00.000Z' },
      { score: 90, page: '0002-eruptions.html', date: '2026-10-02T10:00:00.000Z', objectifs: [1], bonus: { reussies: 1, total: 2 } },
    ],
    maitrise: { pourcentage: 72, palier: 'à consolider' },
    ensuite: 'Les volcans endormis',
    pages: ['0001-volcans.html', '0002-eruptions.html'],
    messages: [],
  });
  assert.match(texte, /session neuve/);
  assert.match(texte, /MISSION\.md/);
  assert.match(texte, /learning-records/);
  assert.match(texte, /NOTES\.md/);
  assert.match(texte, /1\. Nommer les parties d’un volcan : atteint/);
  assert.match(texte, /2\. Expliquer une éruption : pas encore atteint/);
  assert.match(texte, /50 % \(0001-volcans\.html\) le 2026-10-01 ; 90 % \(0002-eruptions\.html\) le 2026-10-02/);
  assert.match(texte, /Maîtrise : 72 %, à consolider/);
  assert.match(texte, /Résultats du dernier quiz : 0002-eruptions\.html, 90 % ; questions bonus : 1 sur 2/);
  assert.match(texte, /« Les volcans endormis »/);
  assert.match(texte, /0001-volcans\.html, 0002-eruptions\.html/);
});

test('Préambule de relais : sans scores ni Objectifs, il demande de fixer les Objectifs ; une question en attente est rappelée', () => {
  const texte = preambuleRelais({
    objectifs: [], scores: [], maitrise: null, ensuite: null, pages: ['0001-volcans.html'],
    messages: [{ role: 'eleve', texte: 'ok' }, { role: 'agent', texte: 'Veux-tu aller plus loin ?', choix: ['Oui', 'Non'] }],
  });
  assert.doesNotMatch(texte, /Scores aux quiz|dernier quiz|annoncé/);
  assert.match(texte, /n'a pas encore d'Objectifs/);
  assert.match(texte, /« Veux-tu aller plus loin \? » \(réponses proposées : Oui \| Non\)/);
});

// Leçon dont le dernier quiz a des résultats par question (Kit) : une question ratée, une juste, une bonus ratée.
const leconAvecResultats = (mode = 'revision') => ({
  mode,
  scores: [
    { score: 30, page: '0001-volcans.html', date: '2026-10-01T10:00:00.000Z' },
    {
      score: 50, page: '0002-eruptions.html', date: '2026-10-02T10:00:00.000Z', bonus: { reussies: 0, total: 1 },
      questions: [
        { id: 'q1', enonce: 'Qu’est-ce que le magma ?', choisie: 'De la lave refroidie', bonne: 'De la roche fondue sous terre', juste: false, bonus: false, objectifs: [1] },
        { id: 'q2', enonce: 'Où sort la lave ?', choisie: 'Par le cratère', bonne: 'Par le cratère', juste: true, bonus: false, objectifs: [1] },
        { id: 'b1', enonce: 'Qu’est-ce qu’un geyser ?', choisie: 'Un volcan', bonne: 'Une source qui jaillit', juste: false, bonus: true, objectifs: [] },
      ],
    },
  ],
});

test('consigne de Rebond : chaque Rebond transmet les questions ratées du dernier quiz et les réponses choisies, et demande un encart en tête de page', () => {
  for (const action of ['revoir', 'defi', 'suivante', 'reviser']) {
    const consigne = consigneRebond(action, leconAvecResultats(action === 'suivante' ? 'libre' : 'revision'));
    assert.match(consigne, /Résultats du dernier quiz : 0002-eruptions\.html, 50 %/, action);
    assert.match(consigne, /« Qu’est-ce que le magma \? » : il a choisi « De la lave refroidie », la bonne réponse était « De la roche fondue sous terre »/, action);
    assert.match(consigne, /« Qu’est-ce qu’un geyser \? » \(bonus 🚀\) : il a choisi « Un volcan »/, action);
    assert.doesNotMatch(consigne, /Où sort la lave/, action); // les questions justes ne sont que comptées
    assert.match(consigne, /1 question juste sur 2/, action);
    assert.match(consigne, /commence par un court encart sur ce qu'il a raté/, action);
  }
  // Revoir reprend nommément les questions ratées.
  assert.match(consigneRebond('revoir', leconAvecResultats()), /reprends nommément chacune des questions ratées/);
  assert.doesNotMatch(consigneRebond('defi', leconAvecResultats()), /nommément/);
});

test('consigne de Rebond : sans résultats par question (anciennes Leçons), le score seul ; sans quiz, rien de plus', () => {
  const ancienne = { mode: 'revision', scores: [{ score: 40, page: 'p.html', date: '2026-10-01T10:00:00.000Z' }] };
  const consigne = consigneRebond('revoir', ancienne);
  assert.match(consigne, /Résultats du dernier quiz : p\.html, 40 %/);
  assert.doesNotMatch(consigne, /court encart|il a choisi/);
  assert.equal(consigneRebond('defi', { mode: 'revision', scores: [] }), REBONDS.defi.consigne);
  // Tout juste : pas d'encart sur ce qui a été raté.
  const parfait = { mode: 'revision', scores: [{ score: 100, page: 'p.html', date: '2026-10-01T10:00:00.000Z', questions: [{ id: 'q1', enonce: 'A ?', choisie: 'a', bonne: 'a', juste: true, bonus: false, objectifs: [] }] }] };
  assert.match(consigneRebond('defi', parfait), /Toutes ses réponses étaient justes/);
  assert.doesNotMatch(consigneRebond('defi', parfait), /court encart/);
});

test('Préambule de relais : les résultats par question du dernier quiz y figurent, sauf quand la consigne les porte déjà', () => {
  const lecon = { ...leconAvecResultats(), objectifs: [], maitrise: null, ensuite: null, pages: [], messages: [] };
  assert.match(preambuleRelais(lecon), /« Qu’est-ce que le magma \? » : il a choisi « De la lave refroidie »/);
  const sans = preambuleRelais(lecon, { resultatsQuiz: false });
  assert.match(sans, /Scores aux quiz/);
  assert.doesNotMatch(sans, /Résultats du dernier quiz|magma/);
});

test('Préambule de relais : après un quiz raté en partie, toute nouvelle page commence par l\'encart sur ce qui a été raté, une seule fois', () => {
  const lecon = { ...leconAvecResultats('libre'), objectifs: [], maitrise: null, ensuite: null, pages: [], messages: [] };
  const texte = preambuleRelais(lecon);
  assert.equal(texte.split('court encart sur ce qu\'il a raté').length, 2);
  assert.doesNotMatch(preambuleRelais(lecon, { resultatsQuiz: false }), /court encart/); // la consigne du Rebond le porte
  const parfait = { ...lecon, scores: [{ score: 100, page: 'p.html', date: '2026-10-01T10:00:00.000Z', questions: [{ id: 'q1', enonce: 'A ?', choisie: 'a', bonne: 'a', juste: true, bonus: false, objectifs: [] }] }] };
  assert.doesNotMatch(preambuleRelais(parfait), /court encart/);
});

test('Préambule de relais : après un Pré-test, ses résultats par question et les Objectifs « à confirmer », sans encart sur ce qui a été raté', () => {
  const pretest = { score: 50, page: '0001-devine.html', date: '2026-10-01T10:00:00.000Z', pretest: true, questions: [
    { id: 'q1', enonce: 'A ?', choisie: 'a', bonne: 'a', juste: true, bonus: false, objectifs: [1] },
    { id: 'q2', enonce: 'B ?', choisie: 'x', bonne: 'b', juste: false, bonus: false, objectifs: [2], sur: true },
  ] };
  const objectifs = [{ texte: 'Un', atteint: false, aConfirmer: true }, { texte: 'Deux', atteint: false, aConfirmer: false }];
  const texte = preambuleRelais({ objectifs, scores: [pretest], maitrise: null, pages: ['0001-devine.html'], messages: [] });
  assert.match(texte, /1\. Un : à confirmer \(réussi au Pré-test\)/);
  assert.match(texte, /2\. Deux : pas encore atteint/);
  assert.match(texte, /50 % \(0001-devine\.html\) \(Pré-test, hors score\)/);
  assert.match(texte, /- « A \? » \(Objectif 1\) : juste\./);
  assert.match(texte, /- « B \? » \(Objectif 2\) : il a choisi « x », la bonne réponse était « b », il était sûr\./);
  assert.match(texte, /À confirmer : 1 /);
  assert.doesNotMatch(texte, /court encart|Maîtrise/);
});

// « Remettre dans l'ordre » (#130) : réservé aux suites à un seul ordre juste, une fois par quiz au plus, hors Pré-test.
test('consignes : « ordre » réservé aux suites à un seul ordre juste, au plus une fois par quiz, et pas en tête des formats', () => {
  const rappel = consignesLecon(profil).split('\n').find((l) => l.startsWith('Rappel actif'));
  assert.ok(rappel.includes(FORMATS_RAPPEL_ACTIF.join(' ; ')), rappel);
  assert.doesNotMatch(FORMATS_RAPPEL_ACTIF[0], /"ordre"/);
  const ordre = FORMATS_RAPPEL_ACTIF.find((f) => f.startsWith('"ordre"'));
  assert.ok(ordre, FORMATS_RAPPEL_ACTIF.join('\n'));
  assert.match(ordre, /un seul ordre est juste et vérifiable dans la page/);
  assert.match(ordre, /chronologie datée/);
  assert.match(ordre, /jamais[^;]*liste de conseils/i);
  assert.match(ordre, /"classer"[^;]*"associer"[^;]*QCM[^;]*d'abord/);
  assert.match(ordre, /une question "ordre" au plus par quiz/);
  assert.match(ordre, /pas dans chaque quiz[^;]*varie les formats d'une page à l'autre/);
  assert.match(ordre, /pas les mêmes éléments qu'une question "ordre" d'une page précédente/);
});

test('consigne du premier tour : pas de question « ordre » dans le Pré-test, plutôt un QCM ou « classer »', () => {
  for (const mode of ['libre', 'revision']) assert.match(consignePremierTour(mode), /pas de question "ordre" dans le Pré-test[^.]*QCM ou "classer"/i);
});

test('Images retirées : une image trop lourde se remplace par l\'image de partage réduite de sa source, les autres comme avant (#139)', () => {
  const lourde = consigneImagesRetirees([{ url: 'https://exemple.org/original.jpg', page: '0003-arc.html', raison: 'image trop lourde' }]).join('\n');
  assert.match(lourde, /https:\/\/exemple\.org\/original\.jpg \(0003-arc\.html\) : image trop lourde/);
  assert.match(lourde, /trop lourde[^\n]*image de partage[^\n]*og:image[^\n]*jamais le fichier original/);

  const morte = consigneImagesRetirees([{ url: 'https://exemple.org/x.png', page: '0002.html', raison: 'adresse morte (erreur 404)' }]).join('\n');
  assert.doesNotMatch(morte, /image de partage/);
  assert.match(morte, /par une autre image qui marche \(déclarée dans images\.json\) ou par un schéma SVG/);
});
