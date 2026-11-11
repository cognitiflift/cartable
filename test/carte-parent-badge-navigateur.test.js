// Cartes de Badge de la Vue parent (spec #235, ticket #238) : fiches, version active rendue à chaque Palier, « Utiliser
// celle-ci », dans un vrai Chromium sans interface piloté par CDP (WebSocket natif de Node). Ignoré avec un message si
// Chromium est absent. Serveur sur un port libre, Élèves dans un dossier temporaire ; tout est supprimé en fin de test.
// `CAPTURES=<dossier>` : écrit aussi des captures PNG de la rubrique (à la main, pour la revue de design).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';
import { ajouterVersionBadge } from '../lib/cartes-badge.js';

const RACINE = path.join(import.meta.dirname, '..');
const dansLePath = (nom) => (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map((d) => path.join(d, nom)).find((f) => { try { accessSync(f, constants.X_OK); return statSync(f).isFile(); } catch { return false; } });
const CHROMIUM = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'].map(dansLePath).find(Boolean);
const raison = CHROMIUM ? false : 'Chromium absent : test des cartes de Badge en navigateur ignoré';
if (raison) console.log(`# ${raison}`);

let dossier, serveur, chrome, base, cdp, slug, faux;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const portLibre = () => new Promise((resolve, reject) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on('error', reject);
});
async function jusqua(fn, message, delai = 10_000) {
  const fin = Date.now() + delai;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* pas encore */ }
    if (Date.now() > fin) throw new Error(`Délai dépassé : ${message}`);
    await attendre(50);
  }
}

async function ouvrirPage(portDebug) {
  const cibles = await (await fetch(`http://127.0.0.1:${portDebug}/json/list`)).json();
  const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('CDP injoignable')); });
  let id = 0;
  const attentes = new Map();
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && attentes.has(m.id)) { const { resolve, reject } = attentes.get(m.id); attentes.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
  };
  const envoyer = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; attentes.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluer = async (expression) => {
    const { result, exceptionDetails } = await envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  await envoyer('Runtime.enable');
  await envoyer('Page.enable');
  return { envoyer, evaluer, fermer: () => ws.close() };
}

// Un dessin d'agent reconnaissable : trois calques sans station ni texte. Mémoire a deux Paliers (bronze, argent) ; la
// surprise « Cliché ! » n'est pas encore trouvée.
const CALQUES = { l1: '<svg viewBox="0 0 200 280"><rect width="200" height="280" fill="var(--nuit)"/></svg>', l2: '<svg viewBox="0 0 200 280"></svg>',
  heros: '<svg viewBox="0 0 200 280"><circle id="heros-agent" cx="100" cy="140" r="50" fill="var(--nouveau)"/></svg>' };

