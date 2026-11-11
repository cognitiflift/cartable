// Cérémonie des cartes (spec #182, ticket #189) : jouée dans un vrai Chromium sans interface, piloté par le protocole de
// débogage (CDP) avec le WebSocket natif de Node, sans aucune dépendance. Ignoré avec un message si Chromium est absent.
// Le serveur tourne sur un port libre, avec un dossier d'Élèves temporaire ; tout est arrêté et supprimé en fin de test.
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

const RACINE = path.join(import.meta.dirname, '..');
const dansLePath = (nom) => (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map((d) => path.join(d, nom)).find((f) => { try { accessSync(f, constants.X_OK); return statSync(f).isFile(); } catch { return false; } });
const CHROMIUM = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'].map(dansLePath).find(Boolean);
const raison = CHROMIUM ? false : 'Chromium absent (chromium, chromium-browser, google-chrome) : test de la cérémonie en navigateur ignoré';
if (raison) console.log(`# ${raison}`);

let dossier, serveur, chrome, base, cdp;
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

// Un Élève dont la seule carte de ligne attend, composée (scène générique) et pas encore retournée.
async function eleveAvecCarte(pseudo, { avecLecon = false } = {}) {
  const eleves = path.join(dossier, 'eleves');
  const store = createStore(eleves);
  const profil = await store.creerEleve({ pseudo, age: 11, niveau: 'Primaire 6' });
  const lecon = avecLecon ? (await store.creerLecon(profil.slug, { sujet: 'Les volcans', mode: 'libre' })).id : '0001-volcans';
  const carte = { lecon, titre: 'Les volcans', categorie: 'sciences', objectifs: 3, jourAcquisition: '2026-11-02', etat: 'generique', essais: 2, calques: sceneGenerique({ lecon, categorie: 'sciences' }), prete: '2026-11-02T10:00:00.000Z', retourne: null };
  await fs.writeFile(path.join(eleves, profil.slug, 'cartes.json'), JSON.stringify({ version: 1, livraison: '2026-10-01T10:00:00.000Z', son: false, ecartees: [], cartes: { [carte.lecon]: carte }, paliers: {} }));
  return profil.slug;
}

// Client minimal du protocole de débogage : une page, des commandes, des évaluations.
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

// Ouvre Mes badges de l'Élève `slug`, avec une largeur et un réglage de mouvement donnés.
async function ouvrirBadges(slug, { largeur = 1024, mouvementReduit = false } = {}) {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 800, deviceScaleFactor: 1, mobile: largeur < 600 });
  await cdp.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: mouvementReduit ? 'reduce' : 'no-preference' }] });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  // Pseudo et adresse posés, puis rechargement : une seule navigation de l'appli, sans route() de l'écran de choix encore en
  // vol qui redessinerait la page sous l'assertion (cause probable de l'échec intermittent, #229).
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); true`);
  await cdp.envoyer('Page.navigate', { url: `${base}?badges=${Date.now()}#/badges` }); // vraie navigation (la requête change), pas un simple changement de hash
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && location.hash === '#/badges' && document.getElementById('app')?.ariaBusy === 'false' && !!document.querySelector('.cl-nouvelles .carte-cachee .cl-medaillon')`), 'Mes badges au repos, carte face cachée affichée');
}

const clic = (sel) => cdp.evaluer(`document.querySelector(${JSON.stringify(sel)}).click(); true`);
const existe = (sel) => cdp.evaluer(`!!document.querySelector(${JSON.stringify(sel)})`);
const visible = (sel) => cdp.evaluer(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && e.getClientRects().length > 0; })()`);

