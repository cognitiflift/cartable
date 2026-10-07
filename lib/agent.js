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
    `Dès la première séance, écris le fichier lesson.json : {"titre": "<titre court de la leçon>", "categorie": "<une de : ${CATEGORIES.join(', ')}>", "objectifs": ["<Objectif 1>", "<Objectif 2>", …]}.`,
    `Les Objectifs sont des choses concrètes que l'élève saura faire, en phrases courtes : les « Success looks like » de MISSION.md (tirés du document source pour une révision), à garder alignés avec eux. Ils sont numérotés par leur position, à partir de 1 : ne les réordonne ni ne les supprime jamais, ajoute seulement les nouveaux à la fin de la liste.`,
    `Dépassement : chaque page de leçon (sauf les pages Revoir) va un tout petit peu plus loin que son contenu pour éveiller la curiosité de l'élève : elle se termine par un encart « 🚀 Pour aller plus loin », et son quiz comporte en plus 2 ou 3 questions bonus sur cet encart, clairement signalées comme bonus (🚀). Les questions bonus sont hors score : elles ne comptent pas dans le pourcentage du quiz.`,
    `Chaque quiz de page de leçon, une fois terminé, transmet le score de l'élève à l'appli avec : window.parent.postMessage({ type: 'cartable-score', score: <pourcentage de 0 à 100, questions bonus exclues>, bonus: { reussies: <questions bonus réussies>, total: <questions bonus posées> }, page: location.pathname.split('/').pop(), objectifs: [<numéros des Objectifs que couvre ce quiz>] }, '*') (sans le champ bonus si le quiz n'a pas de questions bonus). Mets ce code dans un composant partagé de assets/ réutilisé par tous les quiz : c'est lui qui tient les questions bonus hors du score principal.`,
    `Une séance produit TOUJOURS une page de leçon HTML dans lessons/ (comme le skill teach le prévoit) : le contenu et le mini-quiz de rappel interactif y figurent. Dès que tu connais la mission de l'élève, crée cette page : l'appli l'affiche en plein écran à la place de ton message. Après avoir créé une page, ne pose donc pas de question et ne mets pas de ligne CHOIX.`,
    `À la fin d'un quiz, l'appli propose elle-même un Rebond à l'élève. En Leçon libre, c'est toujours « Étape suivante », quel que soit le score : une page nouvelle de sa mission, dans la même Leçon, que tu choisis selon la zone proximale de l'élève (si le quiz est raté, elle retravaille ce qu'il a raté avant d'avancer). « Revoir » (une nouvelle page, plus courte, qui reprend autrement ce qu'il a raté) et « Défi » (une page plus difficile sur le même sujet) sont réservés à la Leçon de révision. Quand il en choisit un, l'appli te dit lequel : crée la page correspondante.`,
  ].join('\n');
}

// Premier tour d'une Leçon libre : le sujet tapé par l'élève, cadré (seul texte libre de l'appli).
export const promptDemarrageLibre = (sujet) => [
  sujet,
  `[Consigne de l'appli : si ce sujet est inadapté à l'âge de l'élève, choquant, ou sans aucun lien avec un apprentissage, ne l'enseigne pas : ne crée ni page ni lesson.json, explique-lui en une phrase bienveillante pourquoi, puis termine par une ligne CHOIX: de 3 ou 4 sujets voisins et adaptés. Quand il en choisit un, démarre la Leçon normalement sur ce sujet. S'il répond « Je ne sais pas », propose-lui d'autres sujets de la même façon.]`,
].join('\n');

// Dernière ligne « <MOT>: valeur » du prof (casse et ** tolérés) : retirée du texte affiché.
function extraireDerniereLigne(reponse, mot) {
  const lignes = reponse.trimEnd().split('\n');
  const derniere = lignes.at(-1).replace(/\*/g, '').match(new RegExp(`^\\s*${mot}\\s*:\\s*(.*)$`, 'i'));
  if (!derniere) return { texte: reponse.trim() };
  return { texte: lignes.slice(0, -1).join('\n').trim(), valeur: derniere[1].trim() };
}

