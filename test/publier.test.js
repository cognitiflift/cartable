import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, chmodSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'publier.sh');

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, stdio: 'pipe' });

// Dépôt « NAS » cloné depuis une origine, avec eleves/ et le script copié dedans.
function monde() {
  const racine = mkdtempSync(join(tmpdir(), 'publier-'));
  const origine = join(racine, 'origine.git');
  const nas = join(racine, 'nas');
  const auteur = join(racine, 'auteur');
  git(racine, 'init', '--bare', '-b', 'main', origine);
  git(racine, 'clone', origine, auteur);
  mkdirSync(join(auteur, 'scripts'));
  writeFileSync(join(auteur, 'a.txt'), '1\n');
  copyFileSync(SCRIPT, join(auteur, 'scripts', 'publier.sh'));
  chmodSync(join(auteur, 'scripts', 'publier.sh'), 0o755);
  git(auteur, 'add', '.');
  git(auteur, 'commit', '-m', 'init');
  git(auteur, 'push', 'origin', 'HEAD:main');
  git(racine, 'clone', origine, nas);
  mkdirSync(join(nas, 'eleves'));
  writeFileSync(join(nas, 'eleves', 'lea.json'), '{"nom":"Léa"}');
  const marque = join(racine, 'redemarre');
  return { racine, origine, nas, auteur, marque };
}

function lancer(m, { verifs = 'true' } = {}) {
  const r = spawnSync('bash', [join(m.nas, 'scripts', 'publier.sh')], {
    cwd: m.nas,
    encoding: 'utf8',
    env: { ...process.env, VERIFS_CMD: verifs, RESTART_CMD: `touch ${m.marque}` },
  });
  return { ...r, sortie: r.stdout + r.stderr };
}

const elevesIntacts = (m) =>
  readFileSync(join(m.nas, 'eleves', 'lea.json'), 'utf8') === '{"nom":"Léa"}';

test('succès : pull, vérifications puis redémarrage', () => {
  const m = monde();
  writeFileSync(join(m.auteur, 'a.txt'), '2\n');
  git(m.auteur, 'commit', '-am', 'maj');
  git(m.auteur, 'push', 'origin', 'HEAD:main');
  const r = lancer(m);
  assert.equal(r.status, 0, r.sortie);
  assert.equal(readFileSync(join(m.nas, 'a.txt'), 'utf8'), '2\n');
  assert.ok(existsSync(m.marque), 'le conteneur doit être redémarré');
  assert.ok(elevesIntacts(m));
});

test('pull sans avance rapide : arrêt avant le redémarrage', () => {
  const m = monde();
  writeFileSync(join(m.nas, 'a.txt'), 'local\n');
  git(m.nas, 'commit', '-am', 'local');
  writeFileSync(join(m.auteur, 'a.txt'), 'distant\n');
  git(m.auteur, 'commit', '-am', 'distant');
  git(m.auteur, 'push', 'origin', 'HEAD:main');
  const r = lancer(m);
  assert.notEqual(r.status, 0);
  assert.match(r.sortie, /pull/i);
  assert.ok(!existsSync(m.marque), 'pas de redémarrage');
  assert.ok(elevesIntacts(m));
});

test('vérifications en échec : arrêt avant le redémarrage', () => {
  const m = monde();
  const r = lancer(m, { verifs: 'false' });
  assert.notEqual(r.status, 0);
  assert.match(r.sortie, /vérifications/i);
  assert.ok(!existsSync(m.marque), 'pas de redémarrage');
  assert.ok(elevesIntacts(m));
});

test('sans npm : les vérifications tournent dans le conteneur (docker exec)', () => {
  const m = monde();
  // PATH réduit à des liens vers les seuls outils du script, plus un faux docker : pas de npm.
  const bin = join(m.racine, 'bin');
  mkdirSync(bin);
  for (const c of ['bash', 'sh', 'git', 'dirname', 'touch', 'cat', 'env']) {
    const chemin = execFileSync('sh', ['-c', `command -v ${c}`], { encoding: 'utf8' }).trim();
    symlinkSync(chemin, join(bin, c));
  }
  const journal = join(m.racine, 'docker.log');
  writeFileSync(join(bin, 'docker'), `#!/bin/sh\necho "$@" >> ${journal}\n`);
  chmodSync(join(bin, 'docker'), 0o755);
  const r = spawnSync(join(bin, 'bash'), [join(m.nas, 'scripts', 'publier.sh')], {
    cwd: m.nas,
    encoding: 'utf8',
    env: { PATH: bin, PUBLIER_PATH_EXTRA: '', HOME: process.env.HOME },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const appels = readFileSync(journal, 'utf8');
  assert.match(appels, /exec cartable sh -c npm run check && npm test/);
  assert.match(appels, /restart cartable/);
  assert.ok(elevesIntacts(m));
});
