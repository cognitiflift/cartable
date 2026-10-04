import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { slugify } from '../lib/store.js';

let serveur, base, dossier;

before(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-'));
  // Faux `claude` : écrit lesson.json et une page, renvoie un JSON comme --output-format json
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
mkdir -p lessons
echo '{"titre":"Les volcans","categorie":"Sciences"}' > lesson.json
echo '<h1>Volcans</h1>' > lessons/0001-volcans.html
echo '{"result":"Bonjour !","session_id":"s-123","is_error":false}'
`, { mode: 0o755 });
  const port = 3100 + Math.floor(Math.random() * 500);
  base = `http://localhost:${port}`;
  serveur = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: port, CLAUDE_BIN: faux, TEACH_SKILL_DIR: dossier },
    cwd: path.join(import.meta.dirname, '..'),
    stdio: 'pipe',
  });
  await new Promise((r) => serveur.stdout.once('data', r));
});

after(async () => {
  serveur.kill();
  await fs.rm(path.join(import.meta.dirname, '..', 'eleves', 'zoe-test'), { recursive: true, force: true });
  await fs.rm(dossier, { recursive: true, force: true });
});

const appel = async (url, method = 'GET', body) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), res };
};

test('slugify retire accents et majuscules', () => {
  assert.equal(slugify('Zoé-Test'), 'zoe-test');
});

test('parcours : créer élève, leçon, message, fichier de leçon', async () => {
  const cree = await appel('/api/eleves', 'POST', { pseudo: 'Zoé-Test', age: 11, niveau: 'Primaire 6' });
  assert.equal(cree.status, 201);
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'zoe-test', age: 11, niveau: 'Primaire 6' })).status, 409);
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: '../x', age: 11, niveau: 'Primaire 6' })).status, 400);

  const lecon = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' });
  assert.equal(lecon.status, 201);
  assert.equal(lecon.data.titre, 'Les volcans');
  assert.equal(lecon.data.categorie, 'Sciences');
  assert.equal(lecon.data.sessionId, 's-123');
  assert.deepEqual(lecon.data.pages, ['0001-volcans.html']);

  const suite = await appel(`/api/eleves/zoe-test/lecons/${lecon.data.id}/messages`, 'POST', { texte: 'ok' });
  assert.equal(suite.data.messages.length, 4);

  const liste = await appel('/api/eleves/zoe-test/lecons');
  assert.equal(liste.data[0].categorie, 'Sciences');
  assert.equal(liste.data[0].messages, undefined);

  const page = await fetch(`${base}/fichiers/zoe-test/${lecon.data.id}/lessons/0001-volcans.html`);
  assert.equal(page.status, 200);
  assert.equal((await fetch(`${base}/fichiers/zoe-test/${lecon.data.id}/..%2F..%2Fprofil.json`)).status, 403);
});

test('révision : documents rangés dans sources/, formats refusés', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const refus = await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'virus.exe', data: pdf }] });
  assert.equal(refus.status, 400);

  const lecon = await appel('/api/eleves/zoe-test/lecons', 'POST', {
    fichiers: [{ nom: 'page1.PDF', data: pdf }, { nom: 'photo.jpg', data: pdf }],
    dateControle: '2026-10-09',
  });
  assert.equal(lecon.status, 201);
  assert.equal(lecon.data.mode, 'revision');
  assert.match(lecon.data.messages[0].texte, /contrôle le/);
  const sources = await fs.readdir(path.join(import.meta.dirname, '..', 'eleves', 'zoe-test', 'lecons', lecon.data.id, 'sources'));
  assert.deepEqual(sources, ['01.pdf', '02.jpg']);
});