before(async () => {
  if (raison) return;
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-cdp-'));
  const eleves = path.join(dossier, 'eleves');
  const profil = await createStore(eleves).creerEleve({ pseudo: 'Cdp-Badges', age: 11, niveau: 'Primaire 6' });
  slug = profil.slug;
  const cartes = { version: 1, livraison: '2026-10-01T10:00:00.000Z', son: false, ecartees: [], cartes: {},
    paliers: { 'memoire/bronze': { retourne: '2026-10-02T10:00:00.000Z' }, 'memoire/argent': { retourne: null } } };
  await fs.writeFile(path.join(eleves, slug, 'cartes.json'), JSON.stringify(ajouterVersionBadge(cartes, 'memoire', CALQUES, Date.parse('2026-11-05T10:00:00.000Z'))));
  await fs.writeFile(path.join(eleves, slug, 'badges.json'), JSON.stringify({ version: 1, badges: { memoire: { bronze: { jour: '2026-10-02', ajoute: '2026-10-02T10:00:00.000Z' }, argent: { jour: '2026-10-20', ajoute: '2026-10-20T10:00:00.000Z' } } } }));
  // Faux `claude` de la régénération (#239) : rend trois calques conformes, attend tant que `attendre` existe, échoue si `echec` existe.
  const agent = { l1: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><rect width="200" height="280" fill="var(--nuit)"/></svg>', l2: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><path d="M0 200 L100 120 L200 200 Z" fill="var(--encre-noire)"/></svg>',
    heros: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><circle id="curieux-regen" cx="100" cy="140" r="60" fill="var(--orange)"/></svg>' };
  const reponse = JSON.stringify({ result: JSON.stringify(agent), session_id: 's-badge', is_error: false, total_cost_usd: 0.5, duration_ms: 1000, usage: { input_tokens: 10, output_tokens: 100 }, modelUsage: { 'claude-sonnet-test': { costUSD: 0.5 } } });
  faux = path.join(dossier, 'faux-claude.sh');
  await fs.writeFile(faux, `#!/bin/sh
while [ -e '${dossier}/attendre' ]; do sleep 0.05; done
if [ -e '${dossier}/echec' ]; then printf '%s\\n' '{"result":"You have hit your limit","is_error":true}'; exit 0; fi
printf '%s\\n' '${reponse}'
`, { mode: 0o755 });
  const port = await portLibre();
  base = `http://127.0.0.1:${port}/`;
  serveur = spawn(process.execPath, ['server.js'], {
    cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', ELEVES_DIR: eleves, CLAUDE_BIN: faux, CARTABLE_PREPARATION: '0' },
  });
  await jusqua(async () => (await fetch(`${base}api/eleves`)).ok, 'serveur démarré');
  chrome = spawn(CHROMIUM, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-extensions', '--mute-audio',
    `--user-data-dir=${path.join(dossier, 'profil-chrome')}`, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
  const portDebug = Number((await jusqua(() => fs.readFile(path.join(dossier, 'profil-chrome', 'DevToolsActivePort'), 'utf8'), 'Chromium démarré', 45_000)).split('\n')[0]);
  cdp = await ouvrirPage(portDebug);
});

after(async () => {
  cdp?.fermer();
  for (const p of [chrome, serveur]) {
    if (p && p.exitCode === null) {
      const fini = new Promise((r) => p.once('exit', r));
      p.kill('SIGTERM');
      await Promise.race([fini, attendre(3000)]);
      if (p.exitCode === null) { p.kill('SIGKILL'); await fini; }
    }
  }
  if (dossier) await fs.rm(dossier, { recursive: true, force: true });
});

async function ouvrirVueParent(largeur, mobile) {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 900, deviceScaleFactor: 1, mobile });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); true`);
  await cdp.envoyer('Page.navigate', { url: `${base}?parent=${Date.now()}#/parent` });
  await jusqua(() => cdp.evaluer(`!!document.querySelector('.badges-parent .badge-parent')`), 'cartes de Badge affichées');
}
async function capturer(nom, cible = `document.querySelector('.badges-parent').closest('section')`) {
  if (!process.env.CAPTURES) return;
  await cdp.evaluer(`${cible}.scrollIntoView(); true`);
  const { data } = await cdp.envoyer('Page.captureScreenshot', { format: 'png' });
  await fs.mkdir(process.env.CAPTURES, { recursive: true });
  await fs.writeFile(path.join(process.env.CAPTURES, nom), Buffer.from(data, 'base64'));
}

