import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { slugify } from '../lib/store.js';
import { lireQuiz, messageScore } from '../public/kit/v1/quiz-logique.js';

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
  // Les fichiers `images-page` et `images-manifeste` sont recopiés tels quels en lessons/0002-images.html et images.json.
  // Comme le vrai `claude -p`, il renvoie un coût et un usage (0,25 $ par tour de Leçon, 0,0625 $ par tour de
  // Propositions) ; le fichier `sans-cout` le fait répondre sans ces champs.
  // CARTABLE_IMAGES_LOCALES=1 : le serveur accepte les images du petit serveur local lancé par les tests de Visuels.
  // CARTABLE_HORLOGE_INJECTABLE=1 : le serveur prend « maintenant » dans l'en-tête X-Cartable-Maintenant (révisions datées).
  // Dans le dossier des Variantes d'une Leçon, il note chaque lancement (`lancements-variantes`) et ses arguments
  // (`args-variantes`), puis écrit variantes.json d'après questions-a-varier.json (faux-variantes.mjs) : pour chaque
  // Question, deux variantes valides (réponses inversées) et une mal formée. `variantes-attendre` le fait patienter,
  // `variantes-echouer` le fait échouer, `variantes-mal-formees` ne lui fait écrire que des variantes mal formées.
  await fs.writeFile(path.join(dossier, 'faux-variantes.mjs'), `import fs from 'node:fs';
const demandes = JSON.parse(fs.readFileSync('questions-a-varier.json', 'utf8'));
const malFormees = fs.existsSync(process.argv[2]);
const variante = (q, n) => ({ enonce: q.enonce + ' (variante ' + n + ')', reponses: [...q.reponses].reverse(), bonne: q.reponses.length - 1 - q.bonne, explication: q.explication });
const sortie = Object.fromEntries(demandes.map((q) => [q.cle, [
  ...(malFormees ? [] : [variante(q, 1), variante(q, 2)]),
  { enonce: q.enonce + ' (mal formée)', reponses: q.reponses, bonne: 9, explication: '' },
  { enonce: '', reponses: ['a'], bonne: 0 },
]]));
fs.writeFileSync('variantes.json', JSON.stringify(sortie));
`);
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
USAGE='"duration_ms":1000,"usage":{"input_tokens":10,"output_tokens":100,"cache_read_input_tokens":1000,"cache_creation_input_tokens":200}'
if [ "$(basename "$PWD")" = propositions ]; then
  COUT=',"total_cost_usd":0.0625,'"$USAGE"',"modelUsage":{"claude-haiku-test":{"costUSD":0.0625}}'
else
  COUT=',"total_cost_usd":0.25,'"$USAGE"',"modelUsage":{"claude-sonnet-test":{"costUSD":0.25}}'
fi
[ -e '${dossier}/sans-cout' ] && COUT=''
if [ "$(basename "$PWD")" = variantes ]; then
  echo lancement >> '${dossier}/lancements-variantes'
  printf '%s\n' "$@" > '${dossier}/args-variantes'
  while [ -e '${dossier}/variantes-attendre' ]; do sleep 0.05; done
  if [ -e '${dossier}/variantes-echouer' ]; then
    echo '{"result":"You have hit your limit","is_error":true}'
    exit 0
  fi
  node '${dossier}/faux-variantes.mjs' '${dossier}/variantes-mal-formees'
  echo '{"result":"ok","session_id":"s-var","is_error":false,"total_cost_usd":0.01,"modelUsage":{"claude-haiku-test":{"costUSD":0.01}}}'
  exit 0
fi
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
[ -e '${dossier}/images-page' ] && cp '${dossier}/images-page' lessons/0002-images.html
[ -e '${dossier}/images-manifeste' ] && cp '${dossier}/images-manifeste' images.json
if [ -e '${dossier}/choix' ]; then
  printf '%s\\n' '{"result":"Pourquoi ?\\nCHOIX: Un exposé | Un devoir","session_id":"s-123","is_error":false'"$COUT"'}'
  exit 0
fi
echo '{"result":"Bonjour !","session_id":"s-123","is_error":false'"$COUT"'}'
`, { mode: 0o755 });
  const port = 3100 + Math.floor(Math.random() * 500);
  base = `http://localhost:${port}`;
  serveur = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: port, CLAUDE_BIN: faux, TEACH_SKILL_DIR: dossier, ELEVES_DIR: eleves, CARTABLE_IMAGES_LOCALES: '1', CARTABLE_HORLOGE_INJECTABLE: '1' },
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

// `entetes` : en-têtes en plus, comme X-Cartable-Maintenant pour fixer la date du serveur.
const appel = async (url, method = 'GET', body, entetes = {}) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...entetes }, body: body && JSON.stringify(body) });
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
  // Tant que le quiz de la dernière page n'est pas fait, « Continuer » ramène à cette page : la carte n'annonce pas la suite.
  assert.equal(page.data.quizEnAttente, true);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).quizEnAttente, true);
  await appel(`${url}/scores`, 'POST', { score: 40, page: '0001-volcans.html' });
  assert.equal((await appel(url)).data.quizEnAttente, false);
  assert.equal((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id).quizEnAttente, false);

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
    { texte: 'Nommer les parties d’un volcan', atteint: false, retenu: false, aConfirmer: false },
    { texte: 'Expliquer une éruption', atteint: false, retenu: false, aConfirmer: false },
    { texte: 'Situer trois volcans', atteint: false, retenu: false, aConfirmer: false },
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

test('Retenu : un Objectif réussi de nouveau au moins 24 heures plus tard est Retenu, dans la Leçon et la liste', async () => {
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const fichier = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'etat.json');
  const retenus = (l) => l.objectifs.map((o) => o.retenu);
  const resume = async () => (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);
  // Dates des entrées de score fixées par le test, dans etat.json (Espace personnel lisible).
  const dater = async (...dates) => {
    const etat = JSON.parse(await fs.readFile(fichier, 'utf8'));
    etat.scores = etat.scores.map((s, i) => ({ ...s, date: dates[i] }));
    await fs.writeFile(fichier, JSON.stringify(etat));
  };
  for (const [score, objectifs] of [[85, [1, 2]], [90, [1]], [100, [2]]]) {
    assert.equal((await appel(`${url}/scores`, 'POST', { score, page: '0001-volcans.html', objectifs })).status, 201);
  }

  // Deux succès le même jour : atteints, pas Retenus.
  await dater('2026-10-01T09:00:00.000Z', '2026-10-01T18:00:00.000Z', '2026-10-01T20:00:00.000Z');
  assert.deepEqual(retenus((await appel(url)).data), [false, false, false]);
  assert.deepEqual(retenus(await resume()), [false, false, false]);

  // Objectif 1 réussi de nouveau 25 heures plus tard : Retenu ; le Niveau de Leçon ne change pas.
  await dater('2026-10-01T09:00:00.000Z', '2026-10-02T10:00:00.000Z', '2026-10-01T20:00:00.000Z');
  const lue = (await appel(url)).data;
  assert.deepEqual(retenus(lue), [true, false, false]);
  assert.deepEqual(lue.objectifs.map((o) => o.atteint), [true, true, false]);
  assert.equal(lue.niveauLecon, 3);
  assert.deepEqual(retenus(await resume()), [true, false, false]);

  // Un quiz raté ensuite ne retire rien : Retenu pour toujours.
  const rate = (await appel(`${url}/scores`, 'POST', { score: 10, page: '0001-volcans.html', objectifs: [1] })).data;
  assert.deepEqual(retenus(rate), [true, false, false]);
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

test('Kit : servi sous son chemin versionné (quiz, rendu d\'une question, logique, style de base et du quiz, documentation)', async () => {
  for (const [fichier, type] of [['quiz.js', 'text/javascript'], ['question.js', 'text/javascript'], ['quiz-logique.js', 'text/javascript'], ['base.css', 'text/css'], ['quiz.css', 'text/css'], ['LISEZMOI.md', 'text/markdown']]) {
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
    { premiereSeance: 1, page: 1, rebond: 1, propositions: 0, variantes: 0 });
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

const argsDe = (lecon) => fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
const nombreDeLecons = async (slug) => (await appel(`/api/eleves/${slug}/lecons`)).data.length;

test('Cadrage : une Leçon libre l\'enregistre et le premier prompt du prof en porte les libellés', async () => {
  const lecon = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les comètes', cadrage: { pourquoi: 'expose', deja: 'un-peu' } });
  assert.equal(lecon.status, 201);
  assert.deepEqual(lecon.data.cadrage, { pourquoi: 'expose', deja: 'un-peu' });
  assert.equal(lecon.data.messages[0].texte, 'les comètes'); // l'Élève voit son sujet, pas le Cadrage
  assert.equal(lecon.data.messages.length, 2); // un seul tour du prof : le Cadrage ne coûte aucun token
  assert.equal(lecon.data.cout.tours, 1);
  const args = await argsDe(lecon.data);
  assert.match(args, /Pourquoi \? Pour un exposé ou un projet/);
  assert.match(args, /Tu en sais déjà… Un peu/);
  assert.deepEqual((await appel(`/api/eleves/zoe-test/lecons/${lecon.data.id}`)).data.cadrage, { pourquoi: 'expose', deja: 'un-peu' });
  assert.deepEqual((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.data.id).cadrage, { pourquoi: 'expose', deja: 'un-peu' });
});

test('Cadrage : questions et réponses fermées servies par la configuration, avec « Je ne sais pas », et les questions posées selon le mode', async () => {
  const { cadrage, questionsCadrage } = (await appel('/api/config')).data;
  assert.equal(cadrage.pourquoi.question, 'Pourquoi ?');
  assert.deepEqual(questionsCadrage, { libre: ['pourquoi', 'deja'], revision: ['deja'] });
  assert.equal((await appel('/api/config')).data.sujetMax, 80);
  assert.equal(cadrage.deja.reponses['je-ne-sais-pas'], 'Je ne sais pas');
  assert.equal(cadrage.pourquoi.reponses.controle, 'Pour un contrôle');
});

test('Cadrage : valeurs inconnues refusées (400) sans créer de Leçon ; Cadrage absent accepté', async () => {
  const avant = await nombreDeLecons('zoe-test');
  assert.equal((await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les comètes', cadrage: { pourquoi: 'pour rire' } })).status, 400);
  assert.equal((await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les comètes', cadrage: { deja: 'rien', envie: 'x' } })).status, 400);
  assert.equal(await nombreDeLecons('zoe-test'), avant);
  const sans = await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les comètes' });
  assert.equal(sans.status, 201);
  assert.equal(sans.data.cadrage, null);
  assert.doesNotMatch(await argsDe(sans.data), /Tu en sais déjà/);
});

test('Cadrage : une Leçon depuis une Proposition l\'enregistre et le transmet au prof, valeurs inconnues refusées', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Cadre-Prop', age: 10, niveau: 'Primaire 5' })).status, 201);
  const { propositions } = await attendrePropositions('cadre-prop');
  const refus = await appel('/api/eleves/cadre-prop/lecons', 'POST', { proposition: propositions[0].titre, cadrage: { deja: 'tout' } });
  assert.equal(refus.status, 400);
  assert.equal(await nombreDeLecons('cadre-prop'), 0);
  const lecon = await appel('/api/eleves/cadre-prop/lecons', 'POST', { proposition: propositions[0].titre, cadrage: { pourquoi: 'curiosite', deja: 'je-ne-sais-pas' } });
  assert.equal(lecon.status, 201);
  assert.deepEqual(lecon.data.cadrage, { pourquoi: 'curiosite', deja: 'je-ne-sais-pas' });
  const args = await argsDe(lecon.data);
  assert.match(args, /Pourquoi \? Par curiosité ; Tu en sais déjà… Je ne sais pas/);
});

test('Cadrage : une Leçon de révision ne garde que « Tu en sais déjà… », « Pourquoi ? » refusé', async () => {
  const fichiers = [{ nom: 'page1.pdf', data: Buffer.from('%PDF-1.4 faux').toString('base64') }];
  const avant = await nombreDeLecons('zoe-test');
  assert.equal((await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers, cadrage: { pourquoi: 'controle', deja: 'rien' } })).status, 400);
  assert.equal((await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers, cadrage: { deja: 'tout' } })).status, 400);
  assert.equal(await nombreDeLecons('zoe-test'), avant);
  const lecon = await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers, cadrage: { deja: 'beaucoup' } });
  assert.equal(lecon.status, 201);
  assert.deepEqual(lecon.data.cadrage, { deja: 'beaucoup' });
  const args = await argsDe(lecon.data);
  assert.match(args, /Tu en sais déjà… Beaucoup/);
  assert.doesNotMatch(args, /Pourquoi \?/);
});

