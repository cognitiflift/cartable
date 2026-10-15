import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validerCadrage } from '../lib/cadrage.js';
import { HttpError } from '../lib/http-error.js';

const refuse = (brut, mode) => assert.throws(() => validerCadrage(brut, mode), (e) => e instanceof HttpError && e.status === 400);

test('Cadrage : absent accepté (null), en Leçon libre comme en révision', () => {
  assert.equal(validerCadrage(undefined, 'libre'), null);
  assert.equal(validerCadrage(null, 'revision'), null);
});

test('Cadrage : valeurs fermées de « Pourquoi ? » et « Tu en sais déjà… » gardées en Leçon libre', () => {
  assert.deepEqual(validerCadrage({ pourquoi: 'curiosite', deja: 'un-peu' }, 'libre'), { pourquoi: 'curiosite', deja: 'un-peu' });
  assert.deepEqual(validerCadrage({ pourquoi: 'je-ne-sais-pas', deja: 'je-ne-sais-pas' }, 'libre'), { pourquoi: 'je-ne-sais-pas', deja: 'je-ne-sais-pas' });
});

test('Cadrage : chaque question peut rester sans réponse', () => {
  assert.deepEqual(validerCadrage({ deja: 'incollable' }, 'libre'), { deja: 'incollable' });
  assert.deepEqual(validerCadrage({}, 'libre'), null);
});

test('Cadrage : valeurs inconnues, texte libre, champ inconnu ou forme invalide refusés (400)', () => {
  refuse({ pourquoi: 'parce que', deja: 'rien' }, 'libre');
  refuse({ deja: 'tout' }, 'libre');
  refuse({ deja: 'rien', autre: 'x' }, 'libre');
  refuse({ deja: 1 }, 'libre');
  refuse('rien', 'libre');
  refuse(['rien'], 'libre');
});

test('Cadrage : une Leçon de révision ne demande pas « Pourquoi ? »', () => {
  assert.deepEqual(validerCadrage({ deja: 'beaucoup' }, 'revision'), { deja: 'beaucoup' });
  refuse({ pourquoi: 'controle', deja: 'beaucoup' }, 'revision');
});
