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

const presentation = (profil) => `Tu t'adresses à ${profil.pseudo}, ${profil.age} ans, niveau scolaire : ${profil.niveau} (système belge francophone).`;

export function consignesLecon(profil) {
  return [
    presentation(profil),
    `Réponds toujours en français, avec un vocabulaire adapté à son âge et des messages courts, en texte brut (pas de Markdown : ni **, ni titres, ni listes à tirets). Une seule question à la fois.`,
    `L'élève ne peut pas écrire : il répond seulement en touchant une des réponses que tu lui proposes (l'appli ajoute toujours « Je ne sais pas 🤷 »). Quand tu poses une question, termine ton message par une dernière ligne au format exact « CHOIX: réponse 1 | réponse 2 | réponse 3 », avec 2 à 4 réponses très courtes, écrites comme l'élève les dirait.`,
    `Travaille uniquement dans le dossier courant (la Leçon de l'élève).`,
    `Dès la première séance, écris le fichier lesson.json : {"titre": "<titre court de la leçon>", "categorie": "<une de : ${CATEGORIES.join(', ')}>"}.`,
    `Chaque quiz de page de leçon, une fois terminé, transmet le score de l'élève à l'appli avec : window.parent.postMessage({ type: 'cartable-score', score: <pourcentage de 0 à 100>, page: location.pathname.split('/').pop() }, '*'). Mets ce code dans un composant partagé de assets/ réutilisé par tous les quiz.`,
    `Une séance produit TOUJOURS une page de leçon HTML dans lessons/ (comme le skill teach le prévoit) : le contenu et le mini-quiz de rappel interactif y figurent. Dès que tu connais la mission de l'élève, crée cette page : l'appli l'affiche en plein écran à la place de ton message. Après avoir créé une page, ne pose donc pas de question et ne mets pas de ligne CHOIX.`,
    `À la fin d'un quiz, l'appli propose elle-même un Rebond à l'élève : « Revoir » (une nouvelle page, plus courte, qui reprend autrement ce qu'il a raté), « Défi » (une page plus difficile sur le même sujet) ou « Étape suivante » (la page suivante de sa mission, dans la même Leçon). Quand il en choisit une, l'appli te dit laquelle : crée la page correspondante.`,
  ].join('\n');
}

// Premier tour d'une Leçon libre : le sujet tapé par l'élève, cadré (seul texte libre de l'appli).
export const promptDemarrageLibre = (sujet) => [
  sujet,
  `[Consigne de l'appli : si ce sujet est inadapté à l'âge de l'élève, choquant, ou sans aucun lien avec un apprentissage, ne l'enseigne pas : ne crée ni page ni lesson.json, explique-lui en une phrase bienveillante pourquoi, puis termine par une ligne CHOIX: de 3 ou 4 sujets voisins et adaptés. Quand il en choisit un, démarre la Leçon normalement sur ce sujet. S'il répond « Je ne sais pas », propose-lui d'autres sujets de la même façon.]`,
].join('\n');

// Réponses proposées : la dernière ligne « CHOIX: a | b | c » du prof, retirée du texte affiché.
export function extraireChoix(reponse) {
  const lignes = reponse.trimEnd().split('\n');
  const derniere = lignes.at(-1).replace(/\*/g, '').match(/^\s*choix\s*:\s*(.*)$/i);
  if (!derniere) return { texte: reponse.trim() };
  const texte = lignes.slice(0, -1).join('\n').trim();
  const choix = derniere[1].split('|').map((c) => c.trim()).filter(Boolean).slice(0, 4);
  return choix.length ? { texte, choix } : { texte };
}

// Suite proposée après un quiz, d'après son score (pas la Maîtrise).
const QUIZ_REUSSI = 80; // score minimal, en %

export const actionApresQuiz = (score, mode) => (score < QUIZ_REUSSI ? 'revoir' : mode === 'revision' ? 'defi' : 'suivante');

// Action portée par le Retour de quiz : un Défi réussi termine une Leçon de révision.
export const actionRetourQuiz = (score, mode, defiEnCours) =>
  defiEnCours && mode === 'revision' && score >= QUIZ_REUSSI ? 'terminee' : actionApresQuiz(score, mode);

// Rebonds, en valeurs fermées : ce que le Retour de quiz annonce, la phrase enregistrée comme message de l'Élève
// et la consigne envoyée au prof.
const consigneRebond = (nom, page) => [
  `[Rebond : ${nom}.] L'élève a choisi ce Rebond après son dernier quiz.`,
  `Crée ${page}, avec son mini-quiz. Ne pose pas de question et n'ajoute pas de ligne CHOIX.`,
].join('\n');

