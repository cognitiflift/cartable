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
  // Dans le dossier des Propositions, il note chaque lancement (`lancements-propositions`) et ses arguments
  // (`args-propositions`), et écrit propositions.json ; le fichier `attendre` le fait patienter, le fichier `echouer` le fait échouer, le fichier
  // `autres` lui fait écrire d'autres idées. Dans une Leçon, il signale son démarrage (`demarre-<leçon>`)
  // et le fichier `lent` le fait répondre lentement.
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
if [ "$(basename "$PWD")" = propositions ]; then
  echo lancement >> '${dossier}/lancements-propositions'
  printf '%s\n' "$@" > '${dossier}/args-propositions'
  while [ -e '${dossier}/attendre' ]; do sleep 0.05; done
  if [ -e '${dossier}/echouer' ]; then
    echo '{"result":"You have hit your limit","is_error":true}'
    exit 0
  fi
  if [ -e '${dossier}/autres' ]; then
    echo '[{"titre":"Les abeilles","categorie":"Sciences","accroche":"Comment font-elles le miel ?","type":"original"}]' > propositions.json
    echo '{"result":"ok","session_id":"s-prop","is_error":false}'
    exit 0
  fi
  cat > propositions.json <<'FIN'
[
  {"titre":"Les dinosaures","categorie":"Sciences","accroche":"Qui était le plus grand ?","type":"original"},
  {"titre":"Les pyramides","categorie":"Histoire","accroche":"Comment les a-t-on construites ?","type":"original"},
  {"titre":"Les fractions en cuisine","categorie":"Cuisine","accroche":"Une demi-tarte, ça fait combien ?","type":"original"},
  {"titre":"Les planètes","categorie":"Sciences","accroche":"Pourquoi Mars est rouge ?","type":"suite"}
]
FIN
  echo '{"result":"ok","session_id":"s-prop","is_error":false}'
  exit 0
fi
touch '${dossier}'/demarre-"$(basename "$PWD")"
while [ -e '${dossier}/lent' ]; do sleep 0.05; done
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
  for (const slug of ['zoe-test', 'prop-test', 'prop-lent', 'prop-echec', 'prop-autres', 'prop-double', 'prop-garde', 'prop-suite']) {
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

// Interroge `lire` toutes les 50 ms (5 s au plus) jusqu'à ce que `ok` accepte la valeur lue.
const sonderJusqua = async (lire, ok, echec) => {
  for (let i = 0; i < 100; i++) {
    const valeur = await lire();
    if (ok(valeur)) return valeur;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(echec);
};
const existe = (fichier) => fs.access(fichier).then(() => true, () => false);
const demarre = (lecon) => existe(path.join(dossier, `demarre-${lecon.id}`));
const message = (lecon, texte) => appel(`/api/eleves/zoe-test/lecons/${lecon.id}/messages`, 'POST', { texte });

// Pose un fichier de contrôle du faux `claude` (attendre, echouer, lent) le temps de `fn`.
const avecFichier = async (nom, fn) => {
  await fs.writeFile(path.join(dossier, nom), '');
  try {
    return await fn();
  } finally {
    await fs.rm(path.join(dossier, nom), { force: true });
  }
};

const attendrePropositions = (slug) => sonderJusqua(
  async () => (await appel(`/api/eleves/${slug}/propositions`)).data,
  (data) => data.etat !== 'en préparation',
  'Propositions jamais prêtes');

test('Propositions : générées à la création du profil, Catégorie hors liste ramenée à « Autre », choisir une démarre une Leçon libre', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Test', age: 9, niveau: 'Primaire 4' })).status, 201);
  const { etat, propositions } = await attendrePropositions('prop-test');
  assert.equal(etat, 'prêtes');
  assert.equal(propositions.length, 4);
  assert.deepEqual(propositions[0], { titre: 'Les dinosaures', categorie: 'Sciences', accroche: 'Qui était le plus grand ?', type: 'original' });
  assert.equal(propositions[2].categorie, 'Autre');
  assert.deepEqual(propositions.map((p) => p.type), ['original', 'original', 'original', 'suite']);

  // Choisir une Proposition démarre une Leçon libre sur son sujet.
  const lecon = await appel('/api/eleves/prop-test/lecons', 'POST', { sujet: propositions[1].titre });
  assert.equal(lecon.status, 201);
  assert.equal(lecon.data.mode, 'libre');
  assert.equal(lecon.data.sujet, 'Les pyramides');
  assert.equal(lecon.data.messages[0].texte, 'Les pyramides');
});

test('Propositions : « en préparation » tant que l\'agent travaille, sans retarder la création', async () => {
  await avecFichier('attendre', async () => {
    assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Lent', age: 14, niveau: 'Secondaire 2' })).status, 201);
    assert.deepEqual((await appel('/api/eleves/prop-lent/propositions')).data, { etat: 'en préparation', propositions: [] });
    // Le sujet libre reste utilisable pendant la préparation.
    assert.equal((await appel('/api/eleves/prop-lent/lecons', 'POST', { sujet: 'les volcans' })).status, 201);
  });
  assert.equal((await attendrePropositions('prop-lent')).etat, 'prêtes');
});

test('Propositions : un échec de génération laisse l\'appli utilisable, sans Propositions', async () => {
  await avecFichier('echouer', async () => {
    assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Echec', age: 7, niveau: 'Primaire 2' })).status, 201);
    assert.deepEqual(await attendrePropositions('prop-echec'), { etat: 'indisponibles', propositions: [] });
  });
  assert.equal((await appel('/api/eleves/prop-echec/lecons', 'POST', { sujet: 'les volcans' })).status, 201);
});

test('Propositions : élève inconnu', async () => {
  assert.equal((await appel('/api/eleves/personne/propositions')).status, 404);
  assert.equal((await appel('/api/eleves/personne/propositions', 'POST')).status, 404);
});

test('Propositions : « D\'autres idées » régénère sans attendre l\'agent, en gardant les anciennes visibles', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Autres', age: 10, niveau: 'Primaire 5' })).status, 201);
  const anciennes = (await attendrePropositions('prop-autres')).propositions;
  assert.equal(anciennes[0].titre, 'Les dinosaures');

  const { etat, propositions } = await avecFichier('autres', async () => {
    await avecFichier('attendre', async () => {
      const relance = await appel('/api/eleves/prop-autres/propositions', 'POST');
      assert.equal(relance.status, 202);
      assert.deepEqual(relance.data, { etat: 'en préparation', propositions: anciennes });
      // Pendant la génération, les anciennes Propositions restent lisibles (et donc cliquables).
      assert.deepEqual((await appel('/api/eleves/prop-autres/propositions')).data, { etat: 'en préparation', propositions: anciennes });
    });
    return attendrePropositions('prop-autres');
  });
  assert.equal(etat, 'prêtes');
  assert.equal(propositions[0].titre, 'Les abeilles');
});

