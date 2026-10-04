import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, HttpError, NIVEAUX, CATEGORIES } from './lib/store.js';
import { lancerAgent, consignesLecon, consignesPropositions } from './lib/agent.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const store = createStore(ROOT);

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const enCours = new Set(); // leçons dont l'agent travaille : un seul agent par leçon à la fois
const propositionsEnCours = new Map(); // élève → Propositions précédentes, pendant que les nouvelles se préparent : un seul tour à la fois

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

async function lireCorps(req, max = 100_000) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > max) throw new HttpError(413, 'Envoi trop volumineux');
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new HttpError(400, 'JSON invalide');
  }
}

async function envoyerFichier(res, base, relatif) {
  const fichier = path.resolve(base, relatif);
  if (fichier !== base && !fichier.startsWith(base + path.sep)) throw new HttpError(403, 'Interdit');
  try {
    const contenu = await fs.readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(contenu);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'EISDIR') throw new HttpError(404, 'Introuvable');
    throw e;
  }
}

// À la reprise, l'agent reçoit les scores récents pour cibler les erreurs (l'élève ne voit pas cet ajout).
function avecScores(prompt, lecon) {
  if (!lecon.scores.length) return prompt;
  const recents = lecon.scores.slice(-5).map((s) => `${s.score} %${s.page ? ` (${s.page})` : ''} le ${s.date.slice(0, 10)}`);
  const m = lecon.maitrise;
  return `[Scores aux quiz : ${recents.join(' ; ')}. Maîtrise : ${m.pourcentage} %, ${m.palier}.]\n\n${prompt}`;
}

// `prompt` part vers l'agent ; `affiche` est ce que l'élève voit de son propre message.
async function tourDeParole({ slug, id, prompt, affiche = prompt, premier }) {
  if (enCours.has(id)) throw new HttpError(409, "L'agent est déjà en train de répondre");
  enCours.add(id);
  try {
    const profil = await store.lireEleve(slug);
    const lecon = await store.lireLecon(slug, id);
    const { reponse, sessionId } = await lancerAgent({
      cwd: store.leconDir(slug, id),
      prompt: premier ? `/mattpocock-skills:teach ${prompt}` : avecScores(prompt, lecon),
      sessionId: lecon.sessionId,
      consignes: consignesLecon(profil),
    });
    await store.enregistrerTour(slug, id, { sessionId, question: affiche, reponse });
    return store.lireLecon(slug, id);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(502, /limit/i.test(e.message) ? "Claude est fatigué pour l'instant, réessaie plus tard." : e.message);
  } finally {
    enCours.delete(id);
  }
}

// Tour d'agent hors Leçon, en arrière-plan : on ne l'attend pas. Pendant ce tour, on sert les `anciennes` Propositions
// (l'agent réécrit le fichier sur place) ; s'il échoue sans laisser de Propositions utilisables, on les remet.
function genererPropositions(slug, anciennes = []) {
  if (propositionsEnCours.has(slug)) return;
  propositionsEnCours.set(slug, anciennes);
  (async () => {
    const profil = await store.lireEleve(slug);
    await lancerAgent({
      cwd: await store.preparerPropositionsDir(slug),
      prompt: 'Prépare 4 Propositions de nouvelles Leçons pour cet élève.',
      consignes: consignesPropositions(profil),
      teach: false,
    });
  })()
    .catch((e) => console.error(`Propositions de ${slug} : ${e.message}`))
    .then(async () => {
      if (anciennes.length && !(await store.lirePropositions(slug))) await store.ecrirePropositions(slug, anciennes);
    })
    .catch((e) => console.error(`Propositions de ${slug} : ${e.message}`))
    .finally(() => propositionsEnCours.delete(slug));
}

async function lirePropositions(slug) {
  if (propositionsEnCours.has(slug)) return { etat: 'en préparation', propositions: propositionsEnCours.get(slug) };
  const propositions = await store.lirePropositions(slug);
  return propositions ? { etat: 'prêtes', propositions } : { etat: 'indisponibles', propositions: [] };
}

// « D'autres idées » : relance la génération sans l'attendre, jamais deux à la fois pour un même Élève.
async function regenererPropositions(slug) {
  const anciennes = await store.lirePropositions(slug); // 404 si l'Élève n'existe pas
  if (propositionsEnCours.has(slug)) throw new HttpError(409, 'Des idées sont déjà en préparation');
  genererPropositions(slug, anciennes ?? []);
  return lirePropositions(slug);
}

