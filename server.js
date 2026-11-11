import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, HttpError, NIVEAUX, CATEGORIES, NOMBRE_PROPOSITIONS_DEFAUT, MODELES, MODELE_DEFAUT, QUIZ_REUSSI, etoilesGagnees, fuseesGagnees, horsPretest } from './lib/store.js';
import { resultatQuiz } from './lib/resultats.js';
import { consigneDifficulte } from './lib/difficulte.js';
import { lancerAgent, consignesLecon, consignesPropositions, consignesVariantes, extraireChoix, actionRetourQuiz, promptDemarrageLibre, consigneRebond, consigneDernierQuiz, consignePremierTour, consigneImagesRetirees, consigneQuestionsIgnorees, consigneSchemasAReprendre, consigneLongueursAReprendre, consigneQuestionsFragiles, consigneQuestionsSignalees, questionsASignaler, consignePreparation, REBONDS, preambuleRelais, resumeScore, RELAIS } from './lib/agent.js';
import { messageDemarrage } from './lib/demarrage.js';
import { texteRetourQuiz, texteRetourPretest, phraseBadges } from './lib/retour.js';
import { ecartPretest } from './lib/pretest.js';
import { compterJustes } from './public/kit/v1/quiz-logique.js';
import { avecAdressesDImages, adresseDImageServie } from './public/kit/v1/figure-logique.js';
import { validerCadrage, promptCadrage, QUESTIONS_CADRAGE, QUESTIONS_AVEC_SUJET, questionsDuMode } from './lib/cadrage.js';
import { rapatrierImages, imagesASignaler } from './lib/images.js';
import { maintenantDe } from './lib/horloge.js';
import { revisionsDuJour } from './lib/revisions.js';
import { joursDeRevisionTerminee, etoileDuJour } from './lib/revision-du-jour.js';
import { vueParent } from './lib/parent.js';
import { indicateurs, periodeDesIndicateurs, joursDesEvenements } from './lib/indicateurs.js';
import { activiteParJour, joursTravailles, meilleureSerie, objectifDuJour, reparationDeSerie, serieDeJours, recapitulatifSemaine, reponsesDeRevision } from './lib/rythme.js';
import { VARIANTES_PAR_QUESTION } from './lib/variantes.js';
import { jourValide, minuitDu, jourLocal, jourDe } from './lib/jour.js';
import { pagePrevue, preparationUtilisable, bilanPreparations } from './lib/preparation.js';
import { fusionnerCartes, ajouterCoutCarte, retournerCarte, reglerSon, reprendreCompositions, vueCartes, prochaineAComposer, commencerComposition, terminerComposition, echouerComposition, generiquesEpuisees } from './lib/cartes.js';
import { consignesCarte, promptCarte } from './lib/carte-agent.js';
import { lireCalques } from './lib/carte-svg.js';
import { calculerBadges, fusionnerBadges, vueMesBadges, marquerVu, paliersObtenus, niveauxFranchis } from './lib/badges.js';
import { calendrier } from './lib/calendrier.js';
import { MOMENTS, validerMoment, validerHeures, heuresDe, fichierIcal } from './lib/moment.js';
import { totauxRecompenses } from './lib/recompenses.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const ELEVES = process.env.ELEVES_DIR || path.join(ROOT, 'eleves');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const store = createStore(ELEVES);
const SUJET_MAX = 80; // sujet libre, après trim

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2' };
const EXTENSIONS_IMAGE = ['.jpg', '.jpeg', '.png', '.webp']; // Documents source qui sont des photos (le reste : PDF)
const enCours = new Set(); // Leçons (cleLecon) dont l'agent travaille : un seul agent par Leçon à la fois
const propositionsEnCours = new Map(); // élève → Propositions précédentes, pendant que les nouvelles se préparent : un seul tour à la fois
const propositionsARelancer = new Set(); // élèves dont une séance a avancé pendant la génération : une relance à la fin
const variantesEnCours = new Set(); // élèves dont un tour de Variantes travaille : un seul à la fois par Élève
const variantesARelancer = new Map(); // élève → Leçons dont des Questions ont pu devenir à varier pendant ce tour
const cartesEnCours = new Set(); // élèves dont une composition de carte travaille : une seule à la fois par Élève
const preparations = new Map(); // cleLecon → page préparée pendant le quiz (#74) : { prevision, fin }, une seule par Leçon
const PREPARATION = process.env.CARTABLE_PREPARATION !== '0'; // CARTABLE_PREPARATION=0 coupe les pages préparées

// Clé d'une Leçon dans les verrous et les pages préparées : deux Élèves peuvent avoir une Leçon du même identifiant.
const cleLecon = (slug, id) => `${slug}/${id}`;

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

// Indicateurs (#78) : un événement daté de l'Élève, enregistré sans jamais faire échouer la requête qui l'a produit.
const noterEvenement = (slug, evenement) =>
  store.enregistrerEvenement(slug, evenement).catch((e) => console.error(`Événement de ${slug} : ${e.message}`));

// Période des indicateurs lue dans la requête (?du=AAAA-MM-JJ&au=AAAA-MM-JJ, bornes comprises), complétée par la
// période par défaut (lib/indicateurs.js). 400 pour une date invalide ou une période à l'envers.
function periodeDe(url, maintenant) {
  const [du, au] = ['du', 'au'].map((cle) => url.searchParams.get(cle) ?? undefined);
  const periode = periodeDesIndicateurs(maintenant, { du, au });
  if (!jourValide(periode.du) || !jourValide(periode.au) || periode.du > periode.au) throw new HttpError(400, 'Période invalide');
  return periode;
}

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
    lignes.push(...consigneDifficulte(lecon.scores));
  }
  lignes.push(...consigneQuestionsFragiles(lecon.questions));
  lignes.push(...consigneQuestionsSignalees(lecon.questions));
  lignes.push(...consigneImagesRetirees(lecon.imagesRetirees));
  lignes.push(...consigneQuestionsIgnorees(lecon.questionsIgnorees));
  lignes.push(...consigneSchemasAReprendre(lecon.schemasAReprendre));
  lignes.push(...consigneLongueursAReprendre(lecon.longueursAReprendre));
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
// Le tour attend d'abord la page préparée en cours, s'il y en a une, et l'écarte : un seul agent par Leçon à la fois.
// Puis la page qu'il laisse affichée fait préparer la suivante (voir preparerPageSuivante).
// `tour.maintenant` : l'horloge de la requête (lib/horloge.js), qui date l'attente de l'Élève.
async function tourDeParole(tour) {
  const lecon = await occuper(tour.slug, tour.id, () => chronometrer(tour.slug, tour.id, tour.maintenant, async () => {
    await ecarterPreparation(tour.slug, tour.id, await prendrePreparation(tour.slug, tour.id));
    return tourDuProf(tour);
  }));
  preparerPageSuivante(tour.slug, tour.id);
  return lecon;
}

// La Leçon `id` de l'Élève `slug` est occupée le temps de `operation()` (tour du prof, Retour de quiz) : une seule
// opération à la fois.
async function occuper(slug, id, operation) {
  const cle = cleLecon(slug, id);
  if (enCours.has(cle)) throw new HttpError(409, "L'agent est déjà en train de répondre");
  enCours.add(cle);
  try {
    return await operation();
  } finally {
    enCours.delete(cle);
    composerCartes(slug); // la Séance est finie : les cartes en attente peuvent se composer
  }
}