before(async () => {
  if (raison) return;
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-cdp-'));
  const slugs = { accueil: await eleveAvecCarte('Cdp-Accueil', { avecLecon: true }), normal: await eleveAvecCarte('Cdp-Normal'), reduit: await eleveAvecCarte('Cdp-Reduit'), etroit: await eleveAvecCarte('Cdp-Etroit') };
  globalThis.__slugs = slugs;
  const port = await portLibre();
  base = `http://127.0.0.1:${port}/`;
  serveur = spawn(process.execPath, ['server.js'], {
    cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', ELEVES_DIR: path.join(dossier, 'eleves'), CLAUDE_BIN: path.join(dossier, 'pas-de-claude'), CARTABLE_PREPARATION: '0' },
  });
  await jusqua(async () => (await fetch(`${base}api/eleves`)).ok, 'serveur démarré');
  chrome = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-extensions', '--mute-audio',
    `--user-data-dir=${path.join(dossier, 'profil-chrome')}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  const fichierPort = path.join(dossier, 'profil-chrome', 'DevToolsActivePort');
  const portDebug = Number((await jusqua(() => fs.readFile(fichierPort, 'utf8'), 'Chromium démarré', 45_000)).split('\n')[0]);
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

test('Cérémonie : la carte attend face cachée, la retourner ouvre la cérémonie, fermer la range d\'office dans sa grille', { skip: raison, timeout: 30_000 }, async () => {
  await ouvrirBadges(globalThis.__slugs.normal);
  assert.equal(await existe('.cl-nouvelles .carte-cachee .cl-medaillon'), true, 'face cachée : médaillon');
  assert.equal(await existe('.cl-nouvelles .carte-ligne-carte:not(.carte-cachee)'), false, 'rien de dévoilé avant le geste');
  assert.equal(await existe('dialog[open]'), false);

  await clic('.cl-nouvelles .carte-cachee');
  await jusqua(() => existe('dialog.cartes-ceremonie[open] .cer-carte .carte-cachee'), 'cérémonie ouverte sur le dos de la carte');
  await clic('dialog.cartes-ceremonie .cer-carte .carte-cachee');
  await jusqua(() => existe('dialog[open] .cer-carte .carte-ligne-carte.entree'), 'carte retournée');
  assert.equal(await visible('dialog[open] .cer-ok'), false, 'le bouton attend la fin de l\'animation');
  await jusqua(() => visible('dialog[open] .cer-ok'), 'bouton d\'ajout affiché', 6000);
  assert.match(await cdp.evaluer(`document.querySelector('dialog[open] .cer-texte h3').textContent`), /volcans/);
  // #232 : rien ne traverse le dessin ; les 3 Objectifs sont 3 petits crans et le ✓, en bas à droite de la carte.
  const pastille = await cdp.evaluer(`(() => { const c = document.querySelector('dialog[open] .cer-carte .carte-ligne-carte'); const r = c.getBoundingClientRect(), p = c.querySelector('.cl-stations').getBoundingClientRect();
    return { crans: c.querySelectorAll('.cl-stations i').length, coche: c.querySelector('.cl-stations b')?.textContent, ancienne: !!c.querySelector('.cl-ligne, .terminus, .station'), droite: p.right > r.left + r.width * .7, bas: p.top > r.top + r.height * .85, large: p.width < r.width * .5 }; })()`);
  assert.deepEqual(pastille, { crans: 3, coche: '✓', ancienne: false, droite: true, bas: true, large: true });

  await clic('dialog[open] .cer-ok');
  await jusqua(async () => !(await existe('dialog[open]')) && !(await existe('.cl-nouvelles')), 'cérémonie fermée, plus de carte en attente');
  assert.equal(await cdp.evaluer(`document.querySelectorAll('ul[aria-label="Mon réseau"] li .carte-ligne-carte').length`), 1, 'rangée dans Mon réseau');
  // Le retournement est enregistré côté serveur.
  const cartes = JSON.parse(await fs.readFile(path.join(dossier, 'eleves', globalThis.__slugs.normal, 'cartes.json'), 'utf8')).cartes;
  assert.ok(cartes['0001-volcans'].retourne);
  assert.deepEqual(cdp.erreursPage, []);
});

test('Cérémonie : sous prefers-reduced-motion, elle fonctionne sans animation', { skip: raison, timeout: 30_000 }, async () => {
  await ouvrirBadges(globalThis.__slugs.reduit, { mouvementReduit: true });
  assert.equal(await cdp.evaluer(`matchMedia('(prefers-reduced-motion: reduce)').matches`), true);
  await clic('.cl-nouvelles .carte-cachee');
  await jusqua(() => existe('dialog[open] .cer-carte .carte-cachee'), 'cérémonie ouverte');
  await clic('dialog[open] .cer-carte .carte-cachee');
  const debut = Date.now();
  await jusqua(() => visible('dialog[open] .cer-ok'), 'bouton d\'ajout affiché d\'emblée', 1500);
  assert.ok(Date.now() - debut < 1500, 'pas d\'attente de 2,4 s');
  // Aucune animation en cours sur la carte ni ses éclats.
  const animations = await cdp.evaluer(`document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity && a.effect?.target?.closest?.('dialog')).length`);
  assert.equal(animations, 0, 'aucune animation bornée en cours');
  await clic('dialog[open] .cer-ok');
  await jusqua(() => cdp.evaluer(`document.querySelectorAll('ul[aria-label="Mon réseau"] li .carte-ligne-carte').length === 1`), 'carte rangée');
  assert.deepEqual(cdp.erreursPage, []);
});

test('Cérémonie : à 390 px de large, la carte tient sans défilement horizontal', { skip: raison, timeout: 30_000 }, async () => {
  await ouvrirBadges(globalThis.__slugs.etroit, { largeur: 390 });
  const debordement = () => cdp.evaluer(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  assert.ok(await debordement() <= 0, 'Mes badges, carte face cachée');
  await clic('.cl-nouvelles .carte-cachee');
  await jusqua(() => existe('dialog[open] .cer-carte .carte-cachee'), 'cérémonie ouverte');
  await clic('dialog[open] .cer-carte .carte-cachee');
  await jusqua(() => visible('dialog[open] .cer-ok'), 'bouton d\'ajout affiché', 6000);
  const dlg = await cdp.evaluer(`(() => { const d = document.querySelector('dialog[open]'); const c = d.querySelector('.cer-carte .carte-ligne-carte').getBoundingClientRect(); return { defile: d.scrollWidth - d.clientWidth, gauche: c.left, droite: c.right, largeur: innerWidth }; })()`);
  assert.ok(dlg.defile <= 0, 'cérémonie sans défilement horizontal');
  assert.ok(dlg.gauche >= 0 && dlg.droite <= dlg.largeur, `la carte tient dans l'écran (${dlg.gauche}–${dlg.droite} sur ${dlg.largeur})`);
  assert.ok(await debordement() <= 0, 'page sans défilement horizontal');
  await clic('dialog[open] .cer-ok');
  await jusqua(() => cdp.evaluer(`document.querySelectorAll('ul[aria-label="Mon réseau"] li .carte-ligne-carte').length === 1`), 'carte rangée');
  assert.ok(await debordement() <= 0, 'page sans défilement horizontal une fois la carte rangée');
});

