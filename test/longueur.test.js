import { test } from 'node:test';
import assert from 'node:assert/strict';
import { problemesDeLongueur, MOTS_PAGE_MAX, MOTS_PARTIE_MAX } from '../lib/longueur.js';

const mots = (n) => Array(n).fill('mot').join(' ');
const raisons = (html) => problemesDeLongueur(html).map((p) => p.raison);

test('Longueur : les bornes sont 800 mots par page et 200 par partie sans titre', () => {
  assert.equal(MOTS_PAGE_MAX, 800);
  assert.equal(MOTS_PARTIE_MAX, 200);
});

test('Longueur : une page courte, en parties titrées, n\'a rien à signaler', () => {
  const html = `<h1>Le magma</h1><p>${mots(150)}</p><h2>Le cratère</h2><p>${mots(150)}</p><h2>Quiz</h2>`;
  assert.deepEqual(raisons(html), []);
});

test('Longueur : une page de plus de 800 mots est relevée, pas une de 800', () => {
  const parties = (n) => Array.from({ length: n }, (_, i) => `<h2>Partie ${i}</h2><p>${mots(100)}</p>`).join('');
  assert.deepEqual(raisons(parties(8)), []);
  const [p] = problemesDeLongueur(`${parties(8)}<h2>Reste</h2><p>mot</p>`);
  assert.equal(p.raison, 'page-trop-longue');
  assert.match(p.detail, /801 mots/);
});

test('Longueur : une partie de plus de 200 mots sans titre est relevée, avec le titre qui la précède', () => {
  assert.deepEqual(raisons(`<h1>T</h1><p>${mots(200)}</p>`), []);
  const [p] = problemesDeLongueur(`<h1>Le magma</h1><p>${mots(120)}</p><h2>Le cratère</h2><p>${mots(130)}</p><p>${mots(80)}</p>`);
  assert.equal(p.raison, 'partie-trop-longue');
  assert.match(p.detail, /210 mots/);
  assert.match(p.detail, /« Le cratère »/);
});

test('Longueur : un texte trop long avant le premier titre est une partie sans titre', () => {
  const [p] = problemesDeLongueur(`<p>${mots(201)}</p><h1>T</h1>`);
  assert.equal(p.raison, 'partie-trop-longue');
  assert.match(p.detail, /avant le premier titre/);
});

test('Longueur : une page peut cumuler les deux problèmes', () => {
  assert.deepEqual(raisons(`<h1>T</h1><p>${mots(900)}</p>`), ['page-trop-longue', 'partie-trop-longue']);
});

test('Longueur : ne comptent ni le quiz, ni les légendes, ni les crédits, ni l\'encart du Dépassement, ni le titre de la page', () => {
  const html = `<!doctype html><html><head><title>${mots(500)}</title><style>p{}</style></head><body>
    <h1>${mots(500)}</h1><p>${mots(150)}</p>
    <figure class="kit-figure" id="f"><svg><text>${mots(300)}</text></svg><figcaption>${mots(300)}</figcaption><small class="kit-credit">${mots(300)}</small></figure>
    <aside class="encart">🚀 Pour aller plus loin : ${mots(600)}</aside>
    <h2>Quiz</h2><script type="application/json" id="cartable-quiz">{"questions":[{"enonce":"${mots(900)}"}]}</script></body></html>`;
  assert.deepEqual(raisons(html), []);
});

test('Longueur : les figures et l\'encart n\'interrompent pas le texte autour d\'eux, une figure imbriquée ou un <br> non plus', () => {
  const html = `<h1>T</h1><p>${mots(100)}<br>${mots(50)}</p><figure class="kit-figure"><figure><figcaption>x</figcaption></figure>${mots(900)}</figure><p>${mots(60)}</p>`;
  assert.deepEqual(problemesDeLongueur(html).map((p) => p.raison), ['partie-trop-longue']);
  assert.match(problemesDeLongueur(html)[0].detail, /210 mots/);
});

test('Longueur : les commentaires et les espaces insécables ne faussent pas le compte', () => {
  assert.deepEqual(raisons(`<h1>T</h1><!-- ${mots(500)} --><p>${mots(100)}&nbsp;:&nbsp;!</p>`), []);
});

test('Longueur : une page vide ou illisible n\'a rien à signaler', () => {
  assert.deepEqual(problemesDeLongueur(''), []);
  assert.deepEqual(problemesDeLongueur(undefined), []);
  assert.deepEqual(problemesDeLongueur('<h1>Titre jamais fermé'), []);
});
