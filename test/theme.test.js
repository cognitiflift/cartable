import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/theme.js';

// public/theme.js est un script classique (chargé avant le premier rendu) : il se range dans globalThis.cartableTheme.
const { lire, retenir } = globalThis.cartableTheme;

const stockage = (valeurs = {}) => ({
  getItem: (cle) => valeurs[cle] ?? null,
  setItem: (cle, v) => { valeurs[cle] = String(v); },
  valeurs,
});
const stockageBloque = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };

test('Thème : automatique par défaut, sinon le choix retenu sur l\'appareil, sous sa propre clé', () => {
  assert.equal(lire(stockage()), 'auto');
  const s = stockage({ pseudo: 'lea' });
  retenir(s, 'sombre');
  assert.equal(lire(s), 'sombre');
  assert.equal(s.valeurs.pseudo, 'lea');
  delete s.valeurs.pseudo; // « Changer » efface le pseudo, pas le thème
  assert.equal(lire(s), 'sombre');
  assert.equal(lire(stockage({ theme: 'violet' })), 'auto');
});

test('Thème : stockage indisponible, automatique sans erreur', () => {
  assert.equal(lire(stockageBloque), 'auto');
  assert.doesNotThrow(() => retenir(stockageBloque, 'clair'));
  assert.equal(lire(undefined), 'auto');
});

// Un document comme le voit le CSSOM : des feuilles, leurs règles, des @media imbriquées, un @import, une feuille illisible.
const documentFactice = () => {
  const media = (mediaText, cssRules = []) => ({ media: { mediaText }, cssRules });
  const sombre = media('(prefers-color-scheme: dark)', [{ selectorText: ':root' }]);
  const etroitSombre = media('(prefers-color-scheme: dark) and (max-width: 640px)');
  const clair = media('(prefers-color-scheme:light)');
  const largeur = media('(max-width: 480px)');
  const imbrique = media('(prefers-color-scheme: dark)');
  const importe = media('(prefers-color-scheme: dark)');
  const doc = {
    documentElement: { style: { colorScheme: '' } },
    styleSheets: [
      { cssRules: [{ selectorText: 'body' }, sombre, etroitSombre, clair, largeur, { conditionText: 'x', cssRules: [imbrique] }] },
      { cssRules: [{ styleSheet: { cssRules: [importe] } }] },
      { get cssRules() { throw new Error('SecurityError'); } },
    ],
  };
  return { doc, sombre, etroitSombre, clair, largeur, imbrique, importe };
};
const TOUJOURS = '(min-width: 0)', JAMAIS = '(not (min-width: 0))';

test('Thème sombre forcé : toute règle sombre s\'applique, toute règle claire non, color-scheme dark', () => {
  const { appliquer } = globalThis.cartableTheme;
  const f = documentFactice();
  appliquer(f.doc, 'sombre');
  assert.equal(f.doc.documentElement.style.colorScheme, 'dark');
  assert.equal(f.sombre.media.mediaText, TOUJOURS);
  assert.equal(f.etroitSombre.media.mediaText, `${TOUJOURS} and (max-width: 640px)`);
  assert.equal(f.clair.media.mediaText, JAMAIS);
  assert.equal(f.imbrique.media.mediaText, TOUJOURS);
  assert.equal(f.importe.media.mediaText, TOUJOURS);
  assert.equal(f.largeur.media.mediaText, '(max-width: 480px)');
});

test('Thème clair forcé puis automatique : les règles sombres s\'éteignent, puis retrouvent la préférence de l\'appareil', () => {
  const { appliquer } = globalThis.cartableTheme;
  const f = documentFactice();
  appliquer(f.doc, 'sombre');
  appliquer(f.doc, 'clair');
  assert.equal(f.doc.documentElement.style.colorScheme, 'light');
  assert.equal(f.sombre.media.mediaText, JAMAIS);
  assert.equal(f.clair.media.mediaText, TOUJOURS);
  appliquer(f.doc, 'auto');
  assert.equal(f.doc.documentElement.style.colorScheme, ''); // celui des feuilles : light dark
  assert.equal(f.sombre.media.mediaText, '(prefers-color-scheme: dark)');
  assert.equal(f.etroitSombre.media.mediaText, '(prefers-color-scheme: dark) and (max-width: 640px)');
  assert.equal(f.clair.media.mediaText, '(prefers-color-scheme:light)');
});

test('Thème forcé : aussi les conditions d\'un @import et d\'une feuille entière (<link media>, <style media>)', () => {
  const { appliquer } = globalThis.cartableTheme;
  const importee = { cssRules: [] };
  const importe = { media: { mediaText: '(prefers-color-scheme: dark)' }, styleSheet: importee };
  const feuille = { media: { mediaText: 'screen and (prefers-color-scheme: dark)' }, cssRules: [importe] };
  const doc = { documentElement: { style: {} }, styleSheets: [feuille] };
  appliquer(doc, 'clair');
  assert.equal(importe.media.mediaText, JAMAIS);
  assert.equal(feuille.media.mediaText, `screen and ${JAMAIS}`);
  appliquer(doc, 'auto');
  assert.equal(feuille.media.mediaText, 'screen and (prefers-color-scheme: dark)');
});

test('Bouton de thème : automatique → clair → sombre → automatique, un nom qui dit le thème courant et l\'action', () => {
  const { suivant, libelle } = globalThis.cartableTheme;
  assert.deepEqual(['auto', 'clair', 'sombre'].map(suivant), ['clair', 'sombre', 'auto']);
  assert.equal(libelle('auto'), 'Thème : automatique, comme l\'appareil. Passer au thème clair');
  assert.equal(libelle('clair'), 'Thème : clair. Passer au thème sombre');
  assert.equal(libelle('sombre'), 'Thème : sombre. Revenir au thème automatique');
});
