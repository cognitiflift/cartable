import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { rapatrierImages } from '../lib/images.js';

// Échecs passagers du téléchargement d'une image de Leçon (#214).
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

// Serveur dont les réponses se suivent dans `reponses` (code HTTP, 'image' ou 'texte'), la dernière se répétant.
async function avecReponses(reponses, fn) {
  let appels = 0;
  const serveur = http.createServer((req, res) => {
    const r = reponses[Math.min(appels++, reponses.length - 1)];
    if (r === 'image') res.writeHead(200, { 'Content-Type': 'image/png' }).end(PNG);
    else if (r === 'texte') res.writeHead(200, { 'Content-Type': 'text/html' }).end('<p>non</p>');
    else res.writeHead(r).end();
  });
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  try {
    return await fn(`http://127.0.0.1:${serveur.address().port}/a.png`, () => appels);
  } finally {
    serveur.close();
  }
}

async function avecLecon(url, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-img-'));
  await fs.mkdir(path.join(dir, 'lessons'));
  await fs.writeFile(path.join(dir, 'images.json'), JSON.stringify([{ url, page: 'p.html' }]));
  await fs.writeFile(path.join(dir, 'lessons', 'p.html'), `<figure><img src="${url}"><figcaption>légende</figcaption></figure>`);
  try {
    return await fn(dir, () => fs.readFile(path.join(dir, 'lessons', 'p.html'), 'utf8'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const OPTIONS = { adressesLocales: true, pausesMs: [0, 0] };

test('Images : un 503 passager puis une réponse : l\'image est rapatriée et la page réécrite', () => avecReponses([503, 'image'], (url, appels) =>
  avecLecon(url, async (dir, page) => {
    assert.deepEqual(await rapatrierImages(dir, OPTIONS), []);
    assert.equal(appels(), 2);
    assert.match(await page(), /src="\.\.\/images\/[0-9a-f]{16}\.png"/);
  })));

test('Images : un échec passager persistant garde la balise aux deux premiers tours, la retire au troisième', () => avecReponses([503], (url) =>
  avecLecon(url, async (dir, page) => {
    for (let tour = 1; tour <= 2; tour++) {
      assert.deepEqual(await rapatrierImages(dir, OPTIONS), [], `tour ${tour}`);
      assert.match(await page(), /<img/);
    }
    const retirees = await rapatrierImages(dir, OPTIONS);
    assert.equal(retirees.length, 1);
    assert.doesNotMatch(await page(), /<img/);
    assert.match(await page(), /légende/);
  })));

test('Images : après un échec passager, le tour suivant rapatrie l\'image', () => avecReponses([503, 503, 503, 'image'], (url) =>
  avecLecon(url, async (dir, page) => {
    assert.deepEqual(await rapatrierImages(dir, OPTIONS), []);
    assert.match(await page(), /<img src="http/);
    assert.deepEqual(await rapatrierImages(dir, OPTIONS), []);
    assert.match(await page(), /src="\.\.\/images\//);
  })));

for (const [nom, reponse] of [['une 404', 404], ['un fichier non image', 'texte']]) {
  test(`Images : ${nom} est retiré aussitôt, sans nouvel essai`, () => avecReponses([reponse, 'image'], (url, appels) =>
    avecLecon(url, async (dir, page) => {
      assert.equal((await rapatrierImages(dir, OPTIONS)).length, 1);
      assert.equal(appels(), 1);
      assert.doesNotMatch(await page(), /<img/);
    })));
}