async function nouvelleRevision(slug, { fichiers, dateControle }) {
  const lecon = await store.creerLecon(slug, { sujet: 'Révision', mode: 'revision' });
  const noms = await store.enregistrerSources(slug, lecon.id, fichiers);
  const controle = typeof dateControle === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateControle) ? dateControle : null;
  const prompt = [
    `Leçon de révision. L'élève a fourni sa leçon scolaire : ${noms.map((n) => `sources/${n}`).join(', ')} (scan ou photo, parfois manuscrite).`,
    `La mission est déjà fixée, ne la demande pas : réviser cette leçon et être évalué sur son contenu${controle ? `, pour un contrôle le ${controle} (organise la révision espacée jusqu'à cette date)` : ''}.`,
    `Lis le document, écris MISSION.md, puis crée une page de révision fidèle au document (n'ajoute pas de notions hors programme) avec un quiz d'évaluation. Si un passage est illisible, demande-le à l'élève.`,
  ].join('\n');
  const affiche = `📄 Voici ma leçon à réviser${controle ? ` (contrôle le ${new Date(controle).toLocaleDateString('fr-BE')})` : ''}.`;
  return tourDeParole({ slug, id: lecon.id, prompt, affiche, premier: true });
}

async function api(req, res, segments) {
  const [r1, slug, r2, id, r3] = segments;
  const m = req.method;
  if (r1 === 'config' && m === 'GET') return json(res, 200, { niveaux: NIVEAUX, categories: CATEGORIES });
  if (r1 !== 'eleves') throw new HttpError(404, 'Introuvable');

  if (!slug) {
    if (m === 'GET') return json(res, 200, await store.listerEleves());
    if (m === 'POST') {
      const profil = await store.creerEleve(await lireCorps(req));
      genererPropositions(profil.slug);
      return json(res, 201, profil);
    }
  } else if (!r2) {
    if (m === 'GET') return json(res, 200, await store.lireEleve(slug));
    if (m === 'PUT') return json(res, 200, await store.modifierProfil(slug, await lireCorps(req)));
  } else if (r2 === 'propositions' && !id) {
    if (m === 'GET') return json(res, 200, await lirePropositions(slug));
    if (m === 'POST') return json(res, 202, await regenererPropositions(slug));
  } else if (r2 === 'lecons') {
    if (!id) {
      if (m === 'GET') return json(res, 200, await store.listerLecons(slug));
      if (m === 'POST') {
        const corps = await lireCorps(req, 40_000_000);
        if (corps.fichiers) return json(res, 201, await nouvelleRevision(slug, corps));
        const sujet = typeof corps.sujet === 'string' ? corps.sujet.trim() : '';
        if (!sujet) throw new HttpError(400, 'Dis-moi ce que tu veux apprendre');
        const lecon = await store.creerLecon(slug, { sujet, mode: 'libre' });
        return json(res, 201, await tourDeParole({ slug, id: lecon.id, prompt: sujet, premier: true }));
      }
    } else if (!r3) {
      if (m === 'GET') return json(res, 200, await store.lireLecon(slug, id));
    } else if (r3 === 'scores' && m === 'POST') {
      return json(res, 201, await store.enregistrerScore(slug, id, await lireCorps(req)));
    } else if (r3 === 'messages' && m === 'POST') {
      const { texte } = await lireCorps(req);
      if (typeof texte !== 'string' || !texte.trim()) throw new HttpError(400, 'Message vide');
      return json(res, 200, await tourDeParole({ slug, id, prompt: texte.trim(), premier: false }));
    }
  }
  throw new HttpError(405, 'Non supporté');
}

const serveur = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (segments[0] === 'api') return await api(req, res, segments.slice(1));
    if (segments[0] === 'fichiers' && segments.length > 3) {
      // /fichiers/<pseudo>/<leçon>/<chemin> : pages HTML et assets de la leçon, relatifs au workspace
      const [, slug, id, ...reste] = segments;
      return await envoyerFichier(res, store.leconDir(slug, id), reste.join('/'));
    }
    return await envoyerFichier(res, PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    json(res, status, { erreur: status === 500 ? 'Erreur interne' : e.message });
  }
});

serveur.listen(PORT, HOST, () => console.log(`Cartable : http://localhost:${PORT}`));
