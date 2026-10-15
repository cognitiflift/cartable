import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CATEGORIES, QUIZ_REUSSI, estPretest } from './store.js';
import { coutDuTour } from './cout.js';
import { validerTache } from './tache.js';
import { modeleDeLaTache } from './modele.js';
import { compterJustes } from '../public/kit/v1/quiz-logique.js';
import { libellesCadrage, QUESTIONS_CADRAGE } from './cadrage.js';
import { MANIFESTE_IMAGES } from './images.js';
import { accorder, pluriel } from './pluriel.js';
import { VARIANTES_PAR_QUESTION } from './variantes.js';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const TIMEOUT_MS = 10 * 60 * 1000;

// Kit de l'appli (ADR 0004) : servi sous /kit/<version>/, lisible par le prof (--add-dir) pour sa documentation.
export const DOSSIER_KIT = path.join(import.meta.dirname, '..', 'public', 'kit');

// Session neuve à chaque page et prompt système allégé (#55). CARTABLE_RELAIS=0 rétablit l'ancien fonctionnement
// (reprise de la session, prompt complet), pour l'essai comparatif des coûts (scripts/comparer-couts.js).
export const RELAIS = process.env.CARTABLE_RELAIS !== '0';

// Le skill lit ses propres fichiers de format hors du dossier de la leçon : il faut l'autoriser (--add-dir).
export function trouverDossierTeach() {
  if (process.env.TEACH_SKILL_DIR) return process.env.TEACH_SKILL_DIR;
  const base = path.join(os.homedir(), '.claude/plugins/cache/claude-plugins-official/mattpocock-skills');
  const versions = fs.existsSync(base) ? fs.readdirSync(base).sort() : [];
  const derniere = versions.at(-1);
  return derniere ? path.join(base, derniere, 'skills/productivity/teach') : null;
}

// Formats de rappel actif du Kit (spec #48) et le contenu auquel chacun convient, cités par la consigne de rappel
// actif : un format par ligne, pour en ajouter un sans toucher aux autres.
export const FORMATS_RAPPEL_ACTIF = [
  `"ordre" pour les étapes d'un processus, les événements d'une histoire ou les mots d'une phrase`,
  `"trous" (texte à trous avec banque de mots) pour le vocabulaire et les définitions`,
  `"associer" (relier deux colonnes) pour des paires : dieu et domaine, mot et définition, pays et capitale`,
  `"classer" (ranger dans deux à quatre catégories) pour apprendre ce qui distingue des catégories`,
  `"etapes" (exemple travaillé dont l'élève complète des étapes en choisissant) pour une méthode de mathématiques`,
  `"devoile" (réfléchis puis dévoile, comme une carte de révision) pour une réponse courte à retrouver de tête qu'aucun autre format ne peut vérifier (une définition, un fait, un « pourquoi »), toujours moins nombreuses que les autres questions du score`,
  `en plus, "explication" (choisis la meilleure explication, un QCM qui ne remplace pas le rappel actif) pour un « pourquoi ? », avec des explications fausses plausibles (idées reçues, confusions fréquentes)`,
];

const presentation = (profil) => `Tu t'adresses à ${profil.pseudo}, ${profil.age} ans, niveau scolaire : ${profil.niveau} (système belge francophone).`;

