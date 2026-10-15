// Page suivante préparée pendant le quiz (#74), par l'API HTTP avec un faux `claude` propre à ce fichier : un serveur
// à part, où la préparation est active (elle est coupée dans test/api.test.js, CARTABLE_PREPARATION=0).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let serveur, base, dossier, eleves;
const journal = () => path.join(dossier, 'journal');

before(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-prep-'));
  eleves = path.join(dossier, 'eleves');
  // Faux `claude` : chaque tour écrit la page suivante de lessons/ (la première est un Pré-test, les autres ont un quiz
  // ordinaire du Kit) et note son début et sa fin dans `journal` (« debut preparation <élève>/<leçon> », « fin lecon <élève>/<leçon> »).
  // Dans le dossier d'une page préparée (pages-preparees/<leçon>), il écrit « préparée » dans la page ; le fichier
  // `attendre-preparation` l'y fait patienter, et `echouer-preparation` l'y fait échouer après un tour payé.
  // Les Propositions, hors sujet ici, restent vides.
  const faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
if [ "$(basename "$PWD")" = propositions ]; then
  echo '[]' > propositions.json
  echo '{"result":"ok","session_id":"s-prop","is_error":false}'
  exit 0
fi
LECON=$(basename "$(dirname "$(dirname "$PWD")")")/$(basename "$PWD")
if [ "$(basename "$(dirname "$PWD")")" = pages-preparees ]; then QUI=preparation; else QUI=lecon; fi
echo "debut $QUI $LECON" >> '${dossier}/journal'
if [ $QUI = preparation ]; then
  while [ -e '${dossier}/attendre-preparation' ]; do sleep 0.05; done
fi
mkdir -p lessons
N=$(( $(ls lessons | grep -c '\\.html$') + 1 ))
if [ $N = 1 ]; then PRETEST=',"pretest":true'; else PRETEST=''; fi
echo '{"titre":"Les volcans","categorie":"Sciences","objectifs":["Nommer les parties d’un volcan","Expliquer une éruption"]}' > lesson.json
cat > lessons/000$N-page.html <<FIN
<p>$QUI</p>
<script type="application/json" id="cartable-quiz">{"objectifs":[1]$PRETEST,"questions":[{"id":"q1","type":"qcm","enonce":"Où sort la lave ?","reponses":["Par le cratère","Par les racines"],"bonne":0,"explication":"Le cratère."}]}</script>
FIN
echo "fin $QUI $LECON" >> '${dossier}/journal'
if [ $QUI = preparation ] && [ -e '${dossier}/echouer-preparation' ]; then
  echo '{"result":"Erreur","is_error":true,"total_cost_usd":0.25,"modelUsage":{"claude-sonnet-test":{"costUSD":0.25}}}'
  exit 0
fi
echo '{"result":"Page '$N' ('$QUI')","session_id":"s-'$N'","is_error":false,"total_cost_usd":0.25,"modelUsage":{"claude-sonnet-test":{"costUSD":0.25}}}'
`, { mode: 0o755 });
  const port = 3700 + Math.floor(Math.random() * 300);
  base = `http://localhost:${port}`;
  serveur = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: port, CLAUDE_BIN: faux, TEACH_SKILL_DIR: dossier, ELEVES_DIR: eleves, CARTABLE_PREPARATION: '1', CARTABLE_HORLOGE_INJECTABLE: '1' },
    cwd: path.join(import.meta.dirname, '..'),
    stdio: 'pipe',
  });
  await new Promise((r) => serveur.stdout.once('data', r));
});

