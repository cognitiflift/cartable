import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { trouverDossierTeach } from '../lib/agent.js';

// Le skill teach lit ses fichiers de format hors du dossier de la leçon : le dossier passé à `claude --add-dir`
// se trouve là où le plugin est installé. Vérifié avec la CLI (2.1.322) : sans --add-dir, la lecture est refusée.

function avecMaison(teachSkillDir, fn) {
  const maison = fs.mkdtempSync(path.join(os.tmpdir(), 'maison-'));
  const avant = { HOME: process.env.HOME, TEACH_SKILL_DIR: process.env.TEACH_SKILL_DIR };
  process.env.HOME = maison;
  if (teachSkillDir === undefined) delete process.env.TEACH_SKILL_DIR;
  else process.env.TEACH_SKILL_DIR = teachSkillDir;
  try {
    fn(maison);
  } finally {
    for (const [k, v] of Object.entries(avant)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(maison, { recursive: true, force: true });
  }
}

function installerPlugin(maison, marketplace, version) {
  const d = path.join(maison, '.claude/plugins/cache', marketplace, 'mattpocock-skills', version, 'skills/productivity/teach');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

test('Dossier du skill teach : trouvé dans le plugin du marketplace mattpocock', () => {
  avecMaison(undefined, (maison) => {
    const d = installerPlugin(maison, 'mattpocock', '1.3.1');
    assert.equal(trouverDossierTeach(), d);
  });
});

test('Dossier du skill teach : trouvé dans le plugin de claude-plugins-official, dernière version', () => {
  avecMaison(undefined, (maison) => {
    installerPlugin(maison, 'claude-plugins-official', '1.0.0');
    const d = installerPlugin(maison, 'claude-plugins-official', '1.2.0');
    assert.equal(trouverDossierTeach(), d);
  });
});

test('Dossier du skill teach : TEACH_SKILL_DIR l\'emporte sur les plugins installés', () => {
  avecMaison('/opt/skill-teach', (maison) => {
    installerPlugin(maison, 'mattpocock', '1.3.1');
    assert.equal(trouverDossierTeach(), '/opt/skill-teach');
  });
});

test('Dossier du skill teach : aucun plugin installé, aucun dossier', () => {
  avecMaison(undefined, () => assert.equal(trouverDossierTeach(), null));
});