test('Propositions : les anciennes restent servies pendant l\'écriture des nouvelles, et après un échec de régénération', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Garde', age: 8, niveau: 'Primaire 3' })).status, 201);
  const anciennes = (await attendrePropositions('prop-garde')).propositions;
  const fichier = path.join(import.meta.dirname, '..', 'eleves', 'prop-garde', 'propositions', 'propositions.json');

  await avecFichier('echouer', () => avecFichier('attendre', async () => {
    assert.equal((await appel('/api/eleves/prop-garde/propositions', 'POST')).status, 202);
    await fs.writeFile(fichier, '[{"titre":"Les'); // l'agent est en train d'écrire
    assert.deepEqual((await appel('/api/eleves/prop-garde/propositions')).data, { etat: 'en préparation', propositions: anciennes });
  }).then(() => attendrePropositions('prop-garde')).then((data) => {
    assert.deepEqual(data, { etat: 'prêtes', propositions: anciennes });
  }));
});

test('Propositions : une seconde demande pendant une génération en cours ne lance pas de second agent', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Double', age: 12, niveau: 'Secondaire 1' })).status, 201);
  await attendrePropositions('prop-double');
  const lancements = path.join(dossier, 'lancements-propositions');
  await fs.rm(lancements, { force: true });

  await avecFichier('attendre', async () => {
    assert.equal((await appel('/api/eleves/prop-double/propositions', 'POST')).status, 202);
    const second = await appel('/api/eleves/prop-double/propositions', 'POST');
    assert.equal(second.status, 409);
    assert.equal(second.data.erreur, 'Des idées sont déjà en préparation');
  });
  await attendrePropositions('prop-double');
  assert.equal((await fs.readFile(lancements, 'utf8')).trim().split('\n').length, 1);

  // Une fois la génération finie, on peut de nouveau en demander une.
  assert.equal((await appel('/api/eleves/prop-double/propositions', 'POST')).status, 202);
  await attendrePropositions('prop-double');
});

