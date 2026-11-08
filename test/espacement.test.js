import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { espacementActif, appliquerEspacement } from '../public/kit/v1/espacement.js';

test('Espacement des lettres : activé seulement quand l\'appli l\'indique dans l\'adresse de la page', () => {
  assert.equal(espacementActif('?espacement=1'), true);
  assert.equal(espacementActif('?lecture=1&espacement=1'), true);
  assert.equal(espacementActif(''), false);
  assert.equal(espacementActif('?lecture=1'), false, 'une page ouverte sans le réglage est inchangée');
  assert.equal(espacementActif('?espacement=0'), false);
});

test('Espacement des lettres : le Kit pose sa classe sur la page seulement si le réglage est dans l\'adresse', () => {
  const classes = new Set();
  const doc = { documentElement: { classList: { add: (c) => classes.add(c) } } };
  appliquerEspacement(doc, '');
  assert.equal(classes.size, 0);
  appliquerEspacement(doc, '?espacement=1');
  assert.deepEqual([...classes], ['kit-espacement']);
});

test('Espacement des lettres : le jeton est dans DESIGN.md et dans les deux :root, aux valeurs de WCAG 1.4.12', async () => {
  const css = await fs.readFile(new URL('../public/style.css', import.meta.url), 'utf8');
  const design = await fs.readFile(new URL('../DESIGN.md', import.meta.url), 'utf8');
  const sombre = css.indexOf('@media (prefers-color-scheme: dark) { :root {');
  const clair = css.slice(css.indexOf(':root {'), sombre);
  const fonce = css.slice(sombre, css.indexOf('} }', sombre));
  for (const jeton of ['espacement-lettres', 'espacement-mots']) {
    assert.ok(clair.includes(`--${jeton}:`), `--${jeton} dans le :root clair`);
    assert.ok(fonce.includes(`--${jeton}:`), `--${jeton} dans le :root sombre`);
    assert.ok(design.includes(jeton), `${jeton} dans DESIGN.md`);
  }
  // WCAG 1.4.12 : un texte doit supporter 0,12 em entre les lettres et 0,16 em entre les mots.
  assert.match(clair, /--espacement-lettres:\s*\.12em/);
  assert.match(clair, /--espacement-mots:\s*\.16em/);
});
