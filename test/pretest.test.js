import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ecartPretest } from '../lib/pretest.js';

const ecart = (deja, justes, total = 3) => ecartPretest({ deja, justes, total });

test('Écart : « un peu » puis 3 sur 3, il en sait plus qu’il ne le pensait', () => {
  const e = ecart('un-peu', 3);
  assert.equal(e.ecart, 'plus');
  assert.deepEqual([e.deja, e.justes, e.total], ['un-peu', 3, 3]);
  assert.equal(e.texte, 'Tu pensais en savoir un peu, et tu as trouvé 3 réponses sur 3 : tu en sais plus que tu ne le croyais ! 🌟');
});

test('Écart : « beaucoup » puis 1 sur 3, présenté sans le décourager', () => {
  const e = ecart('beaucoup', 1);
  assert.equal(e.ecart, 'moins');
  assert.equal(e.texte, "Tu pensais en savoir beaucoup, et tu as trouvé 1 réponse sur 3 : c'est normal de deviner avant d'apprendre, ce Pré-test aide ton prof à choisir par où commencer. 🌱");
});

test('Écart : comme prévu quand le Pré-test confirme l’auto-évaluation', () => {
  assert.equal(ecart('rien', 0).ecart, 'comme-prevu');
  assert.equal(ecart('un-peu', 1).ecart, 'comme-prevu');
  assert.equal(ecart('beaucoup', 2).ecart, 'comme-prevu');
  assert.equal(ecart('incollable', 3).ecart, 'comme-prevu');
  assert.match(ecart('rien', 0).texte, /^Tu pensais découvrir ce sujet, et tu as trouvé 0 réponse sur 3 : tu te connais bien ! /);
  assert.match(ecart('incollable', 3).texte, /^Tu pensais être incollable/);
});

test('Écart : « rien » mais 2 sur 3, plus ; « incollable » mais 2 sur 3, moins', () => {
  assert.equal(ecart('rien', 2).ecart, 'plus');
  assert.equal(ecart('incollable', 2).ecart, 'moins');
});

test('Écart : sans auto-évaluation (absente ou « Je ne sais pas »), le résultat seul, sans écart', () => {
  for (const deja of [undefined, null, 'je-ne-sais-pas']) {
    const e = ecart(deja, 2);
    assert.equal(e.ecart, null);
    assert.equal(e.texte, 'Tu as trouvé 2 réponses sur 3 avant même la leçon. 🔮');
  }
});

test('Écart : la proportion compte, pas le nombre de questions', () => {
  assert.equal(ecart('beaucoup', 4, 6).ecart, 'comme-prevu');
  assert.equal(ecart('un-peu', 6, 6).ecart, 'plus');
});

test('Écart : null sans question', () => {
  assert.equal(ecart('un-peu', 0, 0), null);
});
