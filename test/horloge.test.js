import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maintenantDe, ENTETE_MAINTENANT } from '../lib/horloge.js';

const INJECTABLE = { CARTABLE_HORLOGE_INJECTABLE: '1' };

test('Horloge : l\'en-tête X-Cartable-Maintenant fixe « maintenant » seulement si l\'horloge est injectable', () => {
  assert.equal(ENTETE_MAINTENANT, 'x-cartable-maintenant');
  const entetes = { 'x-cartable-maintenant': '2026-10-20T10:00:00.000Z' };
  assert.equal(maintenantDe(entetes, INJECTABLE), Date.parse('2026-10-20T10:00:00.000Z'));
  const reel = maintenantDe(entetes, {});
  assert.ok(Math.abs(reel - Date.now()) < 5000);
});

test('Horloge : sans en-tête, ou avec une date illisible, l\'heure réelle', () => {
  for (const entetes of [{}, { 'x-cartable-maintenant': 'demain' }]) {
    assert.ok(Math.abs(maintenantDe(entetes, INJECTABLE) - Date.now()) < 5000);
  }
});
