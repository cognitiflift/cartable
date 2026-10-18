import { test } from 'node:test';
import assert from 'node:assert/strict';
import { problemesDesSchemas } from '../lib/schemas.js';

const page = (svg, id = 'f') => `<p>Texte</p><figure class="kit-figure" id="${id}">${svg}<figcaption>Schéma : ce qu'on regarde.</figcaption></figure>`;
const raisons = (html) => problemesDesSchemas(html).map((p) => p.raison);

test('Schémas : un texte rendu sous 14 px à 360 px est relevé, d\'après la largeur de la viewBox', () => {
  const large = problemesDesSchemas(page('<svg viewBox="0 0 640 200"><text x="10" y="20" fill="currentColor" font-size="13">Troie</text></svg>', 'troie'));
  assert.equal(large.length, 1);
  assert.equal(large[0].figure, 'troie');
  assert.equal(large[0].raison, 'texte-trop-petit');
  assert.match(large[0].detail, /6 px/);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 330 190"><text fill="currentColor" font-size="16">Case</text></svg>')), []);
});

test('Schémas : sans font-size, un texte prend la taille de la page (18), elle aussi en unités de viewBox', () => {
  const [p] = problemesDesSchemas(page('<svg viewBox="0 0 640 300"><text fill="currentColor">Persée</text></svg>'));
  assert.equal(p.raison, 'texte-trop-petit');
  assert.match(p.detail, /environ 8 px/);
});

test('Schémas : le font-size effectif vient du texte, d\'un groupe ou du style en ligne, et une largeur imposée plus petite compte', () => {
  assert.deepEqual(raisons(page('<svg viewBox="0 0 640 200"><g font-size="32"><text fill="currentColor">Grand</text></g></svg>')), []);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 640 200" style="font-size: 32px"><text fill="currentColor">Grand</text></svg>')), []);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 640 200"><g font-size="32"><text style="font-size:12px" fill="currentColor">Petit</text></g></svg>')), ['texte-trop-petit']);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 300 200" width="200"><text font-size="18" fill="currentColor">Réduit</text></svg>')), ['texte-trop-petit']);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 300 200" width="600"><text font-size="18" fill="currentColor">Plafonné</text></svg>')), []);
});

test('Schémas : une font-family sur le SVG ou sur un texte est relevée, une seule fois par schéma', () => {
  const grand = (attrs, texte = '') => page(`<svg viewBox="0 0 300 200"${attrs}><text font-size="18" fill="currentColor"${texte}>A</text><text font-size="18" fill="currentColor"${texte}>B</text></svg>`);
  const [p] = problemesDesSchemas(grand(' font-family="sans-serif"'));
  assert.equal(p.raison, 'police-imposee');
  assert.match(p.detail, /sans-serif/);
  assert.deepEqual(raisons(grand('', ' font-family="Arial"')), ['police-imposee']);
  assert.deepEqual(raisons(grand('', ' style="font-family: serif"')), ['police-imposee']);
  assert.deepEqual(raisons(grand('', ' style="font: 18px serif"')), ['police-imposee']);
  assert.deepEqual(raisons(grand('')), []);
});

test('Schémas : une couleur fill ou stroke en dur est relevée ; currentColor, none, var(--kit-…) et url(#…) ne le sont pas', () => {
  const avec = (attrs) => raisons(page(`<svg viewBox="0 0 300 200"><rect width="10" height="10" ${attrs}/><text font-size="18" fill="currentColor">A</text></svg>`));
  const [p] = problemesDesSchemas(page('<svg viewBox="0 0 300 200"><rect fill="#d33"/></svg>'));
  assert.deepEqual(p.raison, 'couleur-en-dur');
  assert.match(p.detail, /#d33/);
  for (const enDur of ['fill="#d33"', 'stroke="red"', 'style="stroke: rgb(0, 0, 0)"', 'fill="var(--ma-couleur)"']) {
    assert.deepEqual(avec(enDur), ['couleur-en-dur'], enDur);
  }
  for (const permise of ['fill="currentColor"', 'stroke="currentcolor"', 'fill="none"', 'fill="var(--kit-accent)"',
    'style="fill: var(--kit-accent-doux)"', 'fill="url(#hachures)"', 'stroke="inherit"', '']) {
    assert.deepEqual(avec(permise), [], permise);
  }
});

test('Schémas : un schéma haut est rétréci par la hauteur maximale de la figure (70 % d\'un écran de 640 px)', () => {
  assert.deepEqual(raisons(page('<svg viewBox="0 0 340 600"><text font-size="16" fill="currentColor">Haut</text></svg>')), ['texte-trop-petit']);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 340 440"><text font-size="16" fill="currentColor">Assez court</text></svg>')), []);
});

test('Schémas : une couleur en dur cachée derrière un dégradé, un repli de var() ou la couleur de currentColor est relevée', () => {
  for (const svg of [
    '<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/></linearGradient></defs><rect fill="url(#g)"/>',
    '<rect fill="var(--kit-accent, red)"/>',
  ]) assert.deepEqual(raisons(page(`<svg viewBox="0 0 300 200">${svg}</svg>`)), ['couleur-en-dur'], svg);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 300 200" color="red"><rect fill="currentColor"/></svg>')), ['couleur-en-dur']);
  assert.deepEqual(raisons(page('<svg viewBox="0 0 300 200"><stop stop-color="var(--kit-accent)"/></svg>')), []);
});

test('Schémas : un SVG hors d\'une figure du Kit n\'est pas examiné ; les figures sans id gardent leur rang', () => {
  assert.deepEqual(problemesDesSchemas('<svg viewBox="0 0 640 200"><text font-size="8" fill="#d33" font-family="serif">x</text></svg>'), []);
  assert.deepEqual(problemesDesSchemas('<figure><svg viewBox="0 0 640 200"><text font-size="8">x</text></svg></figure>'), []);
  const html = '<figure class="kit-figure"><img src="a.png" alt=""></figure><figure class="kit-figure"><svg viewBox="0 0 640 200"><text>x</text></svg></figure>';
  assert.deepEqual(problemesDesSchemas(html).map(({ figure, position }) => ({ figure, position })), [{ figure: null, position: 2 }]);
});

test('Schémas : l\'exemple de schéma du LISEZMOI du Kit suit ses propres repères', async () => {
  const { readFile } = await import('node:fs/promises');
  const doc = await readFile(new URL('../public/kit/v1/LISEZMOI.md', import.meta.url), 'utf8');
  const exemple = /<figure class="kit-figure" id="schema-volcan">[\s\S]*?<\/figure>/.exec(doc)?.[0];
  assert.ok(exemple);
  assert.deepEqual(problemesDesSchemas(exemple), []);
});
