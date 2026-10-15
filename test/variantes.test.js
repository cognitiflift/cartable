import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionsAVarier, lireVariantes, demandeDeVariantes } from '../lib/variantes.js';

const journal = [{ date: '2026-11-01T12:00:00.000Z', juste: true, origine: 'quiz' }, { date: '2026-11-02T12:00:00.000Z', juste: false, origine: 'quiz' }];
const explication = {
  type: 'explication', enonce: 'Pourquoi la lave devient-elle noire ?', reponses: ['Elle se solidifie en roche', 'Elle brûle'], bonne: 0,
  explication: 'Elle refroidit.', objectifs: [1],
};
const trous = { type: 'trous', enonce: 'Complète.', segments: ['Le ', '.'], trous: ['cratère'], intrus: ['nuage'], explication: '', objectifs: [1] };

test('Variantes : une question « explication » (cas particulier de QCM) est variée, pas un autre format', () => {
  const banque = { 'p#e1': { id: 'e1', contenu: explication, journal }, 'p#t1': { id: 't1', contenu: trous, journal } };
  assert.deepEqual(questionsAVarier(banque), ['p#e1']);
});

test('Variantes : celles d\'une question « explication » restent des « explication », quel que soit le type écrit', () => {
  const ecrites = [
    { enonce: 'Pourquoi la lave refroidie est-elle sombre ?', reponses: ['Elle brûle', 'Elle devient du basalte'], bonne: 1, explication: 'Basalte.' },
    { type: 'qcm', enonce: 'Pourquoi la roche volcanique est-elle noire ?', reponses: ['Elle devient du basalte', 'La pluie'], bonne: 0, explication: 'Basalte.' },
  ];
  const variantes = lireVariantes(ecrites, explication);
  assert.deepEqual(variantes.map((v) => v.type), ['explication', 'explication']);
  assert.deepEqual(variantes[0], { type: 'explication', enonce: 'Pourquoi la lave refroidie est-elle sombre ?', reponses: ['Elle brûle', 'Elle devient du basalte'], bonne: 1, explication: 'Basalte.', objectifs: [1] });
  // Le prof sait qu'il écrit des explications : le type est dans la demande.
  assert.equal(demandeDeVariantes({ 'p#e1': { contenu: explication } }, ['p#e1'])[0].type, 'explication');
});

test('Variantes : celles d\'un QCM restent sans type (QCM implicite, comme avant)', () => {
  const qcm = { enonce: 'Où sort la lave ?', reponses: ['Par le cratère', 'Par les racines'], bonne: 0, explication: 'Le cratère.', objectifs: [1] };
  const [v] = lireVariantes([{ enonce: 'Par où la lave sort-elle ?', reponses: ['Les racines', 'Le cratère'], bonne: 1, explication: 'Le cratère.' }], qcm);
  assert.equal(Object.hasOwn(v, 'type'), false);
  assert.equal(Object.hasOwn(demandeDeVariantes({ 'p#q1': { contenu: qcm } }, ['p#q1'])[0], 'type'), false);
});