export function consignesLecon(profil) {
  return [
    presentation(profil),
    `Réponds toujours en français, avec un vocabulaire adapté à son âge et des messages courts, en texte brut (pas de Markdown : ni **, ni titres, ni listes à tirets). Une seule question à la fois.`,
    `L'élève ne peut pas écrire : il répond seulement en touchant une des réponses que tu lui proposes (l'appli ajoute toujours « Je ne sais pas 🤷 »). Quand tu poses une question, termine ton message par une dernière ligne au format exact « CHOIX: réponse 1 | réponse 2 | réponse 3 », avec 2 à 4 réponses très courtes, écrites comme l'élève les dirait.`,
    `Travaille uniquement dans le dossier courant (la Leçon de l'élève).`,
    `Dès la première séance, écris le fichier lesson.json : {"titre": "<titre court de la leçon>", "categorie": "<une de : ${CATEGORIES.join(', ')}>", "objectifs": ["<Objectif 1>", "<Objectif 2>", …]}.`,
    `En Leçon libre, chaque fois que tu crées une page de leçon, mets aussi à jour dans lesson.json le champ "ensuite": "<titre court de la page que tu prévois de créer à la prochaine Étape suivante>" (l'appli le montre à l'élève). Tu pourras changer d'avis plus tard, d'après son quiz.`,
    `Les Objectifs sont des choses concrètes que l'élève saura faire, en phrases courtes : les « Success looks like » de MISSION.md (tirés du document source pour une révision), à garder alignés avec eux. Ils sont numérotés par leur position, à partir de 1 : ne les réordonne ni ne les supprime jamais, ajoute seulement les nouveaux à la fin de la liste.`,
    `Dépassement : chaque page de leçon (sauf les pages Revoir) va un tout petit peu plus loin que son contenu pour éveiller la curiosité de l'élève : elle se termine par un encart « 🚀 Pour aller plus loin », et son quiz comporte en plus 2 ou 3 questions bonus sur cet encart, clairement signalées comme bonus (🚀). Les questions bonus sont hors score : elles ne comptent pas dans le pourcentage du quiz.`,
    `Kit de l'appli : toute nouvelle page de leçon utilise le quiz et le style de base que l'appli sert elle-même. Lis d'abord sa documentation (${path.join(DOSSIER_KIT, 'v1', 'LISEZMOI.md')}). Dans la page, charge <link rel="stylesheet" href="/kit/v1/base.css"> et mets data-categorie sur <html> ; déclare le quiz en données dans <script type="application/json" id="cartable-quiz">{"objectifs": [<numéros des Objectifs que couvre ce quiz>], "questions": [{"id": "q1", "type": "qcm", "enonce": "…", "reponses": ["…", "…", "…"], "bonne": <index de la bonne réponse>, "explication": "…", "bonus": true seulement pour une question bonus 🚀, "objectifs": [<facultatif>]}]}</script>, puis charge <script type="module" src="/kit/v1/quiz.js"></script>. Le Kit affiche, mélange, corrige, tient les questions bonus hors score et transmet le résultat à l'appli. N'écris jamais ton propre quiz ni ta propre feuille de style de base, même si la Leçon en a déjà (les anciennes pages les gardent) ; les composants propres au sujet (atelier, schéma à compléter…) restent permis dans la Leçon.`,
    `Rappel actif : chaque quiz comporte au moins une question de rappel actif (pas un QCM), où l'élève retrouve lui-même la réponse au lieu de la reconnaître, en touchant (jamais au clavier). Choisis son format selon le contenu : ${FORMATS_RAPPEL_ACTIF.join(' ; ')}. Leur format est décrit dans la documentation du Kit.`,
    // Exemples travaillés et retrait progressif des étapes (Sweller, Renkl), puis entrelacement (Rohrer & Taylor) : spec
    // #48, ticket #73. La catégorie de la Leçon n'est pas connue ici : la consigne vaut pour toute page de mathématiques.
    `En mathématiques, pour une méthode nouvelle, enchaîne : d'abord un exemple entièrement résolu dans la page, étape par étape ; puis des questions "etapes" où l'élève complète une étape retirée, puis deux, en retirant les étapes une à une jusqu'à ce qu'il résolve presque seul ; puis des exercices de types mélangés (plusieurs sortes de problèmes dans le même quiz, pas dix fois le même calcul), pour qu'il apprenne à choisir la bonne méthode. Il répond toujours en touchant une proposition, jamais au clavier : garde des distracteurs plausibles, tirés des erreurs fréquentes (oubli d'une retenue, dénominateurs additionnés, signe perdu…).`,
    `Visuels : chaque page de leçon contient au moins un visuel qui explique, qui porte une information du contenu (photo d'une œuvre, d'un objet ou d'un lieu, schéma, frise, carte, arbre), jamais une image seulement décorative, et au moins une question du quiz oblige à regarder ce visuel. Mets chaque visuel dans la figure du Kit (<figure class="kit-figure">, voir sa documentation), avec une légende qui dit ce qu'on regarde, puis sa source et sa licence. Pour un schéma, une frise ou une carte, dessine-le toi-même en SVG dans la page, avec ses textes et ses traits en currentColor pour qu'il reste lisible en mode sombre. Pour une photo, prends une image trouvée en ligne, de préférence sur Wikimedia Commons ou le site d'un musée, jamais une adresse devinée : cite son adresse directe (le fichier image lui-même, en PNG, JPEG, GIF ou WebP : un fichier SVG distant est refusé) dans la page et déclare-la dans le manifeste ${MANIFESTE_IMAGES} de la Leçon : [{"url": "<adresse de l'image>", "source": "<site ou musée>", "licence": "<licence>", "alt": "<texte alternatif>", "page": "<fichier de la page>"}] (ajoute les nouvelles entrées à celles déjà présentes). Après ton tour, l'appli télécharge chaque image déclarée dans la Leçon et réécrit son adresse ; une image injoignable ou qui n'en est pas une est retirée de la page et te sera signalée.`,
    `Une séance produit TOUJOURS une page de leçon HTML dans lessons/ (comme le skill teach le prévoit) : le contenu et le mini-quiz de rappel interactif y figurent. Dès que tu connais la mission de l'élève, crée cette page (pour une Leçon nouvelle, la première page est son Pré-test, comme le demande la consigne du premier tour) : l'appli l'affiche en plein écran à la place de ton message. Après avoir créé une page, ne pose donc pas de question et ne mets pas de ligne CHOIX.`,
    `À la fin d'un quiz, l'appli propose elle-même un Rebond à l'élève. En Leçon libre, c'est toujours « Étape suivante », quel que soit le score : une page nouvelle de sa mission, dans la même Leçon, que tu choisis selon la zone proximale de l'élève (si le quiz est raté, elle retravaille ce qu'il a raté avant d'avancer). « Revoir » (une nouvelle page, plus courte, qui reprend autrement ce qu'il a raté) et « Défi » (une page plus difficile sur le même sujet) sont réservés à la Leçon de révision et à la révision d'une Leçon libre (Rebond « Réviser », proposé quand l'élève revient après plus d'une semaine). Quand il en choisit un, l'appli te dit lequel : crée la page correspondante.`,
  ].join('\n');
}

