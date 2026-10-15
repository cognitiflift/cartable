import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resultatQuiz } from './resultats.js';
import { cumulerCouts } from './cout.js';
import { HttpError } from './http-error.js';
import { ecartPretest } from './pretest.js';
import { compterJustes, corriger, estPartiel } from '../public/kit/v1/quiz-logique.js';
import { quizDeLaPage, ajouterReponsesDuQuiz, questionsDeLaBanque, cleQuestion, ajouterReponseDeRevision, questionDuContenu, questionsIgnoreesDeLaPage } from './banque.js';
import { memoireDeQuestion } from './memoire.js';
import { jourLocal, joursAvant } from './jour.js';
import { lireVariantes, questionsAVarier, noterDemande, demandeDeVariantes, rattacherVariantes } from './variantes.js';

export { HttpError };

export const NIVEAUX = [
  ...[1, 2, 3, 4, 5, 6].map((n) => `Primaire ${n}`),
  ...[1, 2, 3, 4, 5, 6].map((n) => `Secondaire ${n}`),
  'Autre',
];

export const NOMBRE_PROPOSITIONS_DEFAUT = 4;

// Modèles proposés dans le Profil : alias de `claude --model`, qui suivent la dernière version.
export const MODELES = [
  { id: 'haiku', libelle: 'Haiku', description: 'rapide' },
  { id: 'sonnet', libelle: 'Sonnet', description: 'équilibré' },
  { id: 'opus', libelle: 'Opus', description: 'le plus réfléchi' },
];
export const MODELE_DEFAUT = 'sonnet'; // nouveaux Profils (ADR 0005)
const MODELE_PROFILS_ANCIENS = 'haiku'; // défaut d'avant l'ADR 0005 : un Profil existant garde son Modèle

const HISTORIQUE_PROPOSITIONS_MAX = 10; // titres retenus pour « D'autres idées »

