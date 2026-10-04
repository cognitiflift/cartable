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
  // Faux `claude` : écrit lesson.json et une page, renvoie un JSON comme --output-format json.
  // Dans le dossier des Propositions, il écrit propositions.json ; le fichier `attendre` le fait patienter,
  // le fichier `echouer` le fait échouer.
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
if [ "$(basename "$PWD")" = propositions ]; then
  while [ -e '${dossier}/attendre' ]; do sleep 0.05; done
  if [ -e '${dossier}/echouer' ]; then
    echo '{"result":"You have hit your limit","is_error":true}'
    exit 0
  fi
  cat > propositions.json <<'FIN'
[
  {"titre":"Les dinosaures","categorie":"Sciences","accroche":"Qui était le plus grand ?","type":"original"},
  {"titre":"Les pyramides","categorie":"Histoire","accroche":"Comment les a-t-on construites ?","type":"original"},
  {"titre":"Les fractions en cuisine","categorie":"Cuisine","accroche":"Une demi-tarte, ça fait combien ?","type":"original"},
  {"titre":"Les planètes","categorie":"Sciences","accroche":"Pourquoi Mars est rouge ?","type":"original"}
]
FIN
  echo '{"result":"ok","session_id":"s-prop","is_error":false}'
  exit 0
fi
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
  for (const slug of ['zoe-test', 'prop-test', 'prop-lent', 'prop-echec']) {
    await fs.rm(path.join(import.meta.dirname, '..', 'eleves', slug), { recursive: true, force: true });
  }
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

test('Maîtrise : pas encore évaluée, puis moyenne des 3 derniers scores et paliers', async () => {
  const { data: lecon } = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les fractions' });
  const maitrise = async () => (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).maitrise;
  assert.equal(await maitrise(), null);

  assert.equal((await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/scores`, 'POST', { score: 140 })).status, 400);
  const score = (s) => appel(`/api/eleves/zoe-test/lecons/${lecon.id}/scores`, 'POST', { score: s, page: '0001-volcans.html' });

  assert.equal((await score(20)).status, 201);
  assert.deepEqual(await maitrise(), { pourcentage: 20, palier: 'non acquis' });
  await score(70);
  await score(90);
  assert.deepEqual(await maitrise(), { pourcentage: 60, palier: 'à consolider' });
  await score(80);
  assert.deepEqual(await maitrise(), { pourcentage: 80, palier: 'acquis' });
});

test('Maîtrise : baisse de 10 points par semaine sans quiz au-delà de 3 semaines', async () => {
  const { data: lecon } = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' });
  // Les scores sont stockés en clair dans etat.json (Espace personnel lisible) : on y place un vieux score.
  const fichier = path.join(import.meta.dirname, '..', 'eleves', 'zoe-test', 'lecons', lecon.id, 'etat.json');
  const etat = JSON.parse(await fs.readFile(fichier, 'utf8'));
  etat.scores = [{ score: 90, date: new Date(Date.now() - 35 * 86_400_000).toISOString() }];
  await fs.writeFile(fichier, JSON.stringify(etat));

  const liste = await appel('/api/eleves/zoe-test/lecons');
  assert.deepEqual(liste.data.find((l) => l.id === lecon.id).maitrise, { pourcentage: 70, palier: 'à consolider' });
});

const attendrePropositions = async (slug) => {
  for (let i = 0; i < 100; i++) {
    const { data } = await appel(`/api/eleves/${slug}/propositions`);
    if (data.etat !== 'en préparation') return data;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Propositions jamais prêtes');
};

test('Propositions : générées à la création du profil, Catégorie hors liste ramenée à « Autre », choisir une démarre une Leçon libre', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Test', age: 9, niveau: 'Primaire 4' })).status, 201);
  const { etat, propositions } = await attendrePropositions('prop-test');
  assert.equal(etat, 'prêtes');
  assert.equal(propositions.length, 4);
  assert.deepEqual(propositions[0], { titre: 'Les dinosaures', categorie: 'Sciences', accroche: 'Qui était le plus grand ?', type: 'original' });
  assert.equal(propositions[2].categorie, 'Autre');

  // Choisir une Proposition démarre une Leçon libre sur son sujet.
  const lecon = await appel('/api/eleves/prop-test/lecons', 'POST', { sujet: propositions[1].titre });
  assert.equal(lecon.status, 201);
  assert.equal(lecon.data.mode, 'libre');
  assert.equal(lecon.data.sujet, 'Les pyramides');
  assert.equal(lecon.data.messages[0].texte, 'Les pyramides');
});

test('Propositions : « en préparation » tant que l\'agent travaille, sans retarder la création', async () => {
  await fs.writeFile(path.join(dossier, 'attendre'), '');
  try {
    assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Lent', age: 14, niveau: 'Secondaire 2' })).status, 201);
    assert.deepEqual((await appel('/api/eleves/prop-lent/propositions')).data, { etat: 'en préparation', propositions: [] });
    // Le sujet libre reste utilisable pendant la préparation.
    assert.equal((await appel('/api/eleves/prop-lent/lecons', 'POST', { sujet: 'les volcans' })).status, 201);
  } finally {
    await fs.rm(path.join(dossier, 'attendre'));
  }
  assert.equal((await attendrePropositions('prop-lent')).etat, 'prêtes');
});

test('Propositions : un échec de génération laisse l\'appli utilisable, sans Propositions', async () => {
  await fs.writeFile(path.join(dossier, 'echouer'), '');
  try {
    assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Echec', age: 7, niveau: 'Primaire 2' })).status, 201);
    assert.deepEqual(await attendrePropositions('prop-echec'), { etat: 'indisponibles', propositions: [] });
  } finally {
    await fs.rm(path.join(dossier, 'echouer'));
  }
  assert.equal((await appel('/api/eleves/prop-echec/lecons', 'POST', { sujet: 'les volcans' })).status, 201);
});


test('Propositions : élève inconnu', async () => {
  assert.equal((await appel('/api/eleves/personne/propositions')).status, 404);
});