// Premier tour d'une Leçon libre : le sujet tapé par l'élève, cadré (seul texte libre de l'appli).
export const promptDemarrageLibre = (sujet) => [
  sujet,
  `[Consigne de l'appli : si ce sujet est inadapté à l'âge de l'élève, choquant, ou sans aucun lien avec un apprentissage, ne l'enseigne pas : ne crée ni page ni lesson.json, explique-lui en une phrase bienveillante pourquoi, puis termine par une ligne CHOIX: de 3 ou 4 sujets voisins et adaptés. Quand il en choisit un, démarre la Leçon normalement sur ce sujet. S'il répond « Je ne sais pas », propose-lui d'autres sujets de la même façon.]`,
].join('\n');

// Cadrage par le prof et Pré-test (spec #46), ajoutés au premier prompt d'une Leçon : le prof pose ses questions propres
// au sujet, une à la fois avec une ligne CHOIX, puis écrit la mission et les Objectifs et crée le Pré-test, au niveau
// annoncé par « Tu en sais déjà… » quand l'Élève l'a donné.
const QUESTIONS_PROF = {
  libre: `« À la fin, tu voudrais pouvoir… » (par exemple raconter, l'expliquer à quelqu'un, réussir un contrôle, créer quelque chose, le reconnaître autour de moi) puis « Où as-tu croisé ce sujet ? » (par exemple un film, un jeu, en classe, un livre), pour choisir des exemples qui lui parlent`,
  revision: `« Qu'est-ce qui te semble le plus dur ? » (Réponses proposées tirées des parties du document), pour que la révision s'y attarde`,
};

export function consignePremierTour(mode, cadrage = null) {
  const revision = mode === 'revision';
  const deja = cadrage?.deja && cadrage.deja !== 'je-ne-sais-pas'
    ? `au niveau annoncé (${QUESTIONS_CADRAGE.deja.question} ${QUESTIONS_CADRAGE.deja.reponses[cadrage.deja]})`
    : `au niveau de son âge`;
  return [
    `[Cadrage du prof : avant d'écrire la mission, pose-lui une à la fois, chacune terminée par une ligne CHOIX de Réponses proposées adaptées ${revision ? 'à sa leçon' : 'au sujet'}, ${revision ? 'cette question' : 'ces deux questions'} : ${QUESTIONS_PROF[revision ? 'revision' : 'libre']}.`,
    `Puis écris MISSION.md et lesson.json avec ses Objectifs, et crée comme première page le Pré-test : une courte page « Devine ! » de trois questions, ${deja}, ${revision ? 'tiré du Document source (sources/)' : 'sur la mission'}, sans contenu à enseigner ni Dépassement, qui dit à l'élève que ça ne compte pas et qu'il peut deviner. Son quiz est celui du Kit en mode Pré-test : ajoute "pretest": true dans le JSON du quiz, et indique pour chaque question les numéros des Objectifs qu'elle couvre.`,
    `L'appli ne compte pas le Pré-test dans le score : après lui, elle propose à l'élève de « Commencer » et te transmet ses résultats pour choisir la première vraie page.]`,
  ].join('\n');
}

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