test('Vue parent : les cartes de Badge listent Familles et surprises, la version active à chaque Palier, et le choix vaut pour la Famille', { skip: raison, timeout: 40_000 }, async () => {
  await ouvrirVueParent(1024, false);
  const fiches = await cdp.evaluer(`[...document.querySelectorAll('.badges-parent > li')].map((li) => [li.querySelector('.carte-parent-titre').textContent, li.querySelector('.carte-parent-reperes').textContent, li.querySelectorAll(':scope > .paliers-badge > li').length])`);
  assert.equal(fiches.length, 8 + (await (await fetch(`${base}api/eleves/${slug}/parent`)).json()).cartes.badges.filter((b) => b.surprise).length);
  assert.deepEqual(fiches.find(([t]) => t.includes('Mémoire')), ['🧠 Mémoire', 'Palier argent · Version 1 active', 4]);
  assert.deepEqual(fiches.find(([t]) => t.includes('Cliché')), ['📸 Cliché !', 'Surprise pas encore trouvée · Version 1 active', 1], 'une surprise pas trouvée est visible du parent');
  assert.match(await cdp.evaluer(`document.querySelector('.badges-parent .carte-parent-note').textContent`), /Pas encore trouvée|Rien d’obtenu/);
  assert.equal(await cdp.evaluer(`document.querySelectorAll('.badges-parent .badge-parent:first-child > .paliers-badge .carte-badge-carte.apercu').length`), 4, 'quatre Paliers, une carte chacun');
  assert.equal(await cdp.evaluer(`!!document.querySelector('.badges-parent > li > .paliers-badge #heros-agent')`), false, 'la version 1 est le dessin du code');
  await capturer('badges-parent-1024.png');

  const memoire = `[...document.querySelectorAll('.badges-parent > li')].find((li) => li.textContent.includes('Mémoire'))`;
  await cdp.evaluer(`${memoire}.querySelector('summary').click(); true`);
  await jusqua(() => cdp.evaluer(`${memoire}.querySelector('details').open && ${memoire}.querySelectorAll('.versions-badge > li').length === 2`), 'galerie ouverte, deux versions');
  assert.equal(await cdp.evaluer(`${memoire}.querySelectorAll('.versions-badge > li:nth-child(2) .carte-badge-carte.apercu').length`), 4, 'la version 2 rendue à chaque Palier');
  assert.equal(await cdp.evaluer(`${memoire}.querySelectorAll('.versions-badge > li:nth-child(2) #heros-agent').length`), 4);
  assert.equal(await cdp.evaluer(`${memoire}.querySelectorAll('.versions-badge button.secondaire').length`), 1, 'seule la version non active a « Utiliser celle-ci »');
  await capturer('badges-parent-galerie-1024.png');

  await cdp.evaluer(`${memoire}.querySelector('.versions-badge button.secondaire').click(); true`);
  await jusqua(() => cdp.evaluer(`${memoire}.querySelector('.carte-parent-reperes').textContent.includes('Version 2 active')`), 'la version 2 est active');
  assert.equal(await cdp.evaluer(`${memoire}.querySelector('details').open`), true, 'la galerie reste ouverte');
  assert.equal(await cdp.evaluer(`${memoire}.querySelectorAll(':scope > .paliers-badge #heros-agent').length`), 4, 'la version active rendue aux quatre Paliers');

  // Côté Élève : Mes badges montre le dessin choisi, le retournement n'a pas bougé.
  const eleve = await (await fetch(`${base}api/eleves/${slug}/badges`)).json();
  assert.deepEqual(eleve.calquesBadge, { memoire: CALQUES });
  assert.ok(eleve.aRetourner.some((c) => c.type === 'palier' && c.id === 'memoire' && c.palier === 'argent'), 'le Palier argent attend toujours face cachée');
  await cdp.envoyer('Page.navigate', { url: `${base}?eleve=${Date.now()}#/badges` });
  await jusqua(() => cdp.evaluer(`!!document.querySelector('.cartes-badges #heros-agent')`), 'Mes badges montre le dessin choisi par le parent');
});

test('Vue parent : à 390 px les cartes de Badge ne débordent pas et les boutons restent tactiles', { skip: raison, timeout: 30_000 }, async () => {
  await ouvrirVueParent(390, true);
  await cdp.evaluer(`document.querySelectorAll('.badges-parent details').forEach((d) => { d.open = true; }); true`);
  const mesure = await cdp.evaluer(`({ debord: document.documentElement.scrollWidth > innerWidth, boutons: [...document.querySelectorAll('.versions-badge button.secondaire')].every((b) => b.getBoundingClientRect().height >= 43.5), paliers: document.querySelector('.badges-parent .paliers-badge li').getBoundingClientRect().width })`);
  assert.equal(mesure.debord, false);
  assert.equal(mesure.boutons, true);
  assert.ok(mesure.paliers >= 60, 'les cartes de Palier restent lisibles');
  await capturer('badges-parent-390.png');
});