export const CATEGORIES = ['Français', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie', 'Langues', 'Arts', 'Autre'];

const JOUR_MS = 86_400_000;

// Scores hors Pré-test : seuls ceux-là comptent pour la Maîtrise, les Objectifs atteints, les Étoiles et le Dépassement.
export const estPretest = (score) => score.pretest === true;
export const horsPretest = (scores = []) => scores.filter((s) => !estPretest(s));

// Maîtrise (spec #47, ticket #67) : pour une Leçon qui a des Questions (Banque, lib/banque.js), moyenne de la
// probabilité de se souvenir de chacune (`rappel`, calculé à `maintenant` depuis son journal par lib/memoire.js, voir
// lireLecon ; la date de contrôle n'y change rien, elle ne déplace que la prochaine révision) : elle baisse
// vite pour ce qui vient d'être raté, doucement pour ce qui a été bien révisé. Sans Questions (anciennes Leçons, quiz
// hors Kit) : moyenne des 3 derniers scores, moins 10 points par semaine entière sans quiz au-delà de 3 semaines.
// Paliers communs : 80 % acquis, 50 % à consolider. null = pas encore évaluée. Le Pré-test n'y entre pas.
export function calculerMaitrise(tous = [], maintenant = Date.now(), questions = []) {
  const rappels = questions.map((q) => q.rappel).filter((r) => Number.isFinite(r));
  const pourcentage = rappels.length ? Math.round((100 * rappels.reduce((a, b) => a + b, 0)) / rappels.length) : maitriseDesScores(tous, maintenant);
  if (pourcentage === null) return null;
  const palier = pourcentage >= 80 ? 'acquis' : pourcentage >= 50 ? 'à consolider' : 'non acquis';
  return { pourcentage, palier };
}

// Calcul d'avant la Banque de Questions, gardé tel quel pour les Leçons sans Questions. null sans score.
function maitriseDesScores(tous, maintenant) {
  const scores = horsPretest(tous);
  if (scores.length === 0) return null;
  const derniers = scores.slice(-3);
  const moyenne = derniers.reduce((total, s) => total + s.score, 0) / derniers.length;
  const joursSansQuiz = (maintenant - Date.parse(scores.at(-1).date)) / JOUR_MS;
  const penalite = joursSansQuiz > 21 ? 10 * Math.floor((joursSansQuiz - 21) / 7) : 0;
  return Math.max(0, Math.round(moyenne - penalite));
}

export const QUIZ_REUSSI = 80; // score minimal d'un quiz réussi, en %

// Objectifs (textes, numérotés à partir de 1 par leur position) : atteint dès qu'un score réussi le couvre.
// En Leçon libre, les quiz faits en Révisant ne comptent pas : la révision ne rapporte rien. Le Pré-test non plus.
export function objectifsAtteints(objectifs = [], scores = [], mode) {
  const comptes = horsPretest(scores).filter((s) => s.score >= QUIZ_REUSSI && !(mode === 'libre' && s.reviser));
  const couverts = new Set(comptes.flatMap((s) => s.objectifs ?? []));
  return objectifs.map((texte, i) => ({ texte, atteint: couverts.has(i + 1) }));
}

// Retenu : Objectif atteint et couvert par au moins deux quiz réussis passés à au moins 24 heures d'intervalle. Les quiz
// faits en Révisant comptent, le Pré-test non. Calculé sur tous les scores : acquis pour toujours. `atteints` : voir
// objectifsAtteints. Un booléen par Objectif.
function objectifsRetenus(atteints = [], scores = []) {
  const reussis = horsPretest(scores).filter((s) => s.score >= QUIZ_REUSSI && !Number.isNaN(Date.parse(s.date)));
  return atteints.map((o, i) => {
    const dates = reussis.filter((s) => s.objectifs?.includes(i + 1)).map((s) => Date.parse(s.date));
    return o.atteint && dates.length >= 2 && Math.max(...dates) - Math.min(...dates) >= JOUR_MS;
  });
}

// À confirmer : Objectif couvert par une question réussie (hors bonus) au Pré-test, et pas encore atteint par un vrai
// quiz. Un Pré-test sans résultats par question ne confirme rien. `atteints` : voir objectifsAtteints. Un booléen par
// Objectif.
function objectifsAConfirmer(atteints = [], scores = []) {
  const devines = new Set(scores.filter(estPretest).flatMap((s) => (s.questions ?? []).filter((q) => q.juste && !q.bonus).flatMap((q) => q.objectifs ?? [])));
  return atteints.map((o, i) => devines.has(i + 1) && !o.atteint);
}

// Stabilité FSRS (jours) à partir de laquelle une Question est tenue pour retenue (spec #47 : « une stabilité d'au
// moins quelques jours »). 5 jours, calés sur la règle des deux succès espacés qu'elle remplace (paramètres FSRS-5
// par défaut, voir lib/memoire.js) : une seule réponse juste donne 3,2 jours, deux le même jour 4,5 jours, deux à un
// jour d'écart 5,9 jours, deux à deux jours d'écart 8,4 jours. Une réponse fausse la fait retomber sous 2 jours.
export const STABILITE_RETENU = 5;

// Retenu d'après la mémoire (spec #47, ticket #67) : pour chaque Objectif que couvre au moins une Question de la
// Banque, true quand l'Objectif est atteint et que toutes ces Questions ont une stabilité (`stabilite`, voir lireLecon)
// d'au moins STABILITE_RETENU ;
// il suit alors la mémoire (une Question oubliée le fait perdre). null pour un Objectif qu'aucune Question ne couvre :
// il garde la règle des deux succès espacés.
function objectifsRetenusParLaMemoire(atteints = [], questions = []) {
  return atteints.map((o, i) => {
    const couvrantes = questions.filter((q) => q.contenu?.objectifs?.includes(i + 1));
    if (!couvrantes.length) return null;
    return o.atteint && couvrantes.every((q) => (q.stabilite ?? 0) >= STABILITE_RETENU);
  });
}

// État de chaque Objectif, tel que la Leçon l'expose : { texte, atteint, retenu, aConfirmer }. `questions` : Banque de
// Questions de la Leçon avec leur mémoire (vide pour les anciennes Leçons), sur laquelle s'appuie Retenu quand elle
// couvre l'Objectif.
export function etatObjectifs(textes = [], scores = [], mode, questions = []) {
  const atteints = objectifsAtteints(textes, scores, mode);
  const parLaMemoire = objectifsRetenusParLaMemoire(atteints, questions);
  const retenus = objectifsRetenus(atteints, scores).map((r, i) => parLaMemoire[i] ?? r);
  const aConfirmer = objectifsAConfirmer(atteints, scores);
  return atteints.map((o, i) => ({ ...o, retenu: retenus[i], aConfirmer: aConfirmer[i] }));
}

// Niveau de Leçon (Leçon libre) : Objectifs atteints + 1. null sans Objectifs ou pour une Leçon de révision.
export function niveauLecon(objectifs = [], mode) {
  if (mode !== 'libre' || objectifs.length === 0) return null;
  return objectifs.filter((o) => o.atteint).length + 1;
}

// Liste d'Objectifs écrite par l'agent dans lesson.json ; absente ou mal formée = pas d'Objectifs.
const objectifsValides = (brut) =>
  Array.isArray(brut) && brut.every((o) => typeof o === 'string' && o.trim()) ? brut.map((o) => o.trim()) : [];

// Titre de la page que le prof prévoit ensuite (Leçon libre seulement), écrit dans lesson.json quand il crée une page.
// Anciennes Leçons, sans ce champ : le titre annoncé par la ligne ENSUITE du dernier Retour de quiz. Sinon null.
const ENSUITE_MAX = 120;
export function ensuiteLecon(meta, messages = [], mode) {
  if (mode !== 'libre') return null;
  const ecrit = typeof meta?.ensuite === 'string' ? meta.ensuite.trim() : '';
  if (ecrit && ecrit.length <= ENSUITE_MAX) return ecrit;
  return messages.findLast((m) => m.retourQuiz)?.retourQuiz.ensuite ?? null;
}

// Numéros d'Objectifs couverts par un quiz : entiers existants seulement, sans doublon.
const numerosValides = (brut, nombre) =>
  Array.isArray(brut) ? [...new Set(brut.filter((n) => Number.isInteger(n) && n >= 1 && n <= nombre))] : [];

// Dépassement réussi : au moins 2 questions bonus réussies dans un même quiz.
export const depassementReussi = (bonus) => (bonus?.reussies ?? 0) >= 2;

// Dépassement d'une Leçon libre (🚀) : dès qu'un quiz compte un Dépassement réussi, hors quiz faits en Révisant
// (la révision ne rapporte rien). false pour une Leçon de révision, qui a ses Étoiles.
export const depassementLecon = (scores = [], mode) =>
  mode === 'libre' && horsPretest(scores).some((s) => !s.reviser && depassementReussi(s.bonus));

// Clés des trois Étoiles, dans leur ordre d'affichage et d'annonce.
export const ETOILES = ['quiz', 'bonus', 'defi'];

// Étoiles (Leçon de révision seulement), acquises pour toujours, indépendantes de la Maîtrise :
// quiz = un score hors Défi réussi ; bonus = un Dépassement réussi ; defi = Leçon terminée. null en Leçon libre.
export function etoilesLecon(tous = [], terminee, mode) {
  if (mode === 'libre') return null;
  const scores = horsPretest(tous);
  return {
    quiz: scores.some((s) => s.defi !== true && s.score >= QUIZ_REUSSI),
    bonus: scores.some((s) => depassementReussi(s.bonus)),
    defi: Boolean(terminee),
  };
}

// Étoiles gagnées entre deux états, dans l'ordre quiz, bonus, defi.
export const nouvellesEtoiles = (avant, apres) => ETOILES.filter((e) => apres?.[e] && !avant?.[e]);

// Étoiles annoncées par un Retour de quiz : gagnées depuis les Retours de quiz précédents. `dejaComptes` : nombre de
// scores déjà pris en compte par ces Retours ; `terminee` / `termineeApres` : date de fin avant et après ce Retour.
// Un Retour sans score enregistré avant lui n'annonce donc rien pour les scores, et un score dont le Retour a échoué
// est annoncé au Retour suivant.
export function etoilesGagnees({ scores = [], dejaComptes, terminee, termineeApres, mode }) {
  return nouvellesEtoiles(etoilesLecon(scores.slice(0, dejaComptes), terminee, mode), etoilesLecon(scores, termineeApres, mode));
}

// Rebonds proposés à l'Élève : déduits du Retour de quiz, tant qu'il est le dernier message (pas encore choisi).
// Après le Défi réussi qui a terminé la Leçon : « Réviser » (plus de « Nouveau défi »).
// Après le premier Pré-test : « Commencer » seulement (un Pré-test refait ensuite n'en propose aucun).
const REBONDS_PROPOSES = { revoir: ['revoir'], defi: ['defi'], suivante: ['suivante'], terminee: ['reviser'], commencer: ['commencer'] };

// Leçon libre laissée plus d'une semaine (`dernierePage` : date, en ms, de sa page la plus récente) : « Réviser »
// s'ajoute à « Étape suivante ».
const PAUSE_AVANT_REVISER_MS = 7 * JOUR_MS;

export function rebondsProposes(messages = [], dernierePage = null, maintenant = Date.now()) {
  const action = messages.at(-1)?.retourQuiz?.action;
  if (!Object.hasOwn(REBONDS_PROPOSES, action ?? '')) return [];
  const laissee = action === 'suivante' && dernierePage !== null && maintenant - dernierePage > PAUSE_AVANT_REVISER_MS;
  return [...REBONDS_PROPOSES[action], ...(laissee ? ['reviser'] : [])];
}

// Fichiers d'une Leçon gérés par l'appli seule, hors du dossier d'une page préparée (#74) : état, Banque de Questions
// et dossier des Variantes.
const FICHIERS_DE_L_APPLI = ['etat.json', 'questions.json', 'variantes'];
const DOSSIER_SOURCES = 'sources'; // Documents source d'une Leçon de révision
const PREPARATIONS_GARDEES = 50; // issues des pages préparées gardées par Élève

const EXTENSIONS_SOURCE =['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const PSEUDO_RE = /^[\p{L}\p{N}-]{2,20}$/u;
const ID_MAX = 60;
const ID_RE = new RegExp(`^[a-z0-9-]{1,${ID_MAX}}$`);

const categorieValide = (categorie) => (CATEGORIES.includes(categorie) ? categorie : 'Autre');

export function slugify(pseudo) {
  return pseudo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const LIGATURES = { œ: 'oe', æ: 'ae', ß: 'ss' };
const slugSujet = (sujet) =>
  slugify(sujet).replace(/[œæß]/g, (l) => LIGATURES[l]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lecon';

// Coupe un slug à `max` caractères, de préférence sur un tiret.
function tronquer(nom, max) {
  if (nom.length <= max) return nom;
  const tiret = nom.lastIndexOf('-', max);
  return tiret > 0 ? nom.slice(0, tiret) : nom.slice(0, max);
}

// `elevesDir` : le dossier qui contient les Espaces personnels des Élèves.
export function createStore(elevesDir) {
  const readJson = async (file, fallback) => {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return fallback;
      throw e;
    }
  };
  // Écriture d'un coup (fichier temporaire puis renommage) : une lecture simultanée, par exemple la date de contrôle lue
  // pendant qu'un score réécrit etat.json, ne tombe jamais sur un fichier vide ou à moitié écrit. Nom temporaire
  // unique : deux écritures simultanées du même fichier ne se marchent pas dessus.
  let ecritures = 0;
  const writeJson = async (file, data) => {
    const tmp = `${file}.${process.pid}-${++ecritures}.tmp`;
    try {
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, file);
    } catch (e) {
      await fs.rm(tmp, { force: true });
      throw e;
    }
  };

  // Banque de Questions de la Leçon (voir lib/banque.js), rangée par l'appli ; Leçons sans quiz du Kit : vide.
  const banqueFile = (dir) => path.join(dir, 'questions.json');
  const lireBanque = (dir) => readJson(banqueFile(dir), {}).catch(() => ({}));
  // Modifications d'un même fichier une à une (#66) : un score de quiz et des réponses de Révision du jour simultanés
  // lisent puis réécrivent le même fichier ; sans file d'attente, l'un effacerait ce qu'a écrit l'autre.
  // `operation()` lit, modifie et réécrit le fichier `file` ; elle ne commence qu'à la fin de la précédente.
  const filesDAttente = new Map(); // fichier → fin de la dernière opération en attente sur lui
  const unAUn = (file, operation) => {
    const resultat = (filesDAttente.get(file) ?? Promise.resolve()).then(operation);
    const terminee = resultat.catch(() => {});
    filesDAttente.set(file, terminee);
    terminee.then(() => filesDAttente.get(file) === terminee && filesDAttente.delete(file));
    return resultat;
  };
  // Modification de la Banque d'une Leçon : `modifier(banque)` renvoie [nouvelle Banque, résultat].
  const modifierBanque = (dir, modifier) => unAUn(banqueFile(dir), async () => {
    const avant = await lireBanque(dir);
    const [apres, resultat] = await modifier(avant);
    if (apres !== avant) await writeJson(banqueFile(dir), apres);
    return resultat;
  });
  // Nom de fichier d'une page de la Leçon (lessons/<page>), sans chemin : null sinon.
  const nomDePage = (page) => (typeof page === 'string' && /^[^/\\]+\.html$/.test(page) && !page.startsWith('.') ? page : null);

  const eleveDir = (slug) => {
    if (!ID_RE.test(slug)) throw new HttpError(400, 'Pseudo invalide');
    return path.join(elevesDir, slug);
  };
  const leconDir = (slug, id) => {
    if (!ID_RE.test(id)) throw new HttpError(400, 'Identifiant de leçon invalide');
    return path.join(leconsDir(slug), id);
  };
  const leconsDir = (slug) => path.join(eleveDir(slug), 'lecons');
  const propositionsDir = (slug) => path.join(eleveDir(slug), 'propositions');
  const historiquePropositionsFile = (slug) => path.join(eleveDir(slug), 'historique-propositions.json');
  const coutsPropositionsFile = (slug) => path.join(eleveDir(slug), 'couts-propositions.json'); // hors du dossier de travail de l'agent
  // Coûts des tours de Variantes (#69), à part : un tour de Propositions peut écrire le sien en même temps.
  const coutsVariantesFile = (slug) => path.join(eleveDir(slug), 'couts-variantes.json');
  // Pages préparées à l'avance (#74) : un dossier de travail par Leçon, hors de la Leçon, et le journal de leur issue.
  const pagesPrepareesDir = (slug, id) => path.join(eleveDir(slug), 'pages-preparees', path.basename(leconDir(slug, id)));
  const preparationsFile = (slug) => path.join(eleveDir(slug), 'preparations.json');
  const empreintesPreparees = new Map(); // dossier de travail → empreintes de ses fichiers juste après la copie
  // Empreinte (SHA-1) de chaque fichier d'un dossier de travail : chemin relatif → empreinte. Hors Documents source
  // (le prof ne les écrit pas) et hors fichiers de l'appli.
  const empreintes = async (dir) => {
    const resultat = new Map();
    for (const relatif of await fs.readdir(dir, { recursive: true })) {
      const racine = relatif.split(path.sep)[0];
      if (FICHIERS_DE_L_APPLI.includes(racine) || racine === DOSSIER_SOURCES) continue;
      const fichier = path.join(dir, relatif);
      if (!(await fs.stat(fichier)).isFile()) continue;
      resultat.set(relatif, createHash('sha1').update(await fs.readFile(fichier)).digest('hex'));
    }
    return resultat;
  };

  // Identifiant lisible AAAA-MM-JJ-<nom>, suffixé -2, -3… si le dossier existe déjà.
  // mkdir sans `recursive` échoue sur un dossier existant : deux créations simultanées
  // ne visent donc jamais le même dossier.
  async function creerDossierLecon(slug, nom) {
    await fs.mkdir(leconsDir(slug), { recursive: true });
    const date = jourLocal(Date.now()); // jour local de création (pas UTC)
    for (let n = 1; ; n++) {
      const suffixe = n > 1 ? `-${n}` : '';
      const id = `${date}-${tronquer(nom, ID_MAX - date.length - 1 - suffixe.length)}${suffixe}`;
      const dir = leconDir(slug, id);
      try {
        await fs.mkdir(dir);
        return { id, dir };
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
      }
    }
  }

  // `lectureVoixHaute` (#76) : le Kit propose de lire la page et les questions avec la synthèse vocale de l'appareil.
  // `preparerPages` : page suivante préparée pendant le quiz (#74), active par défaut.
  function validerProfil({ age, niveau, nombrePropositions = NOMBRE_PROPOSITIONS_DEFAUT, modele = MODELE_DEFAUT, lectureVoixHaute = false, preparerPages = true }) {
    const a = Number(age);
    if (!Number.isInteger(a) || a < 3 || a > 99) throw new HttpError(400, 'Âge invalide');
    if (!NIVEAUX.includes(niveau)) throw new HttpError(400, 'Niveau invalide');
    const n = Number(nombrePropositions);
    if (!Number.isInteger(n) || n < 2 || n > 10) throw new HttpError(400, 'Nombre de Propositions : un nombre entier de 2 à 10');
    if (!MODELES.some((m) => m.id === modele)) throw new HttpError(400, 'Modèle invalide');
    if (typeof lectureVoixHaute !== 'boolean') throw new HttpError(400, 'Lecture à voix haute : oui ou non');
    if (typeof preparerPages !== 'boolean') throw new HttpError(400, 'Page préparée : oui ou non');
    return { age: a, niveau, nombrePropositions: n, modele, lectureVoixHaute, preparerPages };
  }

  return {
    elevesDir,
    leconDir,

    async listerEleves() {
      await fs.mkdir(elevesDir, { recursive: true });
      const slugs = await fs.readdir(elevesDir);
      const eleves = await Promise.all(slugs.map((s) => readJson(path.join(elevesDir, s, 'profil.json'), null)));
      return eleves.filter(Boolean).sort((a, b) => a.pseudo.localeCompare(b.pseudo, 'fr'));
    },

    async creerEleve({ pseudo, age, niveau, nombrePropositions, modele, lectureVoixHaute, preparerPages }) {
      if (typeof pseudo !== 'string' || !PSEUDO_RE.test(pseudo)) {
        throw new HttpError(400, 'Pseudo : 2 à 20 lettres, chiffres ou tirets');
      }
      const profil = { pseudo, slug: slugify(pseudo), ...validerProfil({ age, niveau, nombrePropositions, modele, lectureVoixHaute, preparerPages }) };
      const dir = eleveDir(profil.slug);
      const existe = await fs.access(path.join(dir, 'profil.json')).then(() => true, () => false);
      if (existe) throw new HttpError(409, 'Ce pseudo existe déjà');
      await fs.mkdir(path.join(dir, 'lecons'), { recursive: true });
      await writeJson(path.join(dir, 'profil.json'), profil);
      return profil;
    },

    async lireEleve(slug) {
      const profil = await readJson(path.join(eleveDir(slug), 'profil.json'), null);
      if (!profil) throw new HttpError(404, 'Élève introuvable');
      return { nombrePropositions: NOMBRE_PROPOSITIONS_DEFAUT, modele: MODELE_PROFILS_ANCIENS, lectureVoixHaute: false, preparerPages: true, ...profil }; // profils créés avant ces réglages
    },

    async modifierProfil(slug, champs) {
      const profil = await this.lireEleve(slug);
      Object.assign(profil, validerProfil({
        age: champs.age ?? profil.age,
        niveau: champs.niveau ?? profil.niveau,
        nombrePropositions: champs.nombrePropositions ?? profil.nombrePropositions,
        modele: champs.modele ?? profil.modele,
        lectureVoixHaute: champs.lectureVoixHaute === undefined ? profil.lectureVoixHaute : champs.lectureVoixHaute,
        preparerPages: champs.preparerPages === undefined ? profil.preparerPages : champs.preparerPages,
      }));
      await writeJson(path.join(eleveDir(slug), 'profil.json'), profil);
      return profil;
    },

    // `cadrage` : réponses du Cadrage posé par l'appli, déjà validées (lib/cadrage.js) ; absent si null.
    // `dateControle` (AAAA-MM-JJ, déjà validée) : date du contrôle d'une Leçon de révision (#68) ; absente si null.
    async creerLecon(slug, { sujet, mode, cadrage = null, dateControle = null }) {
      await this.lireEleve(slug);
      const { id, dir } = await creerDossierLecon(slug, mode === 'revision' ? 'revision' : slugSujet(sujet));
      const maintenant = new Date().toISOString();
      const etat = { id, sujet, mode, ...(cadrage && { cadrage }), ...(dateControle && { dateControle }), sessionId: null, creee: maintenant, derniereActivite: maintenant, messages: [], scores: [] };
      await writeJson(path.join(dir, 'etat.json'), etat);
      return etat;
    },

    // Fusionne l'état géré par l'appli (etat.json) et les métadonnées écrites par l'agent (lesson.json).
    // `maintenant` (ms) : date à laquelle la Leçon est lue (voir lib/horloge.js), pour la Maîtrise et la mémoire des Questions.
    async lireLecon(slug, id, { maintenant = Date.now() } = {}) {
      const dir = leconDir(slug, id);
      const etat = await readJson(path.join(dir, 'etat.json'), null);
      if (!etat) throw new HttpError(404, 'Leçon introuvable');
      const meta = await readJson(path.join(dir, 'lesson.json'), {});
      const pagesHtml = async (sousDossier) => (await fs.readdir(path.join(dir, sousDossier)).catch(() => [])).filter((f) => f.endsWith('.html')).sort();
      const pages = await pagesHtml('lessons');
      // Date (ms) de la page la plus récente, d'après ses fichiers : null sans page.
      const dates = await Promise.all(pages.map((p) => fs.stat(path.join(dir, 'lessons', p)).then((st) => st.mtimeMs, () => null)));
      const dernierePage = dates.some((d) => d !== null) ? Math.max(...dates.filter((d) => d !== null)) : null;
      // Banque de Questions (voir lib/banque.js), chaque Question avec sa mémoire à `maintenant`, calculée une seule fois
      // depuis son journal (lib/memoire.js) : stabilité, probabilité de se souvenir (`rappel`, 0 à 1) et date ISO de sa
      // prochaine révision, resserrée par la date de contrôle (#68). Ses Variantes (#69) sont relues et validées (liste
      // vide sans Variantes), le compte des essais reste interne.
      const banque = questionsDeLaBanque(await lireBanque(dir)).map(({ essaisVariantes, ...q }) => {
        const memoire = memoireDeQuestion(q.journal, { maintenant, dateControle: etat.dateControle });
        const { stabilite = null, rappel = null, prochaineRevision = null } = memoire ?? {};
        return { ...q, variantes: lireVariantes(q.variantes, q.contenu), stabilite, rappel, prochaineRevision };
      });
      const objectifs = etatObjectifs(objectifsValides(meta.objectifs), etat.scores, etat.mode, banque);
      const dernierPretest = (etat.scores ?? []).findLast(estPretest);
      const { couts, ...reste } = etat; // tours du prof : seul leur cumul est exposé
      return {
        ...reste,
        titre: typeof meta.titre === 'string' && meta.titre ? meta.titre : etat.sujet,
        // Réponses au Cadrage posé par l'appli ; null sans Cadrage (Leçons d'avant le Cadrage comprises).
        cadrage: etat.cadrage ?? null,
        // Date du contrôle d'une Leçon de révision (#68), AAAA-MM-JJ ; null sans contrôle (Leçons d'avant comprises).
        dateControle: etat.dateControle ?? null,
        // Jours restants avant ce contrôle à `maintenant`, pour le compte à rebours de l'accueil ; null sans contrôle.
        joursAvantControle: joursAvant(etat.dateControle, maintenant),
        categorie: categorieValide(meta.categorie),
        pages,
        // Documents de référence du prof (glossaire, fiche), ouverts par « 📋 Ma fiche » dans la Séance.
        references: await pagesHtml('reference'),
        scores: etat.scores ?? [],
        maitrise: calculerMaitrise(etat.scores, maintenant, banque),
        // Écart entre « Tu en sais déjà… » et le dernier Pré-test (voir lib/pretest.js) ; null sans Pré-test.
        pretest: dernierPretest ? ecartPretest({ deja: etat.cadrage?.deja, ...compterJustes(dernierPretest.questions) }) : null,
        objectifs,
        // Banque de Questions : vide pour les Leçons sans quiz du Kit, anciennes comprises. La stabilité reste interne.
        questions: banque.map(({ stabilite, ...q }) => q),
        niveauLecon: niveauLecon(objectifs, etat.mode),
        depassement: depassementLecon(etat.scores, etat.mode),
        // Absents des Leçons créées avant la Leçon terminée : non terminée, pas de Défi en cours.
        defiEnCours: etat.defiEnCours === true,
        // Phase Réviser en cours : du Rebond « Réviser » jusqu'au Défi réussi suivant.
        reviserEnCours: etat.reviserEnCours === true,
        terminee: etat.terminee ?? null,
        etoiles: etoilesLecon(etat.scores, etat.terminee, etat.mode),
        // Scores déjà pris en compte par les Retours de quiz (Étoiles annoncées). Leçons d'avant ce champ : un score
        // par Retour de quiz.
        scoresCommentes: etat.scoresCommentes
          ?? Math.min(etat.messages.filter((m) => m.retourQuiz).length, (etat.scores ?? []).length),
        rebondsProposes: rebondsProposes(etat.messages, dernierePage),
        ensuite: ensuiteLecon(meta, etat.messages, etat.mode),
        // Le quiz de la dernière page n'est pas encore fait : « Continuer » ramène à cette page, pas à la suite annoncée.
        quizEnAttente: pages.length > 0 && !(etat.scores ?? []).some((s) => s.page === pages.at(-1)),
        // Images retirées au dernier tour du prof, à lui signaler au tour suivant (voir lib/images.js).
        imagesRetirees: etat.imagesRetirees ?? [],
        // Questions de quiz ignorées par le Kit dans les pages du dernier tour, à lui signaler au tour suivant (spec #48).
        questionsIgnorees: etat.questionsIgnorees ?? [],
        // Coût cumulé des tours du prof (Leçons d'avant la mesure : rien de compté).
        cout: cumulerCouts(couts).total,
      };
    },

    // `maintenant` (ms) : comme pour lireLecon.
    async listerLecons(slug, { maintenant = Date.now() } = {}) {
      const ids = await fs.readdir(leconsDir(slug)).catch(() => []);
      const lecons = await Promise.all(ids.map((id) => this.lireLecon(slug, id, { maintenant }).catch(() => null)));
      return lecons
        .filter(Boolean)
        .map(({ messages, sessionId, scores, questions, defiEnCours, reviserEnCours, rebondsProposes, scoresCommentes, imagesRetirees, questionsIgnorees, ...resume }) => resume)
        .sort((a, b) => b.derniereActivite.localeCompare(a.derniereActivite));
    },

    // Documents source (PDF, photos) envoyés en base64, rangés dans sources/ du workspace.
    async enregistrerSources(slug, id, fichiers) {
      if (!Array.isArray(fichiers) || fichiers.length === 0 || fichiers.length > 10) {
        throw new HttpError(400, 'Envoie entre 1 et 10 fichiers');
      }
      const dir = path.join(leconDir(slug, id), DOSSIER_SOURCES);
      await fs.mkdir(dir, { recursive: true });
      const noms = [];
      for (const [i, { nom, data }] of fichiers.entries()) {
        const ext = path.extname(String(nom)).toLowerCase();
        if (!EXTENSIONS_SOURCE.includes(ext)) throw new HttpError(400, `Format non accepté : ${nom} (PDF ou image)`);
        const fichier = `${String(i + 1).padStart(2, '0')}${ext}`;
        await fs.writeFile(path.join(dir, fichier), Buffer.from(String(data), 'base64'));
        noms.push(fichier);
      }
      return noms;
    },

    // `objectifs` : numéros des Objectifs couverts par ce quiz ; les numéros inexistants ou mal formés sont ignorés.
    // `questions` : résultats par question du Kit (voir lib/resultats.js), qui font foi pour le score et le bonus.
    // `pretest: true` : quiz du Pré-test, enregistré avec son marqueur, hors Maîtrise, Objectifs atteints et Étoiles.
    // `maintenant` (ms) : date du quiz (voir lib/horloge.js), pour le score et le journal des Questions.
    async enregistrerScore(slug, id, { score, page, objectifs, bonus, questions, pretest }, { maintenant = Date.now() } = {}) {
      const file = path.join(leconDir(slug, id), 'etat.json');
      const meta = await readJson(path.join(leconDir(slug, id), 'lesson.json'), {}).catch(() => ({}));
      const nombreObjectifs = objectifsValides(meta.objectifs).length;
      const couverts = numerosValides(objectifs, nombreObjectifs);
      const resultat = resultatQuiz({ score, bonus, questions }, nombreObjectifs);
      const date = new Date(maintenant).toISOString();
      await unAUn(file, async () => {
        const etat = await readJson(file, null);
        if (!etat) throw new HttpError(404, 'Leçon introuvable');
        // Marqueurs « quiz de Défi » et « quiz fait en Révisant » posés par le serveur, « Pré-test » par le Kit ; absents des
        // scores ordinaires et anciens.
        // Résultat bonus du Dépassement gardé à part, s'il est valide.
        const entree = {
          score: resultat.score, date, ...(typeof page === 'string' && { page }),
          ...(couverts.length && { objectifs: couverts }), ...(etat.defiEnCours === true && { defi: true }),
          ...(etat.reviserEnCours === true && { reviser: true }),
          ...(pretest === true && { pretest: true }),
          ...(resultat.bonus && { bonus: resultat.bonus }),
          ...(resultat.questions.length && { questions: resultat.questions }),
        };
        etat.scores = [...(etat.scores ?? []), entree];
        etat.derniereActivite = date;
        await writeJson(file, etat);
      });
      await this.ajouterABanque(slug, id, { page, resultats: resultat.questions, date, pretest: pretest === true, nombreObjectifs });
      return this.lireLecon(slug, id, { maintenant });
    },

    // Réponses d'un quiz du Kit ajoutées à la Banque de Questions (voir ajouterReponsesDuQuiz). Le contenu des Questions
    // vient du quiz déclaré dans la page : sans page lisible ni quiz du Kit, rien n'est ajouté.
    async ajouterABanque(slug, id, { page, resultats, date, pretest, nombreObjectifs }) {
      const nom = nomDePage(page);
      if (!nom || !resultats.length || pretest) return;
      const dir = leconDir(slug, id);
      const quiz = quizDeLaPage(await fs.readFile(path.join(dir, 'lessons', nom), 'utf8').catch(() => null));
      if (!quiz) return;
      await modifierBanque(dir, (avant) => [ajouterReponsesDuQuiz(avant, { page: nom, quiz, resultats, date, nombreObjectifs })]);
    },

    // Pages de leçon (lessons/*.html) et leur date de modification (ms), pour savoir lesquelles un tour du prof a écrites.
    async instantanePages(slug, id) {
      const dossierPages = path.join(leconDir(slug, id), 'lessons');
      const noms = (await fs.readdir(dossierPages).catch(() => [])).filter((n) => n.endsWith('.html'));
      return Object.fromEntries(await Promise.all(noms.map(async (n) => [n, (await fs.stat(path.join(dossierPages, n))).mtimeMs])));
    },

    // Questions de quiz ignorées par le Kit (spec #48) dans les pages créées ou modifiées depuis l'instantané `avant`
    // (instantanePages) : [{ page, id?, position?, raison }].
    async questionsIgnoreesDepuis(slug, id, avant = {}) {
      const apres = await this.instantanePages(slug, id);
      const ecrites = Object.keys(apres).filter((n) => apres[n] !== avant[n]).sort();
      const dossierPages = path.join(leconDir(slug, id), 'lessons');
      const parPage = await Promise.all(ecrites.map(async (page) =>
        questionsIgnoreesDeLaPage(await fs.readFile(path.join(dossierPages, page), 'utf8')).map((q) => ({ page, ...q }))));
      return parPage.flat();
    },

    // Dossier de travail du tour de Propositions : l'agent n'y écrit que propositions.json.
    async preparerPropositionsDir(slug) {
      await this.lireEleve(slug);
      const dir = propositionsDir(slug);
      await fs.mkdir(dir, { recursive: true });
      return dir;
    },

    // Propositions écrites par l'agent, validées à la lecture. null = pas (encore) de Propositions utilisables.
    async lirePropositions(slug) {
      const { nombrePropositions } = await this.lireEleve(slug);
      const file = path.join(propositionsDir(slug), 'propositions.json');
      let brut;
      try {
        brut = await readJson(file, null);
      } catch {
        return null; // fichier illisible (en cours d'écriture ou mal formé)
      }
      const propositions = (Array.isArray(brut) ? brut : [])
        .filter((p) => typeof p?.titre === 'string' && p.titre.trim())
        .slice(0, nombrePropositions)
        .map((p) => ({
          titre: p.titre.trim(),
          categorie: categorieValide(p.categorie),
          accroche: typeof p.accroche === 'string' ? p.accroche.trim() : '',
          type: p.type === 'suite' ? 'suite' : 'original',
          auProgramme: p.auProgramme === true,
        }));
      return propositions.length ? propositions : null;
    },

    // Remet des Propositions déjà validées (après une régénération ratée).
    async ecrirePropositions(slug, propositions) {
      await writeJson(path.join(await this.preparerPropositionsDir(slug), 'propositions.json'), propositions);
    },

    // Titres des Propositions déjà affichées, du plus ancien au plus récent ; hors du dossier de travail de l'agent.
    async lireHistoriquePropositions(slug) {
      await this.lireEleve(slug);
      return readJson(historiquePropositionsFile(slug), []);
    },

    async ajouterHistoriquePropositions(slug, titres) {
      const historique = [...(await this.lireHistoriquePropositions(slug)), ...titres].slice(-HISTORIQUE_PROPOSITIONS_MAX);
      await writeJson(historiquePropositionsFile(slug), historique);
    },

    // Coût d'un tour de Propositions (voir coutDuTour), daté et ajouté aux tours de l'Élève hors Leçon.
    async enregistrerCoutPropositions(slug, cout) {
      await this.lireEleve(slug);
      const file = coutsPropositionsFile(slug);
      await unAUn(file, async () => writeJson(file, [...(await readJson(file, [])), { date: new Date().toISOString(), ...cout }]));
    },

    // Coût de l'Élève : le total et le détail par type de tâche (Propositions comprises), puis par Leçon.
    async lireCouts(slug) {
      const propositions = await this.lireEleve(slug).then(() => readJson(coutsPropositionsFile(slug), []));
      const variantes = await readJson(coutsVariantesFile(slug), []);
      const ids = await fs.readdir(leconsDir(slug)).catch(() => []);
      // Une Leçon illisible est écartée, comme dans listerLecons : elle ne fait pas échouer le reste.
      const lecons = (await Promise.all(ids.map(async (id) => {
        const etat = await readJson(path.join(leconDir(slug, id), 'etat.json'), null);
        if (!etat) return null;
        const { titre } = await this.lireLecon(slug, id);
        return { id, titre, couts: etat.couts ?? [] };
      }).map((lecon) => lecon.catch(() => null)))).filter(Boolean);
      return {
        ...cumulerCouts([...propositions, ...variantes, ...lecons.flatMap((l) => l.couts)]),
        lecons: lecons.map(({ id, titre, couts }) => ({ id, titre, ...cumulerCouts(couts) })),
      };
    },

    // `etatLecon` : champs de l'état de la Leçon (Défi en cours, Réviser en cours, date de fin, images retirées) modifiés par ce tour.
    // `cout` : coût du tour (voir coutDuTour), daté et ajouté aux tours de la Leçon.
    async enregistrerTour(slug, id, { sessionId, question, reponse, details, etatLecon, cout }) {
      const file = path.join(leconDir(slug, id), 'etat.json');
      await unAUn(file, async () => {
        const etat = await readJson(file, null);
        if (sessionId) etat.sessionId = sessionId;
        Object.assign(etat, etatLecon);
        etat.messages.push({ role: 'eleve', texte: question }, { role: 'agent', texte: reponse, ...details });
        etat.derniereActivite = new Date().toISOString();
        if (cout) etat.couts = [...(etat.couts ?? []), { date: etat.derniereActivite, ...cout }];
        await writeJson(file, etat);
      });
    },

    // Révisions du jour (#66) : les Leçons de l'Élève avec leurs Questions et leur mémoire à `maintenant` (voir
    // lib/revisions.js). Une Leçon illisible est écartée, comme dans listerLecons.
    async leconsAReviser(slug, { maintenant = Date.now() } = {}) {
      await this.lireEleve(slug);
      const ids = await fs.readdir(leconsDir(slug)).catch(() => []);
      const lecons = await Promise.all(ids.map((id) => this.lireLecon(slug, id, { maintenant }).catch(() => null)));
      return lecons.filter(Boolean).map(({ id, titre, dateControle, questions }) => ({ id, titre, dateControle, questions }));
    },

    // Vue parent (#77) : toutes les Leçons de l'Élève, lues en entier à `maintenant` (voir lib/parent.js). Une Leçon
    // illisible est écartée, comme dans listerLecons.
    async leconsDuParent(slug, { maintenant = Date.now() } = {}) {
      await this.lireEleve(slug);
      const ids = await fs.readdir(leconsDir(slug)).catch(() => []);
      return (await Promise.all(ids.map((id) => this.lireLecon(slug, id, { maintenant }).catch(() => null)))).filter(Boolean);
    },

    // Rythme (#75) : l'historique de chaque Leçon de l'Élève, tel que le lit lib/rythme.js (mode, Objectifs, scores,
    // Questions avec leur journal). Une Leçon illisible est écartée, comme dans listerLecons.
    async historiqueDuRythme(slug, { maintenant = Date.now() } = {}) {
      await this.lireEleve(slug);
      const ids = await fs.readdir(leconsDir(slug)).catch(() => []);
      const lecons = await Promise.all(ids.map((id) => this.lireLecon(slug, id, { maintenant }).catch(() => null)));
      return lecons.filter(Boolean).map(({ mode, objectifs, scores, questions }) => ({ mode, objectifs, scores, questions }));
    },

    // Réponse à une Question en Révision du jour (#66) : la Question `id` de la page `page` de la Leçon `lecon`.
    // `choisie` : réponse propre au type de la Question (index de la réponse avant mélange pour un QCM, voir
    // public/kit/v1/types/), ou JE_NE_SAIS_PAS ; `sur` : Confiance.
    // Le serveur corrige lui-même avec la bonne réponse qu'il connaît (le `juste` du client n'est pas lu) et ajoute la
    // réponse, datée de `maintenant`, au journal. Renvoie la correction et la prochaine révision de la Question.
    async repondreEnRevision(slug, { lecon, page, id, choisie, sur, variante }, { maintenant = Date.now() } = {}) {
      if (typeof lecon !== 'string') throw new HttpError(400, 'Leçon manquante');
      const dir = leconDir(slug, lecon);
      const cle = cleQuestion(page, id);
      const date = new Date(maintenant).toISOString();
      const { dateControle } = await readJson(path.join(dir, 'etat.json'), {}); // révision resserrée avant un contrôle (#68)
      return modifierBanque(dir, (banque) => {
        const question = typeof page === 'string' && typeof id === 'string' && Object.hasOwn(banque, cle) ? banque[cle] : null;
        if (!question) throw new HttpError(404, 'Question introuvable');
        // Réponse à une Variante (#69) : corrigée avec son propre contenu, journalisée sur la Question d'origine.
        const variantes = lireVariantes(question.variantes, question.contenu);
        if (variante !== undefined && !(Number.isInteger(variante) && variante >= 0 && variante < variantes.length)) throw new HttpError(400, 'Variante inconnue');
        const contenu = variante === undefined ? question.contenu : variantes[variante];
        // Corrigée selon son type (spec #48) : une réponse impossible pour ce type (sans réponse choisie) est refusée.
        const { juste, points, bonne, choisie: texteChoisi, explication, jeNeSaisPas = false } = corriger(questionDuContenu(contenu), choisie);
        if (texteChoisi === null) throw new HttpError(400, 'Réponse invalide');
        const apres = ajouterReponseDeRevision(banque, cle, { date, juste, points, sur, jeNeSaisPas, variante });
        const { prochaineRevision } = memoireDeQuestion(apres[cle].journal, { maintenant, dateControle });
        return [apres, { juste, ...(estPartiel({ juste, points }) && { points }), bonne, explication, prochaineRevision }];
      });
    },

    // Variantes (#69) : dossier de travail du tour de Variantes d'une Leçon (l'agent n'y lit que questions-a-varier.json
    // et n'y écrit que variantes.json), hors des pages de la Leçon.
    variantesDir: (slug, id) => path.join(leconDir(slug, id), 'variantes'),

    // Prépare un tour de Variantes pour la Leçon : les Questions à varier (voir questionsAVarier) reçoivent un essai de
    // plus et sont écrites dans questions-a-varier.json. Renvoie leurs clés ; aucune : pas de tour à lancer.
    async demanderVariantes(slug, id) {
      const dir = leconDir(slug, id);
      return modifierBanque(dir, async (banque) => {
        const cles = questionsAVarier(banque);
        if (!cles.length) return [banque, []];
        await fs.mkdir(this.variantesDir(slug, id), { recursive: true });
        await writeJson(path.join(this.variantesDir(slug, id), 'questions-a-varier.json'), demandeDeVariantes(banque, cles));
        return [noterDemande(banque, cles), cles];
      });
    },

    // Fin d'un tour de Variantes, réussi ou non : les variantes valides de variantes.json sont rattachées aux Questions
    // demandées (`cles`), puis le dossier de travail est vidé.
    async rattacherVariantes(slug, id, cles) {
      const travail = this.variantesDir(slug, id);
      try {
        const ecrites = await readJson(path.join(travail, 'variantes.json'), {}).catch(() => ({}));
        await modifierBanque(leconDir(slug, id), (banque) => [rattacherVariantes(banque, cles, ecrites)]);
      } finally {
        await fs.rm(path.join(travail, 'variantes.json'), { force: true });
        await fs.rm(path.join(travail, 'questions-a-varier.json'), { force: true });
      }
    },

    // Indicateurs (#78) : événements datés de l'Élève (voir lib/indicateurs.js), ajoutés un à un, une ligne JSON
    // chacun, à la fin de evenements.jsonl : le journal grandit sans jamais être relu ni réécrit pour un ajout.
    async enregistrerEvenement(slug, evenement) {
      const file = path.join(eleveDir(slug), 'evenements.jsonl');
      await unAUn(file, () => fs.appendFile(file, `${JSON.stringify(evenement)}\n`));
    },

    // Les événements de l'Élève, dans l'ordre : ceux de l'ancien evenements.json (tableau JSON) puis ceux du journal.
    // Une ligne illisible est ignorée.
    async lireEvenements(slug) {
      await this.lireEleve(slug);
      const anciens = await readJson(path.join(eleveDir(slug), 'evenements.json'), []);
      const journal = await fs.readFile(path.join(eleveDir(slug), 'evenements.jsonl'), 'utf8').catch((e) => {
        if (e.code === 'ENOENT') return '';
        throw e;
      });
      const lignes = journal.split('\n').filter(Boolean).map((ligne) => {
        try {
          return JSON.parse(ligne);
        } catch {
          return null;
        }
      });
      return [...anciens, ...lignes.filter(Boolean)];
    },

    // Coût d'un tour de Variantes (voir coutDuTour), daté et ajouté aux tours de l'Élève hors Séance.
    async enregistrerCoutVariantes(slug, cout) {
      const file = coutsVariantesFile(slug);
      await unAUn(file, async () => writeJson(file, [...(await readJson(file, [])), { date: new Date().toISOString(), ...cout }]));
    },

    // Quiz du Kit de la page `page` de la Leçon (voir quizDeLaPage) ; null sans page lisible ni quiz du Kit.
    async quizDeLaPage(slug, id, page) {
      const nom = nomDePage(page);
      return nom ? quizDeLaPage(await fs.readFile(path.join(leconDir(slug, id), 'lessons', nom), 'utf8').catch(() => null)) : null;
    },

    // Page préparée à l'avance (#74) : son dossier de travail est une copie de la Leçon, sans les fichiers gérés par
    // l'appli (état, Banque de Questions, Variantes), que le prof lit comme la Leçon et où il écrit sa page. Les
    // Documents source (sources/, souvent de gros PDF), que le prof ne fait que lire, y sont des liens physiques, sans
    // copie (copiés si le lien est impossible) : un lien symbolique mènerait hors du dossier de travail, où le prof
    // n'a pas accès. Une empreinte de chaque fichier copié est gardée, pour ne reprendre que ce que le prof a écrit.
    async preparerDossierPreparation(slug, id) {
      const dir = pagesPrepareesDir(slug, id);
      await this.ecarterPreparation(slug, id);
      const source = leconDir(slug, id);
      const horsCopie = [...FICHIERS_DE_L_APPLI, DOSSIER_SOURCES];
      await fs.cp(source, dir, { recursive: true, filter: (f) => !horsCopie.includes(path.relative(source, f)) });
      const sources = await fs.readdir(path.join(source, DOSSIER_SOURCES)).catch(() => []);
      if (sources.length) await fs.mkdir(path.join(dir, DOSSIER_SOURCES));
      for (const nom of sources) {
        const [de, vers] = [source, dir].map((d) => path.join(d, DOSSIER_SOURCES, nom));
        await fs.link(de, vers).catch(() => fs.cp(de, vers, { recursive: true }));
      }
      empreintesPreparees.set(dir, await empreintes(dir));
      return dir;
    },

    // Page préparée retenue : les fichiers que le prof a créés ou modifiés dans le dossier de travail depuis sa copie
    // rejoignent la Leçon (page, lesson.json, notes, images…), puis le dossier est vidé. Un fichier qu'il n'a pas
    // touché n'est pas recopié : la Leçon a pu changer depuis, sa copie serait périmée.
    async adopterPreparation(slug, id) {
      const dir = pagesPrepareesDir(slug, id);
      const lecon = leconDir(slug, id);
      const avant = empreintesPreparees.get(dir) ?? new Map();
      for (const [relatif, empreinte] of await empreintes(dir)) {
        if (avant.get(relatif) === empreinte) continue;
        await fs.mkdir(path.dirname(path.join(lecon, relatif)), { recursive: true });
        await fs.copyFile(path.join(dir, relatif), path.join(lecon, relatif));
      }
      await this.ecarterPreparation(slug, id);
    },

    async ecarterPreparation(slug, id) {
      const dir = pagesPrepareesDir(slug, id);
      empreintesPreparees.delete(dir);
      await fs.rm(dir, { recursive: true, force: true });
    },

    // Coût d'un tour du prof sans message, ajouté aux tours de la Leçon (page préparée puis écartée).
    async ajouterCoutLecon(slug, id, cout) {
      const file = path.join(leconDir(slug, id), 'etat.json');
      await unAUn(file, async () => {
        const etat = await readJson(file, null);
        if (!etat) return;
        etat.couts = [...(etat.couts ?? []), { date: new Date().toISOString(), ...cout }];
        await writeJson(file, etat);
      });
    },

    // Issue d'une page préparée (`utilisee` ou non), datée, pour le taux de pages inutilisées (voir lib/preparation.js).
    async noterPreparation(slug, { lecon, action, utilisee }) {
      const file = preparationsFile(slug);
      await unAUn(file, async () => writeJson(file, [...(await readJson(file, [])), { date: new Date().toISOString(), lecon, action, utilisee }].slice(-PREPARATIONS_GARDEES)));
    },

    async lirePreparations(slug) {
      await this.lireEleve(slug);
      return readJson(preparationsFile(slug), []);
    },
  };
}