// Suite proposée après un quiz, d'après son score (pas la Maîtrise). En Leçon libre, toujours Étape suivante :
// le prof choisit lui-même la page nouvelle selon la zone proximale de l'Élève.
export const actionApresQuiz = (score, mode) => (mode !== 'revision' ? 'suivante' : score < QUIZ_REUSSI ? 'revoir' : 'defi');

// Action portée par le Retour de quiz : un Défi réussi termine une Leçon de révision. En phase Réviser, une Leçon
// libre suit les règles d'une révision (Revoir ou Défi), et son Défi réussi ramène à l'Étape suivante.
export function actionRetourQuiz(score, mode, defiEnCours, reviserEnCours = false) {
  const defiReussi = defiEnCours && score >= QUIZ_REUSSI;
  if (mode === 'libre' && reviserEnCours) return defiReussi ? 'suivante' : actionApresQuiz(score, 'revision');
  return defiReussi && mode === 'revision' ? 'terminee' : actionApresQuiz(score, mode);
}

// Rebonds, en valeurs fermées : la phrase enregistrée comme message de l'Élève
// et la consigne envoyée au prof.
const texteConsigne = (nom, page) => [
  `[Rebond : ${nom}.] L'élève a choisi ce Rebond après son dernier quiz.`,
  `Crée ${page}, avec son mini-quiz. Ne pose pas de question et n'ajoute pas de ligne CHOIX.`,
].join('\n');

export const REBONDS = {
  revoir: {
    phrase: "🔁 Je veux revoir ce que j'ai raté.",
    consigne: texteConsigne('Revoir', "une nouvelle page de leçon, plus courte, qui reprend autrement ce qu'il a raté (pas de Dépassement : ni encart « Pour aller plus loin », ni questions bonus)"),
  },
  defi: {
    phrase: '🏆 Je veux un défi plus difficile.',
    consigne: texteConsigne('Défi', 'une page de Défi, plus difficile, sur le même sujet'),
  },
  suivante: {
    phrase: '➡️ Je suis prêt pour la suite.',
    consigne: texteConsigne('Étape suivante', "une page nouvelle de sa mission, dans la même Leçon, choisie selon sa zone proximale (si son dernier quiz est raté, elle retravaille ce qu'il a raté avant d'avancer)"),
  },
  // Après le Pré-test : la première vraie page, orientée par ses résultats (voir consigneDeBase pour la Leçon de révision).
  commencer: {
    phrase: '🚀 On commence !',
    consigne: texteConsigne('Commencer', "la première vraie page de leçon de sa mission, au niveau que montre son Pré-test : appuie-toi sur ce qu'il a deviné juste, sans réenseigner longuement ce qu'il semble déjà savoir, et pars de ce qu'il a raté"),
  },
  // Leçon de révision terminée : l'Élève refait une révision complète (page, quiz, puis Revoir ou Défi).
  reviser: {
    phrase: '📚 Je veux réviser.',
    consigne: texteConsigne('Réviser', 'une nouvelle page de révision fidèle au Document source (sources/), qui couvre tous ses Objectifs, avec son Dépassement : terminée par son encart « 🚀 Pour aller plus loin » (signalé comme hors du document), et son quiz comporte en plus 2 ou 3 questions bonus (🚀) hors score sur cet encart'),
  },
};

// Commencer une Leçon de révision : la première page de révision, fidèle au Document source, orientée par le Pré-test.
const CONSIGNE_COMMENCER_REVISION = texteConsigne('Commencer', "la première vraie page de leçon : une page de révision fidèle au Document source (sources/), qui s'attarde sur ce qui lui semble le plus dur et sur ce que son Pré-test a montré, avec son quiz d'évaluation et son Dépassement (encart « 🚀 Pour aller plus loin », signalé comme hors du document, et 2 ou 3 questions bonus hors score)");

// Réviser une Leçon libre laissée plus d'une semaine : pas de Document source, la révision reprend les pages déjà vues.
const CONSIGNE_REVISER_LIBRE = texteConsigne('Réviser', "une page de révision des pages déjà vues de cette Leçon (lessons/), sans rien de nouveau hors de son Dépassement (encart « 🚀 Pour aller plus loin » et 2 ou 3 questions bonus hors score sur cet encart) : l'élève ne l'a pas ouverte depuis plus d'une semaine");

