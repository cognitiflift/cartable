// Rubrique « Cartes » de la Vue parent (spec #235, ticket #236) : galerie des versions et « Utiliser celle-ci », dans un vrai
// Chromium sans interface piloté par CDP (WebSocket natif de Node). Ignoré avec un message si Chromium est absent. Serveur sur
// un port libre, Élèves dans un dossier temporaire ; tout est arrêté et supprimé en fin de test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';
import { sceneGenerique } from '../lib/carte-generique.js';
import { ajouterVersion } from '../lib/cartes.js';

const RACINE = path.join(import.meta.dirname, '..');
const dansLePath = (nom) => (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map((d) => path.join(d, nom)).find((f) => { try { accessSync(f, constants.X_OK); return statSync(f).isFile(); } catch { return false; } });
const CHROMIUM = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'].map(dansLePath).find(Boolean);
const raison = CHROMIUM ? false : 'Chromium absent : test de la galerie des cartes en navigateur ignoré';
if (raison) console.log(`# ${raison}`);

let dossier, serveur, chrome, base, cdp, slug, geyser;
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

// Deux cartes : « Les volcans » retournée avec deux versions (la Leçon n'existe plus), « Les dunes » face cachée, une version.
before(async () => {
  if (raison) return;
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-cdp-'));
  const eleves = path.join(dossier, 'eleves');
  const profil = await createStore(eleves).creerEleve({ pseudo: 'Cdp-Cartes', age: 11, niveau: 'Primaire 6' });
  slug = profil.slug;
  const carte = (lecon, titre, jour, retourne) => ({ lecon, titre, categorie: 'sciences', objectifs: 3, jourAcquisition: jour, etat: 'generique', essais: 2, calques: sceneGenerique({ lecon, categorie: 'sciences' }), prete: `${jour}T10:00:00.000Z`, retourne });
  geyser = (await createStore(eleves).creerLecon(slug, { sujet: 'Les geysers', mode: 'libre' })).id; // la seule dont la Leçon existe encore
  const f = { version: 1, livraison: '2026-10-01T10:00:00.000Z', son: false, ecartees: [], paliers: {},
    cartes: { volcans: carte('volcans', 'Les volcans', '2026-11-02', '2026-11-03T10:00:00.000Z'), dunes: carte('dunes', 'Les dunes', '2026-11-04', null),
      [geyser]: carte(geyser, 'Les geysers', '2026-10-20', null) } };
  const deux = ajouterVersion(f, 'volcans', sceneGenerique({ lecon: 'autre-volcans', categorie: 'maths' }), Date.parse('2026-11-05T10:00:00.000Z'));
  await fs.writeFile(path.join(eleves, slug, 'cartes.json'), JSON.stringify(deux));
  const port = await portLibre();
  base = `http://127.0.0.1:${port}/`;
  serveur = spawn(process.execPath, ['server.js'], {
    cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', ELEVES_DIR: eleves, CLAUDE_BIN: path.join(dossier, 'pas-de-claude'), CARTABLE_PREPARATION: '0' },
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

test('Vue parent : la rubrique Cartes liste les cartes, la galerie change la version active sans toucher au retournement', { skip: raison, timeout: 30_000 }, async () => {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); true`);
  await cdp.envoyer('Page.navigate', { url: `${base}?parent=${Date.now()}#/parent` });
  await jusqua(() => cdp.evaluer(`!!document.querySelector('.cartes-parent .carte-parent')`), 'rubrique Cartes affichée');

  const resume = await cdp.evaluer(`[...document.querySelectorAll('.cartes-parent > li')].map((li) => [li.querySelector('.carte-parent-titre').textContent, li.querySelector('.carte-parent-reperes').textContent, !!li.querySelector('details')])`);
  assert.deepEqual(resume, [['Les dunes', 'Face cachée · Scène générique · Leçon supprimée', true], ['Les volcans', 'Retournée · Scène générique · Leçon supprimée', true], ['Les geysers', 'Face cachée · Scène générique', true]]);
  assert.match(await cdp.evaluer(`document.querySelector('.carte-parent-note').textContent`), /pas encore retournée/);

  const versionsVolcans = `.cartes-parent > li:nth-child(2) details`;
  await cdp.evaluer(`document.querySelector(${JSON.stringify(versionsVolcans + ' summary')}).click(); true`);
  await jusqua(() => cdp.evaluer(`document.querySelector(${JSON.stringify(versionsVolcans)}).open && document.querySelectorAll(${JSON.stringify(versionsVolcans + ' .versions-carte li')}).length === 2`), 'galerie ouverte, deux versions');
  const avant = await cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(2) > .carte-ligne-carte .cl-heros').innerHTML`);
  assert.equal(await cdp.evaluer(`document.querySelectorAll(${JSON.stringify(versionsVolcans + ' .versions-carte li > button.secondaire')}).length`), 1, 'seule la version non active a « Utiliser celle-ci »');
  assert.equal(await cdp.evaluer(`document.querySelector(${JSON.stringify(versionsVolcans + ' .versions-carte li > button.secondaire')}).textContent`), 'Utiliser celle-ci');

  await cdp.evaluer(`document.querySelector(${JSON.stringify(versionsVolcans + ' .versions-carte li > button.secondaire')}).click(); true`);
  await jusqua(() => cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(2) > .carte-ligne-carte .cl-heros').innerHTML !== ${JSON.stringify(avant)}`), 'la carte active a changé');
  assert.equal(await cdp.evaluer(`document.querySelector(${JSON.stringify(versionsVolcans)}).open`), true, 'la galerie reste ouverte après le rechargement');
  assert.equal(await cdp.evaluer(`document.querySelector(${JSON.stringify(versionsVolcans + ' .versions-carte li.active > strong')}).textContent`), 'Version 2');

  // Côté Élève : le dessin a changé, la carte reste retournée.
  const carte = (await (await fetch(`${base}api/eleves/${slug}/cartes/ligne/volcans`)).json()).carte;
  assert.equal(carte.retourne, '2026-11-03T10:00:00.000Z');
  assert.match(carte.calques.heros, /./);
  assert.notEqual(carte.calques.heros, avant);
});

test('Vue parent : à 390 px la grille des cartes ne déborde pas et les boutons restent tactiles', { skip: raison, timeout: 30_000 }, async () => {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  await cdp.envoyer('Page.navigate', { url: `${base}?etroit=${Date.now()}#/parent` });
  await jusqua(() => cdp.evaluer(`!!document.querySelector('.cartes-parent .carte-parent')`), 'rubrique Cartes affichée');
  await cdp.evaluer(`document.querySelectorAll('.galerie-versions').forEach((d) => { d.open = true; }); true`);
  const mesure = await cdp.evaluer(`({ debord: document.documentElement.scrollWidth > innerWidth, boutons: [...document.querySelectorAll('.versions-carte li > button.secondaire')].every((b) => b.getBoundingClientRect().height >= 43.5), colonnes: getComputedStyle(document.querySelector('.cartes-parent')).gridTemplateColumns.split(' ').length })`);
  assert.equal(mesure.debord, false);
  assert.equal(mesure.boutons, true);
  assert.ok(mesure.colonnes >= 2, 'au moins deux cartes de front sur un téléphone');
});

test('Vue parent : « Régénérer » en un clic, sans bouton pour une Leçon supprimée, avertissement après deux échecs', { skip: raison, timeout: 40_000 }, async () => {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.envoyer('Page.navigate', { url: `${base}?regen=${Date.now()}#/parent` });
  await jusqua(() => cdp.evaluer(`!!document.querySelector('.cartes-parent .carte-parent')`), 'rubrique Cartes affichée');
  const boutons = await cdp.evaluer(`[...document.querySelectorAll('.cartes-parent > li')].map((li) => [li.querySelector('.carte-parent-titre').textContent, !!li.querySelector('button.regenerer')])`);
  assert.deepEqual(boutons, [['Les dunes', false], ['Les volcans', false], ['Les geysers', true]]);
  assert.match(await cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(1)').textContent`), /Leçon n’existe plus/);
  assert.match(await cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(3) button.regenerer').getAttribute('aria-label')`), /Régénérer la carte « Les geysers »/);

  // Un clic, sans confirmation : le tour échoue deux fois (pas d'agent ici) ; le parent en est averti, la version active reste.
  await cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(3) button.regenerer').click(); true`);
  await jusqua(() => cdp.evaluer(`!!document.querySelector('.cartes-parent > li:nth-child(3) p[role=alert]')`), 'avertissement après deux échecs', 20_000);
  assert.match(await cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(3) p[role=alert]').textContent`), /version active n’a pas changé/);
  const carte = JSON.parse(await fs.readFile(path.join(dossier, 'eleves', slug, 'cartes.json'), 'utf8')).cartes[geyser];
  assert.deepEqual([carte.etat, carte.versions ?? null, carte.regeneration ?? null], ['generique', null, null]);
  assert.equal(await cdp.evaluer(`document.querySelector('.cartes-parent > li:nth-child(3) button.regenerer').disabled`), false, 'on peut réessayer');
});