// Ticket #196 : la cérémonie se joue sur l'accueil, dans l'encart de la Leçon, sans changer de page.
test('Accueil : la carte de la Leçon attend face cachée dans son encart, la cérémonie la range d\'office', { skip: raison, timeout: 30_000 }, async () => {
  const slug = globalThis.__slugs.accueil;
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); location.hash = '#/'; location.reload(); true`);
  await jusqua(() => existe('.lecon .lecon-carte .carte-cachee'), 'dos « Nouveau » dans l\'encart');
  const adresse = await cdp.evaluer('location.hash');
  assert.equal(await existe('#nav .compteur-etoiles .nouveau'), true, 'pastille « Nouveau » de la navigation');
  await clic('.lecon .lecon-carte .carte-cachee');
  await jusqua(() => existe('dialog.cartes-ceremonie[open] .cer-carte .carte-cachee'), 'cérémonie ouverte sur l\'accueil');
  assert.equal(await cdp.evaluer('location.hash'), adresse, 'sans changer de page');
  await clic('dialog.cartes-ceremonie .cer-carte .carte-cachee');
  await jusqua(() => visible('dialog[open] .cer-ok'), 'bouton « Fermer » affiché', 6000);
  assert.equal(await visible('dialog[open] .cer-plus-tard'), false, 'un seul bouton une fois retournée');
  await clic('dialog[open] .cer-ok');
  await jusqua(async () => !(await existe('dialog[open]')) && await existe('.lecon .lecon-carte .carte-ligne-carte:not(.carte-cachee)'), 'carte de ligne rangée dans l\'encart');
  assert.equal(await existe('#nav .compteur-etoiles .nouveau'), false, 'la pastille tombe quand plus aucune carte n\'est à retourner');
  const cartes = JSON.parse(await fs.readFile(path.join(dossier, 'eleves', slug, 'cartes.json'), 'utf8')).cartes;
  assert.ok(Object.values(cartes)[0].retourne, 'retournement enregistré');
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  assert.ok(await cdp.evaluer('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 0, 'accueil sans défilement horizontal à 390 px');
  // Rechargement : la carte est toujours là, et Mes badges n'a plus de « Nouvelles cartes ».
  await cdp.evaluer('location.reload(); true');
  await jusqua(() => existe('.lecon .lecon-carte .carte-ligne-carte:not(.carte-cachee)'), 'carte toujours visible après rechargement');
  await cdp.evaluer(`location.hash = '#/badges'; true`);
  await jusqua(() => existe('ul[aria-label="Mon réseau"] li .carte-ligne-carte'), 'dans Mon réseau');
  assert.equal(await existe('.cl-nouvelles'), false);
  assert.deepEqual(cdp.erreursPage, []);
});

// Ticket #197 : une carte pas encore composée s'ouvre sur l'attente (esquisse), puis se fond dans la cérémonie dès qu'elle
// est prête, sans second geste ; le retournement n'est enregistré qu'à ce moment.
async function eleveCartePasPrete(pseudo) {
  const eleves = path.join(dossier, 'eleves');
  const store = createStore(eleves);
  const profil = await store.creerEleve({ pseudo, age: 11, niveau: 'Primaire 6' });
  const lecon = (await store.creerLecon(profil.slug, { sujet: 'Les volcans', mode: 'libre' })).id;
  const carte = { lecon, titre: 'Les volcans', categorie: 'sciences', objectifs: 3, jourAcquisition: '2026-11-02', etat: 'en-composition', essais: 1, calques: null, prete: null, retourne: null };
  const fichier = path.join(eleves, profil.slug, 'cartes.json');
  const ecrire = (c) => fs.writeFile(fichier, JSON.stringify({ version: 1, livraison: '2026-10-01T10:00:00.000Z', son: false, ecartees: [], cartes: { [lecon]: c }, paliers: {} }));
  await ecrire(carte);
  const rendrePrete = () => ecrire({ ...carte, etat: 'prete', calques: sceneGenerique({ lecon, categorie: 'sciences' }), prete: '2026-11-02T10:00:00.000Z' });
  return { slug: profil.slug, fichier, rendrePrete, lecon };
}

async function ouvrirAccueil(slug, { mouvementReduit = false } = {}) {
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: mouvementReduit ? 'reduce' : 'no-preference' }] });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); location.hash = '#/'; location.reload(); true`);
  await jusqua(() => existe('.lecon .lecon-carte .carte-cachee'), 'dos de la carte dans l\'encart');
}