// Cartes de ligne (#184) : la composition d'une carte « à composer » par l'agent (type de tâche « carte »), en
// arrière-plan : l'Élève ne l'attend jamais. Une seule composition à la fois par Élève, et seulement quand aucune tâche
// de Séance (tour du prof, page préparée) ne travaille pour cet Élève ; une Séance qui commence pendant une composition
// ne l'interrompt pas, la suivante attend. Appelée quand une carte est enregistrée, à la fin d'une tâche de Séance et au
// démarrage du serveur.
const seanceEnCours = (slug) => [...enCours].some((cle) => cle.startsWith(`${slug}/`)) || [...preparations].some(([cle, p]) => p.travaille && cle.startsWith(`${slug}/`));

function composerCartes(slug) {
  if (cartesEnCours.has(slug)) return;
  cartesEnCours.add(slug);
  (async () => {
    while (!seanceEnCours(slug)) {
      const carte = await store.modifierCartes(slug, (avant) => {
        if (!avant) return [avant, null];
        const f = generiquesEpuisees(avant, Date.now());
        const id = prochaineAComposer(f);
        return [id ? commencerComposition(f, id) : f, id && f.cartes[id]];
      });
      if (!carte) break;
      await composerUneCarte(slug, carte);
    }
  })()
    .catch((e) => console.error(`Cartes de ${slug} : ${e.message}`))
    .finally(() => cartesEnCours.delete(slug));
}

// Une tentative de composition : la réponse de l'agent est lue et filtrée (lib/carte-svg.js) ; un SVG refusé, une
// réponse illisible ou une panne est un échec de la tentative. Le Coût du tour, réussi ou non, est rattaché à la Leçon.
async function composerUneCarte(slug, carte) {
  let calques = null;
  const couts = []; // gardés aussi sur la carte : ils survivent à la suppression de la Leçon
  try {
    const [titres, cwd] = await Promise.all([store.titresObjectifs(slug, carte.lecon), store.preparerDossierCarte(slug)]);
    const { reponse, cout } = await lancerAgent({ cwd, prompt: promptCarte(carte, titres), consignes: consignesCarte(), tache: 'carte', teach: false });
    await store.ajouterCoutLecon(slug, carte.lecon, cout).catch(() => {});
    couts.push(cout);
    const lu = lireCalques(reponse, carte.lecon);
    if (lu.ok) calques = lu.calques;
    else console.error(`Carte de ${slug}/${carte.lecon} : calque refusé (${lu.erreurs.slice(0, 3).join(' ; ')})`);
  } catch (e) {
    console.error(`Carte de ${slug}/${carte.lecon} : ${e.message}`);
    if (e.cout) {
      await store.ajouterCoutLecon(slug, carte.lecon, e.cout).catch(() => {});
      couts.push(e.cout);
    }
  }
  await store.viderDossierCarte(slug).catch(() => {});
  await store.modifierCartes(slug, (avant) => {
    const composee = calques ? terminerComposition(avant, carte.lecon, calques, Date.now()) : echouerComposition(avant, carte.lecon, Date.now());
    return [couts.reduce((f, cout) => ajouterCoutCarte(f, carte.lecon, cout), composee), null];
  });
}

// Attente de l'Élève (#78) le temps de `operation()` (tour du prof, ou page préparée attendue puis retenue), notée en
// événement `tour`. Datée par l'horloge de la requête `maintenant` (ms), comme les autres événements ; sa durée est
// celle, réelle, de `operation()`. La préparation en arrière-plan, que l'Élève n'attend pas, n'en est pas une.
async function chronometrer(slug, id, maintenant, operation) {
  const depuis = Date.now();
  try {
    return await operation();
  } finally {
    const [debut, fin] = [maintenant, maintenant + Date.now() - depuis].map((ms) => new Date(ms).toISOString());
    await noterEvenement(slug, { type: 'tour', lecon: id, debut, fin });
  }
}

async function tourDuProf({ slug, id, prompt, affiche = prompt, premier, etatLecon, tache, resultatsQuiz = true, maintenant, rebond }) {
  try {
    const profil = await store.lireEleve(slug);
    const lecon = await store.lireLecon(slug, id);
    // Session neuve dès que la Leçon a sa première page : le prof relance le skill teach et reçoit le préambule de relais.
    const neuve = RELAIS && lecon.pages.length > 0;
    const pagesAvant = await store.instantanePages(slug, id);
    const { reponse, sessionId, cout } = await lancerAgent({
      cwd: store.leconDir(slug, id),
      prompt: premier ? `/mattpocock-skills:teach ${prompt}` : neuve ? `/mattpocock-skills:teach ${preambuleRelais(lecon, { resultatsQuiz })}\n\n${prompt}` : preambule(prompt, lecon, { resultatsQuiz }),
      sessionId: neuve ? null : lecon.sessionId,
      consignes: consignesLecon(profil),
      modele: profil.modele,
      tache: tache ?? (lecon.pages.length ? 'page' : 'premiereSeance'),
    });
    // Les Questions signalées que ce tour a données au prof (#146) ne lui seront plus données.
    if (!premier) await store.signalementsTransmis(slug, id, questionsASignaler(lecon.questions).map((q) => `${q.page}#${q.id}`)).catch((e) => console.error(`Signalements de ${id} : ${e.message}`));
    return await conclureTour({ slug, id, lecon, premier, pagesAvant, affiche, etatLecon, reponse, sessionId, cout: cout && { ...cout, relais: neuve }, maintenant, rebond });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.error(`Prof de ${slug}/${id} : ${e.message}`);
    throw new HttpError(502, /limit/i.test(e.message) ? "Claude est fatigué pour l'instant, réessaie plus tard." : e.message);
  }
}