test('Cadrage : les Propositions reçoivent un résumé des Cadrages récents', async () => {
  assert.equal((await appel('/api/eleves', 'POST', { pseudo: 'Cadre-Idees', age: 10, niveau: 'Primaire 5' })).status, 201);
  await attendrePropositions('cadre-idees');
  const args = path.join(dossier, 'args-propositions');
  await fs.rm(args, { force: true });
  await appel('/api/eleves/cadre-idees/lecons', 'POST', { sujet: 'les requins', cadrage: { pourquoi: 'en-parler', deja: 'beaucoup' } });
  await sonderJusqua(() => fs.readFile(args, 'utf8').catch(() => ''), (a) => a.includes('Les volcans (Sciences)'), 'Pas de régénération après le tour');
  await attendrePropositions('cadre-idees');
  const consignes = await fs.readFile(args, 'utf8');
  assert.match(consignes, /Cadrage/);
  assert.match(consignes, /Pourquoi \? Pour en parler avec quelqu'un ; Tu en sais déjà… Beaucoup/);
});

// Visuels : petit serveur d'images local, lancé par le test (aucun accès réseau extérieur).
// PNG de 1 pixel sous /tableau.png ; /page.png sert du HTML sous un type d'image ; /texte.txt du texte ; le reste, 404.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const avecServeurImages = async (fn) => {
  const serveurImages = http.createServer((req, res) => {
    if (req.url === '/tableau.png') return res.writeHead(200, { 'Content-Type': 'image/png' }).end(PNG);
    if (req.url === '/page.png') return res.writeHead(200, { 'Content-Type': 'image/png' }).end('<html>pas une image</html>');
    if (req.url === '/texte.txt') return res.writeHead(200, { 'Content-Type': 'text/plain' }).end('bonjour');
    res.writeHead(404).end();
  });
  await new Promise((r) => serveurImages.listen(0, '127.0.0.1', r));
  try {
    return await fn(`http://127.0.0.1:${serveurImages.address().port}`);
  } finally {
    serveurImages.close();
  }
};

// Le prof écrit une page avec des figures et le manifeste d'images, le temps de `fn`.
const avecPageImages = async ({ page, manifeste }, fn) => {
  await fs.writeFile(path.join(dossier, 'images-page'), page);
  await fs.writeFile(path.join(dossier, 'images-manifeste'), JSON.stringify(manifeste));
  try {
    return await fn();
  } finally {
    await fs.rm(path.join(dossier, 'images-page'), { force: true });
    await fs.rm(path.join(dossier, 'images-manifeste'), { force: true });
  }
};

const figure = (src, legende) => `<figure class="kit-figure"><img src="${src}" alt="${legende}"><figcaption>${legende}</figcaption></figure>`;
const lirePage = async (lecon, page) => (await fetch(`${base}/fichiers/zoe-test/${lecon.id}/lessons/${page}`)).text();

test('Visuels : consigne du prof (visuel qui explique, légende, source et licence, question du quiz, manifeste) et figure du Kit documentée', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les tableaux' })).data;
  const args = await fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  for (const attendu of [/au moins un visuel/, /légende/, /licence/, /au moins une question du quiz/, /décorati/, /Wikimedia Commons/, /SVG/, /currentColor/, /images\.json/, /kit-figure/]) {
    assert.match(args, attendu);
  }
  const doc = await (await fetch(`${base}/kit/v1/LISEZMOI.md`)).text();
  assert.match(doc, /class="kit-figure"/);
  assert.match(doc, /images\.json/);
  assert.match(doc, /currentColor/);
  assert.match(await (await fetch(`${base}/kit/v1/base.css`)).text(), /\.kit-figure/);
});

test('Visuels : une image déclarée est rapatriée dans la Leçon et son adresse réécrite dans la page', () => avecServeurImages(async (serveurImages) => {
  const distante = `${serveurImages}/tableau.png`;
  const lecon = await avecPageImages({
    page: `<h1>Magritte</h1>${figure(distante, 'Le tableau')}`,
    manifeste: [{ url: distante, source: 'Musée test', licence: 'CC BY-SA 4.0', alt: 'Le tableau', page: '0002-images.html' }],
  }, async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'Magritte' })).data);

  const html = await lirePage(lecon, '0002-images.html');
  assert.ok(!html.includes(distante));
  const locale = html.match(/<img src="([^"]+)"/)[1];
  assert.match(locale, /^\.\.\/images\/[^/]+\.png$/);
  const image = await fetch(new URL(locale, `${base}/fichiers/zoe-test/${lecon.id}/lessons/0002-images.html`));
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), PNG);
  assert.match(html, /<figcaption>Le tableau<\/figcaption>/);
}));

test('Visuels : une adresse morte, un fichier qui n\'est pas une image ou une adresse hors HTTP(S) est retiré de la page, légende gardée, et signalé au tour suivant seulement', () => avecServeurImages(async (serveurImages) => {
  const mortes = [`${serveurImages}/disparue.png`, `${serveurImages}/page.png`, `${serveurImages}/texte.txt`, 'file:///etc/passwd'];
  const lecon = await avecPageImages({
    page: `<h1>Magritte</h1>${mortes.map((url, i) => figure(url, `Légende ${i}`)).join('')}`,
    manifeste: mortes.map((url) => ({ url, source: 'Musée test', licence: 'CC0', alt: 'x', page: '0002-images.html' })),
  }, async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'Magritte encore' })).data);

  const html = await lirePage(lecon, '0002-images.html');
  assert.doesNotMatch(html, /<img/);
  for (let i = 0; i < mortes.length; i++) assert.match(html, new RegExp(`<figcaption>Légende ${i}</figcaption>`));

  const args = async () => fs.readFile(path.join(dossier, `args-${lecon.id}`), 'utf8');
  assert.doesNotMatch(await args(), /Images retirées/);
  await message(lecon, 'ok');
  const signale = await args();
  assert.match(signale, /Images retirées/);
  assert.ok(signale.includes(`${serveurImages}/disparue.png (0002-images.html) : adresse morte (erreur 404)`));
  assert.ok(signale.includes(`${serveurImages}/page.png (0002-images.html) : fichier qui n'est pas une image`));
  assert.ok(signale.includes(`${serveurImages}/texte.txt (0002-images.html) : fichier qui n'est pas une image`));
  assert.ok(signale.includes('file:///etc/passwd (0002-images.html) : adresse qui n\'est pas en HTTP(S)'));
  await message(lecon, 'ok');
  assert.doesNotMatch(await args(), /Images retirées/);
}));

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

test('Pré-test : la consigne du premier tour d\'une Leçon libre fait poser deux questions au prof, puis mission, Objectifs et Pré-test', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les comètes', cadrage: { pourquoi: 'curiosite', deja: 'un-peu' } })).data;
  const args = await argsDe(lecon);
  assert.match(args, /« À la fin, tu voudrais pouvoir… »/);
  assert.match(args, /« Où as-tu croisé ce sujet \? »/);
  assert.match(args, /une à la fois/);
  assert.match(args, /Pré-test/);
  assert.match(args, /trois questions/);
  assert.match(args, /"pretest": true/);
  assert.match(args, /niveau annoncé \(Tu en sais déjà… Un peu\)/);
  assert.doesNotMatch(args, /le plus dur/);
  // Les tours suivants de la première Séance (réponses aux questions du prof) ne la répètent pas.
  assert.equal((await message(lecon, 'Le reconnaître dans le ciel')).status, 200);
  assert.doesNotMatch(await argsDe(lecon), /Où as-tu croisé ce sujet/);
});

test('Pré-test : une Leçon de révision demande « Qu\'est-ce qui te semble le plus dur ? » et un Pré-test tiré du Document source', async () => {
  const fichiers = [{ nom: 'page1.pdf', data: Buffer.from('%PDF-1.4 faux').toString('base64') }];
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers, cadrage: { deja: 'beaucoup' } })).data;
  const args = await argsDe(lecon);
  assert.match(args, /« Qu'est-ce qui te semble le plus dur \? »/);
  assert.match(args, /Pré-test/);
  assert.match(args, /tiré du Document source/);
  assert.match(args, /niveau annoncé \(Tu en sais déjà… Beaucoup\)/);
  assert.doesNotMatch(args, /À la fin, tu voudrais pouvoir/);
  assert.doesNotMatch(args, /Où as-tu croisé/);
});

test('Pré-test : sans Cadrage, la consigne du premier tour vise le niveau de l\'élève', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les marées' })).data;
  const args = await argsDe(lecon);
  assert.match(args, /« À la fin, tu voudrais pouvoir… »/);
  assert.match(args, /Pré-test/);
  assert.doesNotMatch(args, /niveau annoncé/);
});

// Résultats d'un Pré-test de trois questions, tels qu'envoyés par le Kit : q1 (Objectif 1) et q2 (Objectif 2) justes, q3 (Objectif 3) ratée.
const corpsPretest = () => ({
  score: 67, page: '0001-volcans.html', objectifs: [1, 2, 3], pretest: true,
  questions: [
    { id: 'q1', enonce: 'Où sort la lave ?', choisie: 'Par le cratère', bonne: 'Par le cratère', juste: true, bonus: false, objectifs: [1], sur: false },
    { id: 'q2', enonce: 'Le magma, c’est…', choisie: 'De la roche fondue', bonne: 'De la roche fondue', juste: true, bonus: false, objectifs: [2] },
    { id: 'q3', enonce: 'Où est l’Etna ?', choisie: 'En Islande', bonne: 'En Sicile', juste: false, bonus: false, objectifs: [3], sur: true },
  ],
});

test('Pré-test : son score est enregistré à part, hors Maîtrise, Objectifs et Étoiles ; Objectifs réussis « à confirmer »', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }], cadrage: { deja: 'rien' } })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const r = await appel(`${url}/scores`, 'POST', { ...corpsPretest(), questions: corpsPretest().questions.map((q) => ({ ...q, juste: true, choisie: q.bonne })) });
  assert.equal(r.status, 201);
  const lue = r.data;
  assert.equal(lue.scores.at(-1).pretest, true);
  assert.equal(lue.scores.at(-1).score, 100);
  assert.equal(lue.maitrise, null);
  assert.deepEqual(lue.objectifs.map((o) => o.atteint), [false, false, false]);
  assert.deepEqual(lue.etoiles, { quiz: false, bonus: false, defi: false });
  assert.deepEqual(lue.objectifs.map((o) => o.aConfirmer), [true, true, true]);
  // Un vrai quiz réussi ensuite atteint l'Objectif 1 : il n'est plus « à confirmer ».
  const vrai = (await appel(`${url}/scores`, 'POST', { score: 100, page: '0002-volcans.html', objectifs: [1] })).data;
  assert.deepEqual(vrai.objectifs.map((o) => [o.atteint, o.aConfirmer]), [[true, false], [false, true], [false, true]]);
  assert.equal(vrai.maitrise.pourcentage, 100);
  assert.equal(vrai.etoiles.quiz, true);
  assert.equal(vrai.scores.at(-1).pretest, undefined);
  const resume = (await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id);
  assert.deepEqual(resume.objectifs.map((o) => o.aConfirmer), [false, true, true]);
});

