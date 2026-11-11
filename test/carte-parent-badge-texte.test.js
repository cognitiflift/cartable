import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reperesBadge, noteBadge, libelleChoisirBadge, libelleBadgeParent, libellePalierApercu, origineVersion } from '../public/carte-parent-badge-texte.js';

const famille = (obtenus) => ({ nom: 'Mémoire', surprise: false, trouve: obtenus > 0, versionActive: 1, versions: [{ numero: 1, code: true }],
  paliers: ['bronze', 'argent', 'or', 'diamant'].map((palier, i) => ({ palier, obtenu: i < obtenus })) });
const surprise = (trouve) => ({ nom: 'Cliché !', surprise: true, trouve, versionActive: 2, versions: [{ numero: 1 }, { numero: 2 }], paliers: [{ palier: 'unique', obtenu: trouve }] });

test('repères : le Palier le plus haut, ou rien encore, puis la version active', () => {
  assert.deepEqual(reperesBadge(famille(2)), ['Palier argent', 'Version 1 active']);
  assert.deepEqual(reperesBadge(famille(0)), ['Pas encore commencé', 'Version 1 active']);
  assert.deepEqual(reperesBadge(surprise(true)), ['Surprise trouvée', 'Version 2 active']);
  assert.deepEqual(reperesBadge(surprise(false)), ['Surprise pas encore trouvée', 'Version 2 active']);
});

test('note : seulement pour un badge que l’Élève n’a pas encore', () => {
  assert.match(noteBadge(surprise(false)), /le jour où il la trouve/);
  assert.match(noteBadge(famille(0)), /premier Palier/);
  assert.equal(noteBadge(famille(1)), null);
});

test('libellés : le choix dit qu’il vaut pour tous les Paliers', () => {
  assert.match(libelleChoisirBadge(famille(1), { numero: 2 }), /version 2 .*Mémoire.* tous ses Paliers/);
  assert.match(libelleBadgeParent(surprise(true)), /2 versions, version 2 active/);
  assert.equal(libellePalierApercu('unique'), 'Surprise');
  assert.equal(libellePalierApercu('or'), 'Or');
  assert.equal(origineVersion({ code: true }), 'Dessin d’origine');
});
