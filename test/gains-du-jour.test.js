import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gainsDuJour } from '../public/gains-du-jour.js';

const sans = { etoiles: 0, fusees: 0, paliers: [] };
const calendrier = (jours) => ({ aujourdhui: '2026-11-10', jours });

test('Gains du jour : ceux d\'aujourd\'hui seulement', () => {
  const gains = { etoiles: 2, fusees: 1, paliers: [{ emoji: '🔥', palier: 'bronze' }] };
  const cal = calendrier([{ jour: '2026-11-09', gains: { etoiles: 5, fusees: 0, paliers: [] } }, { jour: '2026-11-10', gains }]);
  assert.deepEqual(gainsDuJour(cal), gains);
});

test('Gains du jour : rien du tout (null) sans gain aujourd\'hui, même avec des gains un autre jour', () => {
  assert.equal(gainsDuJour(calendrier([{ jour: '2026-11-09', gains: { etoiles: 3, fusees: 1, paliers: [] } }])), null);
  assert.equal(gainsDuJour(calendrier([{ jour: '2026-11-10', gains: sans }])), null);
  assert.equal(gainsDuJour(calendrier([])), null);
});

test('Gains du jour : un Palier seul suffit', () => {
  const gains = { etoiles: 0, fusees: 0, paliers: [{ emoji: '📚', palier: 'argent' }] };
  assert.deepEqual(gainsDuJour(calendrier([{ jour: '2026-11-10', gains }])), gains);
});

test('Gains du jour : calendrier absent (lecture en échec), rien', () => {
  assert.equal(gainsDuJour(undefined), null);
});