test('Pré-test : l\'écart avec « Tu en sais déjà… » est exposé par la Leçon', async () => {
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans', cadrage: { pourquoi: 'curiosite', deja: 'rien' } })).data);
  assert.equal(lecon.pretest, null);
  const lue = (await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/scores`, 'POST', corpsPretest())).data;
  assert.equal(lue.pretest.ecart, 'plus');
  assert.deepEqual([lue.pretest.deja, lue.pretest.justes, lue.pretest.total], ['rien', 2, 3]);
  assert.match(lue.pretest.texte, /^Tu pensais découvrir ce sujet, et tu as trouvé 2 réponses sur 3 : tu en sais plus/);
  assert.equal(lue.maitrise, null);
});

test('Pré-test : le Retour montre l\'écart, seul « Commencer » est proposé, et sa consigne porte les résultats par question', async () => {
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans', cadrage: { pourquoi: 'curiosite', deja: 'beaucoup' } })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  assert.equal((await appel(`${url}/scores`, 'POST', corpsPretest())).status, 201);
  const retour = (await appel(`${url}/retours`, 'POST', corpsPretest())).data;
  const prof = retour.messages.at(-1);
  assert.deepEqual(prof.retourQuiz, { score: 67, action: 'commencer', pretest: true });
  assert.equal(retour.messages.at(-2).texte, '🔮 Pré-test terminé');
  assert.match(prof.texte, /Tu pensais en savoir beaucoup, et tu as trouvé 2 réponses sur 3 : tu te connais bien/);
  assert.doesNotMatch(prof.texte, /Bravo|Étoile|%/);
  assert.deepEqual(retour.rebondsProposes, ['commencer']);
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'suivante' })).status, 400);

  const suite = await appel(`${url}/rebonds`, 'POST', { action: 'commencer' });
  assert.equal(suite.status, 200);
  assert.equal(suite.data.messages.at(-2).texte, '🚀 On commence !');
  const consigne = await argsDe(lecon);
  assert.match(consigne, /Rebond : Commencer/);
  assert.match(consigne, /première vraie page de leçon/);
  assert.match(consigne, /Résultats du Pré-test/);
  assert.match(consigne, /« Où sort la lave \? » \(Objectif 1\) : juste/);
  assert.match(consigne, /« Le magma, c’est… » \(Objectif 2\) : juste/);
  assert.match(consigne, /« Où est l’Etna \? » \(Objectif 3\) : il a choisi « En Islande », la bonne réponse était « En Sicile »/);
  assert.match(consigne, /À confirmer : 1, 2/);
  assert.match(consigne, /Tu en sais déjà… Beaucoup/);
  assert.doesNotMatch(consigne, /Résultats du dernier quiz/);
  // Un quiz ordinaire après le Pré-test retrouve les Rebonds habituels.
  const ordinaire = { score: 50, page: '0002-volcans.html' };
  await appel(`${url}/scores`, 'POST', ordinaire);
  assert.deepEqual((await appel(`${url}/retours`, 'POST', ordinaire)).data.rebondsProposes, ['suivante']);
});

test('Pré-test : un Retour de Pré-test en Leçon de révision ne fait gagner aucune Étoile et ne propose que « Commencer »', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const parfait = { ...corpsPretest(), questions: corpsPretest().questions.map((q) => ({ ...q, juste: true, choisie: q.bonne })) };
  await appel(`${url}/scores`, 'POST', parfait);
  const retour = (await appel(`${url}/retours`, 'POST', parfait)).data;
  assert.equal(retour.messages.at(-1).retourQuiz.nouvellesEtoiles, undefined);
  assert.deepEqual(retour.rebondsProposes, ['commencer']);
  assert.match(retour.messages.at(-1).texte, /Tu as trouvé 3 réponses sur 3 avant même la leçon/);
  // Le score suivant (vrai quiz) gagne bien son Étoile, annoncée par son propre Retour.
  await appel(`${url}/rebonds`, 'POST', { action: 'commencer' });
  await appel(`${url}/scores`, 'POST', { score: 90 });
  assert.deepEqual((await appel(`${url}/retours`, 'POST', { score: 90 })).data.messages.at(-1).retourQuiz.nouvellesEtoiles, ['quiz']);
});

test('Pré-test : refait en cours de Leçon, il reste hors score mais ne propose pas « Commencer » et n\'annule pas le Défi en cours', async () => {
  const pdf = Buffer.from('%PDF-1.4 faux').toString('base64');
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { fichiers: [{ nom: 'page.pdf', data: pdf }] })).data);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  await appel(`${url}/scores`, 'POST', { score: 90 });
  assert.deepEqual((await appel(`${url}/retours`, 'POST', { score: 90 })).data.rebondsProposes, ['defi']);
  assert.equal((await appel(`${url}/rebonds`, 'POST', { action: 'defi' })).data.defiEnCours, true);

  await appel(`${url}/scores`, 'POST', corpsPretest());
  const retour = (await appel(`${url}/retours`, 'POST', corpsPretest())).data;
  assert.equal(retour.defiEnCours, true);
  assert.deepEqual(retour.rebondsProposes, []);
  assert.equal(retour.messages.at(-1).retourQuiz.pretest, true);
  assert.equal(retour.maitrise.pourcentage, 90);
  // Le Défi suivant, réussi, termine bien la Leçon.
  await appel(`${url}/scores`, 'POST', { score: 85 });
  assert.equal((await appel(`${url}/retours`, 'POST', { score: 85 })).data.messages.at(-1).retourQuiz.action, 'terminee');
});

test('Pré-test : un marqueur invalide est ignoré, le score compte comme un quiz ordinaire', async () => {
  const lecon = await avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les volcans' })).data);
  const lue = (await appel(`/api/eleves/zoe-test/lecons/${lecon.id}/scores`, 'POST', { ...corpsPretest(), pretest: 'oui' })).data;
  assert.equal(Object.hasOwn(lue.scores.at(-1), 'pretest'), false);
  assert.equal(lue.maitrise.pourcentage, 67);
  assert.equal(lue.pretest, null);
});

// Banque de Questions (#64) : le prof écrit une page avec le quiz du Kit, l'Élève y répond.
const quizBanque = {
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Où sort la lave ?', reponses: ['Par le cratère', 'Par les racines'], bonne: 0, explication: 'Le cratère.' },
    { id: 'q2', type: 'qcm', enonce: 'Le magma, c’est…', reponses: ['De la glace', 'De la roche fondue'], bonne: 1, explication: 'Roche fondue.', objectifs: [2] },
    { id: 'b1', type: 'qcm', enonce: '🚀 Le plus grand volcan ?', reponses: ['Olympus Mons', 'Etna'], bonne: 0, explication: 'Sur Mars.' },
  ],
};
// Leçon de zoe-test (créée si besoin : ces tests peuvent tourner seuls), avec trois Objectifs.
const leconBanque = async (corps = { sujet: 'les volcans' }) => {
  await appel('/api/eleves', 'POST', { pseudo: 'Zoé-Test', age: 11, niveau: 'Primaire 6' });
  return avecFichier('objectifs', async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', corps)).data);
};
const ecrirePageQuiz = async (lecon, page, quiz) => {
  const dir = path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'lessons');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, page), `<!doctype html><html><body><h1>Volcans</h1>
<script type="application/json" id="cartable-quiz">${JSON.stringify(quiz)}</script>
<script type="module" src="/kit/v1/quiz.js"></script></body></html>`);
};
// Résultats envoyés par le Kit pour `quizBanque` : q1 juste « pas sûr », q2 « Je ne sais pas », b1 (bonus) juste.
const corpsBanque = (page, autres = {}) => ({
  score: 50, page, objectifs: [1, 2],
  questions: [
    { id: 'q1', enonce: 'Où sort la lave ?', choisie: 'Par le cratère', bonne: 'Par le cratère', juste: true, bonus: false, objectifs: [1], sur: false },
    { id: 'q2', enonce: 'Le magma, c’est…', choisie: 'Je ne sais pas', bonne: 'De la roche fondue', juste: false, jeNeSaisPas: true, bonus: false, objectifs: [2] },
    { id: 'b1', enonce: 'Le plus grand volcan ?', choisie: 'Olympus Mons', bonne: 'Olympus Mons', juste: true, bonus: true, objectifs: [1] },
  ],
  ...autres,
});

test('Banque de Questions : un quiz crée les Questions de la Leçon, le même quiz refait ajoute des réponses sans les dupliquer', async () => {
  const lecon = await leconBanque();
  assert.deepEqual(lecon.questions, []);
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  await ecrirePageQuiz(lecon, '0002-volcans.html', quizBanque);

  const premiere = await appel(`${url}/scores`, 'POST', corpsBanque('0002-volcans.html'));
  assert.equal(premiere.status, 201);
  // Le bonus n'entre pas dans la Banque.
  assert.deepEqual(premiere.data.questions.map((q) => q.id), ['q1', 'q2']);
  const [q1, q2] = premiere.data.questions;
  assert.equal(q1.page, '0002-volcans.html');
  assert.deepEqual(q1.contenu, { enonce: 'Où sort la lave ?', reponses: ['Par le cratère', 'Par les racines'], bonne: 0, explication: 'Le cratère.', objectifs: [1] });
  assert.deepEqual(q2.contenu.objectifs, [2]);
  // Journal : date, juste, Confiance si présente, « Je ne sais pas », origine.
  assert.equal(q1.journal.length, 1);
  assert.ok(!Number.isNaN(Date.parse(q1.journal[0].date)));
  assert.deepEqual({ ...q1.journal[0], date: 'd' }, { date: 'd', juste: true, sur: false, origine: 'quiz' });
  assert.deepEqual({ ...q2.journal[0], date: 'd' }, { date: 'd', juste: false, jeNeSaisPas: true, origine: 'quiz' });

  // Le même quiz refait : mêmes Questions, une réponse de plus chacune.
  const corps = corpsBanque('0002-volcans.html');
  corps.questions[1] = { ...corps.questions[1], choisie: 'De la roche fondue', juste: true, jeNeSaisPas: undefined, sur: true };
  const refait = (await appel(`${url}/scores`, 'POST', corps)).data;
  assert.deepEqual(refait.questions.map((q) => [q.id, q.journal.length]), [['q1', 2], ['q2', 2]]);
  assert.deepEqual({ ...refait.questions[1].journal[1], date: 'd' }, { date: 'd', juste: true, sur: true, origine: 'quiz' });
  // Exposées aussi par la lecture de la Leçon, pas par la liste des Leçons.
  assert.equal((await appel(url)).data.questions.length, 2);
  assert.equal(Object.hasOwn((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id), 'questions'), false);
});

test('Banque de Questions : le quiz du Pré-test n\'y entre pas', async () => {
  const lecon = await leconBanque();
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  await ecrirePageQuiz(lecon, '0001-devine.html', { ...quizBanque, pretest: true });
  const r = await appel(`${url}/scores`, 'POST', corpsBanque('0001-devine.html', { pretest: true }));
  assert.equal(r.status, 201);
  assert.deepEqual(r.data.questions, []);
  // Même si la page ne porte pas le marqueur, celui du résultat suffit (et inversement).
  await ecrirePageQuiz(lecon, '0002-devine.html', quizBanque);
  assert.deepEqual((await appel(`${url}/scores`, 'POST', corpsBanque('0002-devine.html', { pretest: true }))).data.questions, []);
  assert.deepEqual((await appel(`${url}/scores`, 'POST', corpsBanque('0001-devine.html'))).data.questions, []);
});

test('Banque de Questions : sans quiz du Kit (anciennes Leçons et pages), pas de Questions, et la Leçon reste lisible', async () => {
  const lecon = await leconBanque();
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  // Page du faux prof, au quiz écrit à la main ; score sans résultats par question ; page inexistante ou hors Leçon.
  for (const corps of [corpsBanque('0001-volcans.html'), { score: 80, page: '0001-volcans.html' }, corpsBanque('9999-absente.html'), corpsBanque('../etat.json')]) {
    const r = await appel(`${url}/scores`, 'POST', corps);
    assert.equal(r.status, 201);
    assert.deepEqual(r.data.questions, []);
  }
  // Une Banque illisible ne rend pas la Leçon illisible.
  await fs.writeFile(path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'questions.json'), '{ pas du json');
  const lue = await appel(url);
  assert.equal(lue.status, 200);
  assert.deepEqual(lue.data.questions, []);
  assert.ok((await appel('/api/eleves/zoe-test/lecons')).data.some((l) => l.id === lecon.id));
});

// Planificateur FSRS (#65) : la Leçon expose, pour chaque Question, sa probabilité de se souvenir à la date du serveur
// et sa prochaine révision, recalculées depuis le journal.
test('Mémoire des Questions : la Leçon expose probabilité de se souvenir et prochaine révision, à la date du serveur', async () => {
  const lecon = await leconBanque();
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  const banque = {
    '0002-volcans.html#q1': { id: 'q1', page: '0002-volcans.html', contenu: { enonce: 'Où sort la lave ?', reponses: ['a', 'b'], bonne: 0, explication: '', objectifs: [1] },
      journal: [{ date: '2026-10-01T10:00:00.000Z', juste: true, origine: 'quiz' }] },
    '0002-volcans.html#q2': { id: 'q2', page: '0002-volcans.html', contenu: { enonce: 'Le magma ?', reponses: ['a', 'b'], bonne: 1, explication: '', objectifs: [1] },
      journal: [{ date: '2026-10-01T10:00:00.000Z', juste: false, jeNeSaisPas: true, origine: 'quiz' }] },
  };
  await fs.writeFile(path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'questions.json'), JSON.stringify(banque));
  const lire = async (maintenant) => (await appel(url, 'GET', undefined, { 'X-Cartable-Maintenant': maintenant })).data.questions;

  const [q1, q2] = await lire('2026-10-01T10:00:00.000Z');
  // Juste et sûr → revue 3 jours plus tard ; « Je ne sais pas » → dès le lendemain.
  assert.equal(q1.prochaineRevision, '2026-10-04T10:00:00.000Z');
  assert.equal(q2.prochaineRevision, '2026-10-02T10:00:00.000Z');
  assert.equal(q1.rappel, 1);
  // La probabilité baisse avec la date du serveur ; le journal n'a pas bougé (rien n'est rangé en double).
  const [plusTard] = await lire('2026-10-20T10:00:00.000Z');
  assert.ok(plusTard.rappel < 0.9 && plusTard.rappel > 0, `${plusTard.rappel}`);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'questions.json'), 'utf8')), banque);
  // Sans en-tête : la date réelle, après la dernière réponse.
  const [reel] = (await appel(url)).data.questions;
  assert.ok(reel.rappel > 0 && reel.rappel < 1);
});

test('Mémoire des Questions : un quiz répondu à la date du serveur est daté de ce jour-là', async () => {
  const lecon = await leconBanque();
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  await ecrirePageQuiz(lecon, '0002-volcans.html', quizBanque);
  const jour = { 'X-Cartable-Maintenant': '2026-11-02T08:00:00.000Z' };
  const r = await appel(`${url}/scores`, 'POST', corpsBanque('0002-volcans.html'), jour);
  assert.equal(r.status, 201);
  assert.equal(r.data.scores.at(-1).date, '2026-11-02T08:00:00.000Z');
  const [q1, q2] = r.data.questions;
  assert.equal(q1.journal[0].date, '2026-11-02T08:00:00.000Z');
  assert.equal(q1.rappel, 1);
  // Juste mais pas sûr → difficile (1,18 jour : le lendemain) ; « Je ne sais pas » → à revoir, le lendemain aussi.
  assert.equal(q1.prochaineRevision, '2026-11-03T08:00:00.000Z');
  assert.equal(q2.prochaineRevision, '2026-11-03T08:00:00.000Z');
});

// Révisions du jour (#66) : les Questions dues de toutes les Leçons d'un Élève, servies et corrigées par l'appli,
// sans tour du prof. Chaque test a son propre Élève : la route couvre toutes ses Leçons.
const BANQUE_DATE = '2026-11-02T12:00:00.000Z'; // quiz du Kit répondu ce jour-là : q1 juste pas sûr, q2 « Je ne sais pas »
const LENDEMAIN = '2026-11-03T12:00:00.000Z'; // leur prochaine révision (voir « Mémoire des Questions »)
const le = (date) => ({ 'X-Cartable-Maintenant': date });
// Élève neuf avec `nombre` Leçons, chacune avec les Questions de `quizBanque` répondues à BANQUE_DATE. Attend ses
// Propositions et efface les traces de lancement du faux `claude`, pour vérifier ensuite qu'aucun n'est lancé.
const eleveRevisions = async (pseudo, nombre = 2) => {
  const slug = slugify(pseudo);
  await appel('/api/eleves', 'POST', { pseudo, age: 11, niveau: 'Primaire 6' });
  const lecons = [];
  for (let i = 0; i < nombre; i++) {
    const lecon = await avecFichier('objectifs', async () => (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: `sujet ${i}` })).data);
    const dir = path.join(eleves, slug, 'lecons', lecon.id, 'lessons');
    await fs.writeFile(path.join(dir, '0002-volcans.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizBanque)}</script>`);
    await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corpsBanque('0002-volcans.html'), le(BANQUE_DATE));
    lecons.push(lecon);
  }
  await attendrePropositions(slug);
  await fs.rm(path.join(dossier, 'lancements-propositions'), { force: true });
  for (const l of lecons) await fs.rm(path.join(dossier, `demarre-${l.id}`), { force: true });
  return { slug, lecons };
};
const aucunClaudeLance = async (lecons) => {
  assert.equal(await existe(path.join(dossier, 'lancements-propositions')), false);
  for (const l of lecons) assert.equal(await demarre(l), false);
};