test('Propositions : régénérées après chaque tour de séance, d\'après le titre, la Catégorie et la Maîtrise des Leçons', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Suite', age: 11, niveau: 'Primaire 6' })).status, 201);
  await attendrePropositions('prop-suite');
  const lancements = path.join(dossier, 'lancements-propositions');
  const args = path.join(dossier, 'args-propositions');
  const nbLancements = async () => (await fs.readFile(lancements, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).length;
  await fs.rm(lancements, { force: true });

  // Premier tour de la Leçon : régénération, sans retarder la réponse à l'élève (le faux agent des Propositions attend).
  const { data: lecon } = await avecFichier('attendre', async () => {
    const reponse = await appel('/api/eleves/prop-suite/lecons', 'POST', { sujet: 'les volcans' });
    assert.equal(reponse.status, 201);
    await sonderJusqua(nbLancements, (n) => n === 1, 'Pas de régénération après le premier tour');
    assert.equal((await appel('/api/eleves/prop-suite/propositions')).data.etat, 'en préparation');
    assert.match(await fs.readFile(args, 'utf8'), /Les volcans \(Sciences\) : Maîtrise pas encore évaluée/);
    // Un tour pendant une génération en cours ne la double pas : il en relance une seule, une fois celle-ci finie.
    await appel(`/api/eleves/prop-suite/lecons/${reponse.data.id}/scores`, 'POST', { score: 30 });
    assert.equal((await appel(`/api/eleves/prop-suite/lecons/${reponse.data.id}/messages`, 'POST', { texte: 'ok' })).status, 200);
    assert.equal((await appel(`/api/eleves/prop-suite/lecons/${reponse.data.id}/messages`, 'POST', { texte: 'ok' })).status, 200);
    assert.equal(await nbLancements(), 1);
    return reponse;
  });
  await sonderJusqua(nbLancements, (n) => n === 2, 'Pas de relance après la génération en cours');
  await attendrePropositions('prop-suite');
  assert.equal(await nbLancements(), 2);
  assert.match(await fs.readFile(args, 'utf8'), /Les volcans \(Sciences\) : Maîtrise 30 %, non acquis/);

  // Message suivant : nouvelle régénération, qui voit la Maîtrise à jour.
  await appel(`/api/eleves/prop-suite/lecons/${lecon.id}/scores`, 'POST', { score: 90 });
  await appel(`/api/eleves/prop-suite/lecons/${lecon.id}/scores`, 'POST', { score: 90 });
  await appel(`/api/eleves/prop-suite/lecons/${lecon.id}/scores`, 'POST', { score: 90 });
  assert.equal((await appel(`/api/eleves/prop-suite/lecons/${lecon.id}/messages`, 'POST', { texte: 'encore' })).status, 200);
  await sonderJusqua(nbLancements, (n) => n === 3, 'Pas de régénération après un message');
  await attendrePropositions('prop-suite');
  const consignes = await fs.readFile(args, 'utf8');
  assert.match(consignes, /Les volcans \(Sciences\) : Maîtrise 90 %, acquis/);
  assert.match(consignes, /11 ans/);
  assert.match(consignes, /Primaire 6/);
});

test('Concurrence : un second message pendant que l\'agent répond est refusé, puis la Leçon en accepte de nouveau', async () => {
  const { data: lecon } = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' });
  await fs.rm(path.join(dossier, `demarre-${lecon.id}`), { force: true });
  const { premier } = await avecFichier('lent', async () => {
    const premier = message(lecon, 'premier');
    await sonderJusqua(() => demarre(lecon), Boolean, "L'agent n'a jamais démarré");
    // Sans verrou, le second message attendrait l'agent lent : on le borne pour échouer plutôt que bloquer.
    let minuteur;
    const sansReponse = new Promise((r) => (minuteur = setTimeout(() => r({ status: 'pas de réponse en 2 s' }), 2000)));
    const second = await Promise.race([message(lecon, 'second'), sansReponse]);
    clearTimeout(minuteur);
    assert.equal(second.status, 409);
    assert.equal(second.data.erreur, 'L\'agent est déjà en train de répondre');
    return { premier }; // pas encore résolue : l'agent attend la levée de `lent`
  });
  assert.equal((await premier).status, 200);

  const apres = await message(lecon, 'troisième');
  assert.equal(apres.status, 200);
  const envoyes = apres.data.messages.filter((m) => m.role === 'eleve').map((m) => m.texte);
  assert.deepEqual(envoyes, ['les volcans', 'premier', 'troisième']);
});

test('Concurrence : deux Leçons différentes reçoivent des messages en même temps', async () => {
  const { data: a } = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' });
  const { data: b } = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les fractions' });
  await Promise.all([a, b].map((l) => fs.rm(path.join(dossier, `demarre-${l.id}`), { force: true })));
  const { reponses } = await avecFichier('lent', async () => {
    const reponses = Promise.all([message(a, 'ok'), message(b, 'ok')]);
    reponses.catch(() => {}); // une erreur éventuelle est constatée plus bas
    // Les deux agents ont démarré alors qu'aucun n'a encore répondu.
    await sonderJusqua(() => Promise.all([demarre(a), demarre(b)]), (d) => d.every(Boolean), 'Les deux agents ne travaillent pas en même temps');
    return { reponses };
  });
  assert.deepEqual((await reponses).map((r) => r.status), [200, 200]);
});
