import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { slugify } from '../lib/store.js';

let serveur, base, dossier, eleves;
const elevesDuDepot = path.join(import.meta.dirname, '..', 'eleves');

before(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-'));
  eleves = path.join(dossier, 'eleves'); // propre à cette exécution : jamais le `eleves/` du dépôt
  // Faux `claude` : écrit lesson.json et une page, renvoie un JSON comme --output-format json.
  // Dans le dossier des Propositions, il note chaque lancement (`lancements-propositions`) et ses arguments
  // (`args-propositions`), et écrit propositions.json ; le fichier `attendre` le fait patienter, le fichier `echouer` le fait échouer, le fichier
  // `autres` lui fait écrire d'autres idées, `inchange` le fait réussir sans réécrire propositions.json et
  // `ecrire-puis-echouer` le fait échouer après avoir écrit d'autres idées. Dans une Leçon, il signale son démarrage (`demarre-<leçon>`)
  // et le fichier `lent` le fait répondre lentement ; il note ses arguments (`args-<leçon>`) et le fichier `choix`
  // lui fait finir sa réponse par une ligne CHOIX ; le fichier `refuser` simule un prof qui refuse le sujet
  // (ni page ni lesson.json, des sujets voisins en CHOIX).
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
if [ "$(basename "$PWD")" = propositions ]; then
  echo lancement >> '${dossier}/lancements-propositions'
  printf '%s\n' "$@" > '${dossier}/args-propositions'
  while [ -e '${dossier}/attendre' ]; do sleep 0.05; done
  if [ -e '${dossier}/inchange' ]; then
    echo '{"result":"ok","session_id":"s-prop","is_error":false}'
    exit 0
  fi
  if [ -e '${dossier}/ecrire-puis-echouer' ]; then
    echo '[{"titre":"Les abeilles","categorie":"Sciences","accroche":"Comment font-elles le miel ?","type":"original"}]' > propositions.json
    echo '{"result":"You have hit your limit","is_error":true}'
    exit 0
  fi
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
  {"titre":"Les dinosaures","categorie":"Sciences","accroche":"Qui était le plus grand ?","type":"original","auProgramme":true},
  {"titre":"Les pyramides","categorie":"Histoire","accroche":"Comment les a-t-on construites ?","type":"original","auProgramme":"oui"},
  {"titre":"Les fractions en cuisine","categorie":"Cuisine","accroche":"Une demi-tarte, ça fait combien ?","type":"original"},
  {"titre":"Les planètes","categorie":"Sciences","accroche":"Pourquoi Mars est rouge ?","type":"suite","auProgramme":true},
  {"titre":"Les nuages","categorie":"Sciences","accroche":"De quoi sont-ils faits ?","type":"original"}
]
FIN
  echo '{"result":"ok","session_id":"s-prop","is_error":false}'
  exit 0
fi
touch '${dossier}'/demarre-"$(basename "$PWD")"
while [ -e '${dossier}/lent' ]; do sleep 0.05; done
printf '%s\\n' "$@" > '${dossier}'/args-"$(basename "$PWD")"
if [ -e '${dossier}/refuser' ]; then
  printf '%s\\n' '{"result":"Parlons plutôt d’autre chose.\\nCHOIX: Les volcans | Les dinosaures | Les planètes","session_id":"s-123","is_error":false}'
  exit 0
fi
mkdir -p lessons
echo '{"titre":"Les volcans","categorie":"Sciences"}' > lesson.json
echo '<h1>Volcans</h1>' > lessons/0001-volcans.html
if [ -e '${dossier}/choix' ]; then
  printf '%s\\n' '{"result":"Pourquoi ?\\nCHOIX: Un exposé | Un devoir","session_id":"s-123","is_error":false}'
  exit 0