test('Révisions du jour : les Questions dues de toutes les Leçons, mélangées entre Leçons, sans lancer le prof', async () => {
  const { slug, lecons } = await eleveRevisions('Revis-Due');
  const url = `/api/eleves/${slug}/revisions`;
  // Le jour du quiz : rien n'est dû.
  const avant = await appel(url, 'GET', undefined, le(BANQUE_DATE));
  assert.equal(avant.status, 200);
  assert.deepEqual(avant.data, { dues: 0, questions: [] });
  // Le lendemain : les quatre Questions, deux par Leçon, jamais deux de suite de la même Leçon.
  const { data } = await appel(url, 'GET', undefined, le(LENDEMAIN));
  assert.equal(data.dues, 4);
  assert.equal(data.questions.length, 4);
  assert.deepEqual(new Set(data.questions.map((q) => q.lecon)), new Set(lecons.map((l) => l.id)));
  for (let i = 1; i < data.questions.length; i++) assert.notEqual(data.questions[i].lecon, data.questions[i - 1].lecon);
  // Tout ce qu'il faut pour l'afficher avec le rendu du Kit, et ouvrir la Page de leçon d'origine.
  const q1 = data.questions.find((q) => q.id === 'q1');
  assert.equal(q1.page, '0002-volcans.html');
  assert.equal(q1.titreLecon, 'Les volcans');
  assert.equal(q1.enonce, 'Où sort la lave ?');
  assert.deepEqual(q1.reponses, ['Par le cratère', 'Par les racines']);
  assert.equal(q1.explication, 'Le cratère.');
  // Dû le jour même, dès le matin : la date compte, pas l'heure.
  assert.equal((await appel(url, 'GET', undefined, le('2026-11-03T11:00:00.000Z'))).data.dues, 4);
  await aucunClaudeLance(lecons);
});

test('Révisions du jour : une série de 10 Questions au plus, les plus en retard d\'abord', async () => {
  const { slug, lecons: [lecon] } = await eleveRevisions('Revis-Serie', 1);
  // Douze Questions de plus, répondues justes et sûres trois jours avant les deux premières : plus en retard.
  const questions = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, type: 'qcm', enonce: `Question ${i} ?`, reponses: ['oui', 'non'], bonne: 0, explication: '' }));
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0003-serie.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify({ objectifs: [1], questions })}</script>`);
  const corps = { score: 100, page: '0003-serie.html', objectifs: [1], questions: questions.map((q) => ({ id: q.id, enonce: q.enonce, choisie: 'oui', bonne: 'oui', juste: true, bonus: false, objectifs: [1], sur: true })) };
  assert.equal((await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corps, le('2026-10-30T12:00:00.000Z'))).status, 201);

  const { data } = await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le(LENDEMAIN));
  assert.equal(data.dues, 14);
  assert.equal(data.questions.length, 10);
  assert.ok(data.questions.every((q) => q.page === '0003-serie.html'));
});

test('Révisions du jour : une réponse est corrigée par le serveur et journalisée ; ratée, la Question revient bientôt, sue, elle s\'éloigne', async () => {
  const { slug, lecons } = await eleveRevisions('Revis-Reponse', 1);
  const [lecon] = lecons;
  const url = `/api/eleves/${slug}/revisions`;
  const repondre = (corps, date = LENDEMAIN) => appel(url, 'POST', { lecon: lecon.id, page: '0002-volcans.html', ...corps }, le(date));

  // q1 : bonne réponse (index 0 avant mélange), sûr. Le `juste` envoyé par le client est ignoré.
  const sue = await repondre({ id: 'q1', choisie: 0, sur: true, juste: false });
  assert.equal(sue.status, 200);
  assert.equal(sue.data.juste, true);
  assert.equal(sue.data.bonne, 'Par le cratère');
  assert.equal(sue.data.explication, 'Le cratère.');
  // q2 : mauvaise réponse, pourtant annoncée juste par le client.
  const ratee = await repondre({ id: 'q2', choisie: 0, sur: true, juste: true });
  assert.equal(ratee.data.juste, false);
  assert.equal(ratee.data.bonne, 'De la roche fondue');

  // Journal : origine « revision », date du serveur, Confiance.
  const { questions } = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`, 'GET', undefined, le(LENDEMAIN))).data;
  const [q1, q2] = questions;
  assert.deepEqual(q1.journal.at(-1), { date: LENDEMAIN, juste: true, sur: true, origine: 'revision' });
  assert.deepEqual(q2.journal.at(-1), { date: LENDEMAIN, juste: false, sur: true, origine: 'revision' });
  // Ratée : de nouveau due le lendemain. Sue : plusieurs jours plus tard.
  assert.equal(q2.prochaineRevision, '2026-11-04T12:00:00.000Z');
  assert.ok(Date.parse(q1.prochaineRevision) >= Date.parse('2026-11-06T12:00:00.000Z'), q1.prochaineRevision);
  assert.deepEqual((await appel(url, 'GET', undefined, le(LENDEMAIN))).data, { dues: 0, questions: [] });
  assert.deepEqual((await appel(url, 'GET', undefined, le('2026-11-04T12:00:00.000Z'))).data.questions.map((q) => q.id), ['q2']);

  // « Je ne sais pas » : faux, sans Confiance, comme dans le Kit.
  const jnsp = await repondre({ id: 'q2', choisie: 'je-ne-sais-pas', sur: true }, '2026-11-04T12:00:00.000Z');
  assert.equal(jnsp.data.juste, false);
  const relu = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`)).data.questions[1];
  assert.deepEqual(relu.journal.at(-1), { date: '2026-11-04T12:00:00.000Z', juste: false, jeNeSaisPas: true, origine: 'revision' });
  await aucunClaudeLance(lecons);
});

test('Révisions du jour : après les Questions dues, « continuer » propose celles qui ne le sont pas encore, sauf celles déjà répondues aujourd\'hui', async () => {
  const { slug, lecons: [lecon] } = await eleveRevisions('Revis-Suite', 1);
  const url = `/api/eleves/${slug}/revisions`;
  await appel(url, 'POST', { lecon: lecon.id, page: '0002-volcans.html', id: 'q1', choisie: 0, sur: true }, le(LENDEMAIN));
  // q2 reste due : « continuer » ne la sert pas (elle est dans la série du jour), ni q1, répondue aujourd'hui.
  assert.deepEqual((await appel(`${url}?suite=1`, 'GET', undefined, le(LENDEMAIN))).data, { dues: 1, questions: [] });
  // Le surlendemain, q2 répondue la veille et revue aujourd'hui : q1, pas encore due, peut être revue en plus.
  await appel(url, 'POST', { lecon: lecon.id, page: '0002-volcans.html', id: 'q2', choisie: 1, sur: true }, le('2026-11-04T09:00:00.000Z'));
  const suite = (await appel(`${url}?suite=1`, 'GET', undefined, le('2026-11-04T12:00:00.000Z'))).data;
  assert.equal(suite.dues, 0);
  assert.deepEqual(suite.questions.map((q) => q.id), ['q1']);
});

test('Révisions du jour : réponse refusée pour une Question inconnue (404) ou un choix invalide (400), sans rien journaliser', async () => {
  const { slug, lecons: [lecon] } = await eleveRevisions('Revis-Refus', 1);
  const url = `/api/eleves/${slug}/revisions`;
  const repondre = (corps) => appel(url, 'POST', { lecon: lecon.id, page: '0002-volcans.html', id: 'q1', choisie: 0, ...corps });
  for (const corps of [{ id: 'inconnue' }, { page: '0009-autre.html' }, { lecon: '2026-01-01-inconnue' }]) assert.equal((await repondre(corps)).status, 404, JSON.stringify(corps));
  for (const corps of [{ choisie: 2 }, { choisie: -1 }, { choisie: '0' }, { choisie: null }, { lecon: '../x' }]) assert.equal((await repondre(corps)).status, 400, JSON.stringify(corps));
  const { questions } = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`)).data;
  assert.deepEqual(questions.map((q) => q.journal.length), [1, 1]);
});

