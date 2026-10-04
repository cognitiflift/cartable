import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CATEGORIES } from './store.js';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const TIMEOUT_MS = 10 * 60 * 1000;

// Le skill lit ses propres fichiers de format hors du dossier de la leçon : il faut l'autoriser (--add-dir).
export function trouverDossierTeach() {
  if (process.env.TEACH_SKILL_DIR) return process.env.TEACH_SKILL_DIR;
  const base = path.join(os.homedir(), '.claude/plugins/cache/claude-plugins-official/mattpocock-skills');
  const versions = fs.existsSync(base) ? fs.readdirSync(base).sort() : [];
  const derniere = versions.at(-1);
  return derniere ? path.join(base, derniere, 'skills/productivity/teach') : null;
}

export function consignes(profil) {
  return [
    `Tu t'adresses à ${profil.pseudo}, ${profil.age} ans, niveau scolaire : ${profil.niveau} (système belge francophone).`,
    `Réponds toujours en français, avec un vocabulaire adapté à son âge et des messages courts. Une seule question à la fois.`,
    `Travaille uniquement dans le dossier courant (la Leçon de l'élève).`,
    `Dès la première séance, écris le fichier lesson.json : {"titre": "<titre court de la leçon>", "categorie": "<une de : ${CATEGORIES.join(', ')}>"}.`,
    `Une séance produit TOUJOURS une page de leçon HTML dans lessons/ (comme le skill teach le prévoit) : le contenu et le mini-quiz de rappel interactif y figurent. Dès que tu connais la mission de l'élève, crée cette page, puis préviens l'élève dans le chat que la leçon est prête dans le panneau de droite (ne lui demande pas de l'ouvrir lui-même, et ne lui dicte pas le quiz dans le chat). Le chat sert à poser la mission, guider et répondre aux questions.`,
  ].join('\n');
}

export function lancerAgent({ cwd, prompt, sessionId, profil }) {
  // Cloisonnement : écriture dans le dossier de la leçon seulement (acceptEdits), web autorisé pour sourcer
  // les leçons, aucun shell. Seuls les réglages utilisateur sont chargés (pour le plugin teach) : les élèves
  // vivent dans le dépôt, dont les réglages de projet autorisent des commandes git destructrices.
  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--permission-mode', 'acceptEdits',
    '--setting-sources', 'user',
    '--allowedTools', 'WebSearch,WebFetch',
    '--disallowedTools', 'Bash,PowerShell',
    '--append-system-prompt', consignes(profil),
  ];
  const teach = trouverDossierTeach();
  if (teach) args.push('--add-dir', teach);
  if (sessionId) args.push('--resume', sessionId);

  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Impossible de lancer Claude (${e.message})`));
    });
    child.on('close', () => {
      clearTimeout(timer);
      let data;
      try {
        data = JSON.parse(out);
      } catch {
        return reject(new Error(err.trim() || 'Réponse illisible de Claude'));
      }
      if (data.is_error) return reject(new Error(typeof data.result === 'string' ? data.result : 'Erreur de Claude'));
      resolve({ reponse: data.result, sessionId: data.session_id });
    });
  });
}