fi
echo '{"result":"Bonjour !","session_id":"s-123","is_error":false}'
`, { mode: 0o755 });
  const port = 3100 + Math.floor(Math.random() * 500);
  base = `http://localhost:${port}`;
  serveur = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: port, CLAUDE_BIN: faux, TEACH_SKILL_DIR: dossier, ELEVES_DIR: eleves },
    cwd: path.join(import.meta.dirname, '..'),
    stdio: 'pipe',
  });
  await new Promise((r) => serveur.stdout.once('data', r));
});

after(async () => {
  serveur.kill();
  // Un faux `claude` de Propositions lancé juste avant l'arrêt peut encore écrire ici : on réessaie.
  await fs.rm(dossier, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

const appel = async (url, method = 'GET', body) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), res };
};

test('slugify retire accents et majuscules', () => {
  assert.equal(slugify('Zoé-Test'), 'zoe-test');
});

test('les Élèves sont rangés dans ELEVES_DIR, jamais dans le eleves/ du dépôt', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Isole-Test', age: 9, niveau: 'Primaire 4' })).status, 201);
  assert.equal(JSON.parse(await fs.readFile(path.join(eleves, 'isole-test', 'profil.json'), 'utf8')).pseudo, 'Isole-Test');
  await assert.rejects(fs.access(path.join(elevesDuDepot, 'isole-test')), { code: 'ENOENT' });
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

test('Séance : Réponses proposées sur le message du prof, retour de quiz avec action recommandée', async () => {
  await fs.writeFile(path.join(dossier, 'choix'), '');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les tornades' })).data;
  await fs.rm(path.join(dossier, 'choix'));
  assert.equal(lecon.messages.at(-1).texte, 'Pourquoi ?');
  assert.deepEqual(lecon.messages.at(-1).choix, ['Un exposé', 'Un devoir']);

  const retours = `/api/eleves/zoe-test/lecons/${lecon.id}/retours`;
  assert.equal((await appel(retours, 'POST', { score: 'beaucoup' })).status, 400);
  const retour = await appel(retours, 'POST', { score: 70, page: '0001-volcans.html' });
  assert.equal(retour.status, 200);
  const [eleve, prof] = retour.data.messages.slice(-2);
  assert.equal(eleve.texte, '📝 Quiz terminé : 70 %');
  assert.deepEqual(prof.retourQuiz, { score: 70, action: 'revoir' });
  assert.match(await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8'), /Quiz terminé : 0001-volcans\.html, 70 %/);
  assert.equal(retour.data.scores.length, 0); // le score s'enregistre par /scores
});

test('sujet libre : 80 caractères au plus, espaces autour non comptés', async () => {
  const refus = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'a'.repeat(81) });
  assert.equal(refus.status, 400);
  assert.match(refus.data.erreur, /80/);
  const lecon = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: `  ${'b'.repeat(80)}  ` });
  assert.equal(lecon.status, 201);
  assert.equal(lecon.data.sujet, 'b'.repeat(80));
});

test('sujet libre cadré : le prof reçoit la consigne ; s\'il refuse, la Leçon garde son sujet et propose des sujets voisins', async () => {
  const lecon = await avecFichier('refuser', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'un sujet bizarre' })).data);
  const args = await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.match(args, /un sujet bizarre/);
  assert.match(args, /choquant/);
  assert.equal(lecon.titre, 'un sujet bizarre');
  assert.deepEqual(lecon.pages, []);
  assert.equal(lecon.messages[0].texte, 'un sujet bizarre');
  assert.deepEqual(lecon.messages.at(-1).choix, ['Les volcans', 'Les dinosaures', 'Les planètes']);
  const resume = (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);
  assert.equal(resume.titre, 'un sujet bizarre');
  assert.equal((await appel(`/api/eleves/zoe-test/lecons/${lecon.id}`)).data.titre, 'un sujet bizarre');

  // L'élève choisit un sujet voisin : la Leçon démarre normalement, sans nouvelle consigne de cadrage.
  const suite = (await message(lecon, 'Les volcans')).data;
  assert.equal(suite.titre, 'Les volcans');
  assert.deepEqual(suite.pages, ['0001-volcans.html']);
  assert.doesNotMatch(await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8'), /choquant/);
});