test('Révisions du jour : réponses de révision et score de quiz simultanés, aucune réponse perdue', async () => {
  const { slug, lecons: [lecon] } = await eleveRevisions('Revis-Ensemble', 1);
  // Un quiz de page qui se termine pendant des réponses de révision (deux onglets) : trois réponses par Question.
  const revision = (i) => appel(`/api/eleves/${slug}/revisions`, 'POST', { lecon: lecon.id, page: '0002-volcans.html', id: i % 2 ? 'q1' : 'q2', choisie: 1 });
  const envois = [revision(0), revision(1), revision(2), appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corpsBanque('0002-volcans.html')), revision(3), revision(4), revision(5)];
  const reponses = await Promise.all(envois);
  assert.ok(reponses.every((r) => r.status < 300), JSON.stringify(reponses.map((r) => [r.status, r.data?.erreur])));
  const { questions } = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`)).data;
  // Réponse du premier quiz, du quiz simultané, et trois de révision.
  assert.deepEqual(questions.map((q) => q.journal.length), [5, 5]);
});

// Date de contrôle (#68) : une Leçon de révision de l'Élève `slug`, avec le quiz de `quizBanque` répondu à BANQUE_DATE.
const PDF = Buffer.from('%PDF-1.4 faux').toString('base64');
const leconControle = async (slug, dateControle) => {
  const lecon = (await appel(`/api/eleves/${slug}/lecons`, 'POST', { fichiers: [{ nom: 'lecon.pdf', data: PDF }], dateControle })).data;
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-volcans.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizBanque)}</script>`);
  await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corpsBanque('0002-volcans.html'), le(BANQUE_DATE));
  await fs.rm(path.join(dossier, `demarre-${lecon.id}`), { force: true });
  return lecon;
};
// Minuit local du jour J de novembre 2026, en ISO : le planificateur compte en jours de l'Élève (heure du serveur).
const minuitNovembre = (jour) => new Date(2026, 10, jour).toISOString();

test('Date de contrôle : gardée et exposée par la Leçon de révision, sans consigne d\'espacement au prof', async () => {
  const { slug } = await eleveRevisions('Controle-Date', 0);
  const lecon = (await appel(`/api/eleves/${slug}/lecons`, 'POST', { fichiers: [{ nom: 'lecon.pdf', data: PDF }], dateControle: '2026-11-20' })).data;
  assert.equal(lecon.dateControle, '2026-11-20');
  assert.equal((await appel(`/api/eleves/${slug}/lecons/${lecon.id}`)).data.dateControle, '2026-11-20');
  assert.equal((await appel(`/api/eleves/${slug}/lecons`)).data.find((l) => l.id === lecon.id).dateControle, '2026-11-20');
  // Compte à rebours de l'accueil : jours locaux restants avant le contrôle, à la date de la lecture.
  const le18 = { 'X-Cartable-Maintenant': new Date(2026, 10, 18, 23, 30).toISOString() };
  assert.equal((await appel(`/api/eleves/${slug}/lecons`, 'GET', undefined, le18)).data.find((l) => l.id === lecon.id).joursAvantControle, 2);
  const prompt = await argsDe(lecon);
  assert.match(prompt, /contrôle le 2026-11-20/);
  assert.doesNotMatch(prompt, /révision espacée/);
  // Sans date, ou illisible : null.
  const sans = (await appel(`/api/eleves/${slug}/lecons`, 'POST', { fichiers: [{ nom: 'lecon.pdf', data: PDF }], dateControle: 'bientôt' })).data;
  assert.equal(sans.dateControle, null);
  assert.equal((await appel(`/api/eleves/${slug}/lecons/${sans.id}`)).data.dateControle, null);
  assert.equal((await appel(`/api/eleves/${slug}/lecons/${sans.id}`)).data.joursAvantControle, null);
  // Une date impossible (mois 13, 30 février) n'est pas gardée non plus.
  for (const impossible of ['2026-13-45', '2027-02-30']) {
    const lecon = (await appel(`/api/eleves/${slug}/lecons`, 'POST', { fichiers: [{ nom: 'lecon.pdf', data: PDF }], dateControle: impossible })).data;
    assert.equal(lecon.dateControle, null, impossible);
  }
  const libre = (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: 'les volcans' })).data;
  assert.equal((await appel(`/api/eleves/${slug}/lecons/${libre.id}`)).data.dateControle, null);
});

test('Date de contrôle : les Questions de la Leçon passent en premier dans les Révisions du jour', async () => {
  const { slug, lecons: [libre] } = await eleveRevisions('Controle-Priorite', 1);
  const controle = await leconControle(slug, '2026-11-20');
  const { data } = await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le(LENDEMAIN));
  assert.equal(data.dues, 4);
  assert.deepEqual(data.questions.map((q) => q.lecon), [controle.id, controle.id, libre.id, libre.id]);
  // Le contrôle passé, plus de priorité : de nouveau mélangées entre Leçons.
  const apres = (await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le('2026-11-21T12:00:00.000Z'))).data.questions;
  for (let i = 1; i < apres.length; i++) assert.notEqual(apres[i].lecon, apres[i - 1].lecon);
});

test('Date de contrôle : une révision qui tomberait après la date est avancée à la veille, puis le planificateur reprend son cours', async () => {
  const { slug } = await eleveRevisions('Controle-Avance', 0);
  const lecon = await leconControle(slug, '2026-11-06');
  // q1 sue et sûre le 3 : sans contrôle, revue le 6 ou plus tard ; avec un contrôle le 6, la veille.
  const reponse = await appel(`/api/eleves/${slug}/revisions`, 'POST', { lecon: lecon.id, page: '0002-volcans.html', id: 'q1', choisie: 0, sur: true }, le(LENDEMAIN));
  assert.equal(reponse.data.prochaineRevision, minuitNovembre(5));
  const lue = async (date) => (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`, 'GET', undefined, le(date))).data.questions.find((q) => q.id === 'q1');
  assert.equal((await lue('2026-11-04T12:00:00.000Z')).prochaineRevision, minuitNovembre(5));
  const dues = async (date) => (await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le(date))).data.questions.map((q) => q.id);
  assert.ok((await dues('2026-11-05T12:00:00.000Z')).includes('q1'));
  // Après le contrôle : la date normale, plus tard que la veille.
  assert.ok(Date.parse((await lue('2026-11-07T12:00:00.000Z')).prochaineRevision) >= Date.parse('2026-11-06T12:00:00.000Z'));
});

// Maîtrise et Retenu appuyés sur la mémoire des Questions (#67).
test('Maîtrise : une Leçon avec Questions suit leur probabilité de se souvenir ; Retenu suit leur stabilité', async () => {
  const lecon = await leconBanque();
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  // Deux quiz réussis couvrant l'Objectif 1, à un jour d'écart.
  await appel(`${url}/scores`, 'POST', { score: 100, page: '0001-volcans.html', objectifs: [1] }, { 'X-Cartable-Maintenant': '2026-10-01T10:00:00.000Z' });
  await appel(`${url}/scores`, 'POST', { score: 100, page: '0001-volcans.html', objectifs: [1] }, { 'X-Cartable-Maintenant': '2026-10-02T10:00:00.000Z' });
  const question = (id, journal) => ({ id, page: '0002-volcans.html', contenu: { enonce: `${id} ?`, reponses: ['a', 'b'], bonne: 0, explication: '', objectifs: [1] }, journal });
  const ecrire = (banque) => fs.writeFile(path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'questions.json'), JSON.stringify(banque));
  const lire = async (maintenant) => (await appel(url, 'GET', undefined, { 'X-Cartable-Maintenant': maintenant })).data;

  // Une Question répondue juste une seule fois : stabilité 3,173 jours, donc 90 % au bout de 3,173 jours.
  await ecrire({ '0002-volcans.html#q1': question('q1', [{ date: '2026-10-02T10:00:00.000Z', juste: true, origine: 'quiz' }]) });
  const t = Date.parse('2026-10-02T10:00:00.000Z');
  assert.deepEqual((await lire(new Date(t + 3.173 * 86_400_000).toISOString())).maitrise, { pourcentage: 90, palier: 'acquis' });
  assert.deepEqual((await lire(new Date(t + 30 * 86_400_000).toISOString())).maitrise, { pourcentage: 56, palier: 'à consolider' });
  // Stabilité de quelques jours seulement : pas Retenu, même avec deux quiz réussis espacés.
  assert.equal((await lire('2026-10-03T10:00:00.000Z')).objectifs[0].retenu, false);

  // Répondue juste deux jours de suite : stabilité d'environ 6 jours, Retenu.
  await ecrire({ '0002-volcans.html#q1': question('q1', [
    { date: '2026-10-01T10:00:00.000Z', juste: true, origine: 'quiz' }, { date: '2026-10-02T10:00:00.000Z', juste: true, origine: 'quiz' },
  ]) });
  const lue = await lire('2026-10-03T10:00:00.000Z');
  assert.equal(lue.objectifs[0].retenu, true);
  assert.equal(lue.objectifs[1].retenu, false);
  // La liste des Leçons montre la même Maîtrise, à la même date.
  const resume = (await appel('/api/eleves/zoe-test/lecons', 'GET', undefined, { 'X-Cartable-Maintenant': '2026-10-03T10:00:00.000Z' })).data.find((l) => l.id === lecon.id);
  assert.deepEqual(resume.maitrise, lue.maitrise);
});

// Consignes du prof (spec #47) : au début d'une nouvelle page, le préambule cite les Questions les plus fragiles.
const banqueFragile = () => {
  const question = (id, enonce, journal) => [`0002-volcans.html#${id}`, { id, page: '0002-volcans.html', contenu: { enonce, reponses: ['a', 'b'], bonne: 0, explication: '', objectifs: [1] }, journal }];
  const le = (jour, juste, autres = {}) => ({ date: `2026-10-0${jour}T10:00:00.000Z`, juste, origine: 'quiz', ...autres });
  return Object.fromEntries([
    question('solide', 'Question bien sue ?', [le(1, true), le(3, true), le(7, true)]),
    question('ratee', 'Question ratée ?', [le(7, false)]),
    question('hesitante', 'Question hésitante ?', [le(7, true, { sur: false })]),
    question('sue', 'Question sue une fois ?', [le(7, true)]),
  ]);
};
const fragilesDans = (prompt) => ['Question bien sue', 'Question ratée', 'Question hésitante', 'Question sue une fois'].filter((e) => prompt.includes(`« ${e} ? »`));

test('Consignes du prof : le préambule de relais cite les trois Questions les plus fragiles, de la plus fragile à la moins fragile', async () => {
  const lecon = await leconBanque();
  await fs.writeFile(path.join(eleves, 'zoe-test', 'lecons', lecon.id, 'questions.json'), JSON.stringify(banqueFragile()));
  assert.equal((await message(lecon, 'Page suivante')).status, 200);
  const prompt = await argsDe(lecon);
  assert.match(prompt, /Passage de relais/);
  assert.match(prompt, /Questions les plus fragiles/);
  assert.deepEqual(fragilesDans(prompt), ['Question ratée', 'Question hésitante', 'Question sue une fois']);
  assert.ok(prompt.indexOf('Question ratée') < prompt.indexOf('Question hésitante') && prompt.indexOf('Question hésitante') < prompt.indexOf('Question sue une fois'));
  assert.match(prompt, /« Question ratée \? » \(0002-volcans\.html\)/);
});

test('Consignes du prof : le préambule d\'une session reprise cite aussi les Questions les plus fragiles ; rien sans Questions', async () => {
  const lecon = await leconBanque();
  const dir = path.join(eleves, 'zoe-test', 'lecons', lecon.id);
  // Pas encore de page : la session est reprise, avec le préambule court.
  await fs.rm(path.join(dir, 'lessons'), { recursive: true });
  await fs.writeFile(path.join(dir, 'questions.json'), JSON.stringify(banqueFragile()));
  assert.equal((await message(lecon, 'On continue')).status, 200);
  const prompt = await argsDe(lecon);
  assert.doesNotMatch(prompt, /Passage de relais/);
  assert.deepEqual(fragilesDans(prompt), ['Question ratée', 'Question hésitante', 'Question sue une fois']);

  const sans = await leconBanque();
  assert.equal((await message(sans, 'Page suivante')).status, 200);
  assert.doesNotMatch(await argsDe(sans), /Questions les plus fragiles/);
});

// Variantes des Questions (#69), écrites en arrière-plan par le faux `claude` (voir faux-variantes.mjs).
const nbLancementsVariantes = async () => (await fs.readFile(path.join(dossier, 'lancements-variantes'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).length;
const pause = (ms = 200) => new Promise((r) => setTimeout(r, ms));
// Élève neuf avec `nombre` Leçons dont la page 0002-volcans.html porte `quizBanque` ; Propositions attendues et traces
// de lancement des Variantes effacées.
const eleveVariantes = async (pseudo, nombre = 1) => {
  const slug = slugify(pseudo);
  await appel('/api/eleves', 'POST', { pseudo, age: 11, niveau: 'Primaire 6' });
  const lecons = [];
  for (let i = 0; i < nombre; i++) {
    const lecon = await avecFichier('objectifs', async () => (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: `sujet ${i}` })).data);
    await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-volcans.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizBanque)}</script>`);
    lecons.push(lecon);
  }
  await attendrePropositions(slug);
  await fs.rm(path.join(dossier, 'lancements-variantes'), { force: true });
  const quiz = (lecon, date = BANQUE_DATE) => appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corpsBanque('0002-volcans.html'), le(date));
  const lire = async (lecon) => (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`, 'GET', undefined, le(BANQUE_DATE))).data.questions;
  const avecVariantes = (lecon) => sonderJusqua(() => lire(lecon), (qs) => qs.length && qs.every((q) => q.variantes?.length), 'Variantes jamais rattachées');
  // Plus aucun tour de Variantes en cours : le dossier de travail est vidé à la fin de chaque tour.
  const finDuTour = (lecon) => sonderJusqua(() => existe(path.join(eleves, slug, 'lecons', lecon.id, 'variantes', 'questions-a-varier.json')), (e) => !e, 'Tour de Variantes jamais fini');
  return { slug, lecons, quiz, lire, avecVariantes, finDuTour };
};