// Fin d'un tour du prof, dont les fichiers sont déjà dans la Leçon (`pagesAvant` : ses pages avant le tour) : images,
// questions ignorées, schémas à reprendre, réponse et coût enregistrés. Sert aussi à la page préparée retenue.
// Une Leçon libre qui avait des Objectifs et en a davantage après le tour a été élargie (le prof a ajouté des Objectifs
// à sa mission) : événement `mission-elargie` daté de `maintenant`, pour le badge surprise « Mission élargie » (#97).
// L'Élève accepte d'élargir par une Réponse proposée libre du prof (voir lib/agent.js), pas par une action de l'appli :
// c'est donc l'ajout d'Objectifs, constaté après le tour, qui marque l'élargissement.
async function conclureTour({ slug, id, lecon, premier, pagesAvant, affiche, etatLecon, reponse, sessionId, cout, maintenant, rebond = 'nouvelle' }) {
  const { texte, choix } = extraireChoix(reponse);
  // Images déclarées par le prof rapatriées dans la Leçon ; celles retirées sont signalées au tour suivant (une fois).
  // Celles d'avant ce tour restent à signaler tant que son prompt ne les a pas portées (premier tour : pas de préambule).
  const nouvelles = await rapatrierImages(store.leconDir(slug, id)).catch((e) => {
    console.error(`Images de ${id} : ${e.message}`);
    return [];
  });
  const imagesRetirees = imagesASignaler(premier ? lecon.imagesRetirees : [], nouvelles);
  // Questions de quiz ignorées par le Kit dans les pages écrites par ce tour (spec #48) : signalées au tour suivant,
  // une fois, comme les images retirées.
  const ignorees = await store.questionsIgnoreesDepuis(slug, id, pagesAvant).catch((e) => {
    console.error(`Quiz de ${id} : ${e.message}`);
    return [];
  });
  const questionsIgnorees = [...(premier ? lecon.questionsIgnorees : []), ...ignorees];
  // Schémas SVG mal lisibles des pages écrites par ce tour (ticket #134) : signalés de même, la page n'est pas touchée.
  const schemas = await store.schemasAReprendreDepuis(slug, id, pagesAvant).catch((e) => {
    console.error(`Schémas de ${id} : ${e.message}`);
    return [];
  });
  const schemasAReprendre = [...(premier ? lecon.schemasAReprendre : []), ...schemas];
  // Pages et parties trop longues des pages écrites par ce tour (ticket #156) : signalées de même, page intacte.
  const longueurs = await store.longueursAReprendreDepuis(slug, id, pagesAvant).catch((e) => {
    console.error(`Longueur des pages de ${id} : ${e.message}`);
    return [];
  });
  const longueursAReprendre = [...(premier ? lecon.longueursAReprendre : []), ...longueurs];
  // Rebond qui a fait créer les pages de ce tour (#147) : « nouvelle » sauf Revoir, Défi et Réviser.
  const pages = await store.pagesEcritesDepuis(slug, id, pagesAvant).catch(() => []);
  await store.enregistrerTour(slug, id, { sessionId, question: affiche, reponse: texte, details: choix && { choix }, etatLecon: { ...etatLecon, imagesRetirees, questionsIgnorees, schemasAReprendre, longueursAReprendre }, cout, pagesRebond: { pages, rebond } });
  relancerPropositions(slug);
  const apres = await store.lireLecon(slug, id);
  if (apres.mode === 'libre' && lecon.objectifs.length > 0 && apres.objectifs.length > lecon.objectifs.length) {
    await noterEvenement(slug, { type: 'mission-elargie', date: new Date(maintenant).toISOString(), lecon: id });
  }
  return apres;
}

// Page suivante préparée pendant le quiz (#74) : quand un tour laisse une Page de leçon affichée, un seul tour du prof
// en arrière-plan prépare la page du Rebond le plus probable (lib/preparation.js), dans un dossier à part. Sans page
// préparée pendant le quiz, son Retour en fait préparer une, qui reçoit alors les résultats du quiz. Jamais en
// même temps qu'un autre tour de la Leçon : il ne démarre pas si la Leçon est occupée, et tout tour suivant l'attend.
// Coupée sans relais (la session du prof ne se reprend pas ailleurs que dans la Leçon), par CARTABLE_PREPARATION=0,
// par le Profil ou quand trop de pages préparées restent inutilisées.
function preparerPageSuivante(slug, id) {
  (async () => {
    const cle = cleLecon(slug, id);
    if (enCours.has(cle) || preparations.has(cle)) return;
    const profil = await store.lireEleve(slug);
    const { active, suspendue } = await etatPreparations(slug, profil);
    if (!active || suspendue) return;
    const lecon = await store.lireLecon(slug, id);
    const prevision = pagePrevue(lecon, await store.quizDeLaPage(slug, id, lecon.pages.at(-1)));
    if (!prevision || enCours.has(cle) || preparations.has(cle)) return;
    const fin = (async () => {
      const cwd = await store.preparerDossierPreparation(slug, id);
      const { reponse, sessionId, cout } = await lancerAgent({
        cwd,
        prompt: `/mattpocock-skills:teach ${preambuleRelais(lecon, { resultatsQuiz: false, signalements: false })}\n\n${consignePreparation(prevision, lecon)}`,
        consignes: consignesLecon(profil),
        modele: profil.modele,
        tache: 'rebond',
      });
      return { reponse, sessionId, cout: cout && { ...cout, relais: true, preparee: true } };
    })().catch(async (e) => {
      // Préparation ratée : écartée, mais son coût, s'il est connu, compte avec la Leçon.
      console.error(`Page préparée de ${id} : ${e.message}`);
      await store.ecarterPreparation(slug, id).catch(() => {});
      if (e.cout) await store.ajouterCoutLecon(slug, id, { ...e.cout, relais: true, preparee: true, inutilisee: true }).catch(() => {});
      return null;
    });
    const preparation = { prevision, fin, travaille: true };
    preparations.set(cle, preparation);
    fin.finally(() => {
      preparation.travaille = false; // finie, même si la page attend encore l'Élève : la file des cartes peut reprendre
      composerCartes(slug);
    });
  })().catch((e) => console.error(`Page préparée de ${id} : ${e.message}`));
}

// Pages préparées de l'Élève : `active` (ni coupée par CARTABLE_PREPARATION=0 ou par le Profil, ni sans relais), et le
// bilan de leurs issues (taux d'inutilisation, suspension, voir lib/preparation.js).
async function etatPreparations(slug, profil) {
  return { active: RELAIS && PREPARATION && profil.preparerPages, ...bilanPreparations(await store.lirePreparations(slug)) };
}

// Page préparée de la Leçon, attendue si elle est en cours, et retirée : { prevision, reponse, sessionId, cout },
// ou null (aucune, ou tour raté).
async function prendrePreparation(slug, id) {
  const preparation = preparations.get(cleLecon(slug, id));
  if (!preparation) return null;
  const resultat = await preparation.fin;
  preparations.delete(cleLecon(slug, id));
  return resultat && { ...preparation, ...resultat };
}

// Page préparée inutilisée : écartée, son coût compté avec la Leçon, son issue notée.
async function ecarterPreparation(slug, id, preparation) {
  if (!preparation) return;
  await store.ecarterPreparation(slug, id);
  if (preparation.cout) await store.ajouterCoutLecon(slug, id, { ...preparation.cout, inutilisee: true });
  await store.noterPreparation(slug, { lecon: id, action: preparation.prevision.action, utilisee: false });
}

// Page préparée retenue pour le Rebond `action` : elle devient la Page de leçon, sans nouveau tour.
async function adopterPreparation(slug, id, preparation, action, maintenant) {
  const lecon = await store.lireLecon(slug, id);
  const pagesAvant = await store.instantanePages(slug, id);
  await store.adopterPreparation(slug, id);
  await store.noterPreparation(slug, { lecon: id, action, utilisee: true });
  const { reponse, sessionId, cout } = preparation;
  return conclureTour({ slug, id, lecon, premier: false, pagesAvant, affiche: REBONDS[action].phrase, etatLecon: ETAT_APRES_REBOND[action], reponse, sessionId, cout, maintenant, rebond: REBOND_DE_PAGE[action] });
}

// Suppression définitive d'une Leçon archivée (#203). La Leçon est occupée le temps de la suppression (un tour du prof ou
// un Retour de quiz en cours : 409) ; la page préparée en cours est attendue puis effacée avec elle, et les tâches de
// fond (Variantes, composition de carte) qui finissent après coup ne recréent rien (voir store.supprimerLecon).
async function supprimerLecon(slug, id) {
  const { archivee } = await store.lireLecon(slug, id); // 404 si absente
  if (!archivee) throw new HttpError(409, "Cette leçon n'est pas rangée : on ne peut pas la supprimer");
  await occuper(slug, id, async () => {
    await prendrePreparation(slug, id);
    await store.supprimerLecon(slug, id);
  });
  variantesARelancer.get(slug)?.delete(id);
  return { supprimee: id };
}