test('Rebond : l\'action recommandée par le dernier Retour de quiz construit la consigne du prof', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les séismes' })).data;
  const rebonds = `/api/eleves/zoe-test/lecons/${lecon.id}/rebonds`;
  const args = path.join(dossier, `args-${lecon.id}`);
  // Sans Retour de quiz, aucun Rebond n'est proposé.
  assert.equal((await appel(rebonds, 'POST', { action: 'suivante' })).status, 400);

  await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/retours`, 'POST', { score: 90 });
  assert.equal((await appel(rebonds, 'POST', { action: 'sauter' })).status, 400);
  assert.equal((await appel(rebonds, 'POST', { action: 'toString' })).status, 400);
  assert.equal((await appel(rebonds, 'POST', { texte: 'Je veux passer à la suite.' })).status, 400);
  const incoherent = await appel(rebonds, 'POST', { action: 'defi' }); // Leçon libre : Étape suivante seulement
  assert.equal(incoherent.status, 400);
  assert.equal((await appel(`/api/eleves/zoe-test/lecons/${lecon.id}`)).data.messages.length, 4);

  const suite = await appel(rebonds, 'POST', { action: 'suivante' });
  assert.equal(suite.status, 200);
  const consigne = await fs.readFile(args, 'utf8');
  assert.match(consigne, /Rebond : Étape suivante/);
  // Un Rebond déjà choisi ne se rejoue pas (double clic).
  assert.equal((await appel(rebonds, 'POST', { action: 'suivante' })).status, 400);
  assert.match(consigne, /même Leçon/);
  assert.doesNotMatch(consigne, /Je veux/);
  const eleve = suite.data.messages.at(-2);
  assert.equal(eleve.role, 'eleve');
  assert.equal(eleve.texte, '➡️ Je suis prêt pour la suite.');

  // Après un quiz raté, seul Revoir est accepté.
  await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/retours`, 'POST', { score: 40 });
  assert.equal((await appel(rebonds, 'POST', { action: 'suivante' })).status, 400);
  assert.equal((await appel(rebonds, 'POST', { action: 'revoir' })).status, 200);
  assert.match(await fs.readFile(args, 'utf8'), /Rebond : Revoir/);
});

test('Rebonds proposés : exposés par la Leçon lue, pas par la liste ; la route refuse les autres', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const rebond = (action) => appel(`${url}/rebonds`, 'POST', { action });
  assert.deepEqual(lecon.rebondsProposes, []);
  assert.equal((await rebond('defi')).status, 400);

  assert.deepEqual((await appel(`${url}/retours`, 'POST', { score: 50 })).data.rebondsProposes, ['revoir']);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).rebondsProposes, undefined);
  assert.equal((await rebond('defi')).status, 400);
  const revoir = await rebond('revoir');
  assert.equal(revoir.status, 200);
  assert.deepEqual(revoir.data.rebondsProposes, []);

  assert.deepEqual((await appel(`${url}/retours`, 'POST', { score: 90 })).data.rebondsProposes, ['defi']);
  assert.equal((await rebond('defi')).status, 200);
  const termine = (await appel(`${url}/retours`, 'POST', { score: 90 })).data;
  assert.equal(termine.messages.at(-1).retourQuiz.action, 'terminee');
  assert.deepEqual(termine.rebondsProposes, ['defi']);
  assert.deepEqual((await appel(url)).data.rebondsProposes, ['defi']);
});

test('Score enregistré pendant un Défi en cours : marqué « quiz de Défi »', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const quiz = async (score) => {
    await appel(`${url}/scores`, 'POST', { score, page: 'p.html' });
    return (await appel(`${url}/retours`, 'POST', { score, page: 'p.html' })).data;
  };
  await quiz(90);
  await appel(`${url}/rebonds`, 'POST', { action: 'defi' });
  const apres = await quiz(95);
  assert.equal(apres.scores[0].defi, undefined);
  assert.equal(apres.scores[1].defi, true);
  assert.equal(apres.scores[1].score, 95);
});