// Leçon libre dont tous les Objectifs sont atteints : l'Étape suivante propose d'abord d'élargir la mission.
const consigneElargir = [
  `[Rebond : Étape suivante.] L'élève a choisi ce Rebond après son dernier quiz, et il a atteint tous ses Objectifs.`,
  `Ne crée pas encore de page : félicite-le en une phrase et propose-lui d'élargir sa mission, par une question terminée par une ligne CHOIX (par exemple « CHOIX: Oui, je veux aller plus loin | Non, j'ai fini »).`,
  `S'il accepte : mets à jour MISSION.md (avec un learning record), ajoute les nouveaux Objectifs à la fin de la liste de lesson.json, puis crée la page suivante, avec son mini-quiz.`,
  `S'il refuse : félicite-le et invite-le à choisir un nouveau sujet depuis l'accueil, sans créer de page ni de ligne CHOIX.`,
].join('\n');

const tousObjectifsAtteints = ({ mode, objectifs = [] }) => mode === 'libre' && objectifs.length > 0 && objectifs.every((o) => o.atteint);

// Consigne envoyée au prof pour un Rebond ; l'Étape suivante rappelle le titre qu'il a annoncé (Leçon libre),
// ou propose d'élargir la mission quand tous les Objectifs sont atteints. Réviser une Leçon libre reprend ses pages.
// Toute consigne de Rebond porte les résultats du dernier quiz (voir consigneDernierQuiz), et Revoir reprend
// nommément les questions ratées.
export const consigneRebond = (action, lecon = {}) => [consigneDeBase(action, lecon), ...consigneDernierQuiz(lecon.scores?.at(-1), action, lecon)].join('\n');

function consigneDeBase(action, lecon) {
  if (action === 'suivante' && tousObjectifsAtteints(lecon)) return consigneElargir;
  if (action === 'reviser' && lecon.mode === 'libre') return CONSIGNE_REVISER_LIBRE;
  if (action === 'commencer' && lecon.mode === 'revision') return CONSIGNE_COMMENCER_REVISION;
  const { ensuite } = lecon;
  return action === 'suivante' && ensuite
    ? `${REBONDS.suivante.consigne}\nEn créant la page précédente, tu as annoncé cette page : « ${ensuite} ». Crée-la, sauf si tu as une bonne raison de changer.`
    : REBONDS[action].consigne;
}

// Résultats du dernier quiz pour le prof, à chaque tour qui peut créer une page (consigne de Rebond, ou préambule
// des autres tours) et une seule fois par tour : toute nouvelle page après un quiz en partie raté commence par un
// court encart sur ce qui a été raté. `action` : le Rebond choisi, s'il y en a un. Après un Pré-test : ses résultats
// par question (voir resultatsPretest), sans encart, puisqu'il se fait en devinant.
export function consigneDernierQuiz(dernier, action = null, lecon = {}) {
  if (!dernier) return [];
  if (estPretest(dernier)) return [resultatsPretest(dernier, lecon)];
  const ratees = (dernier.questions ?? []).filter((q) => !q.juste);
  return [
    resultatsDernierQuiz(dernier),
    ...(ratees.length
      ? [`Toute nouvelle page que tu crées après ce quiz commence par un court encart sur ce qu'il a raté (sauf si une page créée depuis l'a déjà fait) : explique simplement chaque erreur, sans le décourager.${action === 'revoir' ? ' Puis reprends nommément chacune des questions ratées (hors bonus), expliquée autrement, avant le mini-quiz.' : ''}`]
      : []),
  ];
}

