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
  // (ni page ni lesson.json, des sujets voisins en CHOIX) ; le fichier `ensuite` lui fait écrire dans lesson.json
  // le titre de la prochaine page qu'il prévoit (`ensuite`) ; le fichier `objectifs` lui fait écrire trois Objectifs dans lesson.json.
  // Comme le vrai `claude -p`, il renvoie un coût et un usage (0,25 $ par tour de Leçon, 0,0625 $ par tour de
  // Propositions) ; le fichier `sans-cout` le fait répondre sans ces champs.
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
USAGE='"duration_ms":1000,"usage":{"input_tokens":10,"output_tokens":100,"cache_read_input_tokens":1000,"cache_creation_input_tokens":200}'
if [ "$(basename "$PWD")" = propositions ]; then
  COUT=',"total_cost_usd":0.0625,'"$USAGE"',"modelUsage":{"claude-haiku-test":{"costUSD":0.0625}}'
else
  COUT=',"total_cost_usd":0.25,'"$USAGE"',"modelUsage":{"claude-sonnet-test":{"costUSD":0.25}}'
fi
[ -e '${dossier}/sans-cout' ] && COUT=''
if [ "$(basename "$PWD")" = propositions ]; then
  echo lancement >> '${dossier}/lancements-propositions'
  printf '%s\n' "$@" > '${dossier}/args-propositions'
  while [ -e '${dossier}/attendre' ]; do sleep 0.05; done
  if [ -e '${dossier}/inchange' ]; then
    echo '{"result":"ok","session_id":"s-prop","is_error":false'"$COUT"'}'
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
    echo '{"result":"ok","session_id":"s-prop","is_error":false'"$COUT"'}'
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
  echo '{"result":"ok","session_id":"s-prop","is_error":false'"$COUT"'}'
  exit 0
fi
touch '${dossier}'/demarre-"$(basename "$PWD")"
while [ -e '${dossier}/lent' ]; do sleep 0.05; done
printf '%s\\n' "$@" > '${dossier}'/args-"$(basename "$PWD")"
if [ -e '${dossier}/refuser' ]; then
  printf '%s\\n' '{"result":"Parlons plutôt d’autre chose.\\nCHOIX: Les volcans | Les dinosaures | Les planètes","session_id":"s-123","is_error":false'"$COUT"'}'
  exit 0
fi
mkdir -p lessons
if [ -e '${dossier}/objectifs' ]; then
  echo '{"titre":"Les volcans","categorie":"Sciences","objectifs":["Nommer les parties d’un volcan","Expliquer une éruption","Situer trois volcans"]}' > lesson.json
else
  echo '{"titre":"Les volcans","categorie":"Sciences"}' > lesson.json
fi
[ -e '${dossier}/ensuite' ] && echo '{"titre":"Les volcans","categorie":"Sciences","ensuite":"Les volcans endormis"}' > lesson.json
echo '<h1>Volcans</h1>' > lessons/0001-volcans.html
if [ -e '${dossier}/choix' ]; then
  printf '%s\\n' '{"result":"Pourquoi ?\\nCHOIX: Un exposé | Un devoir","session_id":"s-123","is_error":false'"$COUT"'}'
  exit 0
