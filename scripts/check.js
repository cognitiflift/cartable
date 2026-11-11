// Contrôle de syntaxe de tout le JavaScript du dépôt (`node --check`), sans dépendance.
// Plus rapide que `npm test` : à lancer avant chaque commit (hook `.githooks/pre-commit`) et en CI.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const racine = new URL('..', import.meta.url).pathname;
const dossiers = ['lib', 'public', 'scripts', 'test'];

function fichiers(dossier) {
  return readdirSync(join(racine, dossier), { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : fichiers(chemin);
    return e.name.endsWith('.js') ? [chemin] : [];
  });
}

const tous = ['server.js', ...dossiers.flatMap(fichiers)];
const fautifs = [];
for (const f of tous) {
  try {
    execFileSync(process.execPath, ['--check', join(racine, f)], { stdio: 'pipe' });
  } catch (e) {
    fautifs.push(f);
    console.error(`✖ ${f}\n${e.stderr}`);
  }
}
if (fautifs.length) {
  console.error(`${fautifs.length} fichier(s) avec une erreur de syntaxe.`);
  process.exit(1);
}
console.log(`✔ ${tous.length} fichiers JavaScript : syntaxe valide.`);