// Résultats du dernier quiz, pour le prof : score, page, questions bonus et, quand le Kit les a transmis, résultats par
// question (questions ratées avec la réponse choisie et la bonne ; les justes sont seulement comptées), avec à part les
// erreurs commises « sûr » (Confiance), à retravailler d'abord. Les anciens résultats, sans Confiance, n'en ont pas.
function resultatsDernierQuiz({ score, page, bonus, questions = [] }) {
  const lignes = [`Résultats du dernier quiz : ${page || 'page inconnue'}, ${score} %${bonus ? ` ; questions bonus : ${bonus.reussies} sur ${bonus.total}, hors score` : ''}.`];
  if (!questions.length) return lignes[0];
  const { justes, total } = compterJustes(questions);
  const ratees = questions.filter((q) => !q.juste);
  if (total) lignes.push(`${pluriel(justes, 'question juste')} sur ${total}.`);
  if (!ratees.length) lignes.push('Toutes ses réponses étaient justes.');
  else {
    // Crédit partiel (spec #48) : la part juste est dite, la question reste ratée.
    const partiel = (q) => (q.points > 0 ? ` (juste en partie : ${Math.round(q.points * 100)} %)` : '');
    const ligne = (q) => `- « ${q.enonce} »${q.bonus ? ' (bonus 🚀)' : ''} : il a choisi « ${q.choisie} », la bonne réponse était « ${q.bonne} »${partiel(q)}.`;
    lignes.push('Questions ratées :', ...ratees.map(ligne));
    // Confiance : les erreurs commises « sûr » (il croyait savoir) se corrigent particulièrement bien (hypercorrection).
    const sures = ratees.filter((q) => q.sur === true);
    if (sures.length) {
      lignes.push(
        'Erreurs commises en étant « sûr » (il croyait savoir) :', ...sures.map(ligne),
        "Ce sont les plus importantes : retravaille-les d'abord, avant les autres erreurs, en montrant sans le décourager pourquoi sa réponse semblait juste et ce qui la rend fausse.",
      );
    }
  }
  return lignes.join('\n');
}

// Résultats du Pré-test, pour le prof : chaque question, juste ou ratée (avec la réponse choisie et la bonne), et la
// Confiance quand elle est connue ; puis les Objectifs « à confirmer » et ce que l'Élève pensait savoir.
const numerosObjectifs = (objectifs = []) => (objectifs.length ? ` (${accorder(objectifs.length, 'Objectif')} ${objectifs.join(', ')})` : '');
const CONFIANCE = { true: ', il était sûr', false: ", il n'était pas sûr" };

function resultatsPretest({ score, page, questions = [] }, { objectifs = [], cadrage = null } = {}) {
  const { justes, total } = compterJustes(questions);
  const lignes = [`Résultats du Pré-test (hors score) : ${page || 'page inconnue'}, ${total ? `${pluriel(justes, 'question juste')} sur ${total}` : `${score} %`}.`];
  lignes.push(...questions.filter((q) => !q.bonus).map((q) => `- « ${q.enonce} »${numerosObjectifs(q.objectifs)} : ${q.juste ? 'juste' : `il a choisi « ${q.choisie} », la bonne réponse était « ${q.bonne} »`}${CONFIANCE[q.sur] ?? ''}.`));
  const aConfirmer = objectifs.flatMap((o, i) => (o.aConfirmer ? [i + 1] : []));
  if (aConfirmer.length) lignes.push(`À confirmer : ${aConfirmer.join(', ')} (Objectifs réussis au Pré-test, pas encore atteints) : aborde-les plus vite, sans les sauter, un vrai quiz doit les confirmer.`);
  if (cadrage?.deja) lignes.push(`Avant le Pré-test, il pensait : ${QUESTIONS_CADRAGE.deja.question} ${QUESTIONS_CADRAGE.deja.reponses[cadrage.deja]}.`);
  return lignes.join('\n');
}

// Images retirées au tour précédent (adresse morte, fichier qui n'est pas une image…), signalées une seule fois au prof.
export function consigneImagesRetirees(retirees = []) {
  if (!retirees.length) return [];
  return [
    `Images retirées par l'appli au tour précédent (leur légende est restée dans la page) :`,
    ...retirees.map(({ url, page, raison }) => `- ${url}${page ? ` (${page})` : ''} : ${raison}`),
    `Remplace chacune par une autre image qui marche (déclarée dans ${MANIFESTE_IMAGES}) ou par un schéma SVG, et retire son entrée du manifeste.`,
  ];
}

// Questions de quiz ignorées par le Kit dans les pages écrites au tour précédent (type inconnu, question mal formée,
// spec #48), signalées une seule fois au prof, discrètement : l'élève a eu le reste du quiz.
export function consigneQuestionsIgnorees(ignorees = []) {
  if (!ignorees.length) return [];
  return [
    `Questions ignorées par le Kit dans les pages du tour précédent (l'élève ne les a pas vues, le reste du quiz marche) :`,
    ...ignorees.map(({ page, id, position, raison }) => `- ${[page, id ?? (position && `question n° ${position}`)].filter(Boolean).join(', ')} : ${raison}`),
    `Corrige-les dans la page d'après la documentation du Kit si c'est utile (sinon, soigne leur format dans tes prochaines pages).`,
  ];
}