fi
echo '{"result":"Bonjour !","session_id":"s-123","is_error":false'"$COUT"'}'
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
  // Retour de quiz instantané : composé par l'appli, sans lancer le prof.
  const demarre = path.join(dossier, `demarre-${lecon.id}`);
  await fs.rm(demarre);
  const retour = await appel(retours, 'POST', { score: 70, page: '0001-volcans.html' });
  assert.equal(retour.status, 200);
  await assert.rejects(fs.access(demarre), { code: 'ENOENT' });
  const [eleve, prof] = retour.data.messages.slice(-2);
  assert.equal(eleve.texte, '📝 Quiz terminé : 70 %');
  assert.equal(prof.role, 'agent');
  assert.equal(prof.texte, 'Bien joué : 70 %. Tu es sur la bonne voie ! 💪\nLa prochaine page commencera par ce que tu as raté.');
  assert.deepEqual(prof.retourQuiz, { score: 70, action: 'suivante' }); // Leçon libre : toujours Étape suivante
  assert.equal(retour.data.scores.length, 0); // le score s'enregistre par /scores
  assert.equal(retour.data.cout.tours, 1); // aucun tour du prof compté pour le Retour
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

  // Leçon libre : même après un quiz raté, Étape suivante ; Revoir est refusé.
  const rate = await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/retours`, 'POST', { score: 40 });
  assert.equal(rate.data.messages.at(-1).retourQuiz.action, 'suivante');
  assert.equal((await appel(rebonds, 'POST', { action: 'revoir' })).status, 400);
  assert.equal((await appel(rebonds, 'POST', { action: 'suivante' })).status, 200);
  assert.match(await fs.readFile(args, 'utf8'), /Rebond : Étape suivante/);
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
  assert.deepEqual(termine.rebondsProposes, ['reviser']);
  assert.deepEqual((await appel(url)).data.rebondsProposes, ['reviser']);
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

test('Continuer : en Leçon libre, le prof écrit la suite prévue dans lesson.json en créant la page ; la Leçon et la liste l\'exposent', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les laves' })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const args = path.join(dossier, `args-${lecon.id}`);
  assert.equal(lecon.ensuite, null);
  assert.match(await fs.readFile(args, 'utf8'), /"ensuite": "<titre court/);

  const page = await avecFichier('ensuite', () => message(lecon, 'ok'));
  assert.equal(page.data.ensuite, 'Les volcans endormis');
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).ensuite, 'Les volcans endormis');

  // Le Retour de quiz, instantané, garde le titre annoncé ; l'Étape suivante le rappelle au prof.
  const retour = (await appel(`${url}/retours`, 'POST', { score: 40 })).data;
  assert.equal(retour.ensuite, 'Les volcans endormis');
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'suivante' })).status, 200);
  assert.match(await fs.readFile(args, 'utf8'), /annoncé cette page : « Les volcans endormis »/);
  // La nouvelle page n'annonce rien : plus de titre annoncé.
  assert.equal((await appel(url)).data.ensuite, null);
});

test('Continuer : une ancienne Leçon libre garde le titre annoncé par son dernier Retour de quiz, tant que lesson.json n\'en a pas', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les geysers' })).data;
  const dir = path.join(eleves, 'zoe-test', 'lecons', lecon.id);
  const etat = JSON.parse(await fs.readFile(path.join(dir, 'etat.json'), 'utf8'));
  etat.messages.push(
    { role: 'eleve', texte: '📝 Quiz terminé : 70 %' },
    { role: 'agent', texte: 'Bravo !', retourQuiz: { score: 70, action: 'suivante', ensuite: 'Les geysers d\'Islande' } },
  );
  await fs.writeFile(path.join(dir, 'etat.json'), JSON.stringify(etat));
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  assert.equal((await appel(url)).data.ensuite, 'Les geysers d\'Islande');
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).ensuite, 'Les geysers d\'Islande');

  // Dès que le prof l'écrit dans lesson.json, c'est ce titre-là qui compte.
  await fs.writeFile(path.join(dir, 'lesson.json'), JSON.stringify({ titre: 'Les geysers', ensuite: 'Les sources chaudes' }));
  assert.equal((await appel(url)).data.ensuite, 'Les sources chaudes');
});

test('Continuer : une Leçon de révision n\'annonce pas de suite', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = await avecFichier('ensuite', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data);
  assert.equal(lecon.ensuite, null);
  await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/retours`, 'POST', { score: 85 });
  assert.equal((await appel(`/api/eleves/zoe-test/lecons/${lecon.id}`)).data.ensuite, null);
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
  assert.deepEqual(reussi.messages.at(-1).retourQuiz, { score: 90, action: 'terminee', nouvellesEtoiles: ['defi'] });
  assert.match(reussi.messages.at(-1).texte, /ta Leçon est terminée/);
  const terminee = reussi.terminee;
  assert.ok(!Number.isNaN(Date.parse(terminee)));
  assert.equal((await resume()).terminee, terminee);
  assert.equal((await appel(url)).data.terminee, terminee);
  // La Maîtrise ne dépend pas de l'état terminé.
  assert.equal(reussi.maitrise, null);

  // Sur une Leçon terminée, seul Réviser est proposé : plus de « Nouveau défi ».
  assert.deepEqual(reussi.rebondsProposes, ['reviser']);
  assert.equal((await rebond('terminee')).status, 400);
  assert.equal((await rebond('defi')).status, 400);
  const reviser = await rebond('reviser');
  assert.equal(reviser.status, 200);
  assert.equal(reviser.data.messages.at(-2).texte, '📚 Je veux réviser.');
  const args = await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.match(args, /Rebond : Réviser/);
  assert.match(args, /page de révision fidèle au Document source/);
  assert.doesNotMatch(args, /Je veux réviser/);
  assert.equal((await rebond('reviser')).status, 400); // une seule fois par Retour de quiz
  assert.equal(reviser.data.terminee, terminee);

  // Le cycle d'une révision reprend : quiz raté → Revoir, la Leçon reste terminée.
  const rateApres = await retour(30);
  assert.equal(rateApres.messages.at(-1).retourQuiz.action, 'revoir');
  assert.equal(rateApres.terminee, terminee);
  assert.equal((await rebond('defi')).status, 400);
  assert.equal((await rebond('revoir')).status, 200);
  // Quiz réussi → Défi ; Défi raté → Revoir, toujours terminée (même date).
  assert.equal((await retour(85)).messages.at(-1).retourQuiz.action, 'defi');
  assert.equal((await rebond('defi')).status, 200);
  const defiRate = await retour(40);
  assert.equal(defiRate.messages.at(-1).retourQuiz.action, 'revoir');
  assert.equal(defiRate.terminee, terminee);
  assert.equal((await rebond('revoir')).status, 200);
  assert.equal((await retour(90)).messages.at(-1).retourQuiz.action, 'defi');
  assert.equal((await rebond('defi')).status, 200);
  // Nouveau Défi réussi : Leçon terminée, date de fin inchangée, et Réviser de nouveau proposé.
  const reussiApres = await retour(100);
  assert.equal(reussiApres.messages.at(-1).retourQuiz.action, 'terminee');
  assert.equal(reussiApres.terminee, terminee);
  assert.deepEqual(reussiApres.rebondsProposes, ['reviser']);
});

test('Leçon libre laissée plus d\'une semaine : Réviser à côté d\'Étape suivante, révision sans rien rapporter, puis Étape suivante', () =>
  avecFichier('objectifs', async () => {
    const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les sources chaudes' })).data;
    const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
    const page = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'lessons', '0001-volcans.html');
    const rebond = (action) => appel(`${url}/rebonds`, 'POST', { action });
    const quiz = async (score, objectifs, bonus) => {
      await appel(`${url}/scores`, 'POST', { score, page: '0001-volcans.html', objectifs, bonus });
      return (await appel(`${url}/retours`, 'POST', { score, page: '0001-volcans.html' })).data;
    };

    // Dernière page récente : seulement Étape suivante.
    assert.deepEqual((await quiz(85, [1])).rebondsProposes, ['suivante']);
    assert.equal((await rebond('reviser')).status, 400);
    // La page la plus récente vieillit de 8 jours : Réviser s'ajoute.
    const ilYa8Jours = new Date(Date.now() - 8 * 86_400_000);
    await fs.utimes(page, ilYa8Jours, ilYa8Jours);
    assert.deepEqual((await appel(url)).data.rebondsProposes, ['suivante', 'reviser']);

    const reviser = await rebond('reviser');
    assert.equal(reviser.status, 200);
    assert.equal(reviser.data.reviserEnCours, true);
    assert.equal(reviser.data.messages.at(-2).texte, '📚 Je veux réviser.');
    const args = await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
    assert.match(args, /Rebond : Réviser/);
    assert.match(args, /page de révision des pages déjà vues/);

    // Règles d'une révision : raté → Revoir, réussi → Défi, Défi réussi → Étape suivante et fin de la phase.
    assert.deepEqual((await quiz(50, [2])).rebondsProposes, ['revoir']);
    assert.equal((await rebond('revoir')).status, 200);
    assert.deepEqual((await quiz(90, [2])).rebondsProposes, ['defi']);
    assert.equal((await rebond('defi')).status, 200);
    const fin = await quiz(95, [2, 3], { reussies: 3, total: 3 });
    assert.deepEqual(fin.messages.at(-1).retourQuiz, { score: 95, action: 'suivante' });
    assert.deepEqual(fin.rebondsProposes, ['suivante']);
    assert.equal(fin.reviserEnCours, false);
    assert.equal(fin.terminee, null);

    // Scores de la révision marqués : ils comptent dans la Maîtrise, n'atteignent aucun Objectif, Niveau inchangé.
    assert.deepEqual(fin.scores.map((s) => s.reviser), [undefined, true, true, true]);
    assert.deepEqual(fin.objectifs.map((o) => o.atteint), [true, false, false]);
    assert.equal(fin.niveauLecon, 2);
    // Dépassement réussi en Révisant : pas de 🚀, la révision ne rapporte rien.
    assert.equal(fin.depassement, false);
    assert.equal(fin.maitrise.pourcentage, 78); // (50 + 90 + 95) / 3
  }));

