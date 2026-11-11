// Archivage d'une Leçon (#203) : menu ⋯, confirmations, message « Leçon rangée · Annuler » et section « Archivées »,
// joués dans un vrai Chromium sans interface piloté par CDP (même harnais que test/ceremonie-navigateur.test.js).
// Ignoré avec un message si Chromium est absent. Serveur sur un port libre, dossier d'Élèves temporaire.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';

const RACINE = path.join(import.meta.dirname, '..');
const dansLePath = (nom) => (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map((d) => path.join(d, nom)).find((f) => { try { accessSync(f, constants.X_OK); return statSync(f).isFile(); } catch { return false; } });
const CHROMIUM = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'].map(dansLePath).find(Boolean);
const raison = CHROMIUM ? false : 'Chromium absent : test de l\'archivage en navigateur ignoré';
if (raison) console.log(`# ${raison}`);

let dossier, serveur, chrome, base, cdp, slug;
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
  const erreursPage = [];
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && attentes.has(m.id)) { const { resolve, reject } = attentes.get(m.id); attentes.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') erreursPage.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  };
  const envoyer = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; attentes.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluer = async (expression) => {
    const { result, exceptionDetails } = await envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  await envoyer('Runtime.enable');
  await envoyer('Page.enable');
  return { envoyer, evaluer, erreursPage, fermer: () => ws.close() };
}

const clic = (sel) => cdp.evaluer(`document.querySelector(${JSON.stringify(sel)}).click(); true`);
const existe = (sel) => cdp.evaluer(`!!document.querySelector(${JSON.stringify(sel)})`);
const visible = (sel) => cdp.evaluer(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getClientRects().length > 0; })()`);
const texte = (sel) => cdp.evaluer(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`);
const touche = (key) => cdp.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: 27 }); // Échap
const titres = () => cdp.evaluer(`[...document.querySelectorAll('.lecon h4')].map((h) => h.textContent)`);