// Questions les plus fragiles de la Leçon (spec #47, « Consignes du prof ») : celles de la Banque dont la probabilité
// de se souvenir aujourd'hui (`rappel`, exposé par la Leçon) est la plus basse, citées au début d'une nouvelle page pour
// que le prof puisse les réinjecter. L'espacement reste l'affaire de l'appli (ADR 0006) : c'est une piste, pas un
// ordre. Rien sans Questions (anciennes Leçons, quiz hors Kit).
export const QUESTIONS_FRAGILES = 3;
export function consigneQuestionsFragiles(questions = []) {
  const fragiles = questions.filter((q) => Number.isFinite(q.rappel)).sort((a, b) => a.rappel - b.rappel).slice(0, QUESTIONS_FRAGILES);
  if (!fragiles.length) return [];
  return [
    `Questions les plus fragiles de la Leçon (l'élève risque le plus de les oublier) ; si c'est utile, repose-les dans la page, telles quelles ou reformulées :`,
    ...fragiles.map((q) => `- « ${q.contenu.enonce} » (${q.page}) : ${Math.round(q.rappel * 100)} % de chances de s'en souvenir aujourd'hui`),
  ];
}

// Un score récent, pour le prof : « 80 % (0002-page.html) le 2026-10-01 », marqué s'il vient du Pré-test.
export const resumeScore = (s) => `${s.score} %${s.page ? ` (${s.page})` : ''}${estPretest(s) ? ' (Pré-test, hors score)' : ''} le ${s.date.slice(0, 10)}`;

// Préambule de relais : après la première Séance, chaque tour du prof démarre une session neuve (sans --resume).
// L'appli lui passe l'état qu'elle connaît ; le reste (mission, learning records, notes) est dans les fichiers de teach.
// `resultatsQuiz: false` : les résultats du dernier quiz sont déjà dans la consigne (Rebond), on ne les répète pas.
export function preambuleRelais(lecon, { resultatsQuiz = true } = {}) {
  const { objectifs = [], scores = [], maitrise, ensuite, pages = [], messages = [], imagesRetirees = [], questionsIgnorees = [] } = lecon;
  const lignes = [
    `[Passage de relais de l'appli : tu reprends cette Leçon dans une session neuve, sans souvenir des tours précédents. Avant d'agir, relis MISSION.md, les learning records (learning-records/), NOTES.md et lesson.json du dossier courant, et au besoin les pages déjà créées.]`,
  ];
  if (pages.length) lignes.push(`Pages déjà créées (lessons/) : ${pages.join(', ')}.`);
  if (objectifs.length) {
    lignes.push(`Objectifs :`, ...objectifs.map((o, i) => `${i + 1}. ${o.texte} : ${o.atteint ? 'atteint' : o.aConfirmer ? 'à confirmer (réussi au Pré-test)' : 'pas encore atteint'}`));
  } else {
    lignes.push(`Cette Leçon n'a pas encore d'Objectifs : ajoute dans lesson.json la liste "objectifs", alignée sur les « Success looks like » de MISSION.md, et indique dans chaque quiz les numéros des Objectifs qu'il couvre.`);
  }
  if (scores.length) {
    const recents = scores.slice(-5).map(resumeScore);
    lignes.push(`Scores aux quiz : ${recents.join(' ; ')}.${maitrise ? ` Maîtrise : ${maitrise.pourcentage} %, ${maitrise.palier}.` : ''}`);
    if (resultatsQuiz) lignes.push(...consigneDernierQuiz(scores.at(-1), null, lecon));
  }
  if (ensuite) lignes.push(`Titre annoncé pour la prochaine page : « ${ensuite} ».`);
  lignes.push(...consigneQuestionsFragiles(lecon.questions));
  lignes.push(...consigneImagesRetirees(imagesRetirees));
  lignes.push(...consigneQuestionsIgnorees(questionsIgnorees));
  const dernier = messages.at(-1);
  if (dernier?.role === 'agent' && dernier.choix?.length) {
    lignes.push(`Ton dernier message à l'élève, auquel il répond : « ${dernier.texte} » (réponses proposées : ${dernier.choix.join(' | ')}).`);
  }
  return lignes.join('\n');
}