test('Attente : la carte pas prête s\'ouvre sur l\'esquisse, puis la cérémonie prend le relais dès qu\'elle est prête', { skip: raison, timeout: 40_000 }, async () => {
  const { slug, fichier, rendrePrete, lecon } = await eleveCartePasPrete('Cdp-Attente');
  await ouvrirAccueil(slug);
  assert.equal(await cdp.evaluer(`document.querySelector('.lecon .lecon-carte .carte-cachee').disabled`), false, 'la carte en préparation se touche');
  await clic('.lecon .lecon-carte .carte-cachee');
  await jusqua(() => existe('dialog.cartes-ceremonie[open] .cer-carte .carte-cachee'), 'cérémonie ouverte sur le dos de la carte');
  await clic('dialog.cartes-ceremonie .cer-carte .carte-cachee');
  await jusqua(() => existe('dialog[open] .att-carte .att-in svg'), 'esquisse affichée');
  assert.equal(await cdp.evaluer(`document.querySelector('dialog[open] .cer-texte').textContent`), 'Ta carte se prépare');
  assert.equal(await existe('dialog[open] .cl-heros'), false, 'aucun héros annoncé');
  assert.equal(await visible('dialog[open] .att-pause'), true, 'pause visible dès le départ');
  assert.equal(await cdp.evaluer(`document.querySelector('dialog[open] .att-pause').hasAttribute('aria-pressed')`), false);
  // La pause change seulement de libellé.
  await clic('dialog[open] .att-pause');
  assert.equal(await cdp.evaluer(`document.querySelector('dialog[open] .att-pause').textContent`), 'Reprendre');
  assert.equal(await cdp.evaluer(`document.querySelector('dialog[open] .att-carte').classList.contains('pause')`), true);
  await clic('dialog[open] .att-pause');
  // Pas prête : rien n'est enregistré.
  assert.equal(JSON.parse(await fs.readFile(fichier, 'utf8')).cartes[lecon].retourne, null);
  await rendrePrete();
  await jusqua(() => existe('dialog[open] .cer-carte .carte-ligne-carte.entree'), 'cérémonie sans second geste', 8000);
  assert.equal(await existe('dialog[open] .att-carte'), false, 'l\'esquisse a cédé la place');
  await jusqua(() => visible('dialog[open] .cer-ok'), 'bouton « Fermer » affiché', 6000);
  await jusqua(async () => JSON.parse(await fs.readFile(fichier, 'utf8')).cartes[lecon].retourne, 'retournement enregistré');
  await clic('dialog[open] .cer-ok');
  await jusqua(async () => !(await existe('dialog[open]')) && await existe('.lecon .lecon-carte .carte-ligne-carte:not(.carte-cachee)'), 'carte rangée dans l\'encart');
  assert.equal(await existe('.lecon .lecon-carte .cl-calque svg'), true, 'la carte rangée porte ses calques composés');
  assert.deepEqual(cdp.erreursPage, []);
});