// Réponses proposées : la dernière ligne « CHOIX: a | b | c » du prof, retirée du texte affiché.
export function extraireChoix(reponse) {
  const { texte, valeur } = extraireDerniereLigne(reponse, 'choix');
  const choix = (valeur ?? '').split('|').map((c) => c.trim()).filter(Boolean).slice(0, 4);
  return choix.length ? { texte, choix } : { texte };
}

// Annonce de la suite (Leçon libre) : la dernière ligne « ENSUITE: <titre> » du Retour de quiz, retirée du texte affiché.
export function extraireEnsuite(reponse) {
  const { texte, valeur } = extraireDerniereLigne(reponse, 'ensuite');
  return valeur ? { texte, ensuite: valeur } : { texte };
}

// Suite proposée après un quiz, d'après son score (pas la Maîtrise). En Leçon libre, toujours Étape suivante :
// le prof choisit lui-même la page nouvelle selon la zone proximale de l'Élève.
const QUIZ_REUSSI = 80; // score minimal, en %

export const actionApresQuiz = (score, mode) => (mode !== 'revision' ? 'suivante' : score < QUIZ_REUSSI ? 'revoir' : 'defi');

// Action portée par le Retour de quiz : un Défi réussi termine une Leçon de révision.
export const actionRetourQuiz = (score, mode, defiEnCours) =>
  defiEnCours && mode === 'revision' && score >= QUIZ_REUSSI ? 'terminee' : actionApresQuiz(score, mode);

// Rebonds, en valeurs fermées : ce que le Retour de quiz annonce, la phrase enregistrée comme message de l'Élève
// et la consigne envoyée au prof.
const texteConsigne = (nom, page) => [
  `[Rebond : ${nom}.] L'élève a choisi ce Rebond après son dernier quiz.`,
  `Crée ${page}, avec son mini-quiz. Ne pose pas de question et n'ajoute pas de ligne CHOIX.`,
].join('\n');

export const REBONDS = {
  revoir: {
    annonce: "revoir ce qu'il a raté",
    phrase: "🔁 Je veux revoir ce que j'ai raté.",
    consigne: texteConsigne('Revoir', "une nouvelle page de leçon, plus courte, qui reprend autrement ce qu'il a raté (pas de Dépassement : ni encart « Pour aller plus loin », ni questions bonus)"),
  },
  defi: {
    annonce: 'relever un défi plus difficile',
    phrase: '🏆 Je veux un défi plus difficile.',
    consigne: texteConsigne('Défi', 'une page de Défi, plus difficile, sur le même sujet'),
  },
  suivante: {
    annonce: "passer à l'étape suivante",
    phrase: '➡️ Je suis prêt pour la suite.',
    consigne: texteConsigne('Étape suivante', "une page nouvelle de sa mission, dans la même Leçon, choisie selon sa zone proximale (si son dernier quiz est raté, elle retravaille ce qu'il a raté avant d'avancer)"),
  },
  // Leçon de révision terminée : l'Élève refait une révision complète (page, quiz, puis Revoir ou Défi).
  reviser: {
    annonce: 'réviser encore',
    phrase: '📚 Je veux réviser.',
    consigne: texteConsigne('Réviser', 'une nouvelle page de révision fidèle au Document source (sources/), qui couvre tous ses Objectifs, avec son Dépassement : terminée par son encart « 🚀 Pour aller plus loin » (signalé comme hors du document), et son quiz comporte en plus 2 ou 3 questions bonus (🚀) hors score sur cet encart'),
  },
};