const resumeLecon =({ titre, categorie, maitrise: m }) =>
  `- ${titre} (${categorie}) : Maîtrise ${m ? `${m.pourcentage} %, ${m.palier}` : 'pas encore évaluée'}`;

// Cadrages des Leçons les plus récentes (les Leçons arrivent de la plus récente à la plus ancienne), pour les Propositions.
const CADRAGES_RECENTS = 5;
function resumeCadrages(lecons) {
  const cadrees = lecons.filter((l) => l.cadrage).slice(0, CADRAGES_RECENTS);
  if (!cadrees.length) return [];
  return [
    `Ce qu'il a répondu au Cadrage de ses Leçons récentes (pourquoi il apprend, ce qu'il en savait déjà), pour coller à ses envies :`,
    ...cadrees.map((l) => `- ${l.titre} : ${libellesCadrage(l.cadrage)}`),
  ];
}

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
          ...resumeCadrages(lecons),
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

// Tour hors Séance des Variantes (#69) : l'agent lit questions-a-varier.json et écrit variantes.json dans le dossier
// courant, sans skill teach. L'appli valide ensuite chaque variante (lib/variantes.js) et écarte les mal formées.
export function consignesVariantes(profil) {
  return [
    presentation(profil),
    `Ton rôle : écrire des variantes de questions de quiz qu'il a déjà rencontrées, pour vérifier qu'il a compris et pas seulement retenu la phrase.`,
    `Le fichier questions-a-varier.json du dossier courant liste les questions : [{"cle", "type" (facultatif : "explication" pour une question « choisis la meilleure explication »), "enonce", "reponses", "bonne" (index de la bonne réponse), "explication", "image" (facultatif : description d'une image montrée avec la question, et aussi avec ses variantes)}].`,
    `Pour chacune, écris ${VARIANTES_PAR_QUESTION} variantes : une autre formulation ou une autre situation qui teste exactement la même chose, avec la même bonne réponse en sens, de nouvelles réponses fausses plausibles et une courte explication. Pour une question "explication", chaque variante pose aussi un « pourquoi ? », avec une seule explication juste et des explications fausses plausibles. Jamais l'énoncé d'origine recopié, jamais de question bonus.`,
    `Écris uniquement le fichier variantes.json dans le dossier courant, au format :`,
    `{"<cle>": [{"enonce": "<question>", "reponses": ["<réponse>", …], "bonne": <index de la bonne réponse>, "explication": "<une phrase>"}, …]}`,
    `N'écris aucun autre fichier et ne pose pas de question : l'élève ne lit pas ta réponse.`,
  ].join('\n');
}

// `tache` : type de tâche du tour (lib/tache.js), gardé avec son coût ; avec `modele` (celui du Profil), il fixe le
// Modèle, l'effort et le Modèle de secours passés à claude (Modèle selon la tâche, ADR 0005).
export async function lancerAgent({ cwd, prompt, sessionId, consignes, modele, tache, teach = true }) {
  validerTache(tache);
  // Cloisonnement : écriture dans le dossier de travail seulement (Leçon ou Propositions, acceptEdits), web autorisé pour sourcer
  // les leçons, aucun shell. Seuls les réglages utilisateur sont chargés (pour le plugin teach) : les élèves
  // vivent dans le dépôt, dont les réglages de projet autorisent des commandes git destructrices.
  const choix = modeleDeLaTache(tache, modele);
  const args = [
    '-p', prompt,
    '--model', choix.modele,
    '--effort', choix.effort,
    '--fallback-model', choix.secours,
    '--output-format', 'json',
    '--permission-mode', 'acceptEdits',
    '--setting-sources', 'user',
    '--allowedTools', 'WebSearch,WebFetch',
    '--disallowedTools', 'Bash,PowerShell',
    '--append-system-prompt', consignes,
  ];
  // Prompt système allégé : sections propres à la machine (cwd, env, git) hors du prompt système, et aucun serveur MCP
  // (le prof n'en utilise pas). Les réglages utilisateur restent : ils activent le plugin du skill teach.
  if (RELAIS) args.push('--exclude-dynamic-system-prompt-sections', '--strict-mcp-config');
  const dossierTeach = teach && trouverDossierTeach();
  if (dossierTeach) args.push('--add-dir', dossierTeach);
  if (teach) args.push('--add-dir', DOSSIER_KIT);
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
      resolve({ reponse: data.result, sessionId: data.session_id, cout: coutDuTour(data, tache) });
    });
  });
}