// Tour d'agent hors Leçon, en arrière-plan : on ne l'attend pas. Pendant ce tour, on sert les `anciennes` Propositions
// (l'agent réécrit le fichier sur place) ; s'il échoue sans laisser de Propositions utilisables, on les remet.
// `varier` (« D'autres idées » seulement) : l'agent reçoit l'historique des titres déjà proposés pour s'en écarter.
function genererPropositions(slug, anciennes = [], { varier = false } = {}) {
  if (propositionsEnCours.has(slug)) return;
  propositionsEnCours.set(slug, anciennes);
  (async () => {
    const profil = await store.lireEleve(slug);
    const lecons = await store.listerLecons(slug, { archivees: 'avec' }); // une Leçon rangée n'est pas reproposée (#203)
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

// Variantes des Questions (#69) : après une réponse à une Question (quiz de page ou Révision du jour), un tour du prof
// en arrière-plan, que l'Élève n'attend jamais, écrit des Variantes pour les Questions de la Leçon à varier (voir
// lib/variantes.js). Un seul tour à la fois par Élève : une Leçon arrivée pendant ce tour est reprise juste après.
function varierQuestions(slug, id) {
  if (variantesEnCours.has(slug)) {
    variantesARelancer.set(slug, new Set([...(variantesARelancer.get(slug) ?? []), id]));
    return;
  }
  variantesEnCours.add(slug);
  (async () => {
    const cles = await store.demanderVariantes(slug, id);
    if (!cles.length) return;
    try {
      const profil = await store.lireEleve(slug);
      const { cout } = await lancerAgent({
        cwd: store.variantesDir(slug, id),
        prompt: `Écris ${VARIANTES_PAR_QUESTION} variantes pour chacune des ${cles.length} questions de questions-a-varier.json.`,
        consignes: consignesVariantes(profil), // le Profil pour présenter l'Élève (âge, niveau)
        tache: 'variantes', // Modèle fixé par la tâche, pas par le Profil (ADR 0005)
        teach: false,
      });
      await store.enregistrerCoutVariantes(slug, cout);
    } catch (e) {
      console.error(`Variantes de ${slug}/${id} : ${e.message}`);
    } finally {
      await store.rattacherVariantes(slug, id, cles);
    }
  })()
    .catch((e) => console.error(`Variantes de ${slug}/${id} : ${e.message}`))
    .finally(() => {
      variantesEnCours.delete(slug);
      // La Leçon de ce tour n'est pas reprise tout de suite (un tour raté n'est pas retenté sans nouvelle réponse).
      const suivantes = [...(variantesARelancer.get(slug) ?? [])].filter((lecon) => lecon !== id);
      variantesARelancer.delete(slug);
      for (const lecon of suivantes) varierQuestions(slug, lecon);
    });
}

// Images d'une Question servie hors de sa Page de leçon (Révisions du jour) : son image (US25) et celles de la copie
// de sa figure (#126). Leur adresse relative à la page (`../images/<fichier>`, voir lib/banque.js) devient celle du
// fichier de la Leçon servi sous /fichiers, encodée, et telle que la liste blanche de la figure l'accepte.
const avecAdresseDImage = (slug, q) => {
  const adresse = (src) => adresseDImageServie(slug, q.lecon, src);
  return {
    ...q,
    ...(q.image && { image: { ...q.image, src: adresse(q.image.src) } }),
    ...(q.figure && { figure: avecAdressesDImages(q.figure, adresse) }),
  };
};

async function nouvelleRevision(slug, { fichiers, dateControle, cadrage: brut }, maintenant) {
  const cadrage = validerCadrage(brut, 'revision');
  // Date de contrôle (#68) : gardée dans la Leçon, c'est l'appli qui resserre les révisions jusqu'à elle (lib/memoire.js).
  const controle = jourValide(dateControle) ? dateControle : null;
  const lecon = await store.creerLecon(slug, { sujet: 'Révision', mode: 'revision', cadrage, dateControle: controle });
  const noms = await store.enregistrerSources(slug, lecon.id, fichiers);
  // Badge surprise « Cliché ! » (#221) : une Leçon créée à partir d'un Document source image (photo), pas d'un PDF seul.
  if (noms.some((n) => EXTENSIONS_IMAGE.includes(path.extname(n)))) {
    await noterEvenement(slug, { type: 'photo-lecon', date: new Date(maintenant).toISOString(), lecon: lecon.id });
  }
  const prompt = [
    `Leçon de révision. L'élève a fourni sa leçon scolaire : ${noms.map((n) => `sources/${n}`).join(', ')} (scan ou photo, parfois manuscrite).`,
    `La mission est déjà fixée, ne la demande pas : réviser cette leçon et être évalué sur son contenu${controle ? `, pour un contrôle le ${controle}` : ''}.`,
    `Lis le document. Après le Pré-test viendra une révision fidèle au document (seul le Dépassement va au-delà, signalé comme hors document), avec un quiz d'évaluation. Si un passage est illisible, laisse-le de côté et signale-le dans la page.`,
    consignePremierTour('revision', cadrage),
  ].join('\n');
  const affiche = `📄 Voici ma leçon à réviser${controle ? ` (contrôle le ${new Date(minuitDu(controle)).toLocaleDateString('fr-BE')})` : ''}.`;
  return tourDeParole({ slug, id: lecon.id, prompt: promptCadrage(prompt, cadrage), affiche, premier: true, maintenant });
}

// Fin de quiz : Retour de quiz instantané (ADR 0002), composé par l'appli sans tour du prof ; il porte l'action que
// l'appli propose ensuite. Le score lui-même s'enregistre par /scores. Un Défi réussi termine la Leçon de révision
// (date de fin posée une seule fois, jamais retirée) ; dans tous les cas, le Défi en cours prend fin avec ce Retour de
// quiz, et un Défi réussi met aussi fin à la phase Réviser.
// Le résultat bonus du Dépassement (hors score) n'entre pas dans l'action : le Retour le salue seulement.
// Avec des résultats par question (Kit), le score et le bonus en sont tirés, comme pour le score enregistré.
// Pré-test (`pretest: true`) : hors Étoiles et hors Rebond ordinaire, l'appli propose seulement « Commencer » (tant que
// la Leçon n'a aucun vrai score), et le Retour montre l'écart avec « Tu en sais déjà… ».
// Dans les deux cas, les Badges sont recalculés et le Retour annonce les Paliers que ce quiz a fait atteindre (#98),
// gardés dans ses détails (`nouveauxBadges`) : annoncés une seule fois. L'attribution d'office n'annonce rien.
async function retourQuiz(slug, id, { score, bonus, questions, pretest }, maintenant) {
  const { score: arrondi, bonus: resultatBonus, questions: resultats } = resultatQuiz({ score, bonus, questions });
  // Lecture puis écriture de l'état : la Leçon est occupée le temps du Retour, comme pendant un tour du prof.
  return occuper(slug, id, async () => {
    const { mode, defiEnCours, reviserEnCours, terminee, scores, scoresCommentes, cadrage } = await store.lireLecon(slug, id);
    const { nouveauxBadges, nouvellesCartesLigne } = await annoncerBadges(slug, maintenant);
    // `nouvellesCartesLigne` (#197) : de quoi proposer la carte de ligne gagnée, face cachée, sur l'écran du Retour.
    const badgesRetour = { ...(nouveauxBadges.length && { nouveauxBadges }), ...(nouvellesCartesLigne.length && { nouvellesCartesLigne }) };
    if (pretest === true) {
      // Pré-test refait en cours de Leçon (après un vrai score) : toujours hors score, mais sans « Commencer », et le
      // Défi en cours continue.
      const debut = horsPretest(scores).length === 0;
      await store.enregistrerTour(slug, id, {
        question: '🔮 Pré-test terminé',
        reponse: texteRetourPretest(ecartPretest({ deja: cadrage?.deja, ...compterJustes(resultats) }), nouveauxBadges),
        details: { retourQuiz: { score: arrondi, ...(debut && { action: 'commencer' }), pretest: true, ...badgesRetour } },
        etatLecon: { ...(debut && { defiEnCours: false }), scoresCommentes: scores.length },
      });
      return await store.lireLecon(slug, id);
    }
    const action = actionRetourQuiz(arrondi, mode, defiEnCours, reviserEnCours);
    const termineeApres = action === 'terminee' ? terminee ?? new Date().toISOString() : terminee;
    const etoiles = etoilesGagnees({ scores, dejaComptes: scoresCommentes, terminee, termineeApres, mode });
    const fusees = fuseesGagnees({ scores, dejaComptes: scoresCommentes, mode });
    const retour = {
      score: arrondi, action, ...(resultatBonus && { bonus: resultatBonus }), ...(etoiles.length && { nouvellesEtoiles: etoiles }),
      ...(fusees > 0 && { nouvellesFusees: fusees }), ...badgesRetour,
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
    return store.lireLecon(slug, id);
  });
}

// Badges (#95) : recalculés depuis tout l'historique de l'Élève à `maintenant`, puis fusionnés avec son fichier de Badges
// (lib/badges.js), sans jamais en retirer. Renvoie { nouveaux, fichier, calcul, totaux, lecons, evenements } ;
// `nouveaux` : Paliers gagnés par ce recalcul, [{ id, palier, jour }] (aucun au premier calcul, qui attribue d'office
// l'historique) ; `nouvellesLignes` : Leçons dont la carte de ligne vient d'être enregistrée (#197) ; `totaux` : total d'Étoiles et de Fusées de l'Élève (#96) ; `lecons`, `evenements` : l'historique lu.
async function recalculerBadges(slug, maintenant) {
  const [lecons, evenements, cartesAvant] = await Promise.all([store.leconsLues(slug, { maintenant }), store.lireEvenements(slug), store.lireCartes(slug)]);
  const calcul = calculerBadges({ lecons, evenements, maintenant, cartes: cartesAvant }); // cartes : pour 🚉 Terminus (#220)
  const { fichier, nouveaux } = await store.modifierBadges(slug, (avant) => {
    const fusion = fusionnerBadges(avant, calcul, maintenant);
    return [fusion.fichier, fusion];
  });
  // Cartes de ligne (#183) : au même endroit, une Leçon devenue Acquise enregistre sa carte « à composer ».
  let nouvellesLignes = [];
  const cartes = await store.modifierCartes(slug, (avant) => {
    const fusion = fusionnerCartes(avant, { lecons, badges: fichier, maintenant });
    nouvellesLignes = fusion.nouvelles;
    return [fusion.fichier, fusion.fichier];
  });
  if (prochaineAComposer(cartes)) composerCartes(slug); // en arrière-plan : la réponse n'attend pas la composition
  return { nouveaux, nouvellesLignes, fichier, calcul, cartes, totaux: totauxRecompenses({ lecons, evenements, maintenant }), lecons, evenements };
}

// Niveaux 5 et 10 (#220) : une Leçon libre qui franchit l'un d'eux note un événement `niveau-atteint` (Leçon, niveau),
// une seule fois par Leçon et par niveau, pour les badges surprise 🏔️ Haut niveau et 🌋 Sommet. Les Objectifs ne sont
// pas datés : sans cet événement, rien ne dirait quand le niveau a été atteint. Appelé après chaque score.
async function noterNiveauxFranchis(slug, lecon, niveauAvant, maintenant) {
  if (lecon.mode !== 'libre') return;
  const franchis = niveauxFranchis(niveauAvant, lecon.niveauLecon, await store.lireEvenements(slug), lecon.id);
  for (const niveau of franchis) await noterEvenement(slug, { type: 'niveau-atteint', date: new Date(maintenant).toISOString(), lecon: lecon.id, niveau });
}

// Livraison des cartes (#183) : le premier calcul écarte les Leçons déjà Acquises, il doit donc précéder l'événement qui
// peut en faire une (le score d'un quiz) : sans cela, la Leçon qui devient Acquise au tout premier quiz serait écartée
// avec les anciennes. Appelée avant d'enregistrer un score ; sans effet une fois la livraison fixée. Les Badges ne sont
// ni écrits ni annoncés ici : leurs Paliers déjà justifiés servent seulement à les rendre visibles d'emblée.
async function fixerLivraison(slug, maintenant) {
  if ((await store.lireCartes(slug))?.livraison) return;
  const [lecons, evenements, avantBadges] = await Promise.all([store.leconsLues(slug, { maintenant }), store.lireEvenements(slug), store.lireBadges(slug)]);
  const { fichier: badges } = fusionnerBadges(avantBadges, calculerBadges({ lecons, evenements, maintenant }), maintenant);
  await store.modifierCartes(slug, (avant) => [avant?.livraison ? avant : fusionnerCartes(avant, { lecons, badges, maintenant }).fichier, null]);
}

// Après chaque quiz et chaque fin de Révision du jour : les nouveaux Paliers, nommés pour leur annonce (lib/retour.js),
// `nouveauxBadges` [{ id, nom, palier, jour }], et les Leçons dont la carte de ligne vient d'être gagnée (#197).
async function annoncerBadges(slug, maintenant) {
  const { nouveaux, nouvellesLignes, calcul } = await recalculerBadges(slug, maintenant);
  return {
    nouveauxBadges: nouveaux.map(({ id, palier, jour }) => ({ id, nom: calcul.find((b) => b.id === id).nom, palier, jour })),
    nouvellesCartesLigne: nouvellesLignes,
  };
}

// Choix d'un Rebond : une action fermée, parmi les Rebonds proposés par la Leçon lue, dont le serveur tire la
// consigne du prof et la phrase de l'Élève. Choisir le Défi le met en cours jusqu'au Retour de quiz suivant ;
// choisir Réviser ouvre la phase Réviser jusqu'au Défi réussi.
// Rebond qui crée la page, tel que les indicateurs le comptent (#147) ; les autres (Étape suivante, Commencer) créent une page nouvelle.
const REBOND_DE_PAGE = { revoir: 'revoir', defi: 'defi', reviser: 'reviser' };
const ETAT_APRES_REBOND = { defi: { defiEnCours: true }, reviser: { reviserEnCours: true } };

async function rebond(slug, id, { action }, maintenant) {
  if (typeof action !== 'string' || !Object.hasOwn(REBONDS, action)) throw new HttpError(400, 'Rebond inconnu');
  const lecon = await store.lireLecon(slug, id);
  if (!lecon.rebondsProposes.includes(action)) throw new HttpError(400, "Ce Rebond n'est pas proposé");
  // La page préparée pendant le quiz s'affiche dès qu'elle est prête si elle correspond ; sinon, tour normal. Dans les
  // deux cas, l'attente de l'Élève compte, même nulle : celle d'une préparation qui n'avait pas fini comprise.
  const apres = await occuper(slug, id, () => chronometrer(slug, id, maintenant, async () => {
    const preparation = await prendrePreparation(slug, id);
    if (preparation && preparationUtilisable(preparation.prevision, action, lecon)) return adopterPreparation(slug, id, preparation, action, maintenant);
    await ecarterPreparation(slug, id, preparation);
    return tourDuProf({ slug, id, prompt: consigneRebond(action, lecon), affiche: REBONDS[action].phrase, premier: false, tache: 'rebond', resultatsQuiz: false, etatLecon: ETAT_APRES_REBOND[action], maintenant, rebond: REBOND_DE_PAGE[action] });
  }));
  preparerPageSuivante(slug, id);
  return apres;
}

// Une Proposition n'est ni bornée ni cadrée comme un sujet libre : elle vient de l'agent, pas de l'Élève.
async function nouvelleDepuisProposition(slug, titre, brut, maintenant) {
  const cadrage = validerCadrage(brut, 'libre');
  const proposition = (await store.lirePropositions(slug))?.find((p) => p.titre === titre);
  if (!proposition) throw new HttpError(400, "Cette idée n'est plus proposée");
  const lecon = await store.creerLecon(slug, { sujet: proposition.titre, mode: 'libre', cadrage });
  const prompt = `${promptCadrage(proposition.titre, cadrage)}\n${consignePremierTour('libre', cadrage)}`;
  return tourDeParole({ slug, id: lecon.id, prompt, affiche: proposition.titre, premier: true, maintenant });
}

// Révision du jour menée jusqu'au bout (#94) : enregistre l'événement daté et renvoie les récompenses nouvelles
// (`etoile` : la première de la journée rapporte une Étoile ; `paliers` : Paliers de Badge nouveaux) et le nombre
// d'Étoiles de Révision du jour de l'Élève. Le serveur ne sait pas quelle série a été servie : il faut au moins une
// réponse de Révision du jour dans la journée. Jamais de tour du prof.
async function terminerRevisionDuJour(slug, maintenant, nbQuestions) {
  const [lecons, evenements] = await Promise.all([store.leconsLues(slug, { maintenant }), store.lireEvenements(slug)]);
  const aujourdhui = jourLocal(maintenant);
  const repondueAujourdhui = lecons.some((l) => reponsesDeRevision(l).some((r) => jourDe(r.date) === aujourdhui));
  if (!repondueAujourdhui) throw new HttpError(400, "Aucune Révision du jour répondue aujourd'hui");
  const etoile = etoileDuJour(evenements, maintenant);
  // `nbQuestions` : nombre de Questions de la série servie, que seul l'écran connaît (badge surprise « Série pleine », #221).
  const evenement = { type: 'revision-terminee', date: new Date(maintenant).toISOString(), ...(Number.isInteger(nbQuestions) && nbQuestions > 0 && { questions: nbQuestions }) };
  await store.enregistrerEvenement(slug, evenement);
  const { nouveauxBadges: nouveaux, nouvellesCartesLigne } = await annoncerBadges(slug, maintenant);
  const paliers = nouveaux.map(({ id, palier, jour }) => ({ id, palier, jour }));
  // Annonce des nouveaux Paliers sur l'écran de fin (#98), par la même phrase préparée que le Retour de quiz.
  const annonce = phraseBadges(nouveaux);
  return { recompenses: { etoile, paliers, ...(annonce && { annonce }), ...(nouvellesCartesLigne.length && { nouvellesCartesLigne }) }, etoilesRevisionDuJour: joursDeRevisionTerminee(lecons, [...evenements, evenement], maintenant).length };
}

async function api(req, res, segments) {
  const [r1, slug, r2, id, r3] = segments;
  const m = req.method;
  const maintenant = maintenantDe(req.headers); // lu une fois par requête (lib/horloge.js)
  if (r1 === 'config' && m === 'GET') return json(res, 200, { niveaux: NIVEAUX, categories: CATEGORIES, nombrePropositionsDefaut: NOMBRE_PROPOSITIONS_DEFAUT, modeles: MODELES, modeleDefaut: MODELE_DEFAUT, cadrage: QUESTIONS_CADRAGE, cadrageAvecSujet: QUESTIONS_AVEC_SUJET, questionsCadrage: { libre: questionsDuMode('libre'), revision: questionsDuMode('revision') }, sujetMax: SUJET_MAX });
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
  } else if (r2 === 'preparations' && !id) {
    if (m === 'GET') return json(res, 200, await etatPreparations(slug, await store.lireEleve(slug)));
  } else if (r2 === 'revisions' && !id) {
    // Révisions du jour (#66) : servies et corrigées par l'appli, jamais de tour du prof.
    if (m === 'GET') {
      const suite = new URL(req.url, 'http://x').searchParams.get('suite') === '1';
      const { dues, questions } = revisionsDuJour(await store.leconsLues(slug, { maintenant }), { maintenant, suite });
      return json(res, 200, { dues, questions: questions.map((q) => avecAdresseDImage(slug, q)) });
    }
    if (m === 'POST') {
      await store.lireEleve(slug);
      const corps = await lireCorps(req);
      const reponse = await store.repondreEnRevision(slug, corps, { maintenant });
      await noterEvenement(slug, { type: 'revision', date: new Date(maintenant).toISOString(), lecon: corps.lecon, juste: reponse.juste });
      varierQuestions(slug, corps.lecon);
      return json(res, 200, reponse);
    }
  } else if (r2 === 'signalements' && !id) {
    // Signaler une Question (#146), en quiz de page ou en Révision du jour : une raison de la liste fermée du Kit, jamais
    // de tour du prof (il reçoit le signalement au tour suivant de la Leçon).
    if (m === 'POST') {
      await store.lireEleve(slug);
      const corps = await lireCorps(req);
      const signalement = await store.signalerQuestion(slug, corps, { maintenant });
      await noterEvenement(slug, { type: 'signalement', date: signalement.date, lecon: corps.lecon, raison: signalement.raison });
      return json(res, 200, signalement);
    }
  } else if (r2 === 'predictions' && !id) {
    // Prédiction du Kit (#157) : l'Élève a dit ce qu'il pensait avant une partie de la page. Seulement un événement daté,
    // pour les indicateurs : ni score, ni Banque, ni Maîtrise, ni tour du prof.
    if (m === 'POST') {
      await store.lireEleve(slug);
      const { lecon, page, id: prediction, juste } = await lireCorps(req);
      if (typeof lecon !== 'string') throw new HttpError(400, 'Leçon manquante');
      if (![page, prediction].every((t) => typeof t === 'string' && t.trim() && t.length <= 200)) throw new HttpError(400, 'Prédiction mal formée');
      if (typeof juste !== 'boolean') throw new HttpError(400, 'Résultat manquant');
      await store.lireLecon(slug, lecon, { maintenant });
      const date = new Date(maintenant).toISOString();
      await noterEvenement(slug, { type: 'prediction', date, lecon, juste });
      return json(res, 200, { date, juste });
    }
  } else if (r2 === 'revisions' && id === 'terminee' && !r3) {
    // Révision du jour menée jusqu'au bout (#94) : l'écran le signale après la dernière réponse d'une série.
    if (m === 'POST') return json(res, 200, await terminerRevisionDuJour(slug, maintenant, (await lireCorps(req)).questions));
  } else if (r2 === 'parent' && id === 'signalements' && !r3) {
    // Le parent signale lui-même une Question (#148) : même liste fermée de raisons, auteur parent, jamais de tour du prof.
    if (m === 'POST') {
      await store.lireEleve(slug);
      const corps = await lireCorps(req);
      const signalement = await store.signalerQuestion(slug, corps, { maintenant, auteur: 'parent' });
      await noterEvenement(slug, { type: 'signalement', date: signalement.date, lecon: corps.lecon, raison: signalement.raison, auteur: 'parent' });
      return json(res, 200, signalement);
    }
  } else if (r2 === 'parent' && id === 'retablissements' && !r3) {
    // Rétablir une Question signalée (#148) : le signalement est retiré, la mémoire se recalcule depuis le journal.
    if (m === 'POST') {
      await store.lireEleve(slug);
      const corps = await lireCorps(req);
      const reponse = await store.retablirQuestion(slug, corps);
      await noterEvenement(slug, { type: 'retablissement', date: new Date(maintenant).toISOString(), lecon: corps.lecon });
      return json(res, 200, reponse);
    }
  } else if (r2 === 'parent' && !id) {
    // Vue parent (#77) : agrégats lus seulement, jamais de tour du prof. Le fichier de Badges est lu, jamais modifié (#100).
    if (m === 'GET') {
      const [lecons, couts, evenements, badges, cartes] = await Promise.all([
        store.leconsLues(slug, { maintenant }), store.lireCouts(slug), store.lireEvenements(slug), store.lireBadges(slug), store.lireCartes(slug)]);
      return json(res, 200, vueParent(lecons, { couts, maintenant, evenements, badges, cartes }));
    }
  } else if (r2 === 'indicateurs' && !id) {
    // Indicateurs (#78) : calculés sur la période demandée à partir des événements datés, jamais de tour du prof.
    if (m === 'GET') {
      const periode = periodeDe(new URL(req.url, 'http://x'), maintenant);
      const [evenements, lecons, cartes] = await Promise.all([
        store.lireEvenements(slug), store.leconsLues(slug, { maintenant }), store.lireCartes(slug)]);
      return json(res, 200, indicateurs(evenements, { maintenant, lecons, cartes, ...periode }));
    }
  } else if (r2 === 'rythme' && !id) {
    // Rythme (#75) : Objectif du jour, Série de jours avec jokers et récapitulatif de la semaine, pour cet Élève seul.
    // Lu par l'accueil de l'Élève : son affichage est noté (événement `accueil`), pour ne montrer le récapitulatif
    // qu'au premier retour de la semaine.
    if (m === 'GET') {
      const [lecons, evenements] = await Promise.all([store.leconsLues(slug, { maintenant }), store.lireEvenements(slug)]);
      await noterEvenement(slug, { type: 'accueil', date: new Date(maintenant).toISOString() });
      const activite = activiteParJour(lecons);
      return json(res, 200, {
        objectifDuJour: objectifDuJour(activite, maintenant),
        serieDeJours: serieDeJours(activite, maintenant),
        // Réparation proposée aujourd'hui (#159) ; meilleure série et total des Jours travaillés, montrés après une série repartie.
        reparation: reparationDeSerie(activite, maintenant),
        meilleureSerie: meilleureSerie(activite, maintenant).meilleure,
        joursTravailles: joursTravailles(lecons).filter((j) => j <= jourLocal(maintenant)).length,
        recapitulatif: recapitulatifSemaine(lecons, maintenant, { joursActifs: [...joursDesEvenements(evenements)] }),
      });
    }
  } else if (r2 === 'moment' && id === 'heures' && !r3) {
    // Rappel calendrier (#155) : le parent règle l'heure de chaque moment (lib/moment.js), gardée dans le fichier du moment.
    // Lecture pour la Vue parent : ne marque pas la question du jour comme posée (GET …/moment le fait, pour l'Élève).
    if (m === 'GET') {
      const f = await store.modifierMoment(slug, (x) => [x, x]);
      return json(res, 200, { moment: f.moment, choix: MOMENTS, heures: heuresDe(f.heures) });
    }
    if (m === 'PUT') {
      const { heures } = await lireCorps(req);
      const valides = validerHeures(heures);
      return json(res, 200, await store.modifierMoment(slug, (f) => {
        const reglees = { ...f.heures, ...valides };
        return [{ ...f, heures: reglees }, { moment: f.moment, aProposer: false, choix: MOMENTS, heures: heuresDe(reglees) }];
      }));
    }
  } else if (r2 === 'moment' && id === 'calendrier.ics' && !r3) {
    // Fichier iCalendar du rappel (#155), généré ici et rendu tel quel : rien n'est envoyé ni hébergé (ADR 0001).
    if (m === 'GET') {
      const [profil, f] = await Promise.all([store.lireEleve(slug), store.modifierMoment(slug, (x) => [x, x])]);
      const ics = fichierIcal({ moment: f.moment, heures: f.heures, pseudo: profil.pseudo, maintenant });
      res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="rappel-${slug}.ics"` });
      return res.end(ics);
    }
  } else if (r2 === 'moment' && !id) {
    // Moment de révision (#154) : proposé une fois par jour, une fois l'Objectif du jour atteint ; valeur fermée (lib/moment.js).
    const jour = jourLocal(maintenant);
    if (m === 'GET') {
      const lecons = await store.leconsLues(slug, { maintenant });
      const atteint = objectifDuJour(activiteParJour(lecons), maintenant).atteint;
      return json(res, 200, await store.modifierMoment(slug, (f) => {
        const aProposer = atteint && f.proposeLe !== jour;
        return [aProposer ? { ...f, proposeLe: jour } : f, { moment: f.moment, aProposer, choix: MOMENTS, heures: heuresDe(f.heures) }];
      }));
    }
    if (m === 'PUT') {
      const { moment } = await lireCorps(req);
      const valeur = validerMoment(moment === undefined ? 'inconnu' : moment);
      return json(res, 200, await store.modifierMoment(slug, (f) => [{ ...f, moment: valeur, proposeLe: jour }, { moment: valeur, aProposer: false, choix: MOMENTS, heures: heuresDe(f.heures) }]));
    }
  } else if (r2 === 'badges' && !id) {
    // Mes badges (#95) : la collection, recalculée et fusionnée à la lecture, les totaux d'Étoiles et de Fusées (#96) et
    // le calendrier des Jours travaillés (#99), sans aucun score. Ouverture de l'écran (?ouverture=1) : la réponse
    // montre encore « Nouveau » et le mot d'accueil, effacés pour la suite.
    if (m === 'GET') {
      const { fichier, calcul, cartes, totaux, lecons, evenements } = await recalculerBadges(slug, maintenant);
      if (new URL(req.url, 'http://x').searchParams.get('ouverture') === '1') await store.modifierBadges(slug, (f) => [marquerVu(f, maintenant), null]);
      const jours = calendrier({ lecons, evenements, paliers: paliersObtenus(fichier, calcul), maintenant });
      return json(res, 200, { ...vueMesBadges(fichier, calcul), ...vueCartes(cartes), totaux, calendrier: jours });
    }
  } else if (r2 === 'cartes' && id === 'retournement' && !r3) {
    // Retournement d'une carte (#183) : { type: 'ligne', id } ou { type: 'palier', id, palier } ; idempotent.
    if (m === 'POST') {
      const { type, id: carte, palier } = await lireCorps(req);
      const { statut } = await store.modifierCartes(slug, (avant) => {
        if (!avant) return [avant, { statut: 'introuvable' }];
        const r = retournerCarte(avant, { type, id: carte, palier }, maintenant);
        return [r.fichier, r];
      });
      if (statut === 'introuvable') throw new HttpError(404, 'Carte introuvable');
      if (statut === 'pas-prete') throw new HttpError(409, "Cette carte n'est pas encore prête");
      return json(res, 200, { statut });
    }
  } else if (r2 === 'cartes' && id === 'ligne' && r3) {
    // État d'une carte de ligne (#197) : relu pendant l'attente de la cérémonie, sans recalcul ni composition. Les
    // calques ne sont montrés que pour une carte prête ou générique.
    if (m === 'GET') {
      const carte = vueCartes(await store.lireCartes(slug)).cartesLigne.find((c) => c.lecon === r3);
      if (!carte) throw new HttpError(404, 'Carte introuvable');
      return json(res, 200, { carte });
    }
  } else if (r2 === 'cartes' && id === 'son' && !r3) {
    // Réglage du carillon (#187), éteint par défaut : lu et écrit depuis le Profil. Le réglage ne calcule rien : s'il crée
    // le fichier, c'est sans livraison (le premier calcul la fixera, voir fusionnerCartes).
    if (m === 'GET') return json(res, 200, { son: (await store.modifierCartes(slug, (f) => [f, f]))?.son === true });
    if (m === 'PUT') {
      const { son } = await lireCorps(req);
      if (typeof son !== 'boolean') throw new HttpError(400, 'Le réglage du carillon est vrai ou faux');
      const fichier = await store.modifierCartes(slug, (avant) => { const apres = reglerSon(avant, son); return [apres, apres]; });
      return json(res, 200, { son: fichier.son === true });
    }
  } else if (r2 === 'propositions' && !id) {
    if (m === 'GET') return json(res, 200, await lirePropositions(slug));
    if (m === 'POST') return json(res, 202, await regenererPropositions(slug));
  } else if (r2 === 'lecons') {
    if (!id) {
      if (m === 'GET') {
        // Section « Archivées » (#203) : ?archivees=1 ne liste que les Leçons rangées ; l'accueil ne les voit pas.
        const archivees = new URL(req.url, 'http://x').searchParams.get('archivees') === '1' ? 'seules' : 'sans';
        return json(res, 200, await store.listerLecons(slug, { maintenant, archivees }));
      }
      if (m === 'POST') {
        const corps = await lireCorps(req, 40_000_000);
        if (corps.fichiers) return json(res, 201, await nouvelleRevision(slug, corps, maintenant));
        if (corps.proposition !== undefined) return json(res, 201, await nouvelleDepuisProposition(slug, corps.proposition, corps.cadrage, maintenant));
        const sujet = typeof corps.sujet === 'string' ? corps.sujet.trim() : '';
        if (!sujet) throw new HttpError(400, 'Dis-moi ce que tu veux apprendre');
        if (sujet.length > SUJET_MAX) throw new HttpError(400, `Ton sujet est trop long (${SUJET_MAX} caractères au plus)`);
        const cadrage = validerCadrage(corps.cadrage, 'libre');
        const lecon = await store.creerLecon(slug, { sujet, mode: 'libre', cadrage });
        const prompt = `${promptCadrage(promptDemarrageLibre(sujet), cadrage)}\n${consignePremierTour('libre', cadrage)}`;
        return json(res, 201, await tourDeParole({ slug, id: lecon.id, prompt, affiche: sujet, premier: true, maintenant }));
      }
    } else if (!r3) {
      if (m === 'GET') {
        const lecon = await store.lireLecon(slug, id, { maintenant });
        // Ouverture par l'Élève dans sa Séance (?ouverture=1, #78) : une Leçon lue ailleurs (vue parent…) n'en est pas une.
        if (new URL(req.url, 'http://x').searchParams.get('ouverture') === '1') {
          await noterEvenement(slug, { type: 'ouverture', date: new Date(maintenant).toISOString(), lecon: id });
        }
        return json(res, 200, lecon);
      }
      if (m === 'DELETE') return json(res, 200, await supprimerLecon(slug, id));
    } else if (r3 === 'archivage' && m === 'POST') {
      // Archiver (#203) : la Leçon n'est pas occupée par un tour du prof (qui réécrit lesson.json) ; rien n'est effacé.
      return json(res, 200, await occuper(slug, id, () => store.archiverLecon(slug, id, { maintenant })));
    } else if (r3 === 'restauration' && m === 'POST') {
      return json(res, 200, await occuper(slug, id, () => store.restaurerLecon(slug, id)));
    } else if (r3 === 'scores' && m === 'POST') {
      const corps = await lireCorps(req);
      await fixerLivraison(slug, maintenant); // avant le score : une Acquisition de ce quiz donne sa carte
      const niveauAvant = (await store.lireLecon(slug, id, { maintenant })).niveauLecon;
      const lecon = await store.enregistrerScore(slug, id, corps, { maintenant });
      await noterNiveauxFranchis(slug, lecon, niveauAvant, maintenant);
      varierQuestions(slug, id);
      return json(res, 201, lecon);
    } else if (r3 === 'retours' && m === 'POST') {
      const lecon = await retourQuiz(slug, id, await lireCorps(req), maintenant); // annonce aussi les nouveaux Badges (#98)
      preparerPageSuivante(slug, id); // aucune page préparée pendant le quiz : une, avec ses résultats (#74)
      return json(res, 200, lecon);
    } else if (r3 === 'rebonds' && m === 'POST') {
      return json(res, 200, await rebond(slug, id, await lireCorps(req), maintenant));
    } else if (r3 === 'messages' && m === 'POST') {
      const { texte } = await lireCorps(req);
      if (typeof texte !== 'string' || !texte.trim()) throw new HttpError(400, 'Message vide');
      return json(res, 200, await tourDeParole({ slug, id, prompt: texte.trim(), premier: false, maintenant }));
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

await store.reprendreCartes(reprendreCompositions);
for (const { slug } of await store.listerEleves()) composerCartes(slug); // les cartes restées « à composer »
serveur.listen(PORT, HOST, () => console.log(messageDemarrage({ host: HOST, port: PORT, adressePublique: process.env.ADRESSE_PUBLIQUE })));
