import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, HttpError, NIVEAUX, CATEGORIES, NOMBRE_PROPOSITIONS_DEFAUT, MODELES, MODELE_DEFAUT, QUIZ_REUSSI, etoilesGagnees, horsPretest } from './lib/store.js';
import { resultatQuiz } from './lib/resultats.js';
import { lancerAgent, consignesLecon, consignesPropositions, extraireChoix, actionRetourQuiz, promptDemarrageLibre, consigneRebond, consigneDernierQuiz, consignePremierTour, consigneImagesRetirees, consigneQuestionsFragiles, REBONDS, preambuleRelais, resumeScore, RELAIS } from './lib/agent.js';
import { messageDemarrage } from './lib/demarrage.js';
import { texteRetourQuiz, texteRetourPretest } from './lib/retour.js';
import { ecartPretest } from './lib/pretest.js';
import { compterJustes } from './public/kit/v1/quiz-logique.js';
import { validerCadrage, promptCadrage, QUESTIONS_CADRAGE, questionsDuMode } from './lib/cadrage.js';
import { rapatrierImages, imagesASignaler } from './lib/images.js';
import { maintenantDe } from './lib/horloge.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const ELEVES = process.env.ELEVES_DIR || path.join(ROOT, 'eleves');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const store = createStore(ELEVES);
const SUJET_MAX = 80; // sujet libre, après trim

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.md': 'text/markdown; charset=utf-8' };
const enCours = new Set(); // leçons dont l'agent travaille : un seul agent par leçon à la fois
const propositionsEnCours = new Map(); // élève → Propositions précédentes, pendant que les nouvelles se préparent : un seul tour à la fois
const propositionsARelancer = new Set(); // élèves dont une séance a avancé pendant la génération : une relance à la fin

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

// Tour repris dans la session en cours (première Séance, ou CARTABLE_RELAIS=0) : l'agent reçoit les scores récents et
// les résultats du dernier quiz pour cibler les erreurs (l'Élève ne voit pas cet ajout), et, pour une Leçon qui n'en a
// pas encore (Leçons d'avant les Objectifs), la demande de fixer ses Objectifs. Les Questions les plus fragiles y sont
// citées comme dans le préambule de relais. `resultatsQuiz: false` : comme pour le préambule de relais.
function preambule(prompt, lecon, { resultatsQuiz = true } = {}) {
  const lignes = [];
  if (lecon.scores.length) {
    const m = lecon.maitrise; // null après un Pré-test seul
    lignes.push(`[Scores aux quiz : ${lecon.scores.slice(-5).map(resumeScore).join(' ; ')}.${m ? ` Maîtrise : ${m.pourcentage} %, ${m.palier}.` : ''}]`);
    if (resultatsQuiz) lignes.push(...consigneDernierQuiz(lecon.scores.at(-1), null, lecon));
  }
  lignes.push(...consigneQuestionsFragiles(lecon.questions));
  lignes.push(...consigneImagesRetirees(lecon.imagesRetirees));
  if (!lecon.objectifs.length) {
    lignes.push(`[Cette Leçon n'a pas encore d'Objectifs : ajoute dans lesson.json la liste "objectifs", alignée sur les « Success looks like » de MISSION.md, et indique dans chaque quiz les numéros des Objectifs qu'il couvre.]`);
  }
  return lignes.length ? `${lignes.join('\n')}\n\n${prompt}` : prompt;
}