async function ouvrirAccueil(largeur) {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 800, deviceScaleFactor: 1, mobile: largeur < 600 });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); location.hash = '#/'; location.reload(); true`);
  await jusqua(() => existe('.lecon'), 'accueil affiché');
}

before(async () => {
  if (raison) return;
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-arch-'));
  const eleves = path.join(dossier, 'eleves');
  const store = createStore(eleves);
  slug = (await store.creerEleve({ pseudo: 'Arch-Nav', age: 11, niveau: 'Primaire 6' })).slug;
  for (const sujet of ['Les volcans', 'Les rivières']) {
    const l = await store.creerLecon(slug, { sujet, mode: 'libre' });
    await fs.writeFile(path.join(eleves, slug, 'lecons', l.id, 'lesson.json'), JSON.stringify({ titre: sujet, categorie: 'Sciences', objectifs: ['A', 'B', 'C'] }));
  }
  const port = await portLibre();
  base = `http://127.0.0.1:${port}/`;
  serveur = spawn(process.execPath, ['server.js'], {
    cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', ELEVES_DIR: eleves, CLAUDE_BIN: path.join(dossier, 'pas-de-claude'), CARTABLE_PREPARATION: '0' },
  });
  await jusqua(async () => (await fetch(`${base}api/eleves`)).ok, 'serveur démarré');
  chrome = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-extensions', '--mute-audio',
    `--user-data-dir=${path.join(dossier, 'profil-chrome')}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
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

test('Archivage à 390 px : menu ⋯ de 44 px, nommé, fermé par Échap ; ranger, annuler, ranger, restaurer, supprimer pour toujours', { skip: raison, timeout: 60_000 }, async () => {
  await ouvrirAccueil(390);
  assert.equal((await titres()).length, 2);
  const debordement = () => cdp.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  assert.ok(await debordement() <= 0, 'accueil sans défilement horizontal');
  assert.equal(await existe('details.archivees'), false, 'pas de section Archivées sans Leçon rangée');

  // Le bouton ⋯ : au moins 44 px, nommé, à l'intérieur de la carte et sans gêner le titre.
  const bouton = await cdp.evaluer(`(() => { const b = document.querySelector('.menu-lecon-bouton'); const r = b.getBoundingClientRect(); const c = b.closest('.lecon').getBoundingClientRect(); const h4 = b.closest('.lecon').querySelector('h4').getBoundingClientRect(); return { l: r.width, h: r.height, nom: b.getAttribute('aria-label'), dedans: r.left >= c.left && r.right <= c.right && r.top >= c.top, chevauche: r.left < h4.right && r.right > h4.left && r.top < h4.bottom && r.bottom > h4.top }; })()`);
  assert.ok(bouton.l >= 44 && bouton.h >= 44, `cible de 44 px (${bouton.l}×${bouton.h})`);
  assert.match(bouton.nom, /^Plus d'actions pour /);
  assert.equal(bouton.dedans, true, 'le bouton reste dans la carte');
  assert.equal(bouton.chevauche, false, 'le bouton ne recouvre pas le titre');

  // Ouvrir, fermer par Échap (le focus revient au bouton), rouvrir, fermer au toucher hors du menu.
  await clic('.menu-lecon-bouton');
  assert.equal(await visible('.menu-lecon-liste:not([hidden])'), true);
  assert.equal(await cdp.evaluer(`document.querySelector('.menu-lecon-bouton').getAttribute('aria-expanded')`), 'true');
  assert.equal(await cdp.evaluer(`document.activeElement.getAttribute('role')`), 'menuitem');
  await touche('Escape');
  await jusqua(async () => !(await visible('.menu-lecon-liste:not([hidden])')), 'menu fermé par Échap');
  assert.equal(await cdp.evaluer(`document.activeElement.classList.contains('menu-lecon-bouton')`), true);
  await clic('.menu-lecon-bouton');
  await cdp.evaluer(`document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); true`);
  assert.equal(await visible('.menu-lecon-liste:not([hidden])'), false, 'fermé par un toucher dehors');

  // Archiver : confirmation courte, puis la carte part et « Leçon rangée · Annuler » reste.
  const avant = await titres();
  await clic('.menu-lecon-bouton');
  await clic('.menu-lecon-liste button');
  await jusqua(() => existe('dialog.confirmation[open]'), 'confirmation ouverte');
  assert.equal(await texte('.confirmation-texte'), 'Cette leçon sera rangée. Tu pourras la retrouver.');
  await clic('dialog.confirmation .cadrage-choix button:last-child'); // « Ranger »
  await jusqua(async () => (await titres()).length === 1, 'carte partie de l\'accueil');
  assert.equal(await visible('.message-lecon'), true);
  assert.match(await texte('.message-lecon'), /Leçon rangée/);
  assert.equal(await cdp.evaluer(`document.querySelector('.message-lecon').getAttribute('role')`), 'status');
  // Annuler : la Leçon revient.
  await clic('.message-lecon button:not(.fermer)');
  await jusqua(async () => (await titres()).length === 2 && !(await existe('.message-lecon')), 'Leçon revenue');
  assert.deepEqual((await titres()).sort(), avant.sort());

  // Ranger de nouveau, puis la section « Archivées » : Restaurer, puis supprimer pour toujours avec « Garder » par défaut.
  await clic('.menu-lecon-bouton');
  await clic('.menu-lecon-liste button');
  await clic('dialog.confirmation .cadrage-choix button:last-child');
  await jusqua(() => existe('details.archivees'), 'section Archivées affichée');
  assert.equal(await cdp.evaluer(`document.querySelector('details.archivees').open`), false, 'section repliée');
  await clic('details.archivees summary');
  assert.equal(await cdp.evaluer(`document.querySelectorAll('.archivees-liste li').length`), 1);
  const tailles = await cdp.evaluer(`[...document.querySelectorAll('.archivees-liste button')].map((b) => b.getBoundingClientRect().height)`);
  assert.ok(tailles.every((t) => t >= 44), `boutons de la section à 44 px (${tailles})`);
  assert.ok(await debordement() <= 0, 'section Archivées sans défilement horizontal');

  await clic('.supprimer-lecon');
  await jusqua(() => existe('dialog.confirmation[open]'), 'confirmation de suppression');
  assert.match(await texte('.confirmation-texte'), /La leçon, ses questions et ses pages seront effacées\..*Tes badges et tes cartes restent à toi\./);
  assert.equal(await cdp.evaluer(`document.activeElement.textContent`), 'Garder', '« Garder » a le focus');
  assert.equal(await texte('dialog.confirmation .cadrage-choix button:last-child'), 'Supprimer pour toujours');
  await touche('Escape'); // Échap garde la Leçon
  await jusqua(async () => !(await existe('dialog.confirmation')), 'confirmation fermée');
  assert.equal(await cdp.evaluer(`document.querySelectorAll('.archivees-liste li').length`), 1, 'rien supprimé');

  await clic('.archivees-liste button.secondaire'); // Restaurer
  await jusqua(async () => (await titres()).length === 2 && !(await existe('details.archivees')), 'Leçon restaurée');

  // Archiver puis supprimer pour toujours.
  await clic('.menu-lecon-bouton');
  await clic('.menu-lecon-liste button');
  await clic('dialog.confirmation .cadrage-choix button:last-child');
  await jusqua(() => existe('details.archivees'), 'section Archivées affichée');
  const id = await cdp.evaluer(`document.querySelector('.archivees-liste a').getAttribute('href').split('/').pop()`);
  await clic('.supprimer-lecon');
  await jusqua(() => existe('dialog.confirmation[open]'), 'confirmation de suppression');
  await clic('dialog.confirmation .cadrage-choix button:last-child');
  await jusqua(async () => !(await existe('details.archivees')), 'Leçon supprimée');
  await assert.rejects(fs.access(path.join(dossier, 'eleves', slug, 'lecons', id)));
  assert.deepEqual(cdp.erreursPage, []);
});
