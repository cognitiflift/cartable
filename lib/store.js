import fs from 'node:fs/promises';
import path from 'node:path';

export const NIVEAUX = [
  ...[1, 2, 3, 4, 5, 6].map((n) => `Primaire ${n}`),
  ...[1, 2, 3, 4, 5, 6].map((n) => `Secondaire ${n}`),
  'Autre',
];

export const CATEGORIES = ['Français', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie', 'Langues', 'Arts', 'Autre'];

const EXTENSIONS_SOURCE = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const PSEUDO_RE = /^[\p{L}\p{N}-]{2,20}$/u;
const ID_RE = /^[a-z0-9-]{1,60}$/;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function slugify(pseudo) {
  return pseudo.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function createStore(root) {
  const elevesDir = path.join(root, 'eleves');

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
    return path.join(eleveDir(slug), 'lecons', id);
  };

  function validerProfil({ age, niveau }) {
    const a = Number(age);
    if (!Number.isInteger(a) || a < 3 || a > 99) throw new HttpError(400, 'Âge invalide');
    if (!NIVEAUX.includes(niveau)) throw new HttpError(400, 'Niveau invalide');
    return { age: a, niveau };
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

    async creerEleve({ pseudo, age, niveau }) {
      if (typeof pseudo !== 'string' || !PSEUDO_RE.test(pseudo)) {
        throw new HttpError(400, 'Pseudo : 2 à 20 lettres, chiffres ou tirets');
      }
      const profil = { pseudo, slug: slugify(pseudo), ...validerProfil({ age, niveau }) };
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
      return profil;
    },

    async modifierProfil(slug, champs) {
      const profil = await this.lireEleve(slug);
      Object.assign(profil, validerProfil({ age: champs.age ?? profil.age, niveau: champs.niveau ?? profil.niveau }));
      await writeJson(path.join(eleveDir(slug), 'profil.json'), profil);
      return profil;
    },

    async creerLecon(slug, { sujet, mode }) {
      await this.lireEleve(slug);
      const id = `l-${Date.now().toString(36)}`;
      const dir = leconDir(slug, id);
      await fs.mkdir(dir, { recursive: true });
      const maintenant = new Date().toISOString();
      const etat = { id, sujet, mode, sessionId: null, creee: maintenant, derniereActivite: maintenant, messages: [] };
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
      return {
        ...etat,
        titre: typeof meta.titre === 'string' && meta.titre ? meta.titre : etat.sujet,
        categorie: CATEGORIES.includes(meta.categorie) ? meta.categorie : 'Autre',
        pages,
      };
    },

    async listerLecons(slug) {
      const ids = await fs.readdir(path.join(eleveDir(slug), 'lecons')).catch(() => []);
      const lecons = await Promise.all(ids.map((id) => this.lireLecon(slug, id).catch(() => null)));
      return lecons
        .filter(Boolean)
        .map(({ messages, sessionId, ...resume }) => resume)
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

    async enregistrerTour(slug, id, { sessionId, question, reponse }) {
      const file = path.join(leconDir(slug, id), 'etat.json');
      const etat = await readJson(file, null);
      if (sessionId) etat.sessionId = sessionId;
      etat.messages.push({ role: 'eleve', texte: question }, { role: 'agent', texte: reponse });
      etat.derniereActivite = new Date().toISOString();
      await writeJson(file, etat);
    },
  };
}
