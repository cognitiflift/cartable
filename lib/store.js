import fs from 'node:fs/promises';
import path from 'node:path';

export const NIVEAUX = [
  ...[1, 2, 3, 4, 5, 6].map((n) => `Primaire ${n}`),
  ...[1, 2, 3, 4, 5, 6].map((n) => `Secondaire ${n}`),
  'Autre',
];

export const NOMBRE_PROPOSITIONS_DEFAUT = 4;

const HISTORIQUE_PROPOSITIONS_MAX = 10; // titres retenus pour « D'autres idées »

export const CATEGORIES = ['Français', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie', 'Langues', 'Arts', 'Autre'];

const JOUR_MS = 86_400_000;

// Maîtrise : moyenne des 3 derniers scores, moins 10 points par semaine entière sans quiz
// au-delà de 3 semaines. null = pas encore évaluée.
export function calculerMaitrise(scores = [], maintenant = Date.now()) {
  if (scores.length === 0) return null;
  const derniers = scores.slice(-3);
  const moyenne = derniers.reduce((total, s) => total + s.score, 0) / derniers.length;
  const joursSansQuiz = (maintenant - Date.parse(scores.at(-1).date)) / JOUR_MS;
  const penalite = joursSansQuiz > 21 ? 10 * Math.floor((joursSansQuiz - 21) / 7) : 0;
  const pourcentage = Math.max(0, Math.round(moyenne - penalite));
  const palier = pourcentage >= 80 ? 'acquis' : pourcentage >= 50 ? 'à consolider' : 'non acquis';
  return { pourcentage, palier };
}

export const QUIZ_REUSSI = 80; // score minimal d'un quiz réussi, en %

// Objectifs (textes, numérotés à partir de 1 par leur position) : atteint dès qu'un score réussi le couvre.
export function objectifsAtteints(objectifs = [], scores = []) {
  const couverts = new Set(scores.filter((s) => s.score >= QUIZ_REUSSI).flatMap((s) => s.objectifs ?? []));
  return objectifs.map((texte, i) => ({ texte, atteint: couverts.has(i + 1) }));
}

// Niveau de Leçon (Leçon libre) : Objectifs atteints + 1. null sans Objectifs ou pour une Leçon de révision.
export function niveauLecon(objectifs = [], mode) {
  if (mode !== 'libre' || objectifs.length === 0) return null;
  return objectifs.filter((o) => o.atteint).length + 1;
}

// Liste d'Objectifs écrite par l'agent dans lesson.json ; absente ou mal formée = pas d'Objectifs.
const objectifsValides = (brut) =>
  Array.isArray(brut) && brut.every((o) => typeof o === 'string' && o.trim()) ? brut.map((o) => o.trim()) : [];

// Numéros d'Objectifs couverts par un quiz : entiers existants seulement, sans doublon.
const numerosValides = (brut, nombre) =>
  Array.isArray(brut) ? [...new Set(brut.filter((n) => Number.isInteger(n) && n >= 1 && n <= nombre))] : [];

// Rebonds proposés à l'Élève : déduits du Retour de quiz, tant qu'il est le dernier message (pas encore choisi).
// Après le Défi réussi qui a terminé la Leçon : « Nouveau défi ».
const REBONDS_PROPOSES = { revoir: ['revoir'], defi: ['defi'], suivante: ['suivante'], terminee: ['defi'] };

export function rebondsProposes(messages = []) {
  const action = messages.at(-1)?.retourQuiz?.action;
  return Object.hasOwn(REBONDS_PROPOSES, action ?? '') ? [...REBONDS_PROPOSES[action]] : [];
}

const EXTENSIONS_SOURCE = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const PSEUDO_RE = /^[\p{L}\p{N}-]{2,20}$/u;
const ID_MAX = 60;
const ID_RE = new RegExp(`^[a-z0-9-]{1,${ID_MAX}}$`);

const categorieValide = (categorie) => (CATEGORIES.includes(categorie) ? categorie : 'Autre');

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function slugify(pseudo) {
  return pseudo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Date locale de création (pas UTC), au format AAAA-MM-JJ.
const dateLocale = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

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
  const writeJson = (file, data) => fs.writeFile(file, JSON.stringify(data, null, 2));

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

  // Identifiant lisible AAAA-MM-JJ-<nom>, suffixé -2, -3… si le dossier existe déjà.
  // mkdir sans `recursive` échoue sur un dossier existant : deux créations simultanées
  // ne visent donc jamais le même dossier.
  async function creerDossierLecon(slug, nom) {
    await fs.mkdir(leconsDir(slug), { recursive: true });
    const date = dateLocale(new Date());
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

  function validerProfil({ age, niveau, nombrePropositions = NOMBRE_PROPOSITIONS_DEFAUT }) {
    const a = Number(age);
    if (!Number.isInteger(a) || a < 3 || a > 99) throw new HttpError(400, 'Âge invalide');
    if (!NIVEAUX.includes(niveau)) throw new HttpError(400, 'Niveau invalide');
    const n = Number(nombrePropositions);
    if (!Number.isInteger(n) || n < 2 || n > 10) throw new HttpError(400, 'Nombre de Propositions : un nombre entier de 2 à 10');
    return { age: a, niveau, nombrePropositions: n };
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

    async creerEleve({ pseudo, age, niveau, nombrePropositions }) {
      if (typeof pseudo !== 'string' || !PSEUDO_RE.test(pseudo)) {
        throw new HttpError(400, 'Pseudo : 2 à 20 lettres, chiffres ou tirets');
      }
      const profil = { pseudo, slug: slugify(pseudo), ...validerProfil({ age, niveau, nombrePropositions }) };
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
      return { nombrePropositions: NOMBRE_PROPOSITIONS_DEFAUT, ...profil }; // profils créés avant ce réglage
    },

    async modifierProfil(slug, champs) {
      const profil = await this.lireEleve(slug);
      Object.assign(profil, validerProfil({
        age: champs.age ?? profil.age,
        niveau: champs.niveau ?? profil.niveau,
        nombrePropositions: champs.nombrePropositions ?? profil.nombrePropositions,
      }));
      await writeJson(path.join(eleveDir(slug), 'profil.json'), profil);
      return profil;
    },

    async creerLecon(slug, { sujet, mode }) {
      await this.lireEleve(slug);
      const { id, dir } = await creerDossierLecon(slug, mode === 'revision' ? 'revision' : slugSujet(sujet));
      const maintenant = new Date().toISOString();
      const etat = { id, sujet, mode, sessionId: null, creee: maintenant, derniereActivite: maintenant, messages: [], scores: [] };
      await writeJson(path.join(dir, 'etat.json'), etat);
      return etat;
    },

    // Fusionne l'état géré par l'appli (etat.json) et les métadonnées écrites par l'agent (lesson.json).
    async lireLecon(slug, id) {
      const dir = leconDir(slug, id);
      const etat = await readJson(path.join(dir, 'etat.json'), null);
      if (!etat) throw new HttpError(404, 'Leçon introuvable');
      const meta = await readJson(path.join(dir, 'lesson.json'), {});
      const pages = (await fs.readdir(path.join(dir, 'lessons')).catch(() => [])).filter((f) => f.endsWith('.html')).sort();
      const objectifs = objectifsAtteints(objectifsValides(meta.objectifs), etat.scores);
      return {
        ...etat,
        titre: typeof meta.titre === 'string' && meta.titre ? meta.titre : etat.sujet,
        categorie: categorieValide(meta.categorie),
        pages,
        scores: etat.scores ?? [],
        maitrise: calculerMaitrise(etat.scores),
        objectifs,
        niveau: niveauLecon(objectifs, etat.mode),
        // Absents des Leçons créées avant la Leçon terminée : non terminée, pas de Défi en cours.
        defiEnCours: etat.defiEnCours === true,
        terminee: etat.terminee ?? null,
        rebondsProposes: rebondsProposes(etat.messages),
        // Titre de la page annoncée par le dernier Retour de quiz (Leçon libre), sinon null.
        ensuite: etat.messages.findLast((m) => m.retourQuiz)?.retourQuiz.ensuite ?? null,
      };
    },

    async listerLecons(slug) {
      const ids = await fs.readdir(leconsDir(slug)).catch(() => []);
      const lecons = await Promise.all(ids.map((id) => this.lireLecon(slug, id).catch(() => null)));
      return lecons
        .filter(Boolean)
        .map(({ messages, sessionId, scores, defiEnCours, rebondsProposes, ...resume }) => resume)
        .sort((a, b) => b.derniereActivite.localeCompare(a.derniereActivite));
    },

    // Documents source (PDF, photos) envoyés en base64, rangés dans sources/ du workspace.
    async enregistrerSources(slug, id, fichiers) {
      if (!Array.isArray(fichiers) || fichiers.length === 0 || fichiers.length > 10) {
        throw new HttpError(400, 'Envoie entre 1 et 10 fichiers');
      }
      const dir = path.join(leconDir(slug, id), 'sources');
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
    async enregistrerScore(slug, id, { score, page, objectifs }) {
      const valeur = Number(score);
      if (!Number.isFinite(valeur) || valeur < 0 || valeur > 100) throw new HttpError(400, 'Score invalide (0 à 100)');
      const file = path.join(leconDir(slug, id), 'etat.json');
      const etat = await readJson(file, null);
      if (!etat) throw new HttpError(404, 'Leçon introuvable');
      const meta = await readJson(path.join(leconDir(slug, id), 'lesson.json'), {}).catch(() => ({}));
      const couverts = numerosValides(objectifs, objectifsValides(meta.objectifs).length);
      const date = new Date().toISOString();
      // Marqueur « quiz de Défi » posé par le serveur ; absent des scores ordinaires et des scores anciens.
      const entree = {
        score: Math.round(valeur), date, ...(typeof page === 'string' && { page }),
        ...(couverts.length && { objectifs: couverts }), ...(etat.defiEnCours === true && { defi: true }),
      };
      etat.scores = [...(etat.scores ?? []), entree];
      etat.derniereActivite = date;
      await writeJson(file, etat);
      return this.lireLecon(slug, id);
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

    // `etatLecon` : champs de l'état de la Leçon (Défi en cours, date de fin) modifiés par ce tour.
    async enregistrerTour(slug, id, { sessionId, question, reponse, details, etatLecon }) {
      const file = path.join(leconDir(slug, id), 'etat.json');
      const etat = await readJson(file, null);
      if (sessionId) etat.sessionId = sessionId;
      Object.assign(etat, etatLecon);
      etat.messages.push({ role: 'eleve', texte: question }, { role: 'agent', texte: reponse, ...details });
      etat.derniereActivite = new Date().toISOString();
      await writeJson(file, etat);
    },
  };
}