// Leçon libre dont tous les Objectifs sont atteints : l'Étape suivante propose d'abord d'élargir la mission.
const consigneElargir = [
  `[Rebond : Étape suivante.] L'élève a choisi ce Rebond après son dernier quiz, et il a atteint tous ses Objectifs.`,
  `Ne crée pas encore de page : félicite-le en une phrase et propose-lui d'élargir sa mission, par une question terminée par une ligne CHOIX (par exemple « CHOIX: Oui, je veux aller plus loin | Non, j'ai fini »).`,
  `S'il accepte : mets à jour MISSION.md (avec un learning record), ajoute les nouveaux Objectifs à la fin de la liste de lesson.json, puis crée la page suivante, avec son mini-quiz.`,
  `S'il refuse : félicite-le et invite-le à choisir un nouveau sujet depuis l'accueil, sans créer de page ni de ligne CHOIX.`,
].join('\n');

const tousObjectifsAtteints = ({ mode, objectifs = [] }) => mode === 'libre' && objectifs.length > 0 && objectifs.every((o) => o.atteint);

// Consigne envoyée au prof pour un Rebond ; l'Étape suivante rappelle le titre qu'il a annoncé (Leçon libre),
// ou propose d'élargir la mission quand tous les Objectifs sont atteints.
export const consigneRebond = (action, lecon = {}) => {
  if (action === 'suivante' && tousObjectifsAtteints(lecon)) return consigneElargir;
  const { ensuite } = lecon;
  return action === 'suivante' && ensuite
    ? `${REBONDS.suivante.consigne}\nAprès le dernier quiz, tu as annoncé cette page : « ${ensuite} ». Crée-la, sauf si tu as une bonne raison de changer.`
    : REBONDS[action].consigne;
};

export const promptRetourQuiz = ({ score, page, action, mode, bonus }) => [
  `[Quiz terminé : ${page || 'page en cours'}, ${score} %${bonus ? ` ; questions bonus : ${bonus.reussies} sur ${bonus.total}, hors score` : ''}.]`,
  `Donne à l'élève un retour court sur ce quiz (2 ou 3 phrases encourageantes, qui citent ce qu'il a réussi ou raté si tu le sais).`,
  `Ne crée aucune page, ne pose pas de question et n'ajoute pas de ligne CHOIX : ${action === 'terminee'
    ? "il a réussi son Défi, sa Leçon est terminée : félicite-le, l'appli lui propose ensuite de réviser encore s'il veut s'entraîner avant son contrôle."
    : `l'appli lui propose ensuite de ${REBONDS[action].annonce}.`}`,
  ...(mode === 'libre'
    ? [`Termine ton message par une dernière ligne au format exact « ENSUITE: <titre court> » : le titre de la page que tu comptes créer à la prochaine Étape suivante, choisi d'après ce quiz. L'appli le montre à l'élève.`]
    : []),
].join('\n');

const resumeLecon = ({ titre, categorie, maitrise: m }) =>
  `- ${titre} (${categorie}) : Maîtrise ${m ? `${m.pourcentage} %, ${m.palier}` : 'pas encore évaluée'}`;

// Tour hors Leçon : l'agent écrit les Propositions dans le dossier courant, sans skill teach.
// Nombre de Propositions réglé dans le profil, dont 2 au programme quel que soit leur type ; uniquement des originaux sans Leçon.
// `dejaProposes` : titres des derniers lots (« D'autres idées » seulement), du plus ancien au plus récent.
export function consignesPropositions(profil, lecons = [], dejaProposes = []) {
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
    ...(dejaProposes.length
      ? [
          `Sujets déjà proposés à l'élève, du plus ancien au plus récent :`,
          ...dejaProposes.map((titre) => `- ${titre}`),
          `Il veut d'autres idées : ne reprends aucun de ces sujets, même reformulé. Privilégie d'autres matières (quand c'est possible, des catégories absentes du dernier lot, qui termine cette liste) et aborde chaque sujet sous d'autres angles (autre approche, autre format, autre facette du thème). Cela vaut aussi pour les suites : elles prolongent toujours ses Leçons, mais par un angle différent des suites déjà proposées.`,
        ]
      : []),
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