test('Attente : sous prefers-reduced-motion, l\'esquisse est fixe et complète, sans bouton Pause', { skip: raison, timeout: 40_000 }, async () => {
  const { slug, rendrePrete } = await eleveCartePasPrete('Cdp-Attente-Reduit');
  await ouvrirAccueil(slug, { mouvementReduit: true });
  await clic('.lecon .lecon-carte .carte-cachee');
  await jusqua(() => existe('dialog[open] .cer-carte .carte-cachee'), 'cérémonie ouverte');
  await clic('dialog[open] .cer-carte .carte-cachee');
  await jusqua(() => existe('dialog[open] .att-carte .att-in svg'), 'esquisse affichée');
  assert.equal(await visible('dialog[open] .att-pause'), false, 'rien à arrêter');
  assert.equal(await cdp.evaluer(`document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.att-carte')).length`), 0, 'aucune animation en cours');
  assert.equal(await cdp.evaluer(`getComputedStyle(document.querySelector('dialog[open] .att-in .cadre')).strokeDashoffset`), '0px', 'tracé complet');
  await rendrePrete();
  await jusqua(() => visible('dialog[open] .cer-ok'), 'cérémonie jouée d\'emblée', 8000);
  assert.deepEqual(cdp.erreursPage, []);
});

// Ticket #197 : sur le Retour de quiz, la carte gagnée est proposée face cachée, à côté de l'annonce. Elle s'ouvre au
// geste, sur la page courante ; retournée, elle n'est plus proposée (rechargement compris).
test('Retour de quiz : la carte de ligne gagnée est proposée face cachée, la cérémonie s\'ouvre sans quitter la page', { skip: raison, timeout: 40_000 }, async () => {
  const { slug, fichier, rendrePrete, lecon } = await eleveCartePasPrete('Cdp-Retour');
  await createStore(path.join(dossier, 'eleves')).enregistrerTour(slug, lecon, {
    question: '📝 Quiz terminé : 90 %', reponse: 'Bravo !', details: { retourQuiz: { score: 90, action: 'terminee', nouvellesCartesLigne: [lecon] } }, etatLecon: { terminee: '2026-11-02T10:00:00.000Z' },
  });
  await cdp.envoyer('Emulation.setDeviceMetricsOverride', { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await cdp.envoyer('Page.navigate', { url: base });
  await jusqua(() => cdp.evaluer(`document.readyState === 'complete' && !!document.getElementById('app')`), 'page chargée');
  await cdp.evaluer(`localStorage.setItem('pseudo', ${JSON.stringify(slug)}); location.hash = ${JSON.stringify(`#/lecon/${lecon}`)}; location.reload(); true`);
  await jusqua(() => existe('.apres-quiz .cartes-gain .carte-cachee'), 'carte proposée face cachée sur le Retour');
  assert.equal(await existe('dialog[open]'), false, 'jamais ouverte d\'elle-même');
  const adresse = await cdp.evaluer('location.hash');
  await rendrePrete(); // la composition s'est terminée entre-temps : cérémonie immédiate
  await clic('.apres-quiz .cartes-gain .carte-cachee');
  await jusqua(() => existe('dialog.cartes-ceremonie[open] .cer-carte .carte-cachee'), 'cérémonie ouverte');
  assert.equal(await cdp.evaluer('location.hash'), adresse, 'sans quitter la page');
  await clic('dialog[open] .cer-carte .carte-cachee');
  await jusqua(() => visible('dialog[open] .cer-ok'), 'bouton « Fermer » affiché', 6000);
  assert.ok(JSON.parse(await fs.readFile(fichier, 'utf8')).cartes[lecon].retourne, 'retournement enregistré');
  await clic('dialog[open] .cer-ok');
  await jusqua(async () => !(await existe('dialog[open]')) && !(await visible('.apres-quiz .cartes-gain')), 'carte plus proposée');
  await cdp.evaluer('location.reload(); true');
  await jusqua(() => existe('.apres-quiz .retour'), 'Retour réaffiché');
  assert.equal(await visible('.apres-quiz .cartes-gain'), false, 'après rechargement : plus à retourner');
  assert.deepEqual(cdp.erreursPage, []);
});