// `prompt` part vers l'agent ; `affiche` est ce que l'élève voit de son propre message.
// La réponse du prof est stockée sans sa ligne CHOIX, avec ses Réponses proposées.
// `tache` : type de tâche du tour, gardé avec son coût ; par défaut, première Séance tant que la Leçon n'a aucune
// Page de leçon, page ensuite. `resultatsQuiz: false` : le prompt porte déjà les résultats du dernier quiz (Rebond),
// le préambule de relais ne les répète pas.
async function tourDeParole({ slug, id, prompt, affiche = prompt, premier, etatLecon, tache, resultatsQuiz = true }) {
  if (enCours.has(id)) throw new HttpError(409, "L'agent est déjà en train de répondre");
  enCours.add(id);
  try {
    const profil = await store.lireEleve(slug);
    const lecon = await store.lireLecon(slug, id);
    // Session neuve dès que la Leçon a sa première page : le prof relance le skill teach et reçoit le préambule de relais.
    const neuve = RELAIS && lecon.pages.length > 0;
    const { reponse, sessionId, cout } = await lancerAgent({
      cwd: store.leconDir(slug, id),
      prompt: premier ? `/mattpocock-skills:teach ${prompt}` : neuve ? `/mattpocock-skills:teach ${preambuleRelais(lecon, { resultatsQuiz })}\n\n${prompt}` : preambule(prompt, lecon, { resultatsQuiz }),
      sessionId: neuve ? null : lecon.sessionId,
      consignes: consignesLecon(profil),
      modele: profil.modele,
      tache: tache ?? (lecon.pages.length ? 'page' : 'premiereSeance'),
    });
    const { texte, choix } = extraireChoix(reponse);
    // Images déclarées par le prof rapatriées dans la Leçon ; celles retirées sont signalées au tour suivant (une fois).
    // Celles d'avant ce tour restent à signaler tant que son prompt ne les a pas portées (premier tour : pas de préambule).
    const nouvelles = await rapatrierImages(store.leconDir(slug, id)).catch((e) => {
      console.error(`Images de ${id} : ${e.message}`);
      return [];
    });
    const imagesRetirees = imagesASignaler(premier ? lecon.imagesRetirees : [], nouvelles);
    await store.enregistrerTour(slug, id, { sessionId, question: affiche, reponse: texte, details: choix && { choix }, etatLecon: { ...etatLecon, imagesRetirees }, cout: cout && { ...cout, relais: neuve } });
    relancerPropositions(slug);
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
// `varier` (« D'autres idées » seulement) : l'agent reçoit l'historique des titres déjà proposés pour s'en écarter.
function genererPropositions(slug, anciennes = [], { varier = false } = {}) {
  if (propositionsEnCours.has(slug)) return;
  propositionsEnCours.set(slug, anciennes);
  (async () => {
    const profil = await store.lireEleve(slug);
    const lecons = await store.listerLecons(slug);
    const dejaProposes = varier ? await store.lireHistoriquePropositions(slug) : [];
    const { cout } = await lancerAgent({
      cwd: await store.preparerPropositionsDir(slug),
      prompt: `Prépare ${profil.nombrePropositions} Propositions de nouvelles Leçons pour cet élève.`,
      consignes: consignesPropositions(profil, lecons, dejaProposes),
      modele: profil.modele,
      tache: 'propositions',
      teach: false,
    });
    await store.enregistrerCoutPropositions(slug, cout);
  })()
    .catch((e) => console.error(`Propositions de ${slug} : ${e.message}`))
    .then(async () => {
      // Un lot validé et nouveau, que l'Élève va voir, rejoint l'historique, même si l'agent a échoué après l'avoir écrit.
      // Un lot raté (restauré) ou laissé tel quel n'y entre pas.
      const lot = await store.lirePropositions(slug);
      if (!lot) {
        if (anciennes.length) await store.ecrirePropositions(slug, anciennes);
        return;
      }
      const titres = lot.map((p) => p.titre);
      if (titres.join('\n') !== anciennes.map((p) => p.titre).join('\n')) await store.ajouterHistoriquePropositions(slug, titres);
    })
    .catch((e) => console.error(`Propositions de ${slug} : ${e.message}`))
    .finally(() => {
      propositionsEnCours.delete(slug);
      if (propositionsARelancer.delete(slug)) relancerPropositions(slug);
    });
}

async function lirePropositions(slug) {
  if (propositionsEnCours.has(slug)) return { etat: 'en préparation', propositions: propositionsEnCours.get(slug) };
  const propositions = await store.lirePropositions(slug);
  return propositions ? { etat: 'prêtes', propositions } : { etat: 'indisponibles', propositions: [] };
}

// Après chaque tour de séance : Propositions mises à jour d'après les Leçons, sans retarder la réponse à l'élève.
// Si une génération est déjà en cours, elle a lu les Leçons avant ce tour : on en relance une seule après elle.
function relancerPropositions(slug) {
  if (propositionsEnCours.has(slug)) {
    propositionsARelancer.add(slug);
    return;
  }
  store.lirePropositions(slug)
    .then((anciennes) => genererPropositions(slug, anciennes ?? []))
    .catch((e) => console.error(`Propositions de ${slug} : ${e.message}`));
}

// « D'autres idées » : relance la génération sans l'attendre, jamais deux à la fois pour un même Élève.
async function regenererPropositions(slug) {
  const anciennes = await store.lirePropositions(slug); // 404 si l'Élève n'existe pas
  if (propositionsEnCours.has(slug)) throw new HttpError(409, 'Des idées sont déjà en préparation');
  genererPropositions(slug, anciennes ?? [], { varier: true });
  return lirePropositions(slug);
}

async function nouvelleRevision(slug, { fichiers, dateControle, cadrage: brut }) {
  const cadrage = validerCadrage(brut, 'revision');
  const lecon = await store.creerLecon(slug, { sujet: 'Révision', mode: 'revision', cadrage });
  const noms = await store.enregistrerSources(slug, lecon.id, fichiers);
  const controle = typeof dateControle === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateControle) ? dateControle : null;
  const prompt = [
    `Leçon de révision. L'élève a fourni sa leçon scolaire : ${noms.map((n) => `sources/${n}`).join(', ')} (scan ou photo, parfois manuscrite).`,
    `La mission est déjà fixée, ne la demande pas : réviser cette leçon et être évalué sur son contenu${controle ? `, pour un contrôle le ${controle} (organise la révision espacée jusqu'à cette date)` : ''}.`,
    `Lis le document. Après le Pré-test viendra une révision fidèle au document (seul le Dépassement va au-delà, signalé comme hors document), avec un quiz d'évaluation. Si un passage est illisible, laisse-le de côté et signale-le dans la page.`,
    consignePremierTour('revision', cadrage),
  ].join('\n');
  const affiche = `📄 Voici ma leçon à réviser${controle ? ` (contrôle le ${new Date(controle).toLocaleDateString('fr-BE')})` : ''}.`;
  return tourDeParole({ slug, id: lecon.id, prompt: promptCadrage(prompt, cadrage), affiche, premier: true });
}

// Fin de quiz : Retour de quiz instantané (ADR 0002), composé par l'appli sans tour du prof ; il porte l'action que
// l'appli propose ensuite. Le score lui-même s'enregistre par /scores. Un Défi réussi termine la Leçon de révision
// (date de fin posée une seule fois, jamais retirée) ; dans tous les cas, le Défi en cours prend fin avec ce Retour de
// quiz, et un Défi réussi met aussi fin à la phase Réviser.
// Le résultat bonus du Dépassement (hors score) n'entre pas dans l'action : le Retour le salue seulement.
// Avec des résultats par question (Kit), le score et le bonus en sont tirés, comme pour le score enregistré.
// Pré-test (`pretest: true`) : hors Étoiles et hors Rebond ordinaire, l'appli propose seulement « Commencer » (tant que
// la Leçon n'a aucun vrai score), et le Retour montre l'écart avec « Tu en sais déjà… ».
async function retourQuiz(slug, id, { score, bonus, questions, pretest }) {
  const { score: arrondi, bonus: resultatBonus, questions: resultats } = resultatQuiz({ score, bonus, questions });
  // Lecture puis écriture de l'état : la Leçon est occupée le temps du Retour, comme pendant un tour du prof.
  if (enCours.has(id)) throw new HttpError(409, "L'agent est déjà en train de répondre");
  enCours.add(id);
  try {
    const { mode, defiEnCours, reviserEnCours, terminee, scores, scoresCommentes, cadrage } = await store.lireLecon(slug, id);
    if (pretest === true) {
      // Pré-test refait en cours de Leçon (après un vrai score) : toujours hors score, mais sans « Commencer », et le
      // Défi en cours continue.
      const debut = horsPretest(scores).length === 0;
      await store.enregistrerTour(slug, id, {
        question: '🔮 Pré-test terminé',
        reponse: texteRetourPretest(ecartPretest({ deja: cadrage?.deja, ...compterJustes(resultats) })),
        details: { retourQuiz: { score: arrondi, ...(debut && { action: 'commencer' }), pretest: true } },
        etatLecon: { ...(debut && { defiEnCours: false }), scoresCommentes: scores.length },
      });
      return await store.lireLecon(slug, id);
    }
    const action = actionRetourQuiz(arrondi, mode, defiEnCours, reviserEnCours);
    const termineeApres = action === 'terminee' ? terminee ?? new Date().toISOString() : terminee;
    const etoiles = etoilesGagnees({ scores, dejaComptes: scoresCommentes, terminee, termineeApres, mode });
    const retour = {
      score: arrondi, action, ...(resultatBonus && { bonus: resultatBonus }), ...(etoiles.length && { nouvellesEtoiles: etoiles }),
    };
    await store.enregistrerTour(slug, id, {
      question: `📝 Quiz terminé : ${retour.score} %`,
      reponse: texteRetourQuiz({ ...retour, questions: resultats, rang: scores.length }),
      details: { retourQuiz: retour },
      etatLecon: {
        defiEnCours: false,
        scoresCommentes: scores.length,
        ...(defiEnCours && arrondi >= QUIZ_REUSSI && { reviserEnCours: false }),
        ...(action === 'terminee' && { terminee: termineeApres }),
      },
    });
    return await store.lireLecon(slug, id);
  } finally {
    enCours.delete(id);
  }
}

// Choix d'un Rebond : une action fermée, parmi les Rebonds proposés par la Leçon lue, dont le serveur tire la
// consigne du prof et la phrase de l'Élève. Choisir le Défi le met en cours jusqu'au Retour de quiz suivant ;
// choisir Réviser ouvre la phase Réviser jusqu'au Défi réussi.
const ETAT_APRES_REBOND = { defi: { defiEnCours: true }, reviser: { reviserEnCours: true } };

async function rebond(slug, id, { action }) {
  if (typeof action !== 'string' || !Object.hasOwn(REBONDS, action)) throw new HttpError(400, 'Rebond inconnu');
  const lecon = await store.lireLecon(slug, id);
  if (!lecon.rebondsProposes.includes(action)) throw new HttpError(400, "Ce Rebond n'est pas proposé");
  return tourDeParole({ slug, id, prompt: consigneRebond(action, lecon), affiche: REBONDS[action].phrase, premier: false, tache: 'rebond', resultatsQuiz: false, etatLecon: ETAT_APRES_REBOND[action] });
}

// Une Proposition n'est ni bornée ni cadrée comme un sujet libre : elle vient de l'agent, pas de l'Élève.
async function nouvelleDepuisProposition(slug, titre, brut) {
  const cadrage = validerCadrage(brut, 'libre');
  const proposition = (await store.lirePropositions(slug))?.find((p) => p.titre === titre);
  if (!proposition) throw new HttpError(400, "Cette idée n'est plus proposée");
  const lecon = await store.creerLecon(slug, { sujet: proposition.titre, mode: 'libre', cadrage });
  const prompt = `${promptCadrage(proposition.titre, cadrage)}\n${consignePremierTour('libre', cadrage)}`;
  return tourDeParole({ slug, id: lecon.id, prompt, affiche: proposition.titre, premier: true });
}

async function api(req, res, segments) {
  const [r1, slug, r2, id, r3] = segments;
  const m = req.method;
  if (r1 === 'config' && m === 'GET') return json(res, 200, { niveaux: NIVEAUX, categories: CATEGORIES, nombrePropositionsDefaut: NOMBRE_PROPOSITIONS_DEFAUT, modeles: MODELES, modeleDefaut: MODELE_DEFAUT, cadrage: QUESTIONS_CADRAGE, questionsCadrage: { libre: questionsDuMode('libre'), revision: questionsDuMode('revision') }, sujetMax: SUJET_MAX });
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
  } else if (r2 === 'couts' && !id) {
    if (m === 'GET') return json(res, 200, await store.lireCouts(slug));
  } else if (r2 === 'propositions' && !id) {
    if (m === 'GET') return json(res, 200, await lirePropositions(slug));
    if (m === 'POST') return json(res, 202, await regenererPropositions(slug));
  } else if (r2 === 'lecons') {
    if (!id) {
      if (m === 'GET') return json(res, 200, await store.listerLecons(slug, { maintenant: maintenantDe(req.headers) }));
      if (m === 'POST') {
        const corps = await lireCorps(req, 40_000_000);
        if (corps.fichiers) return json(res, 201, await nouvelleRevision(slug, corps));
        if (corps.proposition !== undefined) return json(res, 201, await nouvelleDepuisProposition(slug, corps.proposition, corps.cadrage));
        const sujet = typeof corps.sujet === 'string' ? corps.sujet.trim() : '';
        if (!sujet) throw new HttpError(400, 'Dis-moi ce que tu veux apprendre');
        if (sujet.length > SUJET_MAX) throw new HttpError(400, `Ton sujet est trop long (${SUJET_MAX} caractères au plus)`);
        const cadrage = validerCadrage(corps.cadrage, 'libre');
        const lecon = await store.creerLecon(slug, { sujet, mode: 'libre', cadrage });
        const prompt = `${promptCadrage(promptDemarrageLibre(sujet), cadrage)}\n${consignePremierTour('libre', cadrage)}`;
        return json(res, 201, await tourDeParole({ slug, id: lecon.id, prompt, affiche: sujet, premier: true }));
      }
    } else if (!r3) {
      if (m === 'GET') return json(res, 200, await store.lireLecon(slug, id, { maintenant: maintenantDe(req.headers) }));
    } else if (r3 === 'scores' && m === 'POST') {
      return json(res, 201, await store.enregistrerScore(slug, id, await lireCorps(req), { maintenant: maintenantDe(req.headers) }));
    } else if (r3 === 'retours' && m === 'POST') {
      return json(res, 200, await retourQuiz(slug, id, await lireCorps(req)));
    } else if (r3 === 'rebonds' && m === 'POST') {
      return json(res, 200, await rebond(slug, id, await lireCorps(req)));
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

serveur.listen(PORT, HOST, () => console.log(messageDemarrage({ host: HOST, port: PORT })));