test('Variantes : demandées en arrière-plan quand une Question atteint deux réponses, au Modèle le moins cher, puis rattachées', async () => {
  const { lecons: [lecon], quiz, lire, avecVariantes } = await eleveVariantes('Var-Lance');
  // Une seule réponse par Question : pas de Variantes.
  assert.equal((await quiz(lecon)).status, 201);
  await pause();
  assert.equal(await nbLancementsVariantes(), 0);

  // Deuxième réponse : un tour en arrière-plan, que l'Élève n'attend pas.
  await avecFichier('variantes-attendre', async () => {
    assert.equal((await quiz(lecon)).status, 201);
    await sonderJusqua(nbLancementsVariantes, (n) => n === 1, 'Variantes jamais demandées');
    assert.ok((await lire(lecon)).every((q) => !q.variantes?.length));
  });
  const questions = await avecVariantes(lecon);
  const args = await fs.readFile(path.join(dossier, 'args-variantes'), 'utf8');
  assert.match(args, /--model\nhaiku\n/);
  assert.match(args, /--effort\nlow\n/);
  assert.doesNotMatch(args, /--add-dir/);
  // Deux variantes valides par Question, les mal formées écartées ; Objectifs de la Question d'origine.
  const q1 = questions.find((q) => q.id === 'q1');
  assert.deepEqual(q1.variantes, [
    { enonce: 'Où sort la lave ? (variante 1)', reponses: ['Par les racines', 'Par le cratère'], bonne: 1, explication: 'Le cratère.', objectifs: [1] },
    { enonce: 'Où sort la lave ? (variante 2)', reponses: ['Par les racines', 'Par le cratère'], bonne: 1, explication: 'Le cratère.', objectifs: [1] },
  ]);
  // Coût du tour gardé avec son type de tâche.
  assert.equal((await appel('/api/eleves/var-lance/couts')).data.parTache.variantes.tours, 1);
  // Un nouveau quiz garde les Variantes et n'en redemande pas.
  await quiz(lecon);
  await pause();
  assert.equal(await nbLancementsVariantes(), 1);
  assert.equal((await lire(lecon)).find((q) => q.id === 'q1').variantes.length, 2);
});

test('Variantes : un seul tour à la fois par Élève, les Questions d\'une autre Leçon sont variées après', async () => {
  const { lecons: [a, b], quiz, avecVariantes } = await eleveVariantes('Var-Seul', 2);
  await quiz(a);
  await quiz(b);
  await avecFichier('variantes-attendre', async () => {
    await quiz(a);
    await sonderJusqua(nbLancementsVariantes, (n) => n === 1, 'Variantes jamais demandées');
    // Pendant le tour de la Leçon a, b atteint deux réponses : pas de second tour simultané.
    assert.equal((await quiz(b)).status, 201);
    await pause();
    assert.equal(await nbLancementsVariantes(), 1);
  });
  await avecVariantes(a);
  await avecVariantes(b);
  assert.equal(await nbLancementsVariantes(), 2);
});

test('Variantes : un tour raté ou sans variante valide ne rattache rien, et n\'est retenté qu\'une fois', async () => {
  const { lecons: [lecon], quiz, lire, finDuTour } = await eleveVariantes('Var-Echec');
  await quiz(lecon);
  await avecFichier('variantes-echouer', async () => {
    await quiz(lecon);
    await sonderJusqua(nbLancementsVariantes, (n) => n === 1, 'Variantes jamais demandées');
    await finDuTour(lecon);
  });
  assert.ok((await lire(lecon)).every((q) => !q.variantes?.length));
  // Réponse suivante : un second essai, qui n'écrit que des variantes mal formées.
  await avecFichier('variantes-mal-formees', async () => {
    await quiz(lecon);
    await sonderJusqua(nbLancementsVariantes, (n) => n === 2, 'Variantes jamais redemandées');
    await finDuTour(lecon);
  });
  assert.ok((await lire(lecon)).every((q) => !q.variantes?.length));
  // Plus d'essai ensuite : la Question reste sans Variantes.
  await quiz(lecon);
  await pause();
  assert.equal(await nbLancementsVariantes(), 2);
});

test('Variantes : une Révision du jour sert la Question ou une variante ; la réponse met à jour la Question d\'origine', async () => {
  const { slug, lecons: [lecon], quiz, avecVariantes } = await eleveVariantes('Var-Revision');
  await quiz(lecon);
  await quiz(lecon);
  await avecVariantes(lecon);
  const url = `/api/eleves/${slug}/revisions`;
  // Tirage au hasard : sur 30 séries, la Question d'origine et ses deux variantes sont servies.
  const servies = new Set();
  for (let i = 0; i < 30; i++) {
    const { data } = await appel(url, 'GET', undefined, le(LENDEMAIN));
    const q1 = data.questions.find((q) => q.id === 'q1');
    servies.add(q1.variante ?? 'origine');
    if (q1.variante !== undefined) {
      assert.equal(q1.enonce, `Où sort la lave ? (variante ${q1.variante + 1})`);
      assert.deepEqual(q1.reponses, ['Par les racines', 'Par le cratère']);
    } else assert.equal(q1.enonce, 'Où sort la lave ?');
  }
  assert.deepEqual(servies, new Set(['origine', 0, 1]));
  assert.equal((await appel(url, 'GET', undefined, le(LENDEMAIN))).data.dues, 2);

  // Réponse à la variante 1 : corrigée avec sa propre bonne réponse, journalisée sur la Question d'origine.
  const repondre = (corps) => appel(url, 'POST', { lecon: lecon.id, page: '0002-volcans.html', id: 'q1', ...corps }, le(LENDEMAIN));
  assert.equal((await repondre({ choisie: 0, variante: 1 })).data.juste, false);
  assert.equal((await repondre({ choisie: 9, variante: 1 })).status, 400);
  assert.equal((await repondre({ choisie: 1, variante: 5 })).status, 400);
  const juste = await repondre({ choisie: 1, variante: 1, sur: true });
  assert.equal(juste.status, 200);
  assert.equal(juste.data.juste, true);
  assert.equal(juste.data.bonne, 'Par le cratère');
  const q1 = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`, 'GET', undefined, le(LENDEMAIN))).data.questions.find((q) => q.id === 'q1');
  assert.deepEqual(q1.journal.slice(-2), [
    { date: LENDEMAIN, juste: false, origine: 'revision', variante: 1 },
    { date: LENDEMAIN, juste: true, sur: true, origine: 'revision', variante: 1 },
  ]);
  // Même état de mémoire : la Question (et donc ses variantes) n'est plus due aujourd'hui.
  assert.equal((await appel(url, 'GET', undefined, le(LENDEMAIN))).data.dues, 1);
});

test('Variantes : une Question réécrite par le prof perd ses Variantes, qui sont redemandées', async () => {
  const { slug, lecons: [lecon], quiz, lire, avecVariantes } = await eleveVariantes('Var-Reecrite');
  await quiz(lecon);
  await quiz(lecon);
  await avecVariantes(lecon);
  const reecrit = { ...quizBanque, questions: quizBanque.questions.map((q) => (q.id === 'q1' ? { ...q, enonce: 'D’où sort la lave ?' } : q)) };
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-volcans.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(reecrit)}</script>`);
  await avecFichier('variantes-attendre', async () => {
    await quiz(lecon);
    const questions = await lire(lecon);
    assert.deepEqual(questions.find((q) => q.id === 'q1').variantes, []);
    assert.equal(questions.find((q) => q.id === 'q2').variantes.length, 2);
    await sonderJusqua(nbLancementsVariantes, (n) => n === 2, 'Variantes jamais redemandées');
  });
  const q1 = (await avecVariantes(lecon)).find((q) => q.id === 'q1');
  assert.equal(q1.variantes[0].enonce, 'D’où sort la lave ? (variante 1)');
});

