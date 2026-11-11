import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

// Lancer un vrai `node server.js` pour un test, sans jamais geler : port libre demandé au système,
// démarrage = « stdout ou sortie du processus » avec un délai, échec avec le contenu de stderr.
const racine = path.join(import.meta.dirname, '..');
const lances = new Set();

// Un test tué ne passe pas dans `after()` : les serveurs lancés s'arrêtent avec le runner.
const arreterTout = () => { for (const p of lances) p.kill('SIGTERM'); };
process.on('exit', arreterTout);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { arreterTout(); process.exit(1); });

export function portLibre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

// `env` s'ajoute à process.env ; PORT est choisi ici. Renvoie { processus, port, logs, arreter }.
// `delai` : durée maximale d'attente du premier message du serveur ; `port` : port imposé (test de l'échec).
export async function lancerServeur({ env = {}, delai = 10_000, port, essais = 3 } = {}) {
  let derniere;
  for (let i = 0; i < essais; i++) {
    const p = port ?? await portLibre();
    try { return await demarrer(p, env, delai); } catch (e) {
      derniere = e;
      // Le port peut être pris entre le tirage et le démarrage : on retire un autre port, sauf s'il est imposé.
      if (port !== undefined || !/EADDRINUSE/.test(e.message)) break;
    }
  }
  throw derniere;
}

function demarrer(port, env, delai) {
  const processus = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, ...env, PORT: String(port) },
    cwd: racine,
    stdio: 'pipe',
  });
  lances.add(processus);
  let sortie = '';
  let erreurs = '';
  processus.stdout.on('data', (d) => (sortie += d));
  processus.stderr.on('data', (d) => (erreurs += d));
  processus.once('exit', () => lances.delete(processus));
  const logs = () => sortie + erreurs;
  const arreter = () => processus.kill('SIGTERM');
  return new Promise((resolve, reject) => {
    const fin = (erreur) => {
      clearTimeout(minuterie);
      processus.stdout.off('data', surSortie);
      processus.off('exit', surExit);
      if (erreur) { processus.kill('SIGKILL'); reject(erreur); } else resolve({ processus, port, logs, arreter });
    };
    const surSortie = () => fin();
    const surExit = (code, signal) => setTimeout(() => fin(new Error(`server.js s'est arrêté au démarrage (code ${code ?? signal}, port ${port}) :\n${logs().trim()}`)), 50);
    const minuterie = setTimeout(() => fin(new Error(`server.js n'a rien écrit en ${delai} ms (port ${port}) :\n${logs().trim() || '(aucune sortie)'}`)), delai);
    processus.stdout.once('data', surSortie);
    processus.once('exit', surExit);
  });
}