after(async () => {
  serveur.kill();
  await fs.rm(dossier, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

// `entetes` : en-têtes en plus, comme X-Cartable-Maintenant pour fixer la date du serveur (voir `le`).
const appel = async (url, method = 'GET', body, entetes = {}) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...entetes }, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
};

// Lignes du journal du faux `claude` pour une Leçon (`cle` : « <élève>/<leçon> »).
const lignes = async (cle) => (await fs.readFile(journal(), 'utf8').catch(() => '')).split('\n').filter((l) => l.endsWith(` ${cle}`));
const attendreQue = async (condition) => {
  for (let i = 0; i < 200; i++) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('Condition jamais remplie');
};
// Une préparation lancée pour la Leçon est terminée (le faux `claude` a fini d'écrire).
const preparationFinie = (cle, n = 1) => attendreQue(async () => (await lignes(cle)).filter((l) => l === `fin preparation ${cle}`).length >= n);

const contenuPage = async (slug, id, page) => (await fetch(`${base}/fichiers/${slug}/${id}/lessons/${page}`)).text();

let numero = 0;
async function nouvelEleve() {
  const pseudo = `Prep-${++numero}`;
  await appel('/api/eleves', 'POST', { pseudo, age: 10, niveau: 'Primaire 5' });
  return pseudo.toLowerCase();
}

const le = (date) => ({ 'X-Cartable-Maintenant': date });

// Leçon libre arrivée à sa première vraie page (0002-page.html), Pré-test fait et « Commencer » choisi, à la date
// `entetes` (voir `le`) si elle est donnée.
async function leconCommencee(slug, corps = { sujet: 'les volcans' }, entetes = {}) {
  const lecon = (await appel(`/api/eleves/${slug}/lecons`, 'POST', corps, entetes)).data;
  const url = `/api/eleves/${slug}/lecons/${lecon.id}`;
  await appel(`${url}/scores`, 'POST', { score: 50, page: '0001-page.html', pretest: true }, entetes);
  await appel(`${url}/retours`, 'POST', { score: 50, pretest: true }, entetes);
  const commencee = await appel(`${url}/rebonds`, 'POST', { action: 'commencer' }, entetes);
  assert.deepEqual(commencee.data.pages, ['0001-page.html', '0002-page.html']);
  return { id: lecon.id, cle: `${slug}/${lecon.id}`, url };
}

// Quiz de la page `page` fait avec `score`, puis son Retour de quiz.
async function quiz(url, page, score, entetes = {}) {
  await appel(`${url}/scores`, 'POST', { score, page }, entetes);
  return (await appel(`${url}/retours`, 'POST', { score }, entetes)).data;
}

// Attente du prof (#78) le jour `jour` (AAAA-MM-JJ), vue ce jour-là.
const attenteDuJour = async (slug, jour) =>
  (await appel(`/api/eleves/${slug}/indicateurs?du=${jour}&au=${jour}`, 'GET', undefined, le(`${jour}T18:00:00.000Z`))).data.attente;

test('Rebond qui correspond : la page préparée pendant le quiz s\'affiche sans nouveau tour', async () => {
  const slug = await nouvelEleve();
  const { id, cle, url } = await leconCommencee(slug);
  await preparationFinie(cle);
  const avant = await lignes(cle);
  assert.deepEqual((await quiz(url, '0002-page.html', 90)).rebondsProposes, ['suivante']);

  const suite = await appel(`${url}/rebonds`, 'POST', { action: 'suivante' });
  assert.equal(suite.status, 200);
  assert.deepEqual(suite.data.pages, ['0001-page.html', '0002-page.html', '0003-page.html']);
  assert.match(await contenuPage(slug, id, '0003-page.html'), /preparation/);
  const [eleve, prof] = suite.data.messages.slice(-2);
  assert.equal(eleve.texte, '➡️ Je suis prêt pour la suite.');
  assert.equal(prof.texte, 'Page 3 (preparation)');
  // Aucun tour de Leçon depuis : seul le prochain tour en arrière-plan a pu démarrer, pour la page 0003.
  assert.deepEqual((await lignes(cle)).slice(avant.length).filter((l) => l.includes(' lecon ')), []);
});

test('Rebond qui ne correspond pas au résultat du quiz : tour normal, la page préparée est écartée', async () => {
  const slug = await nouvelEleve();
  const { id, cle, url } = await leconCommencee(slug);
  await preparationFinie(cle);
  const avant = await lignes(cle);
  // Leçon libre : l'Étape suivante était préparée pour un quiz réussi ; il est raté, la page doit reprendre ses erreurs.
  await quiz(url, '0002-page.html', 40);

  const suite = await appel(`${url}/rebonds`, 'POST', { action: 'suivante' });
  assert.equal(suite.status, 200);
  assert.deepEqual(suite.data.pages, ['0001-page.html', '0002-page.html', '0003-page.html']);
  assert.match(await contenuPage(slug, id, '0003-page.html'), /lecon/);
  assert.equal(suite.data.messages.at(-1).texte, 'Page 3 (lecon)');
  assert.deepEqual((await lignes(cle)).slice(avant.length, avant.length + 2), [`debut lecon ${cle}`, `fin lecon ${cle}`]);
  // La page écartée a coûté son tour : il compte avec la Leçon (Commencer, page écartée, Étape suivante). Celle qui se
  // prépare peut-être déjà pour 0003 ne compte qu'une fois retenue ou écartée.
  const couts = (await appel(`/api/eleves/${slug}/couts`)).data;
  assert.equal(couts.parTache.rebond.tours, 3);
});

test('Un seul tour en arrière-plan, jamais en même temps qu\'un autre tour de la Leçon : le Rebond attend la page préparée', async () => {
  const slug = await nouvelEleve();
  await fs.writeFile(path.join(dossier, 'attendre-preparation'), '');
  const { cle, url } = await leconCommencee(slug);
  await attendreQue(async () => (await lignes(cle)).includes(`debut preparation ${cle}`));
  await quiz(url, '0002-page.html', 40); // le Retour de quiz, sans tour du prof, n'attend pas

  const rebond = appel(`${url}/rebonds`, 'POST', { action: 'suivante' });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal((await lignes(cle)).at(-1), `debut preparation ${cle}`); // le tour du Rebond attend
  await fs.rm(path.join(dossier, 'attendre-preparation'));
  assert.equal((await rebond).status, 200);

  // Jamais deux tours ouverts à la fois pour la Leçon, et une seule page préparée à la fois.
  const journalLecon = await lignes(cle);
  let ouverts = 0;
  for (const ligne of journalLecon) {
    ouverts += ligne.startsWith('debut ') ? 1 : -1;
    assert.equal(ouverts <= 1, true, journalLecon.join('\n'));
  }
  assert.deepEqual(journalLecon.slice(0, 6).map((l) => l.split(' ')[1]), ['lecon', 'lecon', 'lecon', 'lecon', 'preparation', 'preparation']);
  assert.deepEqual(journalLecon.slice(6, 8), [`debut lecon ${cle}`, `fin lecon ${cle}`]);
});

test('Taux de pages préparées inutilisées exposé par Élève ; la préparation se coupe dans le Profil', async () => {
  const slug = await nouvelEleve();
  const preparations = `/api/eleves/${slug}/preparations`;
  assert.deepEqual((await appel(preparations)).data, { active: true, suspendue: false, utilisees: 0, inutilisees: 0, tauxInutilisation: null });
  const { cle, url } = await leconCommencee(slug);
  const rebondApres = async (n, page, score) => {
    await preparationFinie(cle, n);
    await quiz(url, page, score);
    return appel(`${url}/rebonds`, 'POST', { action: 'suivante' });
  };
  await rebondApres(1, '0002-page.html', 90); // retenue
  await rebondApres(2, '0003-page.html', 30); // écartée
  await rebondApres(3, '0004-page.html', 30); // écartée
  assert.deepEqual((await appel(preparations)).data, { active: true, suspendue: false, utilisees: 1, inutilisees: 2, tauxInutilisation: 67 });

  await preparationFinie(cle, 4);
  const profil = await appel(`/api/eleves/${slug}`, 'PUT', { preparerPages: false });
  assert.equal(profil.data.preparerPages, false);
  assert.equal((await appel(`/api/eleves/${slug}`, 'PUT', { preparerPages: 'non' })).status, 400);
  assert.equal((await appel(preparations)).data.active, false);
  // La page préparée avant la coupure sert encore, mais aucune autre ne se prépare.
  const suite = await rebondApres(4, '0005-page.html', 90);
  assert.match(await contenuPage(slug, suite.data.id, '0006-page.html'), /preparation/);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal((await lignes(cle)).filter((l) => l === `debut preparation ${cle}`).length, 4);
  assert.equal((await appel(`/api/eleves/${slug}`)).data.preparerPages, false);
});

// Attente du prof (#78) : ce que l'Élève attend vraiment, daté par l'horloge de la requête comme les autres événements.
test('Attente du prof : une page préparée retenue aussitôt compte pour une attente nulle ; la préparation en arrière-plan n\'est pas un tour attendu', async () => {
  const slug = await nouvelEleve();
  const { cle, url } = await leconCommencee(slug, undefined, le('2026-11-02T10:00:00.000Z'));
  await preparationFinie(cle);
  // Le 2 : la création de la Leçon et « Commencer », pas la page préparée ensuite.
  assert.equal((await attenteDuJour(slug, '2026-11-02')).tours, 2);

  await quiz(url, '0002-page.html', 90, le('2026-11-03T10:00:00.000Z'));
  const suite = await appel(`${url}/rebonds`, 'POST', { action: 'suivante' }, le('2026-11-03T10:00:00.000Z'));
  assert.match(suite.data.messages.at(-1).texte, /preparation/);
  assert.deepEqual(await attenteDuJour(slug, '2026-11-03'), { tours: 1, moyenneSecondes: 0, medianeSecondes: 0, maxSecondes: 0 });
  await preparationFinie(cle, 2);
  assert.equal((await attenteDuJour(slug, '2026-11-02')).tours, 2);
});

test('Attente du prof : une page préparée retenue après avoir attendu la fin de sa préparation compte cette attente', async () => {
  const slug = await nouvelEleve();
  await fs.writeFile(path.join(dossier, 'attendre-preparation'), '');
  try {
    const { cle, url } = await leconCommencee(slug, undefined, le('2026-11-02T10:00:00.000Z'));
    await attendreQue(async () => (await lignes(cle)).includes(`debut preparation ${cle}`));
    await quiz(url, '0002-page.html', 90, le('2026-11-03T10:00:00.000Z'));
    const rebond = appel(`${url}/rebonds`, 'POST', { action: 'suivante' }, le('2026-11-03T10:00:00.000Z'));
    await new Promise((r) => setTimeout(r, 1200));
    await fs.rm(path.join(dossier, 'attendre-preparation'));
    assert.match((await rebond).data.messages.at(-1).texte, /preparation/);
    const attente = await attenteDuJour(slug, '2026-11-03');
    assert.equal(attente.tours, 1);
    assert.ok(attente.maxSecondes >= 1, JSON.stringify(attente));
  } finally {
    await fs.rm(path.join(dossier, 'attendre-preparation'), { force: true });
  }
});

test('Une préparation ratée compte quand même son coût avec la Leçon', async () => {
  const slug = await nouvelEleve();
  await fs.writeFile(path.join(dossier, 'echouer-preparation'), '');
  try {
    const { cle } = await leconCommencee(slug);
    await preparationFinie(cle);
    // Commencer, puis la préparation ratée.
    await attendreQue(async () => (await appel(`/api/eleves/${slug}/couts`)).data.parTache.rebond?.tours === 2);
  } finally {
    await fs.rm(path.join(dossier, 'echouer-preparation'), { force: true });
  }
});
