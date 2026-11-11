import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { lancerServeur } from './aide-serveur.js';

// Serveur réel en sous-processus, dont `claude` est introuvable ou refuse le jeton, et dont les Élèves vivent
// dans un dossier extérieur au dépôt (ELEVES_DIR, comme un volume monté).
const racine = path.join(import.meta.dirname, '..');
const dossiers = [];
const serveurs = [];

async function lancer({ claude }) {
  const dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-indispo-'));
  dossiers.push(dossier);
  const eleves = path.join(dossier, 'volume', 'eleves');
  await fs.mkdir(eleves, { recursive: true });
  let bin = path.join(dossier, 'rien-ici');
  if (claude === 'jeton-refuse') {
    bin = path.join(dossier, 'faux-claude.sh');
    await fs.writeFile(bin, `#!/bin/sh
echo '{"type":"result","is_error":true,"result":"Invalid API key · Please run /login","session_id":"s"}'
`, { mode: 0o755 });
  }
  const serveur = await lancerServeur({
    env: { HOST: '127.0.0.1', CLAUDE_BIN: bin, TEACH_SKILL_DIR: dossier, ELEVES_DIR: eleves, CARTABLE_PREPARATION: '0' },
  });
  serveurs.push(serveur);
  return { base: `http://127.0.0.1:${serveur.port}`, eleves, logs: serveur.logs };
}

after(async () => {
  for (const s of serveurs) s.arreter();
  for (const d of dossiers) await fs.rm(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});

async function demanderUneLecon(base) {
  const cree = await fetch(`${base}/api/eleves`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudo: 'Zoé-Test', age: 11, niveau: 'Primaire 6' }) });
  assert.equal(cree.status, 201);
  const res = await fetch(`${base}/api/eleves/zoe-test/lecons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sujet: 'les volcans' }) });
  return { status: res.status, data: await res.json() };
}

test("claude introuvable : l'accueil est servi depuis un ELEVES_DIR hors du dépôt, la demande au prof dit pourquoi, et les logs aussi", async () => {
  const { base, eleves, logs } = await lancer({ claude: 'introuvable' });
  const accueil = await fetch(`${base}/`);
  assert.equal(accueil.status, 200);
  assert.equal((await fetch(`${base}/api/eleves`)).status, 200);
  const demande = await demanderUneLecon(base);
  assert.equal(demande.status, 502);
  assert.match(demande.data.erreur, /claude.*introuvable/i);
  assert.match(logs(), /claude.*introuvable/i);
  await fs.access(path.join(eleves, 'zoe-test', 'profil.json'));
});

test("jeton refusé par claude : message clair pour l'Élève (jeton expiré ou révoqué, à renouveler par le parent) et dans les logs", async () => {
  const { base, logs } = await lancer({ claude: 'jeton-refuse' });
  const demande = await demanderUneLecon(base);
  assert.equal(demande.status, 502);
  assert.match(demande.data.erreur, /jeton/i);
  assert.match(demande.data.erreur, /expiré ou révoqué/);
  assert.match(demande.data.erreur, /parent/);
  assert.match(logs(), /jeton/i);
});
