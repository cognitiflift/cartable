import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionsSuspectes } from '../lib/suspectes.js';
import { indicateurs } from '../lib/indicateurs.js';

// Questions suspectes (spec #145, ticket #148) : calcul pur sur les Leçons lues.
const iso = (jour, heure = 12) => new Date(2026, 9, jour, heure).toISOString();
const contenu = { enonce: 'Capitale ?', reponses: ['Paris', 'Lyon', 'Nice'], bonne: 0, explication: 'Paris.', objectifs: [1] };
const fausse = (jour, extra = {}) => ({ date: iso(jour), juste: false, sur: true, choisie: 'Lyon', origine: 'revision', ...extra });
const juste = (jour, extra = {}) => ({ date: iso(jour), juste: true, origine: 'revision', ...extra });
const question = (journal, extra = {}) => ({ page: 'p.html', id: 'q1', contenu, journal, ...extra });
const lecon = (questions, retenu = true) => ({ id: 'l1', titre: 'Pays', objectifs: [{ texte: 'Capitales', retenu }], questions });

test('Suspecte : la même réponse fausse choisie sûr à deux jours différents, un Objectif couvert Retenu', () => {
  const [s, ...autres] = questionsSuspectes([lecon([question([fausse(2), juste(3), fausse(5)])])]);
  assert.deepEqual(autres, []);
  assert.deepEqual(s, {
    lecon: 'l1', titreLecon: 'Pays', page: 'p.html', id: 'q1', enonce: 'Capitale ?', bonne: 'Paris',
    motifs: [{ type: 'reponse-fausse-sure', choisie: 'Lyon', jours: 2 }],
  });
});

test('Suspecte : pas le même jour, pas « pas sûr », pas deux réponses fausses différentes, pas sans Objectif Retenu', () => {
  assert.deepEqual(questionsSuspectes([lecon([question([fausse(2, { date: iso(2, 9) }), fausse(2, { date: iso(2, 18) })])])]), []);
  assert.deepEqual(questionsSuspectes([lecon([question([fausse(2, { sur: false }), fausse(3, { sur: false })])])]), []);
  assert.deepEqual(questionsSuspectes([lecon([question([fausse(2), fausse(3, { choisie: 'Nice' })])])]), []);
  assert.deepEqual(questionsSuspectes([lecon([question([fausse(2), fausse(3)])], false)]), []);
  assert.deepEqual(questionsSuspectes([lecon([question([fausse(2, { jeNeSaisPas: true }), fausse(3, { jeNeSaisPas: true })])])]), []);
});

test('Suspecte : une Question déjà signalée n\'est plus montrée', () => {
  const signalee = question([fausse(2), fausse(3)], { signalement: { raison: 'pas-claire', auteur: 'parent', date: iso(4) } });
  assert.deepEqual(questionsSuspectes([lecon([signalee])]), []);
});

test('Suspecte : une Variante ratée nettement plus souvent que sa Question d\'origine', () => {
  const journal = [juste(1), juste(2), juste(3, { variante: 0 }), { ...juste(4, { variante: 0 }), juste: false }, { ...juste(5, { variante: 0 }), juste: false }];
  const [s] = questionsSuspectes([lecon([question(journal)], false)]);
  assert.deepEqual(s.motifs, [{ type: 'variante', variante: 0, ratees: 2, reponses: 3, origine: { ratees: 0, reponses: 2 } }]);
  // Écart trop faible, ou une seule réponse à la Variante : rien.
  assert.deepEqual(questionsSuspectes([lecon([question([juste(1), juste(2), juste(3, { variante: 0 }), juste(4, { variante: 0 }), { ...juste(5, { variante: 0 }), juste: false }])])]), []);
  assert.deepEqual(questionsSuspectes([lecon([question([juste(1), juste(2), { ...juste(3, { variante: 0 }), juste: false }])])]), []);
});

test('Indicateurs : Questions signalées, rétablies (événements de la période) et suspectes (calcul du moment)', () => {
  const evenements = [
    { type: 'signalement', date: iso(3), lecon: 'l1', raison: 'pas-claire' },
    { type: 'signalement', date: iso(4), lecon: 'l1', raison: 'reponse-fausse' },
    { type: 'retablissement', date: iso(5), lecon: 'l1' },
    { type: 'signalement', date: new Date(2026, 8, 1).toISOString(), lecon: 'l1', raison: 'pas-claire' }, // hors période
  ];
  const { questionsSignalees } = indicateurs(evenements, {
    maintenant: new Date(2026, 9, 10, 12).getTime(), du: '2026-10-01', au: '2026-10-10',
    lecons: [lecon([question([fausse(2), fausse(3)])])],
  });
  assert.deepEqual(questionsSignalees, { signalees: 2, retablies: 1, suspectes: 1 });
});
