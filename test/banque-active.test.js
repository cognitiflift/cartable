import test from 'node:test';
import assert from 'node:assert/strict';
import { estActive } from '../lib/banque.js';

test('estActive : une Question signalée n\'est pas active, les autres le sont', () => {
  assert.equal(estActive({ id: 1 }), true);
  assert.equal(estActive({ id: 2, signalement: { raison: 'fausse', auteur: 'parent', date: '2026-10-01' } }), false);
  assert.deepEqual([{ id: 1 }, { id: 2, signalement: { raison: 'x' } }].filter(estActive), [{ id: 1 }]);
});