test('Révisions du jour : une Question avec une image la garde dans la Leçon et dans la révision (US25)', async () => {
  const { slug, lecons: [lecon] } = await eleveRevisions('Revis-Image', 1);
  // Le prof ajoute une image rapatriée (images/ de la Leçon) à q1, une image distante à q2 : l'Élève refait le quiz.
  const quiz = structuredClone(quizBanque);
  quiz.questions[0].image = { src: '../images/cratere.png', alt: 'Le cratère du Stromboli' };
  quiz.questions[1].image = { src: 'https://upload.wikimedia.org/magma.png', alt: 'Du magma' };
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-volcans.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quiz)}</script>`);
  await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corpsBanque('0002-volcans.html'), le(BANQUE_DATE));
  const questions = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`, 'GET', undefined, le(BANQUE_DATE))).data.questions;
  assert.deepEqual(questions.find((q) => q.id === 'q1').contenu.image, { src: '../images/cratere.png', alt: 'Le cratère du Stromboli' });
  // Une image qui n'est pas dans la Leçon (non rapatriée) n'est pas gardée : la révision se fait hors ligne.
  assert.equal(questions.find((q) => q.id === 'q2').contenu.image, undefined);
  // En révision, son adresse est celle du fichier de la Leçon servi par l'appli.
  const { data } = await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le(LENDEMAIN));
  assert.deepEqual(data.questions.find((q) => q.id === 'q1').image, { src: `/fichiers/${slug}/${lecon.id}/images/cratere.png`, alt: 'Le cratère du Stromboli' });
  assert.equal(data.questions.find((q) => q.id === 'q2').image, undefined);
  // Ses Variantes gardent son image, comme ses Objectifs : elles testent la même chose.
  const fichier = path.join(eleves, slug, 'lecons', lecon.id, 'questions.json');
  const banque = JSON.parse(await fs.readFile(fichier, 'utf8'));
  banque['0002-volcans.html#q1'].variantes = [{ enonce: 'Par où la lave sort-elle ?', reponses: ['Le cratère', 'Les racines'], bonne: 0, explication: '' }];
  await fs.writeFile(fichier, JSON.stringify(banque));
  const [variante] = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`)).data.questions.find((q) => q.id === 'q1').variantes;
  assert.deepEqual(variante.image, { src: '../images/cratere.png', alt: 'Le cratère du Stromboli' });
});

// Formats de rappel actif (spec #48, ticket #70) : texte à trous et remettre dans l'ordre, dans la Banque et les
// Révisions du jour, avec crédit partiel. Le corps envoyé est celui que le Kit lui-même construit.
const quizRappel = {
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Où sort la lave ?', reponses: ['Par le cratère', 'Par les racines'], bonne: 0, explication: 'Le cratère.' },
    { id: 't1', type: 'trous', enonce: 'Complète.', texte: 'La lave sort par le [cratère] du [volcan].', intrus: ['nuage'], explication: 'En haut.' },
    { id: 'o1', type: 'ordre', enonce: 'Dans l’ordre ?', elements: ['Le magma monte', 'La lave sort', 'La lave refroidit'], explication: 'Dans cet ordre.' },
  ],
};
const corpsRappel = (page, choix, confiance = {}) => {
  const { type, ...corps } = messageScore(lireQuiz(quizRappel), choix, page, confiance);
  return corps;
};

test('Formats de rappel actif : le score compte le crédit partiel, la Banque garde le contenu de chaque format, et un partiel revient vite', async () => {
  const lecon = await leconBanque();
  const url = `/api/eleves/zoe-test/lecons/${lecon.id}`;
  await ecrirePageQuiz(lecon, '0002-rappel.html', quizRappel);
  // q1 juste sûr ; t1 à moitié (un trou sur deux), sûr ; o1 juste sûr.
  const corps = corpsRappel('0002-rappel.html', { q1: 0, t1: [0, 2], o1: [0, 1, 2] }, { q1: true, t1: true, o1: true });
  const r = await appel(`${url}/scores`, 'POST', { ...corps, score: 0 }, le(BANQUE_DATE));
  assert.equal(r.status, 201);
  assert.equal(r.data.scores.at(-1).score, 83); // (1 + 0,5 + 1) / 3, recalculé par le serveur
  const t1Resultat = r.data.scores.at(-1).questions.find((q) => q.id === 't1');
  assert.deepEqual(t1Resultat, {
    id: 't1', type: 'trous', enonce: 'Complète.', choisie: 'La lave sort par le [cratère] du [nuage].', bonne: 'La lave sort par le [cratère] du [volcan].',
    juste: false, points: 0.5, detail: { places: ['cratère', 'nuage'] }, bonus: false, objectifs: [1], sur: true,
  });

  const [, t1, o1] = r.data.questions;
  assert.deepEqual(t1.contenu, { type: 'trous', enonce: 'Complète.', segments: ['La lave sort par le ', ' du ', '.'], trous: ['cratère', 'volcan'], intrus: ['nuage'], explication: 'En haut.', objectifs: [1] });
  assert.deepEqual(o1.contenu, { type: 'ordre', enonce: 'Dans l’ordre ?', elements: ['Le magma monte', 'La lave sort', 'La lave refroidit'], explication: 'Dans cet ordre.', objectifs: [1] });
  // Partiel : pas juste au journal, avec ses points ; noté « difficile » (revu le lendemain), le juste et sûr plus tard.
  assert.deepEqual(t1.journal[0], { date: BANQUE_DATE, juste: false, points: 0.5, sur: true, origine: 'quiz' });
  assert.equal(t1.prochaineRevision, LENDEMAIN);
  assert.ok(Date.parse(o1.prochaineRevision) > Date.parse(LENDEMAIN), o1.prochaineRevision);
});

test('Formats de rappel actif : en Révision du jour, le serveur corrige chaque format lui-même, crédit partiel compris', async () => {
  const slug = slugify('Revis-Rappel');
  await appel('/api/eleves', 'POST', { pseudo: 'Revis-Rappel', age: 11, niveau: 'Primaire 6' });
  const lecon = await avecFichier('objectifs', async () => (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: 'rappel' })).data);
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-rappel.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizRappel)}</script>`);
  await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', corpsRappel('0002-rappel.html', { q1: 0, t1: [1, 0], o1: [2, 1, 0] }), le(BANQUE_DATE));
  await attendrePropositions(slug);

  const { data } = await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le(LENDEMAIN));
  const servie = data.questions.find((q) => q.id === 't1');
  assert.equal(servie.type, 'trous');
  assert.deepEqual(servie.trous, ['cratère', 'volcan']);

  const url = `/api/eleves/${slug}/revisions`;
  const repondre = (id, choisie) => appel(url, 'POST', { lecon: lecon.id, page: '0002-rappel.html', id, choisie, sur: true, juste: true }, le(LENDEMAIN));
  const partiel = await repondre('o1', [0, 2, 1]);
  assert.equal(partiel.status, 200);
  assert.equal(partiel.data.juste, false);
  assert.equal(partiel.data.points, 2 / 3);
  assert.equal(partiel.data.bonne, 'Le magma monte → La lave sort → La lave refroidit');
  const juste = await repondre('t1', [0, 1]);
  assert.equal(juste.data.juste, true);
  for (const choisie of [0, [0, 0], [0, 1, 2], 'cratère']) assert.equal((await repondre('t1', choisie)).status, 400, JSON.stringify(choisie));

  const { questions } = (await appel(`/api/eleves/${slug}/lecons/${lecon.id}`, 'GET', undefined, le(LENDEMAIN))).data;
  assert.deepEqual(questions.find((q) => q.id === 'o1').journal.at(-1), { date: LENDEMAIN, juste: false, points: 2 / 3, sur: true, origine: 'revision' });
  assert.deepEqual(questions.find((q) => q.id === 't1').journal.at(-1), { date: LENDEMAIN, juste: true, sur: true, origine: 'revision' });
});

test('Formats de rappel actif : la consigne demande au moins une question de rappel actif par quiz, et le Kit documente ses formats', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les saisons' })).data;
  const args = await argsDe(lecon);
  assert.match(args, /au moins une question de rappel actif \(pas un QCM\)/);
  assert.match(args, /"trous"/);
  assert.match(args, /"ordre"/);
  const doc = await (await fetch(`${base}/kit/v1/LISEZMOI.md`)).text();
  assert.match(doc, /"type": "trous"/);
  assert.match(doc, /"intrus"/);
  assert.match(doc, /"type": "ordre"/);
  assert.match(doc, /"elements"/);
  for (const fichier of ['types/index.js', 'types/trous.js', 'types/ordre.js', 'rendus/index.js', 'rendus/trous.js', 'rendus/ordre.js']) {
    assert.equal((await fetch(`${base}/kit/v1/${fichier}`)).status, 200, fichier);
  }
});

// Mathématiques (spec #48, ticket #73) : exemple travaillé à étapes à compléter.
const quizEtapes = {
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Combien font 2 + 2 ?', reponses: ['4', '22'], bonne: 0, explication: 'Deux et deux.' },
    {
      id: 'e1', type: 'etapes', enonce: 'Calcule 3/4 + 1/6.', explication: 'Même dénominateur, puis on additionne les numérateurs.',
      etapes: [{ texte: 'Dénominateur commun : 12' }, { texte: '3/4 = 9/12', intrus: ['3/4 = 3/12'] }, { texte: '9/12 + 2/12 = 11/12', intrus: ['9/12 + 2/12 = 11/24'] }],
    },
  ],
};