test('Réviser en cours : les scores faits en Révisant sont marqués, jusqu\'au Défi réussi', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const rebond = (action) => appel(`${url}/rebonds`, 'POST', { action });
  const quiz = async (score) => {
    await appel(`${url}/scores`, 'POST', { score, page: 'p.html' });
    return (await appel(`${url}/retours`, 'POST', { score, page: 'p.html' })).data;
  };
  assert.equal(lecon.reviserEnCours, false);
  await quiz(90);
  await rebond('defi');
  await quiz(90); // Leçon terminée
  assert.equal((await rebond('reviser')).data.reviserEnCours, true);
  await quiz(50);
  await rebond('revoir');
  await quiz(85);
  await rebond('defi');
  const fin = await quiz(95);
  assert.equal(fin.reviserEnCours, false);
  assert.deepEqual(fin.scores.map((s) => s.reviser), [undefined, undefined, true, true, true]);
  // Après le Défi réussi, plus en Révisant : un score n'est plus marqué.
  await appel(`${url}/scores`, 'POST', { score: 70, page: 'p.html' });
  assert.equal((await appel(url)).data.scores.at(-1).reviser, undefined);
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
  // Comme le Retour de quiz : un score absent ou vide est refusé (pas compté comme 0 %).
  for (const score of [null, '', undefined]) {
    assert.equal((await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/scores`, 'POST', { score })).status, 400);
  }
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

test('Niveau de Leçon : niveau 1 au départ, monte quand un quiz réussi couvre un nouvel Objectif', async () => {
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const resume = async () => (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);
  const score = async (s, objectifs) => {
    const res = await appel(`${url}/scores`, 'POST', { score: s, page: '0001-volcans.html', objectifs });
    assert.equal(res.status, 201);
    return res.data;
  };
  assert.equal(lecon.niveauLecon, 1);
  assert.deepEqual(lecon.objectifs, [
    { texte: 'Nommer les parties d’un volcan', atteint: false },
    { texte: 'Expliquer une éruption', atteint: false },
    { texte: 'Situer trois volcans', atteint: false },
  ]);
  assert.equal((await resume()).niveauLecon, 1);

  // Quiz raté : rien ne change.
  assert.equal((await score(60, [1])).niveauLecon, 1);
  // Quiz réussi couvrant l'Objectif 1 : Niveau 2 ; numéros inexistants ou mal formés ignorés sans erreur.
  const reussi = await score(85, [1, 9, 0, '2', 1.5]);
  assert.equal(reussi.niveauLecon, 2);
  assert.deepEqual(reussi.objectifs.map((o) => o.atteint), [true, false, false]);
  assert.deepEqual(reussi.scores.at(-1).objectifs, [1]);
  // Objectif déjà atteint, puis quiz raté : le Niveau ne bouge pas, l'Objectif reste atteint.
  assert.equal((await score(100, [1])).niveauLecon, 2);
  assert.equal((await score(20, [1, 2])).niveauLecon, 2);
  assert.equal((await resume()).niveauLecon, 2);
  assert.deepEqual((await resume()).objectifs.map((o) => o.atteint), [true, false, false]);
  // Objectifs absents ou mal formés : le score s'enregistre quand même.
  assert.equal((await appel(`${url}/scores`, 'POST', { score: 90, objectifs: 'tous' })).status, 201);

  // Le Retour de quiz accepte aussi les numéros.
  assert.equal((await appel(`${url}/retours`, 'POST', { score: 90, page: '0001-volcans.html', objectifs: [2] })).status, 200);
});

test('Niveau de Leçon : pas de Niveau sans Objectifs, ni pour une Leçon de révision', async () => {
  const libre = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les geysers' })).data;
  assert.equal(libre.niveauLecon, null);
  assert.deepEqual(libre.objectifs, []);
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const revision = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data);
  assert.equal(revision.niveauLecon, null);
  assert.equal(revision.objectifs.length, 3);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === revision.id).niveauLecon, null);
});

test('Objectifs : consignes demandées au prof, et à la reprise d\'une Leçon sans Objectifs, demande de les ajouter', async () => {
  const sans = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les laves' })).data;
  const args = async (lecon) => fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.match(await args(sans), /"objectifs"/);
  assert.match(await args(sans), /"objectifs": \[/);
  await message(sans, 'ok');
  assert.match(await args(sans), /n'a pas encore d'Objectifs/);

  const avec = await avecFichier('objectifs', async () => {
    const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les cratères' })).data;
    await message(lecon, 'ok');
    return lecon;
  });
  assert.doesNotMatch(await args(avec), /n'a pas encore d'Objectifs/);
});

test('Élargir la mission : quand tous les Objectifs sont atteints, l\'Étape suivante propose d\'élargir avant toute page', async () => {
  const args = async (lecon) => fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  await avecFichier('objectifs', async () => {
    const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' })).data;
    const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
    // Des Objectifs restent à atteindre : consigne d'Étape suivante inchangée.
    await appel(`${url}/scores`, 'POST', { score: 90, page: '0001-volcans.html', objectifs: [1, 2] });
    await appel(`${url}/retours`, 'POST', { score: 90, page: '0001-volcans.html' });
    assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'suivante' })).status, 200);
    assert.match(await args(lecon), /Rebond : Étape suivante/);
    assert.doesNotMatch(await args(lecon), /élargir/);
    assert.match(await args(lecon), /Crée une page nouvelle/);

    // Tous atteints : proposer d'élargir la mission avant toute page, par une question avec CHOIX.
    await appel(`${url}/scores`, 'POST', { score: 90, page: '0001-volcans.html', objectifs: [3] });
    await appel(`${url}/retours`, 'POST', { score: 90, page: '0001-volcans.html' });
    assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'suivante' })).status, 200);
    const consigne = await args(lecon);
    assert.match(consigne, /tous ses Objectifs/);
    assert.match(consigne, /élargir sa mission/);
    assert.match(consigne, /ligne CHOIX/);
    assert.match(consigne, /MISSION\.md/);
    assert.match(consigne, /learning record/);
    assert.match(consigne, /à la fin de la liste/);
    assert.match(consigne, /nouveau sujet/);
    assert.doesNotMatch(consigne, /Crée une page nouvelle/);
    assert.doesNotMatch(consigne, /n'ajoute pas de ligne CHOIX/);
  });
});

test('Élargir la mission : après l\'ajout d\'Objectifs, le Niveau reste le même puis remonte', async () => {
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const score = async (objectifs) => (await appel(`${url}/scores`, 'POST', { score: 90, page: '0001-volcans.html', objectifs })).data;
  assert.equal((await score([1, 2, 3])).niveauLecon, 4);
  // Le prof ajoute deux Objectifs à la fin de la liste.
  const meta = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'lesson.json');
  const contenu = JSON.parse(await fs.readFile(meta, 'utf8'));
  contenu.objectifs.push('Comparer deux types d’éruption', 'Expliquer les risques volcaniques');
  await fs.writeFile(meta, JSON.stringify(contenu));
  const lue = (await appel(url)).data;
  assert.equal(lue.niveauLecon, 4);
  assert.deepEqual(lue.objectifs.map((o) => o.atteint), [true, true, true, false, false]);
  assert.equal((await score([5])).niveauLecon, 5);
});

test('Dépassement : le résultat bonus est gardé avec le score, un résultat invalide est ignoré, la Maîtrise n\'en dépend pas', async () => {
  const { data: lecon } = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les marées' });
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const score = (corps) => appel(`${url}/scores`, 'POST', { page: '0001-volcans.html', ...corps });
  const resume = async () => (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);
  assert.equal((await appel(url)).data.depassement, false);

  // Invalides : ignorés sans erreur, le score principal s'enregistre quand même.
  for (const bonus of [{ reussies: 2, total: 4 }, { reussies: 3, total: 2 }, { reussies: -1, total: 3 }, { reussies: 1.5, total: 3 }, { total: 3 }, 'beaucoup']) {
    const r = await score({ score: 60, bonus });
    assert.equal(r.status, 201);
    assert.equal(r.data.scores.at(-1).bonus, undefined);
  }
  const sansBonus = (await appel(url)).data;
  assert.equal(sansBonus.depassement, false);

  // 1 bonus sur 3 : gardé, pas de Dépassement réussi.
  const un = await score({ score: 60, bonus: { reussies: 1, total: 3 } });
  assert.deepEqual(un.data.scores.at(-1).bonus, { reussies: 1, total: 3 });
  assert.equal(un.data.depassement, false);

  // 2 bonus sur 3 : Dépassement réussi, sans effet sur le score ni la Maîtrise.
  const deux = await score({ score: 60, bonus: { reussies: 2, total: 3 } });
  assert.equal(deux.data.scores.at(-1).score, 60);
  assert.deepEqual(deux.data.maitrise, sansBonus.maitrise);
  assert.equal(deux.data.depassement, true);
  assert.equal((await resume()).depassement, true);
  // Acquis pour toujours : un quiz suivant sans bonus ne le retire pas.
  await score({ score: 60 });
  assert.equal((await resume()).depassement, true);
});

test('Kit : servi sous son chemin versionné (quiz, logique, style de base, documentation)', async () => {
  for (const [fichier, type] of [['quiz.js', 'text/javascript'], ['quiz-logique.js', 'text/javascript'], ['base.css', 'text/css'], ['LISEZMOI.md', 'text/markdown']]) {
    const res = await fetch(`${base}/kit/v1/${fichier}`);
    assert.equal(res.status, 200, fichier);
    assert.match(res.headers.get('content-type'), new RegExp(type));
  }
  assert.equal((await fetch(`${base}/kit/v9/quiz.js`)).status, 404);

  // Le prof peut lire la documentation du Kit, hors du dossier de la Leçon.
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les geysers' })).data;
  const args = await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.ok(args.includes(`--add-dir\n${path.join(import.meta.dirname, '..', 'public', 'kit')}\n`));
});

test('Résultats par question : enregistrés avec le score, questions mal formées ignorées, score recalculé hors bonus', async () => {
  const { data: lecon } = await avecFichier('objectifs', () => appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'le magma' }));
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const q = (id, juste, autres = {}) => ({ id, enonce: `Question ${id} ?`, choisie: juste ? 'oui' : 'non', bonne: 'oui', juste, bonus: false, objectifs: [1], ...autres });
  const r = await appel(`${url}/scores`, 'POST', {
    score: 100, // annoncé par la page, démenti par ses questions
    page: '0002-magma.html',
    objectifs: [1, 2],
    questions: [
      q('q1', true),
      q('q2', false, { objectifs: [2, 9, 'x'] }),
      q('q3', true, { bonus: true }),
      { id: 'q4', enonce: 'Sans juste', choisie: 'a', bonne: 'b' },
      { enonce: 'Sans id', choisie: 'a', bonne: 'a', juste: true },
      'pas une question',
    ],
  });
  assert.equal(r.status, 201);
  const entree = r.data.scores.at(-1);
  assert.equal(entree.score, 50);
  assert.deepEqual(entree.bonus, { reussies: 1, total: 1 });
  assert.deepEqual(entree.questions, [
    { id: 'q1', enonce: 'Question q1 ?', choisie: 'oui', bonne: 'oui', juste: true, bonus: false, objectifs: [1] },
    { id: 'q2', enonce: 'Question q2 ?', choisie: 'non', bonne: 'oui', juste: false, bonus: false, objectifs: [2] },
    { id: 'q3', enonce: 'Question q3 ?', choisie: 'oui', bonne: 'oui', juste: true, bonus: true, objectifs: [1] },
  ]);

  // Le Retour de quiz s'appuie sur le même score que celui enregistré.
  const retour = await appel(`${url}/retours`, 'POST', { score: 100, page: '0002-magma.html', questions: [q('q1', true), q('q2', false)] });
  assert.equal(retour.data.messages.at(-1).retourQuiz.score, 50);

  // Questions toutes mal formées, ou absentes : le score de la page fait foi, sans résultats par question.
  const sans = await appel(`${url}/scores`, 'POST', { score: 70, questions: [{ id: 'x' }] });
  assert.equal(sans.status, 201);
  assert.equal(sans.data.scores.at(-1).score, 70);
  assert.equal(sans.data.scores.at(-1).questions, undefined);
});

test('Résultats par question : la consigne du Rebond suivant porte les questions ratées et les réponses choisies, une seule fois', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const args = path.join(dossier, `args-${lecon.id}`);
  const corps = {
    score: 50, page: '0001-volcans.html',
    questions: [
      { id: 'q1', enonce: 'Qu’est-ce que le magma ?', choisie: 'De la lave refroidie', bonne: 'De la roche fondue', juste: false, bonus: false },
      { id: 'q2', enonce: 'Où sort la lave ?', choisie: 'Par le cratère', bonne: 'Par le cratère', juste: true, bonus: false },
    ],
  };
  await appel(`${url}/scores`, 'POST', corps);
  const retour = (await appel(`${url}/retours`, 'POST', corps)).data;
  assert.deepEqual(retour.rebondsProposes, ['revoir']);
  assert.match(retour.messages.at(-1).texte, /: 1 réponse sur 2\./);

  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'revoir' })).status, 200);
  const consigne = await fs.readFile(args, 'utf8');
  assert.match(consigne, /Rebond : Revoir/);
  assert.match(consigne, /« Qu’est-ce que le magma \? » : il a choisi « De la lave refroidie », la bonne réponse était « De la roche fondue »/);
  assert.match(consigne, /reprends nommément chacune des questions ratées/);
  assert.match(consigne, /court encart sur ce qu'il a raté/);
  assert.equal(consigne.split('Résultats du dernier quiz').length, 2); // pas répétés par le préambule de relais
  assert.equal(consigne.split('court encart').length, 2);

  // Un tour de page ordinaire après ce quiz porte aussi les résultats et l'encart, par le préambule de relais.
  assert.equal((await message(lecon, 'ok')).status, 200);
  const page = await fs.readFile(args, 'utf8');
  assert.equal(page.split('Résultats du dernier quiz').length, 2);
  assert.match(page, /il a choisi « De la lave refroidie »/);
  assert.equal(page.split('court encart sur ce qu\'il a raté').length, 2);
});

test('Confiance : gardée dans les résultats par question, sans effet sur le score ; les erreurs commises « sûr » sont listées à part dans la consigne du Rebond', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const args = path.join(dossier, `args-${lecon.id}`);
  const q = (id, juste, sur) => ({ id, enonce: `Question ${id} ?`, choisie: juste ? 'oui' : 'non', bonne: 'oui', juste, bonus: false, ...(sur !== undefined && { sur }) });
  const corps = { score: 0, page: '0001-volcans.html', questions: [q('q1', false, true), q('q2', false, false), q('q3', true, true), q('q4', false, 'oui'), q('q5', true)] };
  const r = await appel(`${url}/scores`, 'POST', corps);
  assert.equal(r.status, 201);
  const entree = r.data.scores.at(-1);
  assert.equal(entree.score, 40);
  assert.deepEqual(entree.questions.map((x) => x.sur), [true, false, true, undefined, undefined]);
  assert.equal(Object.hasOwn(entree.questions[3], 'sur'), false, 'une Confiance invalide est ignorée');

  assert.deepEqual((await appel(`${url}/retours`, 'POST', corps)).data.rebondsProposes, ['revoir']);
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'revoir' })).status, 200);
  const consigne = await fs.readFile(args, 'utf8');
  const [, sures] = consigne.split('Erreurs commises en étant « sûr »');
  assert.ok(sures, 'la consigne porte une liste des erreurs commises « sûr »');
  assert.match(sures, /^[^]*?- « Question q1 \? »/);
  assert.doesNotMatch(sures.split('\n\n')[0], /Question q2|Question q3|Question q4/);
  assert.match(consigne, /retravaille-les d'abord/);
});

test('Confiance : un quiz sans Confiance (anciens scores) ne porte aucune liste d\'erreurs « sûr »', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const corps = { score: 50, page: 'p.html', questions: [{ id: 'q1', enonce: 'A ?', choisie: 'non', bonne: 'oui', juste: false, bonus: false }, { id: 'q2', enonce: 'B ?', choisie: 'oui', bonne: 'oui', juste: true, bonus: false }] };
  assert.equal((await appel(`${url}/scores`, 'POST', corps)).status, 201);
  await appel(`${url}/retours`, 'POST', corps);
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'revoir' })).status, 200);
  const consigne = await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.doesNotMatch(consigne, /« sûr »/);
  assert.match(consigne, /il a choisi « non »/);
});

test('Étoiles : exposées par la Leçon et la liste d\'une Leçon de révision, gagnées par les quiz et annoncées par le Retour de quiz', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const resume = async () => (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);
  // Comme l'écran : le score s'enregistre, puis le Retour de quiz.
  const quiz = async (corps) => {
    await appel(`${url}/scores`, 'POST', { page: '0001-volcans.html', ...corps });
    return (await appel(`${url}/retours`, 'POST', { page: '0001-volcans.html', ...corps })).data;
  };

  assert.deepEqual(lecon.etoiles, { quiz: false, bonus: false, defi: false });
  assert.deepEqual((await resume()).etoiles, { quiz: false, bonus: false, defi: false });

  // 2 bonus sur 3 sous 80 % : Étoile « bonus », pas « quiz ».
  const bonus = await quiz({ score: 60, bonus: { reussies: 2, total: 3 } });
  assert.deepEqual(bonus.etoiles, { quiz: false, bonus: true, defi: false });
  assert.deepEqual(bonus.messages.at(-1).retourQuiz.nouvellesEtoiles, ['bonus']);
  assert.match(bonus.messages.at(-1).texte, /Nouvelle Étoile : questions bonus réussies/);

  // Un quiz qui ne gagne rien n'annonce aucune Étoile.
  const rien = await quiz({ score: 50, bonus: { reussies: 2, total: 3 } });
  assert.equal(rien.messages.at(-1).retourQuiz.nouvellesEtoiles, undefined);
  assert.doesNotMatch(rien.messages.at(-1).texte, /Étoile/);

  // Quiz ordinaire réussi : Étoile « quiz ».
  const reussi = await quiz({ score: 85 });
  assert.deepEqual(reussi.etoiles, { quiz: true, bonus: true, defi: false });
  assert.deepEqual(reussi.messages.at(-1).retourQuiz.nouvellesEtoiles, ['quiz']);

  // Défi réussi : Étoile « defi », Leçon terminée.
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'defi' })).status, 200);
  const defi = await quiz({ score: 90 });
  assert.ok(defi.terminee);
  assert.deepEqual(defi.etoiles, { quiz: true, bonus: true, defi: true });
  assert.deepEqual(defi.messages.at(-1).retourQuiz.nouvellesEtoiles, ['defi']);
  assert.deepEqual((await resume()).etoiles, { quiz: true, bonus: true, defi: true });

  // Une Étoile ne se perd jamais, même si la Maîtrise baisse.
  for (const score of [10, 10, 10]) await appel(`${url}/scores`, 'POST', { score });
  const apres = (await appel(url)).data;
  assert.equal(apres.maitrise.palier, 'non acquis');
  assert.deepEqual(apres.etoiles, { quiz: true, bonus: true, defi: true });
});

test('Étoiles : le Retour de quiz n\'annonce que ce qu\'il fait gagner, avec ou sans score enregistré avant lui', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const score = (s) => appel(`${url}/scores`, 'POST', { score: s });
  const retour = async (s) => (await appel(`${url}/retours`, 'POST', { score: s })).data.messages.at(-1).retourQuiz.nouvellesEtoiles;

  // Retour sans score enregistré avant lui : aucune Étoile.
  assert.equal(await retour(90), undefined);
  // Score puis Retour : l'Étoile « quiz » est annoncée.
  await score(85);
  assert.deepEqual(await retour(85), ['quiz']);
  // Retour de même valeur qu'un score plus ancien, sans nouveau score : pas d'Étoile une seconde fois.
  assert.equal(await retour(85), undefined);
});

test('Étoiles : aucune pour une Leçon libre ; une ancienne Leçon de révision les tire de son historique', async () => {
  const libre = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'Les volcans' })).data;
  await appel(`/api/eleves/zoe-test/lecons/${libre.id}/scores`, 'POST', { score: 100, bonus: { reussies: 3, total: 3 } });
  const lue = (await appel(`/api/eleves/zoe-test/lecons/${libre.id}`)).data;
  assert.equal(lue.etoiles, null);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === libre.id).etoiles, null);

  // Leçon de révision d'avant cette version : scores sans contexte, date de fin posée.
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const ancienne = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const fichier = path.join(eleves, 'zoe-test', 'lecons', ancienne.id, 'etat.json');
  const etat = JSON.parse(await fs.readFile(fichier, 'utf8'));
  etat.scores = [{ score: 85, date: '2026-09-01T10:00:00.000Z' }];
  etat.terminee = '2026-09-02T10:00:00.000Z';
  await fs.writeFile(fichier, JSON.stringify(etat));
  assert.deepEqual((await appel(`/api/eleves/zoe-test/lecons/${ancienne.id}`)).data.etoiles, { quiz: true, bonus: false, defi: true });
});

test('Dépassement : le Retour de quiz accepte le résultat bonus, le Rebond et la fin de Leçon n\'en dépendent pas', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const retour = (corps) => appel(`${url}/retours`, 'POST', { page: '0001-volcans.html', ...corps });

  // Toutes les questions bonus réussies ne rattrapent pas un quiz raté.
  const rate = await retour({ score: 70, bonus: { reussies: 3, total: 3 } });
  assert.equal(rate.status, 200);
  assert.deepEqual(rate.data.messages.at(-1).retourQuiz, { score: 70, action: 'revoir', bonus: { reussies: 3, total: 3 } });
  assert.match(rate.data.messages.at(-1).texte, /Dépassement réussi : 3 questions bonus sur 3/);
  // Un résultat invalide est ignoré sans erreur.
  const invalide = await retour({ score: 90, bonus: { reussies: 5, total: 3 } });
  assert.equal(invalide.status, 200);
  assert.deepEqual(invalide.data.messages.at(-1).retourQuiz, { score: 90, action: 'defi' });
  assert.doesNotMatch(invalide.data.messages.at(-1).texte, /🚀/);
  // Aucune question bonus réussie n'empêche le Défi, ni sa réussite de terminer la Leçon.
  assert.equal((await retour({ score: 90, bonus: { reussies: 0, total: 2 } })).data.messages.at(-1).retourQuiz.action, 'defi');
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'defi' })).status, 200);
  const defi = await retour({ score: 85, bonus: { reussies: 0, total: 3 } });
  assert.equal(defi.data.messages.at(-1).retourQuiz.action, 'terminee');
  assert.ok(defi.data.terminee);
});

test('Dépassement : le prof reçoit la consigne de l\'encart et des questions bonus, fidèle au document en révision, aucun en Revoir', async () => {
  const libre = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les aurores' })).data;
  const argsLibre = await fs.readFile(path.join(dossier, `args-${libre.id}`), 'utf8');
  assert.match(argsLibre, /🚀 Pour aller plus loin/);
  assert.match(argsLibre, /2 ou 3 questions bonus/);
  assert.match(argsLibre, /"bonus": true/); // question bonus déclarée au Kit

  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const revision = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data;
  const argsRevision = path.join(dossier, `args-${revision.id}`);
  const demarrage = await fs.readFile(argsRevision, 'utf8');
  assert.doesNotMatch(demarrage, /n'ajoute pas de notions hors programme/);
  assert.match(demarrage, /fidèle au document/);
  assert.match(demarrage, /seul le Dépassement va au-delà/);
  assert.match(demarrage, /hors document/);

  await appel(`/api/eleves/zoe-test/lecons/${revision.id}/retours`, 'POST', { score: 40 });
  assert.equal((await appel(`/api/eleves/zoe-test/lecons/${revision.id}/rebonds`, 'POST', { action: 'revoir' })).status, 200);
  assert.match(await fs.readFile(argsRevision, 'utf8'), /Rebond : Revoir[\s\S]*pas de Dépassement/);
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

test('Modèle selon la tâche : les Pages de leçon passent le Modèle de l\'Élève (effort medium) ; les Propositions passent toujours Haiku (effort low) ; un Modèle de secours à chaque appel', async () => {
  const { data: config } = await appel('/api/config');
  assert.equal(config.modeleDefaut, 'sonnet');
  assert.deepEqual(config.modeles.map((m) => m.id), ['haiku', 'sonnet', 'opus']);
  assert.ok(config.modeles.every((m) => m.libelle && m.description));

  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Mod-Defaut', age: 9, niveau: 'Primaire 4' })).data.modele, 'sonnet');
  await attendrePropositions('mod-defaut');
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Mod-Invalide', age: 9, niveau: 'Primaire 4', modele: 'fable' })).status, 400);
  const cree = await appel('/api/eleves', 'POST', { pseudo: 'Mod-Test', age: 9, niveau: 'Primaire 4', modele: 'opus' });
  assert.equal(cree.data.modele, 'opus');
  await attendrePropositions('mod-test');
  assert.match(await argsPropositions(), /--model\nhaiku\n/);
  assert.match(await argsPropositions(), /--effort\nlow\n/);
  assert.match(await argsPropositions(), /--fallback-model\nsonnet\n/);

  const lecon = (await appel('/api/eleves/mod-test/lecons', 'POST', { sujet: 'les comètes' })).data;
  const args = () => fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.match(await args(), /--model\nopus\n/);
  assert.match(await args(), /--effort\nmedium\n/);
  assert.match(await args(), /--fallback-model\nsonnet\n/);

  // Changer de Modèle vaut dès l'appel suivant (une session neuve depuis la première page).
  assert.equal((await appel('/api/eleves/mod-test', 'PUT', { modele: 'sonnet' })).data.modele, 'sonnet');
  assert.equal((await appel(`/api/eleves/mod-test/lecons/${lecon.id}/messages`, 'POST', { texte: 'ok' })).status, 200);
  assert.match(await args(), /--model\nsonnet\n/);
  assert.match(await args(), /--fallback-model\nhaiku\n/);
  await attendrePropositions('mod-test');
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

test('Concurrence : la Leçon est occupée pendant qu\'un Retour de quiz l\'écrit, sans Retour perdu ni compté deux fois', async () => {
  await appel('/api/eleves', 'POST', { pseudo: 'Retour-Occupe', age: 10, niveau: 'Primaire 5' });
  const { data: lecon } = await appel('/api/eleves/retour-occupe/lecons', 'POST', { sujet: 'les volcans' });
  const url = `/api/eleves/retour-occupe/lecons/${lecon.id}`;
  const statuts = (await Promise.all(Array.from({ length: 5 }, () => appel(`${url}/retours`, 'POST', { score: 90 })))).map((r) => r.status);
  assert.equal(statuts.filter((s) => s === 200).length + statuts.filter((s) => s === 409).length, 5);
  const retours = (await appel(url)).data.messages.filter((m) => m.retourQuiz);
  assert.equal(retours.length, statuts.filter((s) => s === 200).length);
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

test('Coût mesuré : chaque tour du prof s\'ajoute au coût cumulé de la Leçon, exposé par la Leçon lue et par la liste', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Cout-Lecon', age: 10, niveau: 'Primaire 5' })).status, 201);
  const lecons = '/api/eleves/cout-lecon/lecons';
  const lecon = (await appel(lecons, 'POST', { sujet: 'les volcans' })).data;
  assert.deepEqual(lecon.cout, { coutUsd: 0.25, tours: 1, entree: 10, sortie: 100, cacheLu: 1000, cacheEcrit: 200, dureeMs: 1000 });

  // Le Retour de quiz ne fait pas travailler le prof : il ne coûte rien.
  assert.equal((await appel(`${lecons}/${lecon.id}/retours`, 'POST', { score: 90 })).data.cout.tours, 1);
  const apresRebond = (await appel(`${lecons}/${lecon.id}/rebonds`, 'POST', { action: 'suivante' })).data;
  assert.equal(apresRebond.cout.coutUsd, 0.5);
  assert.equal(apresRebond.cout.tours, 2);

  // Un tour sans coût ni usage compte comme un tour gratuit, sans rien casser.
  const sansCout = await avecFichier('sans-cout', () => appel(`${lecons}/${lecon.id}/messages`, 'POST', { texte: 'ok' }));
  assert.equal(sansCout.status, 200);
  assert.equal(sansCout.data.cout.coutUsd, 0.5);
  assert.equal(sansCout.data.cout.tours, 3);

  assert.equal((await appel(`${lecons}/${lecon.id}`)).data.cout.coutUsd, 0.5);
  assert.equal((await appel(lecons)).data.find((l) => l.id === lecon.id).cout.coutUsd, 0.5);
  await attendrePropositions('cout-lecon');
});

test('Coût mesuré : la route de l\'Élève donne le total et le détail par Leçon et par type de tâche, Propositions comprises', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Cout-Eleve', age: 10, niveau: 'Primaire 5' })).status, 201);
  await attendrePropositions('cout-eleve');
  assert.equal((await appel('/api/eleves/cout-eleve/couts')).data.parTache.propositions.coutUsd, 0.0625);

  const lecons = '/api/eleves/cout-eleve/lecons';
  const a = (await appel(lecons, 'POST', { sujet: 'les volcans' })).data;
  await appel(`${lecons}/${a.id}/messages`, 'POST', { texte: 'ok' }); // la Leçon a déjà sa page : tour de page
  await appel(`${lecons}/${a.id}/retours`, 'POST', { score: 90 }); // Retour de quiz : aucun tour du prof
  await appel(`${lecons}/${a.id}/rebonds`, 'POST', { action: 'suivante' });
  const b = await avecFichier('refuser', async () => (await appel(lecons, 'POST', { sujet: 'un sujet bizarre' })).data);
  await avecFichier('refuser', () => appel(`${lecons}/${b.id}/messages`, 'POST', { texte: 'Je ne sais pas' })); // toujours sans page
  await attendrePropositions('cout-eleve');

  const { status, data } = await appel('/api/eleves/cout-eleve/couts');
  assert.equal(status, 200);
  const parId = Object.fromEntries(data.lecons.map((l) => [l.id, l]));
  assert.equal(parId[a.id].titre, 'Les volcans');
  assert.equal(parId[a.id].total.coutUsd, 0.75);
  assert.deepEqual(Object.fromEntries(Object.entries(parId[a.id].parTache).map(([t, c]) => [t, c.tours])),
    { premiereSeance: 1, page: 1, rebond: 1, propositions: 0 });
  assert.equal(parId[b.id].total.coutUsd, 0.5);
  assert.equal(parId[b.id].parTache.premiereSeance.tours, 2);

  const propositions = data.parTache.propositions;
  assert.ok(propositions.tours >= 2); // à la création, puis après les tours de séance
  assert.equal(propositions.coutUsd, propositions.tours * 0.0625);
  assert.equal(data.parTache.premiereSeance.coutUsd, 0.75);
  assert.equal(data.parTache.page.coutUsd, 0.25);
  assert.equal(data.parTache.rebond.coutUsd, 0.25);
  assert.equal(data.total.coutUsd, 1.25 + propositions.coutUsd);
  assert.equal(data.total.tours, 5 + propositions.tours);

  assert.equal((await appel('/api/eleves/inconnu/couts')).status, 404);
});

test('Session neuve : la première Séance reprend sa session ; après la première page, chaque tour repart sans --resume, avec le préambule de relais', async () => {
  const args = async (lecon) => (await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8')).split('\n');
  // Première Séance sans page encore (le prof cadre le sujet) : la session est reprise.
  const lecon = await avecFichier('refuser', async () => {
    const cree = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'un sujet flou' })).data;
    await message(cree, 'Les volcans');
    return cree;
  });
  let recus = await args(lecon);
  assert.equal(recus[recus.indexOf('--resume') + 1], 's-123');
  assert.ok(!recus.join('\n').includes('Passage de relais'));

  // La première page existe : le tour suivant démarre une session neuve, avec le skill teach et le préambule.
  await message(lecon, 'Les volcans');
  await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/scores`, 'POST', { score: 60, page: '0001-volcans.html' });
  for (const tour of [
    () => message(lecon, 'ok'),
    () => appel(`/api/eleves/zoe-test/lecons/${lecon.id}/retours`, 'POST', { score: 60, page: '0001-volcans.html' }),
    () => appel(`/api/eleves/zoe-test/lecons/${lecon.id}/rebonds`, 'POST', { action: 'suivante' }),
  ]) {
    assert.equal((await tour()).status, 200);
    recus = await args(lecon);
    assert.ok(!recus.includes('--resume'));
    assert.equal(recus[recus.indexOf('-p') + 1], '/mattpocock-skills:teach [Passage de relais de l\'appli : tu reprends cette Leçon dans une session neuve, sans souvenir des tours précédents. Avant d\'agir, relis MISSION.md, les learning records (learning-records/), NOTES.md et lesson.json du dossier courant, et au besoin les pages déjà créées.]');
    assert.match(recus.join('\n'), /Résultats du dernier quiz : 0001-volcans\.html, 60 %/);
  }
});

test('Prompt système allégé : sections dynamiques exclues, réglages utilisateur seulement, aucun serveur MCP', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les geysers' })).data;
  const recus = (await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8')).split('\n');
  assert.ok(recus.includes('--exclude-dynamic-system-prompt-sections'));
  assert.ok(recus.includes('--strict-mcp-config'));
  assert.equal(recus[recus.indexOf('--setting-sources') + 1], 'user');
});

test('Ma fiche : la Leçon lue expose ses documents de référence (reference/*.html), liste vide sinon', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les glaciers' })).data;
  assert.deepEqual(lecon.references, []);
  const dossierReference = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'reference');
  await fs.mkdir(dossierReference);
  await fs.writeFile(path.join(dossierReference, 'glossaire.html'), '<h1>Glossaire</h1>');
  await fs.writeFile(path.join(dossierReference, 'fiche.html'), '<h1>Fiche</h1>');
  await fs.writeFile(path.join(dossierReference, 'notes.txt'), 'pas un document');
  const lue = (await appel(`/api/eleves/zoe-test/lecons/${lecon.id}`)).data;
  assert.deepEqual(lue.references, ['fiche.html', 'glossaire.html']);
  assert.equal((await fetch(`${base}/fichiers/zoe-test/${lecon.id}/reference/fiche.html`)).status, 200);
});