test('Rebond : Défi après un quiz réussi en Leçon de révision', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const rebonds = `/api/eleves/zoe-test/lecons/${lecon.id}/rebonds`;
  await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/retours`, 'POST', { score: 85 });
  assert.equal((await appel(rebonds, 'POST', { action: 'suivante' })).status, 400);
  const defi = await appel(rebonds, 'POST', { action: 'defi' });
  assert.equal(defi.status, 200);
  assert.equal(defi.data.messages.at(-2).texte, '🏆 Je veux un défi plus difficile.');
  assert.match(await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8'), /Rebond : Défi/);
});

test('Leçon terminée : un Défi réussi termine la Leçon de révision, un Défi raté ne la « dé-termine » pas', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  // Une Leçon sans les nouveaux champs (comme les Leçons existantes) se lit comme non terminée.
  assert.equal(lecon.terminee, null);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const retour = async (score) => (await appel(`${url}/retours`, 'POST', { score })).data;
  const rebond = (action) => appel(`${url}/rebonds`, 'POST', { action });
  const resume = async () => (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);

  // Un quiz ordinaire réussi recommande un Défi sans terminer la Leçon, même deux fois de suite.
  assert.equal((await retour(95)).messages.at(-1).retourQuiz.action, 'defi');
  assert.equal((await retour(95)).terminee, null);
  // Tant que la Leçon n'est pas terminée, aucun autre Rebond que celui recommandé.
  assert.equal((await rebond('terminee')).status, 400);

  // Défi raté : Revoir, toujours pas terminée.
  assert.equal((await rebond('defi')).status, 200);
  const rate = await retour(60);
  assert.deepEqual(rate.messages.at(-1).retourQuiz, { score: 60, action: 'revoir' });
  assert.equal(rate.terminee, null);
  assert.equal((await rebond('defi')).status, 400);
  assert.equal((await rebond('revoir')).status, 200);

  // Quiz de la page Revoir réussi (pas un Défi), puis Défi réussi : Leçon terminée.
  assert.equal((await retour(85)).messages.at(-1).retourQuiz.action, 'defi');
  assert.equal((await rebond('defi')).status, 200);
  const reussi = await retour(90);
  assert.deepEqual(reussi.messages.at(-1).retourQuiz, { score: 90, action: 'terminee' });
  assert.match(await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8'), /Leçon est terminée/);
  const terminee = reussi.terminee;
  assert.ok(!Number.isNaN(Date.parse(terminee)));
  assert.equal((await resume()).terminee, terminee);
  assert.equal((await appel(url)).data.terminee, terminee);
  // La Maîtrise ne dépend pas de l'état terminé.
  assert.equal(reussi.maitrise, null);

  // « Nouveau défi » sur une Leçon terminée, une seule fois par Retour de quiz.
  assert.equal((await rebond('terminee')).status, 400);
  const nouveau = await rebond('defi');
  assert.equal(nouveau.status, 200);
  assert.match(await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8'), /Rebond : Défi/);
  assert.equal((await rebond('defi')).status, 400);

  // Nouveau Défi raté : Revoir, mais la Leçon reste terminée (même date).
  const rateApres = await retour(30);
  assert.equal(rateApres.messages.at(-1).retourQuiz.action, 'revoir');
  assert.equal(rateApres.terminee, terminee);
  // Comme avant la fin, seul Revoir est proposé après un Défi raté.
  assert.equal((await rebond('defi')).status, 400);
  assert.equal((await rebond('revoir')).status, 200);
  assert.equal((await retour(85)).messages.at(-1).retourQuiz.action, 'defi');
  assert.equal((await rebond('defi')).status, 200);
  // Nouveau Défi réussi : toujours terminée, date de fin inchangée.
  const reussiApres = await retour(100);
  assert.equal(reussiApres.messages.at(-1).retourQuiz.action, 'terminee');
  assert.equal(reussiApres.terminee, terminee);
});

test('Leçon terminée : une Leçon libre ne l\'est jamais', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les comètes' })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  await appel(`${url}/retours`, 'POST', { score: 90 });
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'defi' })).status, 400);
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'suivante' })).status, 200);
  const apres = (await appel(`${url}/retours`, 'POST', { score: 100 })).data;
  assert.equal(apres.messages.at(-1).retourQuiz.action, 'suivante');
  assert.equal(apres.terminee, null);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).terminee, null);
});

test('Leçon terminée : une Leçon existante, sans les nouveaux champs, se lit comme non terminée', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  // Leçon d'avant les Leçons terminées : etat.json tel qu'il était écrit alors.
  const fichier = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'etat.json');
  const { id, sujet, mode, sessionId, creee, derniereActivite, messages, scores } = JSON.parse(await fs.readFile(fichier, 'utf8'));
  await fs.writeFile(fichier, JSON.stringify({ id, sujet, mode, sessionId, creee, derniereActivite, messages, scores }));
  assert.equal((await appel(url)).data.terminee, null);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).terminee, null);
  // Pas de Défi en cours : un quiz réussi recommande un Défi, sans terminer la Leçon.
  const apres = (await appel(`${url}/retours`, 'POST', { score: 90 })).data;
  assert.equal(apres.messages.at(-1).retourQuiz.action, 'defi');
  assert.equal(apres.terminee, null);
});

test('révision :documents rangés dans sources/, formats refusés', async () => {
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
  assert.doesNotMatch(await fs.readFile(path.join(dossier, `args-${lecon.data.id}`), 'utf8'), /choquant/);
  const sources = await fs.readdir(path.join(eleves, 'zoe-test', 'lecons', lecon.data.id, 'sources'));
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
  const fichier = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'etat.json');
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
  assert.deepEqual(propositions[0], { titre: 'Les dinosaures', categorie: 'Sciences', accroche: 'Qui était le plus grand ?', type: 'original', auProgramme: true });
  assert.equal(propositions[2].categorie, 'Autre');
  assert.deepEqual(propositions.map((p) => p.type), ['original', 'original', 'original', 'suite']);
  // Marque absente ou invalide : pas au programme. Le faux agent en écrit 5 : on n'en garde que 4, le nombre par défaut.
  assert.deepEqual(propositions.map((p) => p.auProgramme), [true, false, false, true]);

  // Choisir une Proposition démarre une Leçon libre sur son sujet, sans la consigne de cadrage du sujet libre.
  assert.equal((await appel('/api/eleves/prop-test/lecons', 'POST', { proposition: 'Un sujet inventé' })).status, 400);
  const lecon = await appel('/api/eleves/prop-test/lecons', 'POST', { proposition: propositions[1].titre });
  assert.equal(lecon.status, 201);
  assert.equal(lecon.data.mode, 'libre');
  assert.equal(lecon.data.sujet, 'Les pyramides');
  assert.equal(lecon.data.messages[0].texte, 'Les pyramides');
  assert.doesNotMatch(await fs.readFile(path.join(dossier, `args-${lecon.data.id}`), 'utf8'), /choquant/);
});

test('Nombre de Propositions : réglé à la création et dans le profil, 400 hors de 2 à 10 ou non entier', async () => {
  for (const invalide of [1, 11, 3.5, 'beaucoup']) {
    const cree = await appel('/api/eleves', 'POST', { pseudo: 'Nb-Invalide', age: 9, niveau: 'Primaire 4', nombrePropositions: invalide });
    assert.equal(cree.status, 400);
    assert.match(cree.data.erreur, /Nombre de Propositions : un nombre entier de 2 à 10/);
  }
  const cree = await appel('/api/eleves', 'POST', { pseudo: 'Nb-Test', age: 9, niveau: 'Primaire 4', nombrePropositions: 7 });
  assert.equal(cree.status, 201);
  assert.equal(cree.data.nombrePropositions, 7);
  for (const invalide of [1, 11, 3.5, 'beaucoup']) {
    assert.equal((await appel('/api/eleves/nb-test', 'PUT', { nombrePropositions: invalide })).status, 400);
  }
  assert.equal((await appel('/api/eleves/nb-test', 'PUT', { age: 9, niveau: 'Primaire 4', nombrePropositions: '3' })).data.nombrePropositions, 3);
  assert.equal((await appel('/api/eleves/nb-test')).data.nombrePropositions, 3);
});

test('Nombre de Propositions : un Élève existant sans ce champ en a 4', async () => {
  await fs.mkdir(path.join(eleves, 'ancien', 'lecons'), { recursive: true });
  await fs.writeFile(path.join(eleves, 'ancien', 'profil.json'), JSON.stringify({ pseudo: 'Ancien', slug: 'ancien', age: 10, niveau: 'Primaire 5' }));
  assert.equal((await appel('/api/eleves/ancien')).data.nombrePropositions, 4);
  assert.equal((await appel('/api/eleves/ancien/propositions', 'POST')).status, 202);
  assert.equal((await attendrePropositions('ancien')).propositions.length, 4);
});

test('Propositions : l\'agent est prié d\'en écrire le nombre réglé, dont 2 au programme ; l\'API n\'en garde pas plus', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Prop-Trois', age: 9, niveau: 'Primaire 4', nombrePropositions: 3 })).status, 201);
  const { propositions } = await attendrePropositions('prop-trois');
  assert.deepEqual(propositions.map((p) => p.titre), ['Les dinosaures', 'Les pyramides', 'Les fractions en cuisine']);
  const args = await fs.readFile(path.join(dossier, 'args-propositions'), 'utf8');
  assert.match(args, /Prépare 3 Propositions/);
  assert.match(args, /3 sujets originaux/);
  assert.match(args, /Exactement 2 d'entre eux sont au programme scolaire officiel de Primaire 4/);

  // Baisser le réglage ne relance pas de génération : on montre seulement les premières.
  await fs.rm(path.join(dossier, 'lancements-propositions'), { force: true });
  assert.equal((await appel('/api/eleves/prop-trois', 'PUT', { nombrePropositions: 2 })).status, 200);
  assert.deepEqual((await appel('/api/eleves/prop-trois/propositions')).data, { etat: 'prêtes', propositions: propositions.slice(0, 2) });
  await assert.rejects(fs.access(path.join(dossier, 'lancements-propositions')), { code: 'ENOENT' });
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
  const fichier = path.join(eleves, 'prop-garde', 'propositions', 'propositions.json');

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

const historique = (slug) => fs.readFile(path.join(eleves, slug, 'historique-propositions.json'), 'utf8').then(JSON.parse);
const argsPropositions = () => fs.readFile(path.join(dossier, 'args-propositions'), 'utf8');

test('Historique des Propositions : « D\'autres idées » transmet les titres des lots précédents à l\'agent, puis y ajoute le nouveau lot', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Hist-Test', age: 10, niveau: 'Primaire 5' })).status, 201);
  await attendrePropositions('hist-test');
  assert.doesNotMatch(await argsPropositions(), /déjà proposés/);
  const premierLot = ['Les dinosaures', 'Les pyramides', 'Les fractions en cuisine', 'Les planètes'];
  assert.deepEqual(await historique('hist-test'), premierLot); // lot automatique, vu par l'Élève

  await avecFichier('autres', async () => {
    assert.equal((await appel('/api/eleves/hist-test/propositions', 'POST')).status, 202);
    await attendrePropositions('hist-test');
  });
  const consignes = await argsPropositions();
  assert.match(consignes, /déjà proposés/);
  assert.match(consignes, new RegExp(premierLot.map((t) => `- ${t}`).join('\n')));
  assert.deepEqual(await historique('hist-test'), [...premierLot, 'Les abeilles']);
});

test('Historique des Propositions : au plus les 10 titres les plus récents', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Hist-Dix', age: 10, niveau: 'Primaire 5' })).status, 201);
  await attendrePropositions('hist-dix');
  const vieux = Array.from({ length: 10 }, (_, i) => `Vieux sujet ${i + 1}`);
  await fs.writeFile(path.join(eleves, 'hist-dix', 'historique-propositions.json'), JSON.stringify(vieux));

  await avecFichier('autres', async () => {
    assert.equal((await appel('/api/eleves/hist-dix/propositions', 'POST')).status, 202);
    await attendrePropositions('hist-dix');
  });
  assert.match(await argsPropositions(), new RegExp(vieux.map((t) => `- ${t}`).join('\n')));
  assert.deepEqual(await historique('hist-dix'), [...vieux.slice(1), 'Les abeilles']);

  assert.equal((await appel('/api/eleves/hist-dix/propositions', 'POST')).status, 202);
  await attendrePropositions('hist-dix');
  const consignes = await argsPropositions();
  assert.doesNotMatch(consignes, /- Vieux sujet 1\n/);
  assert.match(consignes, /- Vieux sujet 2\n[^]*- Vieux sujet 10\n- Les abeilles\n/);
  assert.deepEqual(await historique('hist-dix'), [...vieux.slice(5), 'Les abeilles', 'Les dinosaures', 'Les pyramides', 'Les fractions en cuisine', 'Les planètes']);
});

test('Historique des Propositions : la génération automatique après un tour de séance ne le transmet pas', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Hist-Auto', age: 10, niveau: 'Primaire 5' })).status, 201);
  await attendrePropositions('hist-auto');
  const lancements = path.join(dossier, 'lancements-propositions');
  await fs.rm(lancements, { force: true });
  assert.equal((await appel('/api/eleves/hist-auto/lecons', 'POST', { sujet: 'les volcans' })).status, 201);
  await sonderJusqua(() => existe(lancements), Boolean, 'Pas de régénération après le tour');
  await attendrePropositions('hist-auto');
  const consignes = await argsPropositions();
  assert.match(consignes, /Les volcans \(Sciences\)/);
  assert.doesNotMatch(consignes, /déjà proposés/);
  assert.equal((await historique('hist-auto')).length, 4); // le second lot automatique, identique, n'est pas nouveau
});

test('Historique des Propositions : une génération ratée ne le modifie pas', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Hist-Echec', age: 10, niveau: 'Primaire 5' })).status, 201);
  const anciennes = (await attendrePropositions('hist-echec')).propositions;
  const avant = await historique('hist-echec');
  await avecFichier('echouer', async () => {
    assert.equal((await appel('/api/eleves/hist-echec/propositions', 'POST')).status, 202);
    assert.deepEqual(await attendrePropositions('hist-echec'), { etat: 'prêtes', propositions: anciennes });
  });
  assert.deepEqual(await historique('hist-echec'), avant);
});

test('Historique des Propositions : seul un lot nouveau y entre, même si l\'agent échoue après l\'avoir écrit', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Hist-Lot', age: 10, niveau: 'Primaire 5' })).status, 201);
  const anciennes = (await attendrePropositions('hist-lot')).propositions;
  const avant = await historique('hist-lot');
  await avecFichier('inchange', async () => {
    assert.equal((await appel('/api/eleves/hist-lot/propositions', 'POST')).status, 202);
    assert.deepEqual(await attendrePropositions('hist-lot'), { etat: 'prêtes', propositions: anciennes });
  });
  assert.deepEqual(await historique('hist-lot'), avant);

  await avecFichier('ecrire-puis-echouer', async () => {
    assert.equal((await appel('/api/eleves/hist-lot/propositions', 'POST')).status, 202);
    assert.equal((await attendrePropositions('hist-lot')).propositions[0].titre, 'Les abeilles');
  });
  assert.deepEqual(await historique('hist-lot'), [...avant, 'Les abeilles']);
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