test('Exemple à étapes : son crédit partiel compte dans le score, la Banque le garde et la Révision du jour le corrige', async () => {
  const slug = slugify('Revis-Etapes');
  await appel('/api/eleves', 'POST', { pseudo: 'Revis-Etapes', age: 11, niveau: 'Primaire 6' });
  const lecon = await avecFichier('objectifs', async () => (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: 'fractions' })).data);
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-etapes.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizEtapes)}</script>`);
  const { type, ...corps } = messageScore(lireQuiz(quizEtapes), { q1: 0, e1: [0, 1] }, '0002-etapes.html', { q1: true, e1: true });
  const r = await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', { ...corps, score: 0 }, le(BANQUE_DATE));
  assert.equal(r.status, 201);
  assert.equal(r.data.scores.at(-1).score, 75);
  const e1 = r.data.questions.find((q) => q.id === 'e1');
  assert.deepEqual(e1.contenu.etapes, quizEtapes.questions[1].etapes);
  assert.deepEqual(e1.journal[0], { date: BANQUE_DATE, juste: false, points: 0.5, sur: true, origine: 'quiz' });
  await attendrePropositions(slug);

  const url = `/api/eleves/${slug}/revisions`;
  const servie = (await appel(url, 'GET', undefined, le(LENDEMAIN))).data.questions.find((q) => q.id === 'e1');
  assert.equal(servie.type, 'etapes');
  const repondre = (choisie) => appel(url, 'POST', { lecon: lecon.id, page: '0002-etapes.html', id: 'e1', choisie, sur: true, juste: true }, le(LENDEMAIN));
  const juste = await repondre([0, 0]);
  assert.equal(juste.status, 200);
  assert.equal(juste.data.juste, true);
  assert.equal(juste.data.bonne, 'étape 2 : 3/4 = 9/12 ; étape 3 : 9/12 + 2/12 = 11/12');
  for (const choisie of [0, [0], [0, 2]]) assert.equal((await repondre(choisie)).status, 400, JSON.stringify(choisie));
});

test('Exemple à étapes : la consigne de page le demande en mathématiques, et le Kit le documente et le sert', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les fractions' })).data;
  const args = await argsDe(lecon);
  assert.match(args, /En mathématiques[^\n]*exemple entièrement résolu[^\n]*"etapes"[^\n]*mélangés/);
  const doc = await (await fetch(`${base}/kit/v1/LISEZMOI.md`)).text();
  assert.match(doc, /"type": "etapes"/);
  assert.match(doc, /"intrus"/);
  for (const fichier of ['types/etapes.js', 'rendus/etapes.js']) assert.equal((await fetch(`${base}/kit/v1/${fichier}`)).status, 200, fichier);
});

test('Formats de rappel actif : une question mal formée ou d\'un type inconnu est signalée au prof au tour suivant seulement', async () => {
  const quiz = { objectifs: [1], questions: [quizRappel.questions[0], { id: 'x1', type: 'mystere', enonce: '?' }, { ...quizRappel.questions[1], intrus: [] }] };
  const lecon = await avecPageImages({ page: `<script type="application/json" id="cartable-quiz">${JSON.stringify(quiz)}</script>`, manifeste: [] },
    async () => (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'quiz bancal' })).data);
  assert.doesNotMatch(await argsDe(lecon), /Questions ignorées/);
  await message(lecon, 'ok');
  const signale = await argsDe(lecon);
  assert.match(signale, /Questions ignorées/);
  assert.ok(signale.includes('- 0002-images.html, x1 : type inconnu « mystere »'), signale);
  assert.ok(signale.includes('- 0002-images.html, t1 : question « trous » mal formée'), signale);
  assert.equal(Object.hasOwn((await appel('/api/eleves/zoe-test/lecons')).data.find((l) => l.id === lecon.id), 'questionsIgnorees'), false);
  await message(lecon, 'ok');
  assert.doesNotMatch(await argsDe(lecon), /Questions ignorées/);
});

// Formats « réfléchis puis dévoile » et « meilleure explication » (spec #48, ticket #72).
const quizDevoile = {
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Où sort la lave ?', reponses: ['Par le cratère', 'Par les racines'], bonne: 0, explication: 'Le cratère.' },
    { id: 'e1', type: 'explication', enonce: 'Pourquoi la lave devient-elle noire ?', reponses: ['Elle se solidifie en roche', 'Elle brûle', 'La pluie la salit'], bonne: 0, explication: 'Elle refroidit.' },
    { id: 'o1', type: 'ordre', enonce: 'Dans l’ordre ?', elements: ['Le magma monte', 'La lave sort', 'La lave refroidit'], explication: 'Dans cet ordre.' },
    { id: 'd1', type: 'devoile', enonce: 'Qu’est-ce que le magma ?', reponse: 'De la roche fondue sous terre.', explication: 'Il devient lave en sortant.' },
    { id: 'd2', type: 'devoile', enonce: 'Qu’est-ce qu’un cratère ?', reponse: 'L’ouverture au sommet du volcan.', explication: 'La lave en sort.' },
  ],
};

test('Dévoile et meilleure explication : « à moitié » vaut 0,5 et revient le lendemain, « je l\'avais » plus tard, et la Révision du jour les corrige', async () => {
  const slug = slugify('Revis-Devoile');
  await appel('/api/eleves', 'POST', { pseudo: 'Revis-Devoile', age: 11, niveau: 'Primaire 6' });
  const lecon = await avecFichier('objectifs', async () => (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: 'dévoile' })).data);
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-devoile.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizDevoile)}</script>`);
  const { type, ...corps } = messageScore(lireQuiz(quizDevoile), { q1: 0, e1: 0, o1: [0, 1, 2], d1: 'moitie', d2: 'avais' }, '0002-devoile.html', { q1: true, e1: true, o1: true });
  const r = await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', { ...corps, score: 0 }, le(BANQUE_DATE));
  assert.equal(r.status, 201);
  assert.equal(r.data.scores.at(-1).score, 90); // (1 + 1 + 1 + 0,5 + 1) / 5
  await attendrePropositions(slug);

  const url = `/api/eleves/${slug}/lecons/${lecon.id}`;
  const banque = (await appel(url, 'GET', undefined, le(BANQUE_DATE))).data.questions;
  const [e1, d1, d2] = ['e1', 'd1', 'd2'].map((id) => banque.find((q) => q.id === id));
  assert.deepEqual(e1.contenu, { type: 'explication', enonce: 'Pourquoi la lave devient-elle noire ?', reponses: ['Elle se solidifie en roche', 'Elle brûle', 'La pluie la salit'], bonne: 0, explication: 'Elle refroidit.', objectifs: [1] });
  assert.deepEqual(d1.contenu, { type: 'devoile', enonce: 'Qu’est-ce que le magma ?', reponse: 'De la roche fondue sous terre.', explication: 'Il devient lave en sortant.', objectifs: [1] });
  // « À moitié » : juste en partie, noté « difficile » ; « je l'avais » : juste (vaut sûr), noté « bien ».
  assert.deepEqual(d1.journal[0], { date: BANQUE_DATE, juste: false, points: 0.5, origine: 'quiz' });
  assert.equal(d1.prochaineRevision, LENDEMAIN);
  assert.deepEqual(d2.journal[0], { date: BANQUE_DATE, juste: true, origine: 'quiz' });
  assert.ok(Date.parse(d2.prochaineRevision) > Date.parse(LENDEMAIN), d2.prochaineRevision);

  const repondre = (id, choisie) => appel(`/api/eleves/${slug}/revisions`, 'POST', { lecon: lecon.id, page: '0002-devoile.html', id, choisie }, le(LENDEMAIN));
  const pas = await repondre('d1', 'pas');
  assert.equal(pas.status, 200);
  assert.equal(pas.data.juste, false);
  assert.equal(Object.hasOwn(pas.data, 'points'), false);
  assert.equal(pas.data.bonne, 'De la roche fondue sous terre.');
  assert.equal((await repondre('e1', 0)).data.juste, true);
  for (const choisie of [0, 'oui', ['avais']]) assert.equal((await repondre('d1', choisie)).status, 400, JSON.stringify(choisie));
});

test('Dévoile et meilleure explication : la consigne dit quand les utiliser, et le Kit les documente', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les orages' })).data;
  const args = await argsDe(lecon);
  assert.match(args, /"devoile"/);
  assert.match(args, /"explication"/);
  const doc = await (await fetch(`${base}/kit/v1/LISEZMOI.md`)).text();
  assert.match(doc, /"type": "devoile"/);
  assert.match(doc, /"type": "explication"/);
  assert.match(doc, /FSRS/);
  for (const fichier of ['types/devoile.js', 'types/explication.js', 'rendus/devoile.js', 'rendus/explication.js']) {
    assert.equal((await fetch(`${base}/kit/v1/${fichier}`)).status, 200, fichier);
  }
});

// Formats associer et classer (spec #48, ticket #71), dans la Banque et les Révisions du jour, avec crédit partiel.
const quizAssocierClasser = {
  objectifs: [1],
  questions: [
    { id: 'q1', type: 'qcm', enonce: 'Qui règne sur l’Olympe ?', reponses: ['Zeus', 'Hadès'], bonne: 0, explication: 'Zeus.' },
    { id: 'a1', type: 'associer', enonce: 'Relie.', paires: [['Zeus', 'le ciel'], ['Poséidon', 'la mer'], ['Hadès', 'les Enfers']], explication: 'Trois frères.' },
    { id: 'c1', type: 'classer', enonce: 'Range.', categories: [{ nom: 'Dieux', elements: ['Zeus', 'Héra'] }, { nom: 'Héros', elements: ['Ulysse', 'Achille'] }], explication: 'Les héros sont mortels.' },
  ],
};
const corpsAssocierClasser = (page, choix, confiance = {}) => {
  const { type, ...corps } = messageScore(lireQuiz(quizAssocierClasser), choix, page, confiance);
  return corps;
};

test('Formats associer et classer : la Banque garde leur contenu, et le serveur les corrige lui-même en Révision du jour', async () => {
  const slug = slugify('Revis-Associer');
  await appel('/api/eleves', 'POST', { pseudo: 'Revis-Associer', age: 11, niveau: 'Primaire 6' });
  const lecon = await avecFichier('objectifs', async () => (await appel(`/api/eleves/${slug}/lecons`, 'POST', { sujet: 'mythes' })).data);
  await fs.writeFile(path.join(eleves, slug, 'lecons', lecon.id, 'lessons', '0002-mythes.html'), `<script type="application/json" id="cartable-quiz">${JSON.stringify(quizAssocierClasser)}</script>`);
  // q1 juste ; a1 : une paire juste sur trois ; c1 : Héra chez les héros, 3 sur 4.
  const r = await appel(`/api/eleves/${slug}/lecons/${lecon.id}/scores`, 'POST', { ...corpsAssocierClasser('0002-mythes.html', { q1: 0, a1: [0, 2, 1], c1: [0, 1, 1, 1] }, { q1: true, a1: true, c1: true }), score: 0 }, le(BANQUE_DATE));
  assert.equal(r.status, 201);
  assert.equal(r.data.scores.at(-1).score, 69); // (1 + 1/3 + 0,75) / 3 = 69,4 %, recalculé par le serveur
  const c1Resultat = r.data.scores.at(-1).questions.find((q) => q.id === 'c1');
  assert.deepEqual(c1Resultat.detail, { categories: [{ nom: 'Dieux', elements: ['Zeus'] }, { nom: 'Héros', elements: ['Héra', 'Ulysse', 'Achille'] }] });
  const [, a1, c1] = r.data.questions;
  assert.deepEqual(a1.contenu, { type: 'associer', enonce: 'Relie.', paires: quizAssocierClasser.questions[1].paires, explication: 'Trois frères.', objectifs: [1] });
  assert.deepEqual(c1.contenu, { type: 'classer', enonce: 'Range.', categories: quizAssocierClasser.questions[2].categories, explication: 'Les héros sont mortels.', objectifs: [1] });
  assert.deepEqual(c1.journal[0], { date: BANQUE_DATE, juste: false, points: 0.75, sur: true, origine: 'quiz' });
  await attendrePropositions(slug);

  const { data } = await appel(`/api/eleves/${slug}/revisions`, 'GET', undefined, le(LENDEMAIN));
  assert.deepEqual(data.questions.find((q) => q.id === 'a1').paires, quizAssocierClasser.questions[1].paires);
  const url = `/api/eleves/${slug}/revisions`;
  const repondre = (id, choisie) => appel(url, 'POST', { lecon: lecon.id, page: '0002-mythes.html', id, choisie, sur: true, juste: true }, le(LENDEMAIN));
  const partiel = await repondre('c1', [0, 0, 1, 0]);
  assert.equal(partiel.status, 200);
  assert.equal(partiel.data.juste, false);
  assert.equal(partiel.data.points, 0.75);
  assert.equal(partiel.data.bonne, 'Dieux : Zeus, Héra ; Héros : Ulysse, Achille');
  assert.equal((await repondre('a1', [0, 1, 2])).data.juste, true);
  for (const choisie of [0, [0, 0, 1], [0, 1], 'Zeus']) assert.equal((await repondre('a1', choisie)).status, 400, JSON.stringify(choisie));
  for (const choisie of [[0, 0, 1], [0, 0, 1, 2]]) assert.equal((await repondre('c1', choisie)).status, 400, JSON.stringify(choisie));
});

test('Formats associer et classer : la consigne les cite pour les paires et les catégories, et le Kit les documente', async () => {
  const lecon = (await appel('/api/eleves/zoe-test/lecons', 'POST', { sujet: 'les animaux' })).data;
  const args = await argsDe(lecon);
  assert.match(args, /"associer"[^\n]*paires/);
  assert.match(args, /"classer"[^\n]*catégories/);
  const doc = await (await fetch(`${base}/kit/v1/LISEZMOI.md`)).text();
  assert.match(doc, /"type": "associer"/);
  assert.match(doc, /"paires"/);
  assert.match(doc, /"type": "classer"/);
  assert.match(doc, /"categories"/);
  for (const fichier of ['types/associer.js', 'types/classer.js', 'rendus/associer.js', 'rendus/classer.js']) {
    assert.equal((await fetch(`${base}/kit/v1/${fichier}`)).status, 200, fichier);
  }
});