export const REBONDS = {
  revoir: {
    annonce: "revoir ce qu'il a raté",
    phrase: "🔁 Je veux revoir ce que j'ai raté.",
    consigne: consigneRebond('Revoir', "une nouvelle page de leçon, plus courte, qui reprend autrement ce qu'il a raté"),
  },
  defi: {
    annonce: 'relever un défi plus difficile',
    phrase: '🏆 Je veux un défi plus difficile.',
    consigne: consigneRebond('Défi', 'une page de Défi, plus difficile, sur le même sujet'),
  },
  suivante: {
    annonce: "passer à l'étape suivante",
    phrase: '➡️ Je suis prêt pour la suite.',
    consigne: consigneRebond('Étape suivante', 'la page suivante de sa mission, dans la même Leçon'),
  },
};

export const promptRetourQuiz = ({ score, page, action }) => [
  `[Quiz terminé : ${page || 'page en cours'}, ${score} %.]`,
  `Donne à l'élève un retour court sur ce quiz (2 ou 3 phrases encourageantes, qui citent ce qu'il a réussi ou raté si tu le sais).`,
  `Ne crée aucune page, ne pose pas de question et n'ajoute pas de ligne CHOIX : ${action === 'terminee'
    ? "il a réussi son Défi, sa Leçon est terminée : félicite-le, l'appli lui propose ensuite un nouveau défi s'il veut s'entraîner encore."
    : `l'appli lui propose ensuite de ${REBONDS[action].annonce}.`}`,
].join('\n');

const resumeLecon = ({ titre, categorie, maitrise: m }) =>
  `- ${titre} (${categorie}) : Maîtrise ${m ? `${m.pourcentage} %, ${m.palier}` : 'pas encore évaluée'}`;

// Tour hors Leçon : l'agent écrit les Propositions dans le dossier courant, sans skill teach.
// Nombre de Propositions réglé dans le profil, dont 2 au programme quel que soit leur type ; uniquement des originaux sans Leçon.
export function consignesPropositions(profil, lecons = []) {
  const n = profil.nombrePropositions;
  const type = lecons.length ? `"type": "suite" ou "type": "original"` : `"type": "original"`;
  return [
    presentation(profil),
    ...(lecons.length
      ? [
          `Ses Leçons :`,
          ...lecons.map(resumeLecon),
          `Ton rôle : proposer à l'élève ${n} sujets de nouvelles Leçons libres, en choisissant toi-même combien de chaque type : des suites de ce qu'il a déjà étudié (approfondir, consolider ce qui n'est pas acquis, ou passer à l'étape suivante), et des sujets originaux, sans rapport avec ses Leçons, adaptés à son âge et à son niveau scolaire.`,
        ]
      : [`Ton rôle : proposer à l'élève ${n} sujets originaux de nouvelles Leçons libres, adaptés à son âge et à son niveau scolaire.`]),
    `Exactement 2 d'entre eux sont au programme scolaire officiel de ${profil.niveau} (Fédération Wallonie-Bruxelles) : des notions qu'il étudie ou va étudier en classe cette année. Une suite comme un sujet original peut être au programme. Appuie-toi sur tes connaissances et, au besoin, sur une recherche web.`,
    `Varie les matières. Écris uniquement le fichier propositions.json dans le dossier courant, au format :`,
    `[{"titre": "<titre court>", "categorie": "<une de : ${CATEGORIES.join(', ')}>", "accroche": "<une phrase qui donne envie, en français adapté à son âge>", ${type}, "auProgramme": true ou false}]`,
    `N'écris aucun autre fichier et ne pose pas de question : l'élève ne lit pas ta réponse.`,
  ].join('\n');
}

export function lancerAgent({ cwd, prompt, sessionId, consignes, teach = true }) {
  // Cloisonnement : écriture dans le dossier de travail seulement (Leçon ou Propositions, acceptEdits), web autorisé pour sourcer
  // les leçons, aucun shell. Seuls les réglages utilisateur sont chargés (pour le plugin teach) : les élèves
  // vivent dans le dépôt, dont les réglages de projet autorisent des commandes git destructrices.
  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--permission-mode', 'acceptEdits',
    '--setting-sources', 'user',
    '--allowedTools', 'WebSearch,WebFetch',
    '--disallowedTools', 'Bash,PowerShell',
    '--append-system-prompt', consignes,
  ];
  const dossierTeach = teach && trouverDossierTeach();
  if (dossierTeach) args.push('--add-dir', dossierTeach);
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