// « Régénérer » sur un Badge (#239) : un clic, l'état « en composition » le temps du tour, la version arrive dans la galerie
// (rendue à chaque Palier, active inchangée) ; un échec laisse la version active et avertit le parent.
test('Vue parent : « Régénérer » un Badge ajoute une version, un échec avertit sans rien changer', { skip: raison, timeout: 60_000 }, async () => {
  await ouvrirVueParent(1024, false);
  const curieux = `[...document.querySelectorAll('.badges-parent > li')].find((li) => li.textContent.includes('Curieux'))`;
  await cdp.evaluer(`${curieux}.querySelector('summary').click(); true`);
  assert.equal(await cdp.evaluer(`${curieux}.querySelector('button.regenerer').textContent`), 'Régénérer');
  assert.match(await cdp.evaluer(`${curieux}.querySelector('button.regenerer').getAttribute('aria-label')`), /tous ses Paliers/);

  await fs.writeFile(path.join(dossier, 'attendre'), '');
  await cdp.evaluer(`${curieux}.querySelector('button.regenerer').click(); true`);
  await jusqua(() => cdp.evaluer(`${curieux}.querySelector('button.regenerer').disabled && ${curieux}.querySelector('.version-en-composition')`), 'en composition');
  assert.equal(await cdp.evaluer(`${curieux}.querySelector('button.regenerer').textContent`), 'En composition…');
  assert.equal(await cdp.evaluer(`${curieux}.querySelector('button.regenerer').getAttribute('aria-busy')`), 'true');
  assert.match(await cdp.evaluer(`${curieux}.textContent`), /Une nouvelle version est en cours/);
  await capturer('badges-parent-regeneration-1024.png', curieux);

  await fs.rm(path.join(dossier, 'attendre'));
  await jusqua(() => cdp.evaluer(`${curieux}.querySelectorAll('.versions-badge > li:not(.version-en-composition)').length === 2 && !${curieux}.querySelector('button.regenerer').disabled`), 'version arrivée', 30_000);
  assert.equal(await cdp.evaluer(`${curieux}.querySelectorAll('.versions-badge > li:nth-child(2) #curieux-regen').length`), 4, 'la nouvelle version rendue à chaque Palier');
  assert.match(await cdp.evaluer(`${curieux}.querySelector('.carte-parent-reperes').textContent`), /Version 1 active/);
  assert.equal(await cdp.evaluer(`${curieux}.querySelector('details').open`), true, 'la galerie reste ouverte');
  assert.equal(await cdp.evaluer(`${curieux}.querySelectorAll(':scope > .paliers-badge #curieux-regen').length`), 0, 'l\u2019active n\u2019a pas changé');
  await capturer('badges-parent-regeneree-1024.png', curieux);

  await fs.writeFile(path.join(dossier, 'echec'), '');
  await cdp.evaluer(`${curieux}.querySelector('button.regenerer').click(); true`);
  await jusqua(() => cdp.evaluer(`${curieux}.querySelector('.carte-parent-note.erreur[role="alert"]')`), 'abandon signalé', 30_000);
  assert.match(await cdp.evaluer(`${curieux}.querySelector('.carte-parent-note.erreur').textContent`), /abandonnée après deux essais ratés\. La version active n’a pas changé/);
  assert.equal(await cdp.evaluer(`${curieux}.querySelectorAll('.versions-badge > li:not(.version-en-composition)').length`), 2, 'aucune version de plus');
  assert.equal(await cdp.evaluer(`${curieux}.querySelector('button.regenerer').disabled`), false, 'le parent peut réessayer');
  await capturer('badges-parent-abandon-1024.png', curieux);
});
