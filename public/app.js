import { rendreQuestion } from '/kit/v1/question.js';
import { construireFigure } from '/kit/v1/figure-logique.js';
import { arreterLecture } from '/kit/v1/lecture.js';
import { avecEmoji, nommer } from '/kit/v1/dom.js';
import { nomEtPalier, morceauxRecompensesLecon } from '/recompenses-texte.js';
import { rangerCollection, rangDeCarte, crans, aFeuilleHolo, libelleCarteBadge, libelleADecouvrir, dosCarteBadge } from '/carte-badge-texte.js';
import { artDeBadge } from '/carte-badge-art.js';
import { esquisseCarte } from '/carte-attente-art.js';
import { badgeAuPalier, collectionRangee, nouvellesCartes, cartesLigneRangees, contientNouveau, cleCarte, emplacementCarte, cartesDuGain, ATTENTE, TEXTES_CEREMONIE } from '/nouvelles-cartes.js';
import { jouerCarillon } from '/carillon.js';
import { gainsDuJour } from '/gains-du-jour.js';
import { cleCategorieCarte, objectifsDeCarte, libelleCarteLigne, dosCarteLigne, calquesDeCarte } from '/carte-ligne-texte.js';
import { conclusionDesIndicateurs } from '/conclusion-parent.js';
import {
  sectionIdees, ECHEC_LECTURE, cartoucheProposition, colonnesPropositions, questionCadrage, carteAttente, carteErreur,
  confirmationFichiers, messageSujet, FICHIERS_MANQUANTS,
} from '/nouvelle-lecon-texte.js';
import { RAISONS_SIGNALEMENT } from '/kit/v1/quiz-logique.js';
import { ErreurApi, chargerProfil, avecAttente, lireEnParallele } from '/chargement.js';
import { pastilleRevisions } from '/pastille-revisions.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let config;
let quitterEcran = () => {}; // nettoyage de l'écran précédent (écouteurs)

const api = async (url, options = {}) => {
  let res;
  try {
    res = await fetch(`/api/${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
      body: options.body && JSON.stringify(options.body),
    });
  } catch {
    throw new ErreurApi('Pas de réponse du serveur', 0); // réseau coupé ou serveur arrêté
  }
  // Une panne peut répondre autre chose que du JSON : le statut compte plus que le corps.
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ErreurApi(data?.erreur || 'Erreur', res.status);
  return data;
};

// Petit constructeur DOM : h('button', {onclick}, 'texte', enfant…)
const h = (tag, attrs = {}, ...enfants) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el[k] = v;
  }
  el.append(...garder(enfants).flatMap((e) => [avecEmoji(e)].flat())); // emoji décoratifs masqués aux lecteurs d'écran (#168)
  return el;
};
const garder = (enfants) => enfants.flat(Infinity).filter((e) => e != null && e !== false);
const montrer = (...enfants) => app.replaceChildren(...garder(enfants));
const pseudoCourant = () => localStorage.getItem('pseudo');

// En-tête : le total d'Étoiles de l'Élève, qui ouvre Mes badges, puis son Profil. Le total vient de GET …/badges, lu une
// fois par Élève puis mis à jour par l'accueil et Mes badges (retenirRecompenses), pour ne pas le relire à chaque écran.
let recompensesConnues = null; // { slug, etoiles, nouveau }
const retenirRecompenses = (profil, { totaux, aRetourner }) => {
  recompensesConnues = { slug: profil.slug, etoiles: totaux?.etoiles ?? 0, nouveau: contientNouveau(aRetourner) }; // « Nouveau » : tant qu'une carte attend (#187)
};
function barreNav(profil) {
  if (!profil) return nav.replaceChildren();
  const connues = recompensesConnues?.slug === profil.slug ? recompensesConnues : null;
  const compteur = h('a', { className: 'compteur-etoiles', href: '#/badges', title: 'Mes badges' },
    h('span', { ariaHidden: 'true' }, '⭐'),
    h('span', { className: 'nombre' }, connues ? String(connues.etoiles) : '…'),
    h('span', { className: 'cache' }, connues?.nouveau ? ' Étoiles, voir mes badges : une nouvelle carte attend' : ' Étoiles, voir mes badges'),
    connues?.nouveau && h('span', { className: 'nouveau', ariaHidden: 'true' }, 'Nouveau'));
  nav.replaceChildren(compteur,
    h('span', { className: 'qui' }, `${profil.pseudo} · ${profil.niveau}`, h('span', { className: 'age' }, ` · ${profil.age} ans`)),
    h('button', { className: 'secondaire', onclick: () => (location.hash = '#/profil') }, 'Mon profil'),
    h('button', { className: 'secondaire', onclick: () => { localStorage.removeItem('pseudo'); location.hash = '#/'; route(); } }, 'Changer'));
  if (!connues) {
    api(`eleves/${profil.slug}/badges`).then((badges) => {
      retenirRecompenses(profil, badges);
      if (nav.contains(compteur)) barreNav(profil);
    }).catch(() => {});
  }
}

// Bouton de thème de l'en-tête (public/theme.js) : à tous les écrans, choix de l'Élève compris, hors de la nav.
const boutonTheme = document.getElementById('bouton-theme');
const afficherBoutonTheme = () => {
  const { courant, libelle, icone } = globalThis.cartableTheme;
  boutonTheme.replaceChildren(h('span', { ariaHidden: 'true' }, icone(courant())));
  boutonTheme.ariaLabel = boutonTheme.title = libelle(courant());
};
boutonTheme.addEventListener('click', () => { globalThis.cartableTheme.basculer(); afficherBoutonTheme(); });
afficherBoutonTheme();

async function ecranChoix() {
  barreNav(null);
  const eleves = await api('eleves');
  montrer(
    h('h2', {}, 'Qui es-tu ?'),
    h('div', { className: 'grille' },
      eleves.map((e) => h('button', { className: 'carte', onclick: () => { localStorage.setItem('pseudo', e.slug); location.hash = '#/'; route(); } }, e.pseudo, h('small', {}, e.niveau))),
      h('button', { className: 'carte secondaire', onclick: () => (location.hash = '#/nouvel-eleve') }, '➕ Nouvel élève')),
  );
}

function formulaireProfil({ profil, titre, envoyer }) {
  const erreur = h('p', { className: 'erreur' });
  const pseudo = h('input', { name: 'pseudo', required: true, minLength: 2, maxLength: 20, disabled: !!profil, value: profil?.pseudo ?? '' });
  const age = h('input', { name: 'age', type: 'number', min: 3, max: 99, required: true, value: profil?.age ?? '' });
  const niveau = h('select', { name: 'niveau' }, config.niveaux.map((n) => h('option', { value: n, selected: n === profil?.niveau }, n)));
  const nombrePropositions = h('input', { name: 'nombrePropositions', type: 'number', min: 2, max: 10, required: true, value: profil?.nombrePropositions ?? config.nombrePropositionsDefaut });
  // Page suivante préparée pendant le quiz (#74) : active par défaut, à couper si elle coûte trop.
  const preparerPages = h('input', { name: 'preparerPages', type: 'checkbox', checked: profil?.preparerPages ?? true });
  const modele = h('select', { name: 'modele' }, config.modeles.map((m) => h('option', { value: m.id, selected: m.id === (profil?.modele ?? config.modeleDefaut) }, `${m.libelle} — ${m.description}`)));
  const lectureVoixHaute = h('input', { name: 'lectureVoixHaute', type: 'checkbox', checked: profil?.lectureVoixHaute ?? false });
  const espacementLettres = h('input', { name: 'espacementLettres', type: 'checkbox', checked: profil?.espacementLettres ?? false });
  const form = h('form', { className: 'colonne', onsubmit: async (ev) => {
    ev.preventDefault();
    try { await envoyer({ pseudo: pseudo.value, age: age.value, niveau: niveau.value, nombrePropositions: nombrePropositions.value, modele: modele.value, lectureVoixHaute: lectureVoixHaute.checked, espacementLettres: espacementLettres.checked, preparerPages: preparerPages.checked }); } catch (e) { erreur.textContent = e.message; }
  } },
    !profil && h('label', {}, 'Pseudo', h('br'), pseudo),
    h('label', {}, 'Âge', h('br'), age),
    h('label', {}, 'Classe', h('br'), niveau),
    h('label', {}, "Nombre d'idées de leçons proposées (2 à 10)", h('br'), nombrePropositions),
    h('label', {}, 'Modèle', h('br'), modele),
    h('label', {}, lectureVoixHaute, ' 🔊 Lecture à voix haute des pages et des questions (avec la voix de cet appareil)'),
    h('label', {}, espacementLettres, ' Espacement des lettres et des mots agrandi (pour lire plus facilement)'),
    h('label', {}, preparerPages, ' Préparer la page suivante pendant le quiz (plus rapide, coûte parfois un tour de plus)'),
    h('button', {}, profil ? 'Enregistrer' : 'Créer'),
    erreur);
  return [h('h2', {}, titre), form];
}

async function ecranNouvelEleve() {
  barreNav(null);
  montrer(...formulaireProfil({ titre: 'Nouvel élève', envoyer: async (champs) => {
    const profil = await api('eleves', { method: 'POST', body: champs });
    localStorage.setItem('pseudo', profil.slug);
    location.hash = '#/';
  } }));
}

// Carillon du retournement (#187) : éteint par défaut, réglé ici une fois pour toutes. Il s'enregistre à part du reste du
// Profil, tout de suite, et le dit.
function reglageCarillon(profil) {
  const etat = h('p', { className: 'doux', role: 'status' });
  const case_ = h('input', { type: 'checkbox', name: 'carillon', disabled: true, onchange: async () => {
    const voulu = case_.checked;
    try {
      const { son } = await api(`eleves/${profil.slug}/cartes/son`, { method: 'PUT', body: { son: voulu } });
      case_.checked = son;
      etat.textContent = son ? 'Le carillon est allumé.' : 'Le carillon est éteint.';
    } catch {
      case_.checked = !voulu;
      etat.textContent = 'Le réglage n’a pas pu être enregistré. Réessaie.';
    }
  } });
  api(`eleves/${profil.slug}/cartes/son`).then(({ son }) => { case_.checked = son; case_.disabled = false; }).catch(() => { etat.textContent = 'Le réglage du carillon n’a pas pu être lu.'; });
  return h('div', { className: 'reglage-carillon' }, h('label', {}, case_, TEXTES_CEREMONIE.reglageSon), etat);
}

async function ecranProfil(profil) {
  // Pour le parent : Coût d'un tour cumulé (CONTEXT.md), un indicateur relatif du quota partagé de l'abonnement, pas de
  // l'argent dépensé : affiché en tokens, avec son équivalent indicatif au tarif de l'API. Jamais pendant la Séance.
  const cout = h('p', { className: 'cout' });
  montrer(...formulaireProfil({ profil, titre: 'Mon profil', envoyer: async (champs) => {
    await api(`eleves/${profil.slug}`, { method: 'PUT', body: champs });
    location.hash = '#/';
  } }), reglageCarillon(profil), cout);
  const couts = await api(`eleves/${profil.slug}/couts`).catch(() => null);
  if (couts) {
    const { coutUsd, tours, entree, sortie, cacheLu, cacheEcrit } = couts.total;
    const tokens = (entree + sortie + cacheLu + cacheEcrit).toLocaleString('fr-BE', { notation: 'compact', maximumFractionDigits: 1 });
    const equivalent = coutUsd.toLocaleString('fr-BE', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    cout.textContent = `Quota utilisé (indicatif) : ${tokens} tokens en ${tours} appel${tours > 1 ? 's' : ''} au prof, l'équivalent de ${equivalent} au tarif de l'API. Ce n'est pas une dépense : l'abonnement se mesure en quota partagé.`;
  }
  // Vue parent (#77) : accessible d'ici seulement, jamais depuis l'accueil de l'Élève.
  app.append(h('p', {}, h('button', { className: 'secondaire', onclick: () => (location.hash = '#/parent') }, '👪 Vue parent')));
}

// Chaque palier de Maîtrise (spec #84) : sa couleur et le mot affiché, le même pour l'Élève (carte d'accueil, en-tête de
// la Séance) et pour la Vue parent. « Acquis » (#88), mot de fin, en vert marqué avec une coche : distinct de
// « Bien en tête » et des Paliers des Badges.
const PALIERS_DE_MAITRISE = {
  'à revoir': { classe: 'rouge', mot: 'À revoir' },
  'à consolider': { classe: 'orange', mot: 'À consolider' },
  'bien en tête': { classe: 'vert', mot: 'Bien en tête' },
  acquis: { classe: 'acquis', mot: 'Acquis ✓' },
};

// Vue parent (#77) : un écran par Élève, pour le parent, agrégé par le serveur (GET …/parent). Une section par clé
// des agrégats : SECTIONS_PARENT en ajoute une sans toucher aux autres (indicateurs, #78).
// Montant en dollars, dit en toutes lettres (« 1,23 dollars ») plutôt que par un sigle de devise.
const equivalentUsd = (usd) => `${usd.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} dollars`;
const foisProf = (n) => `${n} fois`;
const listeOuVide = (elements, vide) => (elements.length ? h('ul', {}, elements) : h('p', { className: 'doux' }, vide));
// Le parent ouvre la Leçon en aperçu (#/apercu/…) : ce n'est pas un retour de l'Élève pour les indicateurs (#78).
const lienLecon = (lecon, titre) => h('a', { href: `#/apercu/${lecon}`, className: 'lien-lecon' }, `(${titre})`);
const avecLecon = (texte, item) => h('li', {}, texte, ' ', lienLecon(item.lecon, item.titreLecon));
const SECTIONS_PARENT = [
  { titre: '🧠 Objectifs Retenus', bloc: 'retient', rendu: ({ objectifs }) => listeOuVide(objectifs.retenus.map((o) => avecLecon(o.texte, o)), 'Aucun Objectif Retenu pour l’instant.') },
  // Soutien à l'autonomie (#158) : des questions ouvertes à poser, tirées des Objectifs Retenus récents, sans tour du prof.
  { titre: '💬 Pour en parler avec lui', bloc: 'aide', rendu: ({ pourEnParler: { invitations, autonomie } }) => [
    listeOuVide(invitations.map((i) => avecLecon(i.texte, i)), 'Pas d’activité ces 7 derniers jours : rien à proposer pour l’instant.'),
    h('p', { className: 'doux' }, autonomie)] },
  { titre: '🌱 Ce qui se consolide', bloc: 'retient', rendu: ({ objectifs }) => [
    h('p', { className: 'doux' }, 'Objectifs atteints, pas encore Retenus : ils se consolident au fil des Révisions du jour.'),
    listeOuVide(objectifs.fragiles.map((o) => avecLecon(o.texte, o)), 'Aucun.')] },
  // La Leçon et le pourcentage se disent une fois : une Leçon, puis ses Questions avec leur pourcentage compact (#164).
  { titre: '🔁 Ce qu’il revoit en ce moment', bloc: 'aide', rendu: ({ questionsFragiles }) => {
    const parLecon = new Map();
    for (const q of questionsFragiles) {
      if (!parLecon.has(q.lecon)) parLecon.set(q.lecon, { lecon: q.lecon, titreLecon: q.titreLecon, questions: [] });
      parLecon.get(q.lecon).questions.push(q);
    }
    return [
      questionsFragiles.length > 0 && h('p', { className: 'doux' }, 'Pour chaque Question : ses chances de s’en souvenir aujourd’hui.'),
      listeOuVide([...parLecon.values()].map((l) => h('li', {}, h('a', { href: `#/apercu/${l.lecon}`, className: 'lien-lecon' }, l.titreLecon),
        h('ul', {}, l.questions.map((q) => h('li', {}, `${q.enonce} (${q.pourcentage} %)`))))), 'Aucune : tout tient bien.')];
  } },
  // Questions signalées et suspectes (#148) : le parent juge. Rétablir retire le signalement sans perte ; Signaler porte l'auteur parent.
  { titre: '🚩 Questions signalées', bloc: 'aide', rendu: ({ questionsSignalees }, contexte) => [
    h('p', { className: 'doux' }, 'Ces Questions ne sont plus posées ni comptées. Rétablir les remet en Révision du jour et dans la Maîtrise, sans rien perdre.'),
    listeOuVide(questionsSignalees.map((q) => h('li', { className: 'question-signalee' },
      h('strong', {}, insecables(q.enonce)), ' ', lienLecon(q.lecon, q.titreLecon),
      h('br'), `Bonne réponse attendue : ${q.bonne}`,
      h('br'), `${q.libelleRaison}, signalée par ${q.auteur === 'parent' ? 'toi' : 'l’Élève'} le ${new Date(q.date).toLocaleDateString('fr-BE')}.`,
      ' ', actionParent(contexte, 'Rétablir', `eleves/${contexte.slug}/parent/retablissements`, q))), 'Aucune Question signalée.')] },
  { titre: '🔎 Questions à vérifier', bloc: 'aide', rendu: ({ questionsSuspectes, questionsSignalables }, contexte) => [
    h('p', { className: 'doux' }, 'L’appli les juge suspectes mais n’en retire aucune : c’est à toi de décider.'),
    listeOuVide(questionsSuspectes.map((q) => h('li', { className: 'question-suspecte' },
      h('strong', {}, insecables(q.enonce)), ' ', lienLecon(q.lecon, q.titreLecon),
      h('br'), `Bonne réponse attendue : ${q.bonne}`,
      q.motifs.map((m) => [h('br'), motifSuspect(m)]),
      h('br'), signalerParent(contexte, q))), 'Aucune Question suspecte.'),
    questionsSignalables.length > 0 && h('details', { className: 'signaler-parent' }, h('summary', {}, 'Signaler une autre Question'),
      questionsSignalables.map((l) => h('details', {}, h('summary', {}, l.titreLecon),
        h('ul', {}, l.questions.map((q) => h('li', {}, insecables(q.enonce), h('br'), signalerParent(contexte, { ...q, lecon: l.lecon })))))))] },
  // Badges (#100) : ceux des 7 derniers jours et les totaux, en lecture seule (rien n'y change « Nouveau » dans Mes badges).
  { titre: '🏅 Badges', bloc: 'retient', rendu: ({ badges: { recents, etoiles, fusees } }) => [
    h('p', {}, `⭐ ${pluriel(etoiles, 'Étoile')} · 🚀 ${pluriel(fusees, 'Fusée')} en tout.`),
    listeOuVide(recents.map((b) => h('li', {}, `${b.emoji} ${nomEtPalier(b)} · ${dateBadge(b.jour)}`)),
      'Aucun Badge ces 7 derniers jours.')] },
  { titre: '📆 Ces derniers jours', bloc: 'retient', rendu: ({ jours }) => !jours.some((j) => j.revisions || j.quiz)
    ? h('p', { className: 'doux' }, 'Aucune Révision du jour ni quiz de page ces 7 derniers jours.')
    : h('table', { className: 'vue-parent-jours' },
    h('tr', {}, h('th', {}, 'Jour'), h('th', {}, 'Révisions du jour'), h('th', {}, 'Quiz de page')),
    jours.map((j) => h('tr', {},
      h('td', {}, new Date(`${j.jour}T12:00`).toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' })),
      h('td', {}, j.revisions ? `${j.revisions} (${j.justes} juste${j.justes > 1 ? 's' : ''})` : '–'),
      h('td', {}, j.quiz || '–')))) },
  { titre: '📅 Contrôles à venir', bloc: 'aide', rendu: ({ controles }) => listeOuVide(controles.map((c) =>
    avecLecon(`${new Date(`${c.dateControle}T12:00`).toLocaleDateString('fr-BE')} (${texteControle(c.joursAvant)}) : Maîtrise : ${c.maitrise ? `${PALIERS_DE_MAITRISE[c.maitrise.palier].mot} (${c.maitrise.pourcentage} %)` : 'pas encore évaluée'}, ${pluriel(c.questionsDues, 'question')} à revoir aujourd’hui`, c)), 'Aucun contrôle prévu.') },
  { titre: '💶 Coût des Leçons', bloc: 'reglages', replie: true, rendu: ({ cout }) => [
    h('p', {}, `Total (indicatif) : ${equivalentUsd(cout.total.coutUsd)} pour ${foisProf(cout.total.tours)} où le prof a répondu, Propositions comprises. L'abonnement se mesure en quota partagé, pas en argent dépensé.`),
    listeOuVide(cout.lecons.map((l) => h('li', {}, `${l.titre} : ${equivalentUsd(l.coutUsd)} (${foisProf(l.tours)})`)), 'Aucune Leçon.')] },
// Indicateurs (#78) : sur les 4 dernières semaines, pour juger si l'appli aide à retenir et donne envie de revenir.
  { titre: '📈 Indicateurs', bloc: 'reglages', replie: true, rendu: ({ indicateurs: { periode, planificateur, souvenir, retour, attente, retenu30, calibration, jeNeSaisPas, reussiteParRebond, revisionsDesJoursDus, predictions, questionsSignalees: qs, cartes } }) => [
    h('p', { className: 'doux' }, `Du ${new Date(`${periode.du}T12:00`).toLocaleDateString('fr-BE')} au ${new Date(`${periode.au}T12:00`).toLocaleDateString('fr-BE')}.`),
    h('p', {}, conclusionDesIndicateurs({ souvenir, retour, calibration })),
    h('details', { className: 'pour-les-curieux' }, h('summary', {}, 'Pour les curieux'),
    h('ul', {},
      h('li', {}, 'Souvenir aux Révisions du jour : ', souvenir.reponses
        ? `${souvenir.pourcentage} % (${souvenir.justes} sur ${pluriel(souvenir.reponses, 'réponse')})` : 'pas encore de Révision du jour.'),
      h('li', {}, 'Retour la semaine d’après une nouvelle Leçon : ', retour.lecons
        ? `${retour.pourcentage} % (${retour.revenus} sur ${pluriel(retour.lecons, 'Leçon')})` : 'pas encore mesurable.',
        retour.enAttente ? ` ${pluriel(retour.enAttente, 'Leçon')} trop récente${retour.enAttente > 1 ? 's' : ''} pour le dire.` : ''),
      h('li', {}, 'Attente du prof : ', attente.tours
        ? `${attente.medianeSecondes} s d’habitude, ${attente.maxSecondes} s au plus (sur ${attente.tours} fois où le prof a répondu)` : 'le prof n’a pas encore répondu.'),
      h('li', {}, 'Objectifs Retenus il y a au moins 30 jours, encore Retenus : ', retenu30.objectifs
        ? `${retenu30.pourcentage} % (${retenu30.encoreRetenus} sur ${pluriel(retenu30.objectifs, 'Objectif')})` : 'pas encore mesurable.'),
      h('li', {}, '« Je ne sais pas » : ', partJeNeSaisPas(jeNeSaisPas.quiz, 'dans les quiz de page', 'aucun quiz de page'), ' ',
        partJeNeSaisPas(jeNeSaisPas.revision, 'aux Révisions du jour', 'aucune Révision du jour')),
      h('li', {}, 'Réussite des quiz selon la page : ', MESURES_REBOND.some(([cle]) => reussiteParRebond[cle].quiz)
        ? MESURES_REBOND.filter(([cle]) => reussiteParRebond[cle].quiz).map(([cle, mot]) =>
          `${mot} ${reussiteParRebond[cle].pourcentage} % (${pluriel(reussiteParRebond[cle].quiz, 'quiz')})`).join(' ; ') + '.'
        : 'pas encore de quiz.'),
      h('li', {}, 'Méthode de calcul des rappels : ', texteDuPlanificateur(planificateur)),
      h('li', {}, 'Révisions les jours où des Questions étaient dues : ', revisionsDesJoursDus.jours
        ? `${revisionsDesJoursDus.pourcentage} % des jours (${revisionsDesJoursDus.faites} sur ${pluriel(revisionsDesJoursDus.jours, 'jour')})` : 'aucun jour de Questions dues.'),
      h('li', {}, 'Prédictions avant une partie de la page : ', predictions.faites
        ? `${pluriel(predictions.faites, 'faite')}, ${predictions.justes} juste${predictions.justes > 1 ? 's' : ''} (${predictions.pourcentage} %).` : 'aucune pour l’instant.'),
      h('li', {}, 'Cartes de ligne : ', texteDesCartes(cartes)),
      h('li', {}, 'Questions : ', `${pluriel(qs.signalees, 'signalée')}, ${pluriel(qs.retablies, 'rétablie')} sur la période ; ${pluriel(qs.suspectes, 'suspecte')} en ce moment.`),
    ),
    h('p', {}, h('strong', {}, 'Les rappels tombent-ils au bon moment ?')),
    h('p', { className: 'doux' }, 'Pour chaque tranche de chances de s’en souvenir annoncées par l’appli avant la réponse, la part de réponses justes aux Révisions du jour.'),
    h('ul', {}, calibration.map((t) => h('li', {}, `Quand l’appli pensait qu’il s’en souviendrait à ${t.de}–${t.a} % : `, t.reponses
      ? `${t.pourcentage} % de réponses justes (${t.justes} sur ${pluriel(t.reponses, 'réponse')}, ${t.predit} % annoncé en moyenne)` : 'aucune réponse.'))))] },
  { titre: '🔔 Rappel dans ton calendrier', bloc: 'reglages', replie: true, rendu: (_agregats, { profil, moment }) => rappelCalendrier(profil, moment) },
];
// Les trois blocs de la Vue parent (#164), dans l'ordre de la page ; chaque section de SECTIONS_PARENT dit le sien (`bloc`).
// Une section `replie` s'ouvre à la demande (<details>) ; les autres restent ouvertes.
const BLOCS_PARENT = [
  { id: 'retient', titre: 'Ce qu’il retient' },
  { id: 'aide', titre: 'Ce qui demande de l’aide' },
  { id: 'reglages', titre: 'Réglages et coûts' },
];
// Sections repliées que le parent a ouvertes : gardées quand un geste (Rétablir, Signaler) recharge l'écran.
const sectionsParentOuvertes = new Set();
const sectionParent = ({ titre, replie, rendu }, agregats, contexte) => {
  if (!replie) return h('section', { className: 'vue-parent' }, h('h4', {}, titre), rendu(agregats, contexte));
  return h('details', { className: 'vue-parent section-repliable', open: sectionsParentOuvertes.has(`${contexte.slug}/${titre}`),
    ontoggle: (e) => { if (!e.target.isConnected) return; const cle = `${contexte.slug}/${titre}`; if (e.target.open) sectionsParentOuvertes.add(cle); else sectionsParentOuvertes.delete(cle); } },
  h('summary', {}, h('h4', {}, titre)), rendu(agregats, contexte));
};
// Le sommaire mène à un bloc sans toucher au hash (c'est celui du routeur) ; une cible repliée s'ouvre.
const allerAuBloc = (id) => (e) => {
  e.preventDefault();
  const cible = document.getElementById(`bloc-${id}`);
  cible.closest('details')?.setAttribute('open', '');
  cible.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  cible.focus({ preventScroll: true });
};

// Planificateur de mémoire (#161), en mots : celui qui sert et pourquoi, avec la perte de prédiction de chacun (plus basse = mieux).
const texteDuPlanificateur = ({ utilise, reponses, seuil, fsrs5, fsrs6 }) => {
  const base = `${utilise === 'fsrs6' ? 'FSRS-6, la plus récente' : 'FSRS-5, l’ancienne'}.`;
  if (reponses < seuil) return `${base} Il faut ${pluriel(seuil, 'réponse')} aux Révisions du jour pour la comparer à l’autre, ${reponses} jusqu’ici.`;
  const erreur = (m) => String(m.perte).replace('.', ',');
  return `${base} Elle est choisie parce qu’elle devine le mieux ce que l’Élève retient : erreur de prédiction (plus basse = mieux) ${erreur(fsrs5)} pour FSRS-5, ${erreur(fsrs6)} pour FSRS-6, sur ${pluriel(reponses, 'réponse')}.`;
};

// Part de « Je ne sais pas » d'un indicateur (#147), en mots et en chiffres : « 12 % dans les quiz de page (3 sur 25 réponses). »
  // Cartes de ligne (#190) dans « Pour les curieux » : retournement, composition, échecs et coût, en mots simples.
const texteDesCartes = ({ pretes, nonRetourneesA7Jours: n7, delaiMedianHeures, composees, echecs, coutMoyenUsd }) => {
  if (!pretes) return 'aucune carte prête pour l’instant.';
  const delai = delaiMedianHeures === null ? 'aucune retournée' : delaiMedianHeures < 48 ? `retournées au bout de ${delaiMedianHeures} h d’habitude` : `retournées au bout de ${Math.round(delaiMedianHeures / 24)} jours d’habitude`;
  return [`${pluriel(pretes, 'prête')}, ${delai}`,
    n7.cartes ? `${n7.pourcentage} % pas encore retournées sept jours après (${n7.jamais} sur ${pluriel(n7.cartes, 'carte')})` : null,
    composees.pourcentage === null ? null : `${composees.pourcentage} % dessinées sur mesure, le reste en scène de repli`,
    echecs ? `${pluriel(echecs, 'dessin raté')}` : 'aucun dessin raté',
    coutMoyenUsd === null ? null : `environ ${equivalentUsd(coutMoyenUsd)} par carte (indicatif)`].filter(Boolean).join(' ; ') + '.';
};
const partJeNeSaisPas = ({ reponses, jeNeSaisPas, pourcentage }, ou, vide) =>
  reponses ? `${pourcentage} % ${ou} (${jeNeSaisPas} sur ${pluriel(reponses, 'réponse')}).` : `${vide}.`;
const MESURES_REBOND = [['nouvelle', 'page nouvelle'], ['revoir', 'Revoir'], ['defi', 'Défi'], ['reviser', 'Réviser']];

// Bouton d'action du parent sur une Question (Rétablir, Signaler) : envoie { lecon, page, id, …corps() } puis recharge l'écran.
function actionParent(contexte, libelle, url, q, corps = () => ({})) {
  const erreur = h('span', { className: 'erreur', role: 'alert' });
  const bouton = h('button', { className: 'secondaire', type: 'button', onclick: async () => {
    bouton.disabled = true;
    try { await api(url, { method: 'POST', body: { lecon: q.lecon, page: q.page, id: q.id, ...corps() } }); await contexte.recharger(); }
    catch (e) { erreur.textContent = e.message; bouton.disabled = false; }
  } }, libelle);
  return h('span', { className: 'actions-parent' }, bouton, erreur);
}
// « Signaler » côté parent : une raison de la liste fermée du Kit (comme pour l'Élève), auteur parent.
function signalerParent(contexte, q) {
  const raison = h('select', { ariaLabel: 'Raison du signalement' }, RAISONS_SIGNALEMENT.map((r) => h('option', { value: r.id }, r.libelle)));
  return h('span', { className: 'actions-parent' }, raison, ' ',
    actionParent(contexte, 'Signaler', `eleves/${contexte.slug}/parent/signalements`, q, () => ({ raison: raison.value })));
}
// Motif d'une Question suspecte, en mots.
const motifSuspect = (m) => (m.type === 'reponse-fausse-sure'
  ? `Même réponse fausse « ${m.choisie} » choisie « sûr » à ${m.jours} jours différents, alors qu’un Objectif qu’elle couvre est Retenu.`
  : `La Variante ${m.variante + 1} est ratée ${m.ratees} fois sur ${m.reponses}, la Question d’origine ${m.origine.ratees} sur ${m.origine.reponses}.`);

// Rappel dans le calendrier du parent (#155) : le parent règle l'heure de chaque moment, puis télécharge un fichier
// iCalendar généré par le serveur, à importer dans son propre calendrier. Sans moment choisi par l'Élève, on l'explique.
function rappelCalendrier(profil, etat) {
  const zone = h('div', {});
  const libelle = (id) => etat.choix.find((c) => c.id === id).libelle;
  const dessiner = () => {
    const avecHeure = etat.moment && etat.moment in etat.heures;
    zone.replaceChildren(...garder([
      h('p', { className: 'doux' }, 'Le fichier se génère ici, sur cet appareil : rien n’est envoyé ni hébergé. Tu l’ouvres dans ton calendrier, qui te préviendra à l’heure choisie.'),
      h('div', { className: 'rappel-heures' }, Object.entries(etat.heures).map(([id, heure]) => h('label', {},
        `${libelle(id)} `,
        h('input', { type: 'time', value: heure, required: true, onchange: async (e) => {
          if (!e.target.value) { e.target.value = etat.heures[id]; return; }
          Object.assign(etat, await api(`eleves/${profil.slug}/moment/heures`, { method: 'PUT', body: { heures: { [id]: e.target.value } } }));
          dessiner();
        } })))),
      avecHeure
        ? [h('p', {}, `${profil.pseudo} a choisi : ${libelle(etat.moment).toLowerCase()}, à ${etat.heures[etat.moment].replace(':', ' h ')}.`),
          h('a', { className: 'bouton', href: `/api/eleves/${profil.slug}/moment/calendrier.ics`, download: `rappel-${profil.slug}.ics` }, 'Télécharger le fichier calendrier')]
        : h('p', {}, `${profil.pseudo} n’a pas encore choisi son moment de révision (l’appli le lui propose après l’Objectif du jour). Il n’y a donc pas de fichier à télécharger pour l’instant.`)]));
  };
  dessiner();
  return zone;
}

async function ecranParent(profil) {
  const agregats = await api(`eleves/${profil.slug}/parent`);
  const moment = await api(`eleves/${profil.slug}/moment/heures`);
  const contexte = { slug: profil.slug, profil, moment, recharger: () => ecranParent(profil) };
  montrer(
    h('h2', { className: 'vue-parent-titre' }, `👪 Vue parent : ${profil.pseudo}`),
    h('p', {}, h('button', { className: 'secondaire', onclick: () => (location.hash = '#/profil') }, '← Profil')),
    h('nav', { className: 'sommaire-parent', 'aria-label': 'Sommaire de la Vue parent' },
      BLOCS_PARENT.map(({ id, titre }) => h('a', { href: '#/parent', onclick: allerAuBloc(id) }, titre))),
    BLOCS_PARENT.map(({ id, titre }) => h('section', { className: 'bloc-parent', id: `bloc-${id}`, tabIndex: -1 },
      h('h3', {}, titre),
      SECTIONS_PARENT.filter((section) => section.bloc === id).map((section) => sectionParent(section, agregats, contexte)))));
}

// Étoiles et Fusées d'une Leçon : « ⭐ n · 🚀 n » en Leçon libre, « ☆☆☆ · 🚀 n » en Leçon de révision, sans Fusée à 0
// (voir morceauxRecompensesLecon).
const recompensesLecon = (l) => h('span', { className: 'etoiles' },
  morceauxRecompensesLecon(l).map(({ texte, titre, classe }) => h('span', { className: classe, title: titre },
    // Un emoji qui porte un sens garde un nom textuel : « Pages réussies : 3 », « Quiz réussi : obtenue »
    titre ? nommer(texte, `${titre} : ${texte.replace(/\D+/g, '') || (classe === 'pleine' ? 'obtenue' : 'pas encore')}`) : texte)));

// Lien « ← Mes leçons » des en-têtes d'écran et de la carte d'attente.
const retourAccueil = () => h('a', { className: 'retour-accueil', href: '#/' }, '← Mes leçons');

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
// Espaces insécables du français autour des guillemets et devant : ; ? !, pour qu'un retour à la ligne n'en isole
// jamais un (« Dire « stop » calmement », « Troie : mythe ou réalité ? »). Le texte vient du prof ou de l'Élève.
const insecables = (texte) => texte.replace(/« /g, '«\u00a0').replace(/ ([»:;?!])/g, '\u00a0$1');

// Accueil : chaque Leçon est une ligne du réseau, à la couleur de sa Catégorie (celle du Kit), et ses Objectifs
// en sont les stations. L'état d'un Objectif se lit à la forme de sa station : vide (pas encore évalué), hachurée
// (à confirmer), blanche (atteint), verte (Retenu). Le terminus « Acquis » s'allume au palier de Maîtrise Acquis.
const cleCategorie = (categorie) => categorie.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
// La couleur de ligne d'une Catégorie, en style à poser sur ce qui la porte (carte, section, en-tête de Séance).
const styleLigne = (categorie) => `--ligne: var(--ligne-${cleCategorie(categorie)}, var(--ligne-autre))`;
const ETATS_STATION = [
  { cle: 'retenu', classe: 'retenue', libelle: 'Retenu' },
  { cle: 'atteint', classe: 'atteinte', libelle: 'atteint' },
  { cle: 'aConfirmer', classe: 'a-confirmer', libelle: 'à confirmer' },
];
const PAS_EVALUE = { classe: 'pas-encore', libelle: 'pas encore évalué' };
const etatStation = (objectif) => ETATS_STATION.find((e) => objectif[e.cle]) ?? PAS_EVALUE;
const station = (objectif, attrs = {}, ...enfants) => h('span', { className: `station ${etatStation(objectif).classe}`, ...attrs }, ...enfants);

function resumeObjectifs(objectifs) {
  const compte = (cle) => objectifs.filter((o) => o[cle]).length;
  const aConfirmer = compte('aConfirmer');
  return [`${compte('atteint')} sur ${pluriel(objectifs.length, 'Objectif')} atteints`, pluriel(compte('retenu'), 'Retenu'),
    aConfirmer && `${aConfirmer} à confirmer`].filter(Boolean).join(', ');
}

// Le trait est à la couleur de la Catégorie jusqu'à la dernière station atteinte, gris ensuite. La prochaine station
// (la première pas encore atteinte) est marquée sur la ligne quand l'Élève a une page à faire.
function ligneLecon(l, { ici = false } = {}) {
  const objectifs = l.objectifs ?? [];
  const acquis = l.maitrise?.palier === 'acquis';
  const terminus = h('span', { className: `terminus${acquis ? ' allume' : ''}`, title: acquis ? `Maîtrise : ${l.maitrise.pourcentage} %` : undefined }, acquis ? 'Acquis ✓' : 'Acquis');
  if (!objectifs.length) return h('div', { className: 'ligne en-travaux' }, h('span', { className: 'travaux' }, 'Objectifs à venir'), terminus);
  const dernier = objectifs.findLastIndex((o) => o.atteint);
  const prochaine = ici ? objectifs.findIndex((o) => !o.atteint) : -1;
  return h('div', { className: 'ligne', role: 'img', ariaLabel: `${resumeObjectifs(objectifs)}${acquis ? ', Leçon acquise' : ''}` },
    objectifs.map((o, i) => [
      i > 0 && h('span', { className: `troncon${i <= dernier ? ' fait' : ''}` }),
      station(o, { title: `${o.texte} (${etatStation(o).libelle})`, className: `station ${etatStation(o).classe}${i === prochaine ? ' ici' : ''}` })]),
    h('span', { className: `troncon${acquis ? ' fait' : ''}` }), terminus);
}

function badgeMaitrise(maitrise) {
  if (!maitrise) return h('span', { className: 'maitrise' }, 'Pas encore évalué');
  const { classe, mot } = PALIERS_DE_MAITRISE[maitrise.palier];
  return h('span', { className: `maitrise ${classe}`, title: `Maîtrise : ${maitrise.pourcentage} %` }, mot);
}

// Ce que l'Élève trouvera en touchant Continuer : la page annoncée par le prof (Leçon libre), le quiz de la dernière
// page s'il n'est pas fait, ou rien de plus.
function prochaineStation(l) {
  const texte = !l.pages?.length ? 'Ta première page'
    : l.quizEnAttente ? 'Le quiz de ta page'
      : l.mode === 'libre' && l.ensuite ? l.ensuite : null;
  return texte && h('p', { className: 'prochaine' }, h('span', { className: 'libelle' }, 'Prochaine station\u00a0: '), insecables(texte));
}

const texteControle = (jours) => (jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`);
const controleAVenir = (l) => Number.isInteger(l.joursAvantControle) && l.joursAvantControle >= 0;

// enTete : la Leçon où l'Élève en était, posée en tête de l'accueil ; seul son Continuer est un bouton plein, les
// autres sont en contour à la couleur de leur ligne.
// `cartes` (#196) : { cartesLigne, son, slug, retourner } ; l'encart porte l'emplacement de la carte de la Leçon, sans
// quitter l'accueil. Sans `cartes` (badges illisibles), l'encart n'a pas d'emplacement.
function carteLecon(l, { enTete = false, cartes } = {}) {
  const objectifs = l.objectifs ?? [];
  const adresse = `#/lecon/${l.id}`;
  const corps = h('div', { className: 'lecon-corps' },
    h('div', { className: 'lecon-tete' },
      l.niveauLecon && h('span', { className: 'niveau', title: 'Niveau de Leçon' }, `Niveau ${l.niveauLecon}`),
      h('h4', {}, h('a', { href: adresse }, insecables(l.titre))),
      l.maitrise?.palier !== 'acquis' && badgeMaitrise(l.maitrise)), // Acquis : dit par le terminus allumé, pas deux fois
    ligneLecon(l, { ici: !!prochaineStation(l) }),
    h('div', { className: 'lecon-bas' },
      prochaineStation(l) ?? h('span', { className: 'prochaine' }),
      controleAVenir(l) && h('span', { className: 'controle' }, `📅 Contrôle ${texteControle(l.joursAvantControle)}`),
      l.terminee && h('span', { className: 'terminee' }, '🏁 Terminée'),
      recompensesLecon(l),
      h('a', { className: `bouton${enTete ? ' plein' : ''}`, href: adresse }, 'Continuer')),
    objectifs.length > 0 && h('details', { className: 'objectifs' },
      h('summary', {}, h('span', { className: 'voir' }, 'Voir les Objectifs'), h('span', { className: 'cacher' }, 'Cacher les Objectifs')),
      h('ul', {}, objectifs.map((o) => h('li', {}, station(o), h('span', {}, o.texte, h('small', {}, etatStation(o).libelle)))))));
  return h('article', { className: `lecon${enTete ? ' en-tete' : ''}${cartes ? ' avec-carte' : ''}`, style: styleLigne(l.categorie) },
    corps, cartes && emplacementCarteLecon(l, cartes));
}

// L'emplacement de carte de l'encart (#196), à trois états : le template « À découvrir » (aucune carte de ligne), le dos
// « Nouveau » (carte gagnée : la toucher ouvre la cérémonie ici ; pas cliquable tant qu'elle n'est pas composée), la
// carte de ligne retournable (retournée, rangée d'office). Redessiné sur place quand la cérémonie retourne la carte.
function emplacementCarteLecon(l, { cartesLigne, son, slug, retourner }) {
  const zone = h('div', { className: 'lecon-carte' });
  const dessiner = () => {
    const e = emplacementCarte(cartesLigne, l.id);
    if (e.etat === 'a-decouvrir') return zone.replaceChildren(carteLeconADecouvrir());
    const carte = { type: 'ligne', id: l.id };
    zone.dataset.cle = cleCarte(carte);
    if (e.etat === 'rangee') return zone.replaceChildren(carteLigne(e.carte));
    const c = { ...carte, cle: cleCarte(carte), medaillon: e.medaillon, ligne: e.carte, libelle: e.libelle };
    const dos = carteFaceCachee(c, () => ceremonie(c, { son, slug, retourner: (x) => { retourner(x); dessiner(); } }));
    zone.replaceChildren(dos);
  };
  dessiner();
  return zone;
}

// Une erreur à la place d'un bloc, annoncée comme une alerte, avec de quoi repartir (#169).
const blocErreur = (texte) => h('div', { className: 'bloc-erreur', role: 'alert' },
  h('p', { className: 'erreur' }, texte), h('button', { className: 'secondaire', onclick: () => route() }, 'Réessayer'));

// L'accueil lit cinq choses, chacune pour son compte. Les Leçons et les Révisions sont l'essentiel : en échec, une erreur
// avec « Réessayer » prend la place du bloc. Rythme, badges et moment sont accessoires : le bloc est omis ou dit en une phrase
// qu'il n'a pas pu s'afficher, sans bloquer l'Élève.
async function ecranAccueil(profil) {
  const lire = (chemin) => api(`eleves/${profil.slug}/${chemin}`);
  const lectures = await lireEnParallele({ lecons: lire('lecons'), revisions: lire('revisions'), rythme: lire('rythme'), badges: lire('badges'), moment: lire('moment') });
  const lecons = lectures.lecons.valeur ?? [];
  const { revisions: { valeur: revisions }, rythme: { valeur: rythme }, badges: { valeur: badges }, moment: { valeur: moment } } = lectures;
  if (badges) retenirRecompenses(profil, badges);
  barreNav(profil);
  // La cérémonie des cartes se joue ici, dans l'encart de la Leçon (#196) : le retournement met à jour les données déjà
  // lues et la pastille « Nouveau » de la navigation, sans nouvel appel.
  const cartes = badges && { cartesLigne: badges.cartesLigne ?? [], son: badges.son === true, slug: profil.slug, retourner: (c) => {
    carteRetournee(badges, c);
    retenirRecompenses(profil, badges);
    barreNav(profil);
  } };
  // « Où j'en étais ? » : la Leçon à la dernière activité la plus récente passe en tête, hors de sa Catégorie (#141).
  const enTete = lecons.reduce((recente, l) => (l.derniereActivite > recente.derniereActivite ? l : recente), lecons[0]);
  const parCategorie = Object.groupBy(lecons.filter((l) => l !== enTete), (l) => l.categorie);
  montrer(
    recapitulatifSemaine(profil, rythme?.recapitulatif),
    bandeauDuJour(profil, { calendrier: badges?.calendrier, rythme, revisions, moment }),
    h('div', { className: 'lecons-tete' },
      h('h2', {}, 'Mes leçons'),
      // Une action en retrait, sauf quand le réseau est vide : c'est alors la seule chose à faire, et le seul bouton plein.
      h('button', { className: lectures.lecons.erreur || lecons.length ? 'bouton-nouvelle' : 'bouton-nouvelle plein', onclick: () => (location.hash = '#/nouvelle-lecon') }, '✨ Apprendre quelque chose de nouveau')),
    lectures.lecons.erreur && blocErreur('Tes leçons n’ont pas pu s’afficher. Ce n’est pas de ta faute : réessaie dans un instant.'),
    !lectures.lecons.erreur && lecons.length === 0 && h('div', { className: 'reseau-vide' },
      h('div', { className: 'ligne en-travaux' }, h('span', { className: 'travaux' }, 'Ton réseau est encore vide'), h('span', { className: 'terminus' }, 'Acquis')),
      h('p', {}, "Tu n'as pas encore de leçon. Touche « Apprendre quelque chose de nouveau » pour ouvrir ta première ligne.")),
    enTete && h('section', { className: 'categorie reprise', style: styleLigne(enTete.categorie) },
      h('h3', {}, 'Tu en étais là', h('span', { className: 'reprise-categorie' }, `· ${enTete.categorie}`)),
      carteLecon(enTete, { enTete: true, cartes })),
    h('div', { className: 'reseau' }, config.categories.filter((c) => parCategorie[c]).map((c) => h('section', {
      className: `categorie${parCategorie[c].length > 1 ? ' etendue' : ''}`, style: styleLigne(c) },
    h('h3', {}, c),
    h('div', { className: 'lecons-grille' }, parCategorie[c].map((l) => carteLecon(l, { cartes })))))));
}

// Le bandeau du jour (#192) : le salut et le lien vers Mes badges, la Série de jours (#75), l'Objectif du jour avec
// ce qui a été gagné aujourd'hui (Étoiles, Fusées, Paliers de Badge) et le Moment de révision, et les Révisions du
// jour (#66). Les sept jours d'avant sont dans le calendrier de Mes badges, les contrôles sur les cartes de Leçon. Aucun score.
const JOURS_SEMAINE = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
const JOURS_ENTIERS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const enJour = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const jourPlus = (jour, n) => { const d = new Date(`${jour}T12:00:00`); d.setDate(d.getDate() + n); return enJour(d); };
const ETATS_JOUR = { vide: '', pale: 'travaillé', plein: 'Objectif du jour atteint' };

// Un jour en tampon, seule façon de dessiner un jour : le calendrier de Mes badges.
// Une journée : { jour, etat, joker, gains… }, celle du calendrier du serveur ou jourSansRien. classeJour porte l'état
// (vide, pâle, plein), aujourd'hui et futur ; lectureJour le dit en mots, le tampon étant muet.
// `debut` (calendrier de Mes badges) : le premier Jour de l'Élève ; un jour d'avant est neutre (« avant »), sans le
// contour en tirets d'un jour vide, pour ne pas se lire comme un jour manqué.
const classeJour = ({ jour, etat }, aujourdhui, debut = '') => `jour ${etat}${jour === aujourdhui ? ' aujourdhui' : ''}${jour > aujourdhui ? ' futur' : ''}${jour < debut ? ' avant' : ''}`;
const lectureJour = (nom, { jour, etat, joker, repare }, aujourdhui, debut = '') => [nom, jour === aujourdhui && "aujourd'hui", jour < debut ? 'avant ton premier jour' : ETATS_JOUR[etat], joker && 'protégé par un joker', repare && 'jour réparé'].filter(Boolean).join(', ');
// Sans `jour`, un tampon muet : la légende du calendrier.
const tamponJour = ({ jour, joker, repare }) => h('span', { className: 'tampon', ariaHidden: 'true' }, jour ? String(Number(jour.slice(8))) : '', joker && h('span', { className: 'joker' }, '🛡️'), repare && h('span', { className: 'joker' }, '🩹'));

// Mon moment de révision (#154) : une liste fermée de moments, proposée une fois par jour après l'Objectif du jour
// atteint (`aProposer`), puis rappelée dans le bandeau ; l'Élève peut le changer ou le retirer, sans être relancé.
function momentDeRevision(profil, etat) {
  const libelle = (id) => etat.choix.find((c) => c.id === id)?.libelle;
  const zone = h('div', { className: 'moment-revision' });
  const enregistrer = async (moment) => {
    Object.assign(etat, await api(`eleves/${profil.slug}/moment`, { method: 'PUT', body: { moment } }));
    dessiner(false);
  };
  const choix = (question) => h('div', { className: 'moment-choix', role: 'group', ariaLabel: question },
    h('strong', {}, question),
    h('div', { className: 'moment-boutons' }, etat.choix.map((c) =>
      h('button', { className: 'secondaire', ariaPressed: String(etat.moment === c.id), onclick: () => enregistrer(c.id) }, c.libelle))));
  const dessiner = (ouvert) => {
    zone.replaceChildren(ouvert
      ? h('div', {}, choix('Quand reviendras-tu ?'),
        h('button', { className: 'moment-lien', onclick: () => (etat.moment ? enregistrer(null) : dessiner(false)) }, etat.moment ? 'Ne plus en choisir' : 'Plus tard'))
      : etat.moment
        ? h('small', {}, `🕐 Je reviens : ${libelle(etat.moment).toLowerCase()} `, h('button', { className: 'moment-lien', onclick: () => dessiner(true) }, 'Changer'))
        : h('button', { className: 'moment-lien', onclick: () => dessiner(true) }, 'Choisir mon moment de révision'));
  };
  dessiner(etat.aProposer);
  return zone;
}

function bandeauDuJour(profil, { calendrier, rythme, revisions, moment }) {
  const pastille = revisions && pastilleRevisions(revisions, rythme?.objectifDuJour.revisions);
  const boutonRevisions = revisions
    ? h('button', { className: `bouton-revisions${revisions.dues ? '' : ' secondaire'}`, onclick: () => (location.hash = '#/revisions') },
      h('strong', {}, 'Mes révisions du jour',
        pastille.compte > 0 && h('span', { className: 'compte' }, String(pastille.compte), h('span', { className: 'cache' }, pastille.cache))),
      h('small', {}, pastille.sousTitre))
    : blocErreur('Tes révisions du jour n’ont pas pu s’afficher.');
  if (!rythme) {
    return h('section', { className: 'bandeau-jour' },
      h('div', { className: 'bandeau-gauche' }, h('h2', {}, `Salut ${profil.pseudo} !`), h('p', { className: 'doux' }, 'Ton objectif du jour n’a pas pu s’afficher pour le moment.')),
      h('div', { className: 'bandeau-cote' }, boutonRevisions));
  }
  const { objectifDuJour: o, serieDeJours, reparation, meilleureSerie, joursTravailles } = rythme;
  const gains = gainsDuJour(calendrier);
  const gainsAujourdhui = gains && h('div', { className: 'gains' },
    (gains.etoiles > 0 || gains.fusees > 0) && h('span', { className: 'gains-nombres' },
      gains.etoiles > 0 && h('span', { title: pluriel(gains.etoiles, 'Étoile') }, nommer(`⭐${gains.etoiles > 1 ? gains.etoiles : ''}`, pluriel(gains.etoiles, 'Étoile'))),
      gains.fusees > 0 && h('span', { title: pluriel(gains.fusees, 'Fusée') }, nommer(`🚀${gains.fusees > 1 ? gains.fusees : ''}`, pluriel(gains.fusees, 'Fusée')))),
    gains.paliers.length > 0 && h('span', { className: 'gains-badges' },
      gains.paliers.map((p) => h('span', { className: 'gain-badge', title: `Badge : ${nomEtPalier(p)}` }, pastilleBadge(p)))));
  const objectif = o.atteint
    ? h('strong', {}, 'Objectif du jour atteint')
    : h('strong', {}, `Objectif du jour : ${o.revisions}/${o.revisionsVisees} révisions ou ${pluriel(o.pagesVisees, 'page')}`);
  const serie = serieDeJours.jours
    ? `${pluriel(serieDeJours.jours, 'jour')} de suite${serieDeJours.aujourdhui ? '' : ' : encore un petit effort aujourd’hui'}`
    : 'Chaque jour un peu, c’est comme ça qu’on retient';
  return h('section', { className: 'bandeau-jour' },
    h('div', { className: 'bandeau-gauche' },
      h('div', { className: 'bandeau-titre' },
        h('h2', {}, `Salut ${profil.pseudo} !`),
        h('a', { href: '#/badges' }, 'Mon calendrier et mes badges')),
      // La série, dans la colonne de gauche sous le salut, en corps normal et en --texte (#166).
      h('div', { className: 'serie-de-jours' },
        h('p', {}, serie,
          serieDeJours.jokers > 0 && h('span', { title: 'Chaque lundi, tu reçois 3 jokers pour la semaine. Un joker protège ta série de jours pour un jour manqué. Ceux qui restent ne passent pas à la semaine suivante.' }, ` · 🛡️ ${pluriel(serieDeJours.jokers, 'joker')}`)),
        serieDeJours.jokersUtilises > 0 && h('p', {}, `🛡️ ${serieDeJours.jokersUtilises > 1 ? 'Des jokers ont' : 'Un joker a'} protégé ta série de jours pendant ta pause.`),
        // Série repartie (#159) : la meilleure série et tous les Jours travaillés restent sous les yeux, à la place d'un « 0 » seul.
        meilleureSerie > serieDeJours.jours && h('p', { className: 'serie-acquis' },
          `Ta meilleure série : ${pluriel(meilleureSerie, 'jour')} · ${pluriel(joursTravailles, 'jour')} travaillé${joursTravailles > 1 ? 's' : ''} en tout`),
        // Réparation proposée le jour du retour, sans reproche : deux fois l'Objectif du jour, et la série d'avant reprend.
        reparation && h('p', { className: 'reparation' },
          `🩹 Ta série peut reprendre : aujourd’hui, fais deux fois l’Objectif du jour (${reparation.revisions}/${reparation.revisionsVisees} révisions ou ${reparation.pages}/${pluriel(reparation.pagesVisees, 'page')}) et hier sera réparé.`))),
    h('div', { className: 'bandeau-cote' },
      h('div', { className: `objectif-du-jour${o.atteint ? ' atteint' : ''}` }, objectif, gainsAujourdhui,
        moment && momentDeRevision(profil, moment)),
      // Des Questions dues : un contour accent et une pastille de compte, jamais un bouton plein (#141).
      boutonRevisions));
}

// Badges (#95) : un emoji dans une pastille à la couleur de son Palier ; grisé tant qu'il n'est pas obtenu.
const pastilleBadge = ({ emoji, palier }, attrs = {}) => h('span', { className: `pastille-badge ${palier ?? 'pas-encore'}`, title: palier ?? 'pas encore', ...attrs }, emoji);
// L'année n'est écrite que quand ce n'est pas celle d'aujourd'hui.
// Le premier du mois s'écrit « 1er ».
const premierDuMois = (texte) => texte.replace(/^1 /, '1er ');
const dateBadge = (jour) => premierDuMois(new Date(`${jour}T12:00:00`).toLocaleDateString('fr-BE',
  { day: 'numeric', month: 'long', ...(jour.slice(0, 4) !== String(new Date().getFullYear()) && { year: 'numeric' }) }));
const dateCourte = (jour) => premierDuMois(new Date(`${jour}T12:00:00`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' }));

// La ligne d'un Badge : ses Paliers en sont les stations (`station`), cerclées de la couleur de leur Palier une fois
// atteintes, le prochain en « vous êtes ici ». Le trait est parcouru jusqu'au dernier Palier obtenu, puis rempli en
// partie vers le prochain selon `avance`, sans chiffre ; le texte alternatif dit ce chemin en mots.
const cheminVers = (avance) => (avance < 1 / 3 ? 'au début du chemin vers le Palier' : avance < 2 / 3 ? 'à mi-chemin du Palier' : 'presque au Palier');
function ligneBadge(b, estNouveau) {
  const dernier = b.paliers.findLastIndex((p) => p.jour);
  const prochaine = b.prochain ? dernier + 1 : -1;
  const obtenus = b.paliers.filter((p) => p.jour).map((p) => `${p.palier} le ${dateBadge(p.jour)}${estNouveau(p.palier) ? ' (nouveau)' : ''}`).join(', ');
  const suite = b.prochain ? `${cheminVers(b.avance)} ${b.prochain.palier}` : 'tous les Paliers obtenus';
  return h('div', { className: 'ligne ligne-badge', role: 'img', ariaLabel: `${b.nom} : ${obtenus} ; ${suite}` },
    b.paliers.map((p, i) => [
      i > 0 && h('span', i === prochaine
        ? { className: 'troncon en-cours', style: `--avance: ${Math.round(b.avance * 100)}%` }
        : { className: `troncon${i <= dernier ? ' fait' : ''}` }),
      station({ atteint: !!p.jour }, { className: `station ${p.jour ? 'atteinte' : 'pas-encore'} ${p.palier}${i === prochaine ? ' ici' : ''}` },
        h('span', { className: 'station-nom' }, p.palier,
          p.jour && h('small', {}, dateCourte(p.jour)),
          estNouveau(p.palier) && h('span', { className: 'nouveau' }, 'Nouveau')))]));
}

// Mes badges (#95) : en tête, le total d'Étoiles et de Fusées de l'Élève (#96) ; puis le calendrier des Jours
// travaillés (#99) dans une carte comme le bandeau du jour, et à côté la collection : chaque Badge commencé en
// ligne (`ligneBadge`), le dernier Palier gagné en premier ; les badges surprise trouvés ; puis, à découvrir, les
// Badges sans Palier avec ce qu'ils saluent, sans ligne ni décompte. Les Paliers à retourner attendent dans « Nouvelles cartes » ; le mot d'accueil
// s'affiche à la première ouverture.
// Une carte retournée est rangée d'office (#196) : elle quitte « Nouvelles cartes » pour « Mon réseau » ou la grille des
// Badges dès le retournement, sans étape « Ajouter ». Partagé par Mes badges et l'accueil : met à jour les données lues
// (la carte n'est plus à retourner, la carte de ligne l'est) sans nouvel appel.
function carteRetournee(donnees, c) {
  donnees.aRetourner = (donnees.aRetourner ?? []).filter((x) => cleCarte(x) !== c.cle);
  const l = c.type === 'ligne' && donnees.cartesLigne?.find((x) => x.lecon === c.id);
  if (l) Object.assign(l, { retourne: new Date().toISOString(), ...(c.ligne?.calques && { calques: c.ligne.calques, etat: c.ligne.etat, prete: c.ligne.prete }) }); // composée pendant l'attente (#197)
}

async function ecranBadges(profil) {
  const donnees = await api(`eleves/${profil.slug}/badges?ouverture=1`);
  const { nouveaux, accueil, totaux, calendrier, cartesLigne = [] } = donnees;
  donnees.aRetourner ??= [];
  const estNouveau = (b, palier) => nouveaux.some((n) => n.id === b.id && n.palier === palier);
  const collection = h('section', { className: 'collection', ariaLabel: 'Ma collection' });
  const afficherCollection = () => {
    const { aRetourner } = donnees;
    retenirRecompenses(profil, { totaux, aRetourner }); // « Nouveau » reste tant qu'une carte attend ; ouvrir Mes badges ne l'efface pas
    barreNav(profil);
    const { obtenues, aDecouvrir } = rangerCollection(collectionRangee(donnees.collection, aRetourner));
    const attente = nouvellesCartes({ aRetourner, collection: donnees.collection, cartesLigne });
    collection.replaceChildren(...garder([
      h('h3', {}, 'Ma collection'),
      attente.length > 0 && nouvellesCartesGroupe(attente, { son: donnees.son === true, slug: profil.slug, retourner: (c) => { carteRetournee(donnees, c); afficherCollection(); } }),
      monReseau(cartesLigneRangees(cartesLigne)),
      h('h4', {}, 'Mes Badges'),
      obtenues.length
        ? h('ul', { className: 'cartes-reseau cartes-badges', ariaLabel: 'Mes Badges' }, obtenues.map((b) => h('li', {}, carteBadge(b, estNouveau(b, b.palier)))))
        : h('p', { className: 'doux' }, 'Ton premier Palier donnera ici sa carte.'),
      aDecouvrir.length > 0 && [
        h('h4', {}, 'À découvrir'),
        h('ul', { className: 'cartes-reseau cartes-badges a-decouvrir', ariaLabel: 'À découvrir' }, aDecouvrir.map((b) => h('li', {}, carteADecouvrir(b))))]]));
  };
  afficherCollection();
  const { obtenues } = rangerCollection(donnees.collection);
  montrer(
    h('p', {}, retourAccueil()),
    h('div', { className: 'badges-tete' },
      h('h2', {}, 'Mes badges'),
      totaux && h('p', { className: 'totaux-recompenses', title: 'Toutes tes Leçons et Révisions du jour' },
        `⭐ ${pluriel(totaux.etoiles, 'Étoile')} · 🚀 ${pluriel(totaux.fusees, 'Fusée')}`)),
    accueil && obtenues.length > 0 && h('p', { className: 'accueil-badges' }, 'Voici les badges que tu as déjà gagnés !'), // l'appli parle, pas le prof
    h('div', { className: 'badges-corps' }, calendrierJours(calendrier), collection));
}

// « Nouvelles cartes » : chaque Palier gagné et chaque carte de ligne attend face cachée (médaillon du Badge, ou 🚉, sans
// dire le Palier) jusqu'au geste de l'Élève, même des jours plus tard, dans l'ordre qu'il veut. Toucher une carte ouvre
// la cérémonie ; retournée, la carte est rangée d'office.
function nouvellesCartesGroupe(cartes, { son, slug, retourner }) {
  return h('div', { className: 'cl-nouvelles' },
    h('h4', { className: 'cl-groupe' }, TEXTES_CEREMONIE.titreGroupe),
    h('ul', { className: 'cartes-reseau cartes-attente', ariaLabel: TEXTES_CEREMONIE.titreGroupe }, cartes.map((c) => {
      const li = h('li', {}, carteFaceCachee(c, () => ceremonie(c, { son, slug, retourner })));
      li.dataset.cle = c.cle; // retrouver la carte quand la cérémonie se ferme (le groupe a été redessiné)
      return li;
    })));
}

// Les cartes gagnées, proposées face cachée à l'endroit du gain (#197) : sur le Retour de quiz et l'écran de fin de
// Révision du jour, à côté de l'annonce. `gain` : { paliers: [{ id, palier }], lignes: [identifiants de Leçon] }, tel que
// le serveur les annonce. L'état des cartes est lu à l'affichage : une carte déjà retournée n'est plus proposée. Toucher
// une carte ouvre la même cérémonie, sur la page courante ; jamais d'ouverture d'elle-même. Rien à proposer, ou lecture
// impossible : rien n'est dessiné, le Retour reste tel quel (la carte attend dans Mes badges ou l'encart de la Leçon).
function cartesDuGainEcran(profil, gain) {
  const zone = h('div', { className: 'cartes-gain', hidden: true });
  if (!gain.paliers?.length && !gain.lignes?.length) return zone;
  api(`eleves/${profil.slug}/badges`).then((donnees) => {
    donnees.aRetourner ??= [];
    const retourner = (c) => { carteRetournee(donnees, c); retenirRecompenses(profil, donnees); barreNav(profil); dessiner(); };
    const dessiner = () => {
      const cartes = cartesDuGain({ ...gain, aRetourner: donnees.aRetourner, collection: donnees.collection ?? [], cartesLigne: donnees.cartesLigne ?? [] });
      zone.hidden = cartes.length === 0;
      zone.replaceChildren(...(cartes.length ? [h('p', { className: 'cg-mot' }, TEXTES_CEREMONIE.propose(cartes.length)),
        h('ul', { className: 'cartes-attente', ariaLabel: TEXTES_CEREMONIE.titreGroupe }, cartes.map((c) => {
          const li = h('li', {}, carteFaceCachee(c, () => ceremonie(c, { son: donnees.son === true, slug: profil.slug, retourner })));
          li.dataset.cle = c.cle; // retrouver la carte quand la cérémonie se ferme
          return li;
        }))] : []));
    };
    dessiner();
  }).catch(() => {});
  return zone;
}

function carteFaceCachee(c, ouvrir) {
  return h('button', { type: 'button', className: `carte-ligne-carte carte-cachee ${c.type === 'ligne' ? 'ligne' : c.badge.surprise ? 'palier-unique' : 'palier-neutre'}`, ariaLabel: c.libelle, onclick: ouvrir },
    h('span', { className: 'cl-cachee-face' },
      h('span', { className: 'cl-medaillon', ariaHidden: 'true' }, c.medaillon),
      h('span', { className: 'nouveau', ariaHidden: 'true' }, 'Nouveau')));
}

// La cérémonie (spec #182, #187) : un dialogue plein écran sur le voile. La carte attend face cachée ; au geste, elle se
// retourne (enregistré côté serveur, idempotent), ses couches entrent l'une après l'autre (ciel, décor, ligne, puis le
// héros qui tombe), les stations s'allument une à une, une gerbe d'éclats part une seule fois, puis le nom, ce que la
// carte salue et le bouton « Fermer ». Fermer (bouton, Échap) après le retournement range la carte d'office ; « Plus tard »
// avant le retournement la laisse face cachée. Partagée : Mes badges et l'accueil (#196). Les animations
// sont bornées (moins de 3 s, aucun clignotement) et coupées sous prefers-reduced-motion : tout apparaît d'emblée.
const DUREE_CEREMONIE = 2400;
function ceremonie(c, { son, slug, retourner }) {
  const ligne = c.type === 'ligne';
  const badge = ligne ? null : badgeAuPalier(c.badge, c.palier);
  const nom = ligne ? c.ligne.titre : `${c.badge.nom} · ${c.badge.surprise ? 'badge surprise' : `Palier ${c.palier}`}`;
  const salue = ligne ? dosCarteLigne(c.ligne, jourEnMots).salue : (c.badge.phrase ?? 'Trouvé sans le chercher.');
  const ouvreur = document.activeElement; // la carte qui a ouvert : le focus lui revient à la fermeture
  const dlg = h('dialog', { className: 'cartes-ceremonie', ariaLabel: TEXTES_CEREMONIE.dialogue(ligne ? c.ligne.titre : c.badge.nom) });
  const texte = h('div', { className: 'cer-texte', ariaLive: 'polite' }, h('p', {}, TEXTES_CEREMONIE.aide));
  const scene = h('div', { className: 'cer-carte' });
  const ok = h('button', { type: 'button', className: 'cer-ok', hidden: true, onclick: () => dlg.close() }, TEXTES_CEREMONIE.fermerRetournee);
  const plusTard = h('button', { type: 'button', className: 'secondaire cer-plus-tard', onclick: () => dlg.close() }, TEXTES_CEREMONIE.fermer);
  let retournee = false;
  const minuteurs = [];
  const apres = (ms, f) => minuteurs.push(setTimeout(() => { if (dlg.isConnected) f(); }, ms));
  const reveler = () => {
    if (retournee) return;
    retournee = true;
    pause.hidden = true;
    api(`eleves/${slug}/cartes/retournement`, { method: 'POST', body: ligne ? { type: 'ligne', id: c.id } : { type: 'palier', id: c.id, palier: c.palier } }).catch(() => {});
    jouerCarillon(ligne ? 4 : rangDeCarte(badge) /* carte de ligne : rang fixe, le plus long (voir public/carillon.js) */, { actif: son });
    const vraie = ligne ? carteLigne(c.ligne) : carteBadge(badge, false);
    vraie.classList.add('entree');
    const stations = [...vraie.querySelectorAll('.cl-ligne .station')];
    stations.forEach((st, i) => st.style.setProperty('--i', String(i)));
    vraie.style.setProperty('--pas', `${Math.min(0.18, 1.2 / Math.max(stations.length, 1)).toFixed(3)}s`);
    scene.replaceChildren(vraie, h('div', { className: 'cer-eclats', ariaHidden: 'true' }, Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2, d = 90 + (i % 3) * 30;
      return h('i', { style: `--dx:${(Math.cos(a) * d).toFixed(0)}px; --dy:${(Math.sin(a) * d).toFixed(0)}px; animation-delay:${(1.5 + (i % 4) * 0.03).toFixed(2)}s` });
    })));
    vraie.focus(); // le dos retourné est retiré de la scène : le focus suit la vraie carte (ses boucles tournent, bornées)
    plusTard.hidden = true; // retournée : un seul bouton, « Fermer », qui range la carte
    retourner(c); // rangée d'office : l'écran derrière la cérémonie la montre déjà à sa place
    setTimeout(() => {
      if (!dlg.isConnected) return;
      texte.replaceChildren(h('h3', {}, nom), h('p', {}, salue));
      ok.hidden = false;
      ok.focus();
    }, moinsDeMouvement() ? 0 : DUREE_CEREMONIE);
  };
  // Carte de ligne pas encore composée (#197) : l'esquisse se dessine en boucle jusqu'à ce que la carte soit prête, puis
  // la cérémonie prend le relais sans second geste. Le retournement n'est enregistré qu'à ce moment (le serveur refuse
  // celui d'une carte pas prête). L'état de la carte est relu sans relancer de composition.
  const pause = h('button', { type: 'button', className: 'secondaire att-pause', hidden: true }, TEXTES_CEREMONIE.pause);
  const attendre = () => {
    if (retournee || attenteEnCours) return;
    attenteEnCours = true;
    const reduit = moinsDeMouvement();
    const carte = h('div', { className: `att-carte ${cleCategorieCarte(c.ligne.categorie)}`, style: `--ligne: var(--ligne-${cleCategorieCarte(c.ligne.categorie)}, var(--ligne-autre))` }, h('div', { className: 'att-in' }));
    const dessin = () => { carte.firstChild.innerHTML = esquisseCarte(c.ligne.categorie); };
    dessin();
    scene.replaceChildren(carte);
    texte.replaceChildren(h('p', {}, reduit ? TEXTES_CEREMONIE.attenteFixe : TEXTES_CEREMONIE.attente));
    (reduit ? plusTard : pause).focus(); // le dos a quitté la scène : le focus reste dans le dialogue
    let repli = false, prete = false;
    const accelerer = () => carte.getAnimations({ subtree: true }).forEach((a) => { a.playbackRate = ATTENTE.vitesse; });
    apres(0, accelerer); // la carte n'est dans le document qu'après ce code : le premier passage est accéléré comme les autres
    // La boucle (pilotée ici : le CSS global seul laisserait la carte se vider brusquement à chaque tour sous mouvement
    // réduit) : l'esquisse en entier, un fondu, puis elle repart de zéro. Pas de boucle sous mouvement réduit.
    const tour = () => apres(ATTENTE.tour, () => {
      if (retournee || repli || prete) return;
      if (carte.classList.contains('pause')) return tour();
      carte.classList.add('rejoue-sortie');
      apres(ATTENTE.fondu, () => {
        if (repli || prete) return;
        dessin(); carte.classList.remove('rejoue-sortie'); accelerer(); tour();
      });
    });
    if (!reduit) tour();
    pause.hidden = reduit; // WCAG 2.2.2 : visible dès le départ, libellé seul (pas d'aria-pressed)
    pause.onclick = () => { const p = carte.classList.toggle('pause'); pause.textContent = p ? TEXTES_CEREMONIE.reprendre : TEXTES_CEREMONIE.pause; };
    const finir = (nouvelle) => { // l'esquisse se met de profil, la vraie carte revient du même angle (cer-retourne)
      prete = true;
      c.ligne = nouvelle;
      carte.classList.remove('pause', 'rejoue-sortie');
      carte.classList.add('fin');
      texte.replaceChildren(h('p', {}, ''));
      apres(reduit ? 0 : ATTENTE.profil, reveler);
    };
    const relire = async () => {
      let nouvelle = null;
      try { nouvelle = (await api(`eleves/${slug}/cartes/ligne/${c.id}`)).carte; } catch { /* la relecture suivante réessaie */ }
      if (!dlg.isConnected || retournee || prete || repli) return;
      if (nouvelle?.calques) return finir(nouvelle);
      apres(ATTENTE.relecture, relire);
    };
    apres(ATTENTE.relecture, relire);
    // Délai maximal : texte calme, le dessin complet figé, le dialogue reste ouvert (pas de fermeture automatique, WCAG
    // 2.2.1). La carte reste à retourner dans l'encart de la Leçon.
    apres(ATTENTE.repli, () => {
      if (retournee || prete) return;
      repli = true;
      pause.hidden = true;
      carte.classList.remove('rejoue-sortie', 'pause');
      dessin(); // jamais une carte vide figée en plein fondu
      carte.getAnimations({ subtree: true }).forEach((a) => { try { a.finish(); } catch { /* rotation sans fin : ignorée */ } });
      carte.classList.add('pose');
      texte.replaceChildren(h('p', {}, TEXTES_CEREMONIE.repli));
      plusTard.textContent = TEXTES_CEREMONIE.fermerRepli;
    });
  };
  let attenteEnCours = false;
  const dos = carteFaceCachee(c, () => (ligne && !c.ligne.calques ? attendre() : reveler()));
  scene.append(dos);
  dlg.append(h('div', { className: 'cer-scene' }, scene, texte, ok, pause, plusTard));
  // À la fermeture, le focus revient à l'Élève là où il était. L'écran derrière a été redessiné au retournement et l'ancien
  // bouton n'existe plus : le focus va à la carte rangée au même endroit (encart de la Leçon, Mon réseau), sinon au titre.
  dlg.addEventListener('close', () => {
    dlg.remove();
    minuteurs.forEach(clearTimeout);
    const cible = ouvreur.isConnected ? ouvreur : document.querySelector(`[data-cle="${CSS.escape(c.cle)}"] .carte-ligne-carte`) ?? document.querySelector('.cl-groupe') ?? document.querySelector('.collection h3, .lecons-tete h2');
    if (cible) { if (!cible.matches('button, a')) cible.tabIndex = -1; cible.focus(); }
  });
  document.body.append(dlg);
  dlg.showModal();
  dos.focus();
}

// La carte de Badge (spec #182, #186) : la même carte que celle de ligne (5 sur 7, trois calques et un héros en
// parallaxe, reflet, retournement), dessinée à la main (`artDeBadge`), au cadre de la couleur du Palier atteint, avec
// autant de crans que la Famille a de Paliers (allumés jusqu'au Palier atteint). L'or et le diamant ont une feuille
// holographique qui suit le pointeur. Le dos dit ce que le Badge salue, la date, le prochain Palier en mots, puis la
// ligne de Badge (`ligneBadge`), seule jauge du système, sans chiffre ; ses noms de Palier sont dits par le texte
// alternatif. Une surprise est violette (`palier-unique`).
function carteBadge(b, nouveau) {
  const palier = b.surprise ? 'unique' : b.palier, art = artDeBadge(b, rangDeCarte(b)), dos = dosCarteBadge(b, jourEnMots);
  const calque = (classe, svg) => h('div', { className: `cl-calque ${classe}`, ariaHidden: 'true', innerHTML: svg });
  const el = h('button', { type: 'button', className: `carte-ligne-carte carte-badge-carte ${palier}`, ariaPressed: 'false',
    ariaLabel: `${libelleCarteBadge(b, jourEnMots, nouveau)} ${dos.prochain}`, style: `--ligne: var(--palier-${palier}); --sur-ligne: var(--sur-accent)` },
  h('div', { className: 'cl-incl' },
    h('div', { className: 'cl-face cl-avant' },
      h('div', { className: 'cl-cadre', ariaHidden: 'true' }, calque('cl-l1', art.l1), calque('cl-l2', art.l2)),
      h('div', { className: 'cl-bord', ariaHidden: 'true' }),
      calque('cl-heros', art.heros),
      h('div', { className: 'cl-texte', ariaHidden: 'true' }, h('span', { className: 'cl-titre' }, b.nom),
        h('span', { className: 'cl-bas' }, h('span', { className: b.surprise ? 'cl-etiquette mot' : 'cl-etiquette' }, b.surprise ? 'Surprise' : b.emoji),
          h('span', { className: 'cl-crans' }, crans(b).map((allume) => h('i', { className: allume ? '' : 'vide' }))))),
      h('div', { className: 'cl-reflet', ariaHidden: 'true' }),
      aFeuilleHolo(b) && h('div', { className: 'cl-holo', ariaHidden: 'true' }),
      nouveau && h('span', { className: 'nouveau', ariaHidden: 'true' }, 'Nouveau')),
    h('div', { className: 'cl-face cl-dos', ariaHidden: 'true' },
      h('span', { className: 'cl-cartouche' }, dos.cartouche), h('strong', {}, dos.nom), h('p', {}, dos.salue),
      !b.surprise && ligneBadge(b, () => false),
      h('small', {}, dos.date, ' ', dos.prochain))));
  animerCarte(el);
  return el;
}

// « À découvrir » : une carte hachurée, sans dessin ni décompte, qui dit ce que le Badge salue.
// Dans l'encart d'une Leçon sans carte de ligne (#196) : le même gabarit hachuré, sans dessin ni décompte.
const carteLeconADecouvrir = () => h('div', { className: 'carte-badge-carte verrou', role: 'group', ariaLabel: 'Carte de ligne de cette Leçon, à découvrir' },
  h('div', { className: 'cl-face', ariaHidden: 'true' }, h('span', { className: 'cl-emoji' }, '🚉'), h('strong', {}, 'À découvrir')));

const carteADecouvrir = (b) => h('div', { className: 'carte-badge-carte verrou', role: 'group', ariaLabel: libelleADecouvrir(b) },
  h('div', { className: 'cl-face', ariaHidden: 'true' }, h('span', { className: 'cl-emoji' }, b.emoji), h('strong', {}, b.nom), h('p', {}, b.phrase)));

// La carte de ligne (spec #182, #185) : une Leçon Acquise, gardée pour toujours. 5 sur 7, cadre à la couleur de la
// Catégorie, trois calques (l1 fond, l2 décor, héros qui peut déborder) en parallaxe sous la ligne de la Leçon, dessinée
// par `ligneLecon` (une station par Objectif) ; le terminus « Acquis ✓ » en est détaché pour passer au-dessus du héros.
// Face : titre en haut, Catégorie en bas, sur un voile. Dos : cartouche, nom, ce que la carte salue, date. Un bouton :
// toucher ou Entrée la retourne. Les calques sont déjà filtrés par le serveur ; la scène générique vient du code.
const jourEnMots = (jour) => `le ${new Date(`${jour}T12:00:00`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^1 /, '1er ')}`;
const moinsDeMouvement = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const DUREE_BOUCLES = 6000; // les boucles du décor s'arrêtent d'elles-mêmes

// L'inclinaison au pointeur et au toucher, le retournement (toucher ou Entrée) et les boucles du décor, qui ne tournent
// que quand on regarde la carte : partagés par la carte de ligne et la carte de Badge.
function animerCarte(el) {
  let arret;
  const bouger = (x, y) => { el.style.setProperty('--px', x.toFixed(3)); el.style.setProperty('--py', y.toFixed(3)); };
  const regarder = () => { el.classList.add('regarde'); clearTimeout(arret); arret = setTimeout(() => el.classList.remove('regarde'), DUREE_BOUCLES); };
  const pointeur = (e) => { // inclinaison au pointeur et au toucher, de -1 à 1 depuis le centre
    if (moinsDeMouvement()) return;
    const r = el.getBoundingClientRect();
    bouger(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)), Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2)));
    el.classList.add('actif');
  };
  const repos = () => { bouger(0, 0); el.classList.remove('actif'); };
  el.addEventListener('pointermove', pointeur);
  el.addEventListener('pointerdown', pointeur);
  el.addEventListener('pointerenter', regarder);
  el.addEventListener('focus', regarder);
  el.addEventListener('pointerleave', repos);
  el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') repos(); });
  el.addEventListener('pointercancel', repos);
  el.addEventListener('click', () => { const retournee = el.classList.toggle('retournee'); el.ariaPressed = String(retournee); regarder(); });
}

function carteLigne(c) {
  const cle = cleCategorieCarte(c.categorie), calques = calquesDeCarte(c), dos = dosCarteLigne(c, jourEnMots);
  const ligne = ligneLecon({ objectifs: objectifsDeCarte(c.objectifs), maitrise: { palier: 'acquis', pourcentage: 100 } });
  const terminus = ligne.querySelector('.terminus');
  terminus.removeAttribute('title'); // pas de pourcentage : le terminus allumé est la seule annonce
  terminus.remove();
  const calque = (classe, svg) => h('div', { className: `cl-calque ${classe}`, ariaHidden: 'true', innerHTML: svg });
  const el = h('button', { type: 'button', className: `carte-ligne-carte ${cle}`, ariaPressed: 'false', ariaLabel: libelleCarteLigne(c, jourEnMots),
    style: `--ligne: var(--ligne-${cle}); --n: ${Math.max(1, c.objectifs ?? 1)}` },
  h('div', { className: 'cl-incl' },
    h('div', { className: 'cl-face cl-avant' },
      h('div', { className: 'cl-cadre', ariaHidden: 'true' }, calque('cl-l1', calques.l1), calque('cl-l2', calques.l2), h('div', { className: 'cl-ligne' }, ligne)),
      h('div', { className: 'cl-bord', ariaHidden: 'true' }),
      calque('cl-heros', calques.heros),
      h('div', { className: 'cl-texte', ariaHidden: 'true' }, h('span', { className: 'cl-titre' }, c.titre), h('span', { className: 'cl-etiquette' }, c.categorie)),
      h('div', { className: 'cl-terminus', ariaHidden: 'true' }, terminus),
      h('div', { className: 'cl-reflet', ariaHidden: 'true' })),
    h('div', { className: 'cl-face cl-dos', ariaHidden: 'true' },
      h('span', { className: 'cl-cartouche' }, dos.cartouche), h('strong', {}, dos.nom), h('p', {}, dos.salue), h('small', {}, dos.date))));
  animerCarte(el);
  return el;
}

// « Mon réseau » : les cartes de ligne retournées, de la plus récente à la plus ancienne (le serveur les range ainsi).
// Une carte prête mais pas encore retournée attend dans « Nouvelles cartes ». Vide : une phrase, sans pression.
function monReseau(cartesLigne) {
  const visibles = cartesLigne.filter((c) => c.retourne);
  return [
    h('h4', { className: 'cl-groupe' }, 'Mon réseau'),
    visibles.length
      ? h('ul', { className: 'cartes-reseau', ariaLabel: 'Mon réseau' }, visibles.map((c) => { const li = h('li', {}, carteLigne(c)); li.dataset.cle = `ligne/${c.lecon}`; return li; }))
      : h('p', { className: 'doux' }, 'Chaque Leçon Acquise ajoutera ici sa carte.')];
}

// Calendrier des Jours travaillés (#99), mois par mois, en tampons de jour : pâle quand
// l'Élève a travaillé, plein quand l'Objectif du jour est atteint, 🛡️ quand un Joker a couvert le jour. Toucher un jour
// montre à côté ce qui a été fait et gagné, sans score ; aujourd'hui est montré à l'ouverture.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const moisSuivant = (mois, n) => { const [a, m] = mois.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const jourSansRien = (jour) => ({ jour, etat: 'vide', joker: false, repare: false, lecons: [], quiz: 0, revisions: 0, gains: { etoiles: 0, fusees: 0, paliers: [] } });
function calendrierJours({ aujourdhui, jours }) {
  const parJour = new Map(jours.map((journee) => [journee.jour, journee]));
  const duJour = (jour) => parJour.get(jour) ?? jourSansRien(jour);
  const debut = jours[0]?.jour ?? aujourdhui; // premier jour de l'Élève dans le calendrier
  const premier = debut.slice(0, 7);
  const dernier = aujourdhui.slice(0, 7);
  let mois = dernier;
  const bloc = h('section', { className: 'mon-calendrier', ariaLabel: 'Mon calendrier' });
  const detail = (journee) => {
    const faits = [journee.quiz && `${journee.quiz} quiz`, journee.revisions && pluriel(journee.revisions, 'Révision') + ' du jour'].filter(Boolean).join(' · ');
    const gains = [journee.gains.etoiles && `⭐ ${pluriel(journee.gains.etoiles, 'Étoile')}`, journee.gains.fusees && `🚀 ${pluriel(journee.gains.fusees, 'Fusée')}`].filter(Boolean).join(' · ');
    // Plusieurs Leçons : une liste plutôt qu'une phrase à virgules ; les gains en pastilles qui reviennent à la ligne.
    const lecons = journee.lecons.map((l) => l.titre);
    return [
      h('strong', {}, dateBadge(journee.jour)),
      lecons.length === 1 && h('p', {}, `📚 ${lecons[0]}`),
      lecons.length > 1 && h('ul', { className: 'lecons-du-jour', ariaLabel: 'Leçons' }, lecons.map((titre) => h('li', {}, `📚 ${titre}`))),
      faits && h('p', {}, faits),
      journee.joker && h('p', {}, '🛡️ Un joker a protégé ta série de jours ce jour-là.'),
      journee.repare && h('p', {}, '🩹 Tu as réparé ta série de jours ce jour-là.'),
      (gains || journee.gains.paliers.length > 0) && h('div', { className: 'gains-du-jour' }, gains && h('span', {}, `Gagné : ${gains}`),
        journee.gains.paliers.map((p) => h('span', { className: 'gain-badge' }, pastilleBadge(p, { ariaHidden: 'true', title: undefined }), nomEtPalier(p)))),
      !faits && !journee.lecons.length && !journee.joker && !journee.repare && !gains && !journee.gains.paliers.length && h('p', { className: 'doux' }, journee.jour === aujourdhui ? 'Pas encore aujourd’hui.' : 'Rien ce jour-là.')];
  };
  const afficher = (choisi, focaliser = true) => {
    const [a, m] = mois.split('-').map(Number);
    const decalage = (new Date(a, m - 1, 1).getDay() + 6) % 7; // lundi en premier
    const nombre = new Date(a, m, 0).getDate();
    const cases = [...Array(decalage).fill(null), ...Array.from({ length: nombre }, (_, i) => `${mois}-${String(i + 1).padStart(2, '0')}`)];
    let aFocaliser = null;
    // Un seul arrêt de tabulation dans la grille : le jour choisi, sinon aujourd'hui, sinon le premier jour touchable
    // du mois ; les flèches passent d'un jour à l'autre (et d'un mois à l'autre), comme un calendrier natif.
    const touchable = (jour) => jour && jour >= debut && jour <= aujourdhui;
    const arret = [choisi, aujourdhui].find((j) => cases.includes(j) && touchable(j)) ?? cases.find(touchable);
    const deplacer = (e) => {
      const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!pas || !e.target.value) return;
      e.preventDefault();
      const cible = jourPlus(e.target.value, pas);
      if (!touchable(cible)) return;
      mois = cible.slice(0, 7);
      afficher(cible);
    };
    bloc.replaceChildren(
      h('div', { className: 'calendrier-jours' },
        h('div', { className: 'calendrier-mois' },
          h('button', { className: 'secondaire', name: 'precedent', ariaLabel: 'Mois précédent', title: 'Mois précédent', disabled: mois <= premier, onclick: () => { mois = moisSuivant(mois, -1); afficher(undefined, 'precedent'); } }, '‹'),
          h('h3', {}, `${MOIS[m - 1]} ${a}`),
          h('button', { className: 'secondaire', name: 'suivant', ariaLabel: 'Mois suivant', title: 'Mois suivant', disabled: mois >= dernier, onclick: () => { mois = moisSuivant(mois, 1); afficher(undefined, 'suivant'); } }, '›')),
        h('div', { className: 'calendrier-grille', role: 'group', ariaLabel: `${MOIS[m - 1]} ${a}`, onkeydown: deplacer },
          JOURS_SEMAINE.map((d) => h('span', { className: 'nom', ariaHidden: 'true' }, d)),
          cases.map((jour) => {
            if (!jour) return h('span', {});
            const journee = duJour(jour);
            const nom = `${JOURS_ENTIERS[(new Date(`${jour}T12:00:00`).getDay() + 6) % 7]} ${Number(jour.slice(8))} ${MOIS[m - 1]}`;
            const bouton = h('button', {
              className: `${classeJour(journee, aujourdhui, debut)} calendrier-jour${jour === choisi ? ' choisi' : ''}`,
              ariaLabel: lectureJour(nom, journee, aujourdhui, debut),
              ariaPressed: String(jour === choisi),
              ariaCurrent: jour === aujourdhui ? 'date' : undefined,
              disabled: !touchable(jour),
              tabIndex: jour === arret ? 0 : -1,
              value: jour,
              onclick: () => afficher(jour),
            }, tamponJour(journee));
            if (jour === choisi) aFocaliser = bouton;
            return bouton;
          })),
        h('p', { className: 'calendrier-legende' },
          [['pale', 'travaillé'], ['plein', 'Objectif du jour atteint'], ['vide', 'joker', true], ['vide', 'jour réparé', false, true]].map(([etat, mot, joker, repare]) =>
            h('span', { className: `jour ${etat}` }, tamponJour({ joker, repare }), mot)))),
      h('div', { className: 'calendrier-detail', ariaLive: 'polite' },
        choisi ? detail(duJour(choisi)) : h('p', { className: 'doux' }, 'Touche un jour pour voir ce que tu as fait et gagné.')));
    // Après ‹ ou ›, le focus reste sur le même bouton (ou, désactivé au bout de l'historique, va à la grille) ; après un
    // jour touché, sur ce jour.
    const cible = typeof focaliser === 'string'
      ? bloc.querySelector(`button[name="${focaliser}"]:not(:disabled)`) ?? bloc.querySelector('.calendrier-grille button[tabindex="0"]')
      : aFocaliser;
    if (focaliser) cible?.focus();
  };
  afficher(aujourdhui, false); // le détail d'aujourd'hui d'abord, sans prendre le focus
  return bloc;
}

// Récapitulatif de la semaine passée (#75) : le serveur ne l'envoie qu'au premier retour de la semaine (le lundi, ou le
// premier jour où l'Élève revient). Ce jour-là, l'Élève peut le fermer (mémorisé dans ce navigateur : simple confort).
const cleRecapitulatif = (profil, recap) => `recapitulatif-${profil.slug}-${recap.du}`;
function recapitulatifSemaine(profil, recap) {
  if (!recap) return null;
  try { if (localStorage.getItem(cleRecapitulatif(profil, recap))) return null; } catch { /* stockage indisponible */ }
  const retenus = recap.objectifsRetenus;
  const titre = retenus
    ? `Cette semaine, tu as retenu ${retenus} ${retenus > 1 ? 'nouveaux Objectifs' : 'nouvel Objectif'} 🌟`
    : 'Ta semaine, en résumé';
  const faits = [recap.revisions && pluriel(recap.revisions, 'révision'), recap.pages && pluriel(recap.pages, 'page') + ' de leçon',
    recap.joursAtteints && `Objectif du jour atteint ${recap.joursAtteints === 1 ? 'un jour' : `${recap.joursAtteints} jours`}`].filter(Boolean).join(' · ');
  const carte = h('div', { className: 'carte recapitulatif' },
    h('button', { className: 'secondaire fermer', title: 'Fermer', ariaLabel: 'Fermer le retour', onclick: () => {
      try { localStorage.setItem(cleRecapitulatif(profil, recap), '1'); } catch { /* stockage indisponible */ }
      carte.remove();
    } }, '✕'),
    h('strong', {}, `📅 ${titre}`),
    faits && h('small', {}, `Tes efforts : ${faits}. C’est la régularité qui fait retenir.`));
  return carte;
}

// Révisions du jour (#66) : des séries courtes de Questions dues, toutes Leçons mélangées, affichées tout de suite avec
// le rendu du quiz du Kit, sans le prof. Chaque réponse part au serveur, qui la corrige lui-même et la journalise.
// À la fin des Questions dues, un message le dit, et l'Élève peut continuer avec des Questions pas encore dues.
async function ecranRevisions(profil) {
  montrer(h('p', {}, retourAccueil()), h('h2', {}, '🧠 Mes révisions du jour'),
    revisionsDuJour(profil, { fin: h('button', { className: 'secondaire', onclick: () => (location.hash = '#/') }, '← Mes leçons') }));
}

// Zone des Révisions du jour, sur leur écran ou pendant que le prof prépare une page (#49, US4). `fin` : bouton
// ajouté au message de fin.
function revisionsDuJour(profil, { fin: boutonFin = null } = {}) {
  const url = `eleves/${profil.slug}/revisions`;
  const zone = h('section', { className: 'kit-quiz revisions' });
  const erreur = h('p', { className: 'erreur' });

  // Récompenses de la série menée jusqu'au bout (#94), annoncées en tête de l'écran qui suit : l'Étoile du jour, puis
  // les nouveaux Paliers de Badge dans la phrase préparée par le serveur (#98).
  // Les cartes gagnées (Paliers, carte de ligne) sont proposées face cachée à côté, sans s'ouvrir d'elles-mêmes (#197).
  const annonces = (recompenses) => [
    ...[
      recompenses?.etoile && '⭐ Nouvelle Étoile : Révision du jour terminée !',
      recompenses?.annonce,
    ].filter(Boolean).map((texte) => h('p', { className: 'bulle-prof' }, texte)),
    recompenses && (recompenses.paliers?.length || recompenses.nouvellesCartesLigne?.length)
      ? cartesDuGainEcran(profil, { paliers: recompenses.paliers, lignes: recompenses.nouvellesCartesLigne }) : null,
  ].filter(Boolean);
  const fin = (suite, recompenses) => [
    ...annonces(recompenses),
    h('p', { className: 'bulle-prof' }, suite ? '🎉 Tu as tout revu, même en plus. Bravo !' : '🎉 Tu as fini tes révisions du jour ! Tu es libre.'),
    h('p', {}, !suite && h('button', { onclick: () => serie(true) }, '💪 Encore des questions'), ' ', boutonFin),
  ];
  // Une série : les Questions l'une après l'autre ; à la fin, la série suivante ou le message de fin.
  // `recompenses` : celles de la série précédente, à annoncer.
  const serie = async (suite = false, recompenses = null) => {
    erreur.textContent = '';
    let questions;
    try { ({ questions } = await api(`${url}${suite ? '?suite=1' : ''}`)); } catch (e) { return (erreur.textContent = e.message); }
    if (!questions.length) return zone.replaceChildren(...fin(suite, recompenses));
    let i = 0;
    let repondues = 0; // réponses bien reçues par le serveur
    const suivante = async () => {
      arreterLecture();
      if (i >= questions.length) {
        // Chaque Question de la série a sa réponse : la Révision du jour est menée jusqu'au bout.
        let nouvelles = null;
        if (repondues === questions.length) {
          try { ({ recompenses: nouvelles } = await api(`${url}/terminee`, { method: 'POST', body: {} })); } catch (e) { erreur.textContent = e.message; }
        }
        return serie(suite, nouvelles);
      }
      const q = questions[i++];
      const lien = h('a', { href: `#/lecon/${q.lecon}/${encodeURIComponent(q.page)}`, target: '_blank' }, '📖 Relire la page');
      const ensuite = h('p', { hidden: true }, h('button', { onclick: suivante }, i < questions.length ? 'Question suivante ▶️' : 'Continuer ▶️'));
      zone.replaceChildren(
        ...(i === 1 ? annonces(recompenses) : []),
        h('p', { className: 'revision-origine' }, h('small', {}, `${q.titreLecon} · question ${i} sur ${questions.length} · `, lien)),
        rendreQuestion(q, {
          lecture: profil.lectureVoixHaute,
          // Copie de la figure de sa page (#126), dépliée d'office : reconstruite élément par élément, sans balisage.
          figure: construireFigure(document, q.figure),
          figureDepliee: true,
          // Signaler (#146) : une raison de la liste fermée du Kit, enregistrée par le serveur.
          signaler: (raison) => api(`eleves/${profil.slug}/signalements`, { method: 'POST', body: { lecon: q.lecon, page: q.page, id: q.id, raison } }),
          quandCorrigee: async ({ choisie, sur }) => {
            try {
              await api(url, { method: 'POST', body: { lecon: q.lecon, page: q.page, id: q.id, choisie, sur, variante: q.variante } });
              repondues++;
              ensuite.hidden = false;
            } catch (e) { erreur.textContent = e.message; }
          },
        }),
        ensuite);
    };
    suivante();
  };
  serie();
  return [zone, erreur];
}

const enBase64 = (fichier) => new Promise((resolve, reject) => {
  const lecteur = new FileReader();
  lecteur.onload = () => resolve(lecteur.result.split(',')[1]);
  lecteur.onerror = () => reject(new Error(`Lecture impossible : ${fichier.name}`));
  lecteur.readAsDataURL(fichier);
});

// Cadrage posé par l'appli (ADR 0002), avant tout tour du prof : questions fixes, une à la fois, dans une carte en
// boîte de dialogue modale (le reste de l'écran est inerte sous le voile). L'Élève touche une réponse (« Je ne sais
// pas » compris) ; on renvoie les valeurs, jamais les libellés. Les questions posées selon le mode viennent de la
// configuration. « ✕ » ou Échap annule : on renvoie null, sans rien démarrer. Avec un `sujet` connu (sujet tapé
// ou titre d'une Proposition), la question le nomme (#118) ; en révision, il n'est pas encore connu.
async function cadrer(mode, sujet) {
  const cadrage = {};
  const cles = config.questionsCadrage[mode];
  for (const [i, cle] of cles.entries()) {
    const { question, reponses } = config.cadrage[cle];
    const posee = questionCadrage({ question, avecSujet: config.cadrageAvecSujet?.[cle], sujet });
    cadrage[cle] = await new Promise((choisir) => {
      const fermer = (valeur) => { boite.close(); boite.remove(); choisir(valeur); };
      const boite = h('dialog', { className: 'carte cadrage', oncancel: (e) => { e.preventDefault(); fermer(null); } },
        cles.length > 1 && h('p', { className: 'cadrage-etape' }, `Question ${i + 1} sur ${cles.length}`),
        h('h2', { id: 'cadrage-question' }, posee),
        h('div', { className: 'cadrage-choix' }, Object.entries(reponses).map(([valeur, libelle], j) =>
          h('button', { className: 'secondaire', autofocus: j === 0, onclick: () => fermer(valeur) }, libelle))),
        h('button', { className: 'secondaire annuler', ariaLabel: 'Annuler', title: 'Annuler', onclick: () => fermer(null) }, '✕'));
      boite.setAttribute('aria-labelledby', 'cadrage-question');
      app.append(boite);
      boite.showModal();
    });
    if (cadrage[cle] === null) return null;
  }
  return cadrage;
}

// Colonnes de la grille des Propositions pour chaque largeur (2, 3 ou 4 colonnes au plus, choisies par style.css) :
// aucune carte seule sur la dernière rangée.
const colonnesGrille = (nombre) => [2, 3, 4].map((maximum) => `--colonnes-${maximum}: ${colonnesPropositions(nombre, maximum)}`).join('; ');

// Voile d'attente de l'écran Nouvelle leçon : une carte posée au centre, le reste de l'écran inerte dessous, barre de
// navigation comprise. Pendant que le prof prépare la Leçon, la carte d'attente ; si la préparation échoue, une carte
// d'erreur prend sa place, avec « Réessayer » et « Retour aux idées ». `lever` retire la carte et rend l'écran actif ;
// l'écran l'appelle aussi en le quittant, pour ne pas laisser la barre de navigation inerte.
function voileAttente() {
  const element = h('div', { className: 'nouvelle-voile', hidden: true });
  const dessous = () => [...app.children, nav].filter((el) => el !== element);
  const poser = (carte) => {
    for (const el of dessous()) el.inert = true;
    element.replaceChildren(carte);
    element.hidden = false;
  };
  const lever = () => {
    element.hidden = true;
    element.replaceChildren();
    for (const el of dessous()) el.inert = false;
  };
  // L'attente est un état (jamais rouge) : la carte, région d'état, est remplie après sa pose pour être annoncée.
  // La nouvelle ligne y est « en travaux », dessinée par `ligneLecon`, à la couleur de sa Catégorie quand elle est connue.
  const attendre = ({ sujet, categorie, mode }) => {
    const { titre, duree, ensuite } = carteAttente({ sujet, mode });
    const carte = h('section', { className: 'carte carte-attente', role: 'status', tabIndex: -1, style: categorie ? styleLigne(categorie) : '--ligne: var(--ligne-autre)' });
    poser(carte);
    requestAnimationFrame(() => {
      carte.replaceChildren(
        h('h2', {}, titre),
        ligneLecon({ objectifs: [] }),
        h('p', { className: 'doux' }, duree),
        h('p', { className: 'attente-ensuite' }, ensuite),
        h('div', { className: 'attente-actions' }, retourAccueil()));
      carte.focus();
    });
  };
  // L'erreur est une alerte, à la place de la carte d'attente : le message du serveur, puis de quoi repartir.
  // `reessayer` et `revenir` sont appelés une fois la carte levée.
  const echouer = ({ message, reessayer, revenir }) => {
    const { titre, message: texte } = carteErreur({ message });
    const bouton = h('button', { onclick: () => { lever(); reessayer(); } }, 'Réessayer');
    poser(h('section', { className: 'carte carte-attente echec', role: 'alert' },
      h('h2', {}, titre),
      h('p', {}, texte),
      h('div', { className: 'attente-actions' },
        bouton,
        h('button', { className: 'secondaire', onclick: () => { lever(); revenir(); } }, 'Retour aux idées'),
        retourAccueil())));
    bouton.focus();
  };
  return { element, attendre, echouer, lever };
}

function ecranNouvelleLecon(profil) {
  const boutons = [];
  let boutonsIdees = []; // cartes de Propositions et « D'autres idées », remplacés à chaque affichage
  const activer = (actifs) => [...boutons, ...boutonsIdees].forEach((b) => (b.disabled = !actifs));
  // Réponses du Cadrage par démarrage (`cle`) : après une erreur du serveur, réessayer les garde sans le reposer.
  const cadrages = new Map();
  // Ce que l'Élève a touché en dernier, pour lui rendre le focus après un Cadrage annulé ou « Retour aux idées ».
  // Mémorisé au toucher : sur iPad Safari, toucher un bouton ne lui donne pas le focus et l'élément actif du document
  // vaut le corps de la page.
  let touche = null;
  const memoriser = (e) => { touche = e.target.closest?.('button, input, select, textarea, a') ?? touche; };
  app.addEventListener('pointerdown', memoriser, true);
  app.addEventListener('focusin', memoriser, true);
  // Les cartes de Propositions sont redessinées par la relecture des idées pendant le Cadrage ou l'attente : on retrouve
  // la carte touchée par sa clé de démarrage (`data-cle`), et à défaut le titre de la section d'idées.
  const rendreFocus = (element) => {
    const cle = element?.dataset?.cle;
    const cible = cle ? idees.querySelector(`[data-cle="${CSS.escape(cle)}"]`) : element;
    (cible?.isConnected ? cible : idees.querySelector('h2'))?.focus();
  };

  // Un démarrage : `cle`, ce que l'Élève démarre (`proposition:<titre>`, `sujet:<texte>` ou `revision`) ; `mode`,
  // 'libre' ou 'revision', pour les questions du Cadrage ; `envoi()`, le corps de la requête sans le Cadrage ;
  // `sujet` et `categorie`, connus avant la préparation (sujet tapé, ou titre et Catégorie d'une Proposition), que la
  // question du Cadrage et la carte d'attente nomment, absents en révision.
  const demarrer = async (demarrage) => {
    const retour = touche;
    const revenir = () => { activer(true); rendreFocus(retour); };
    activer(false);
    if (!cadrages.has(demarrage.cle)) {
      const reponses = await cadrer(demarrage.mode, demarrage.sujet);
      if (!reponses) return revenir(); // Cadrage annulé : l'Élève revient où il était, rien n'est envoyé
      cadrages.set(demarrage.cle, reponses);
    }
    preparer(demarrage, revenir);
  };

  const voile = voileAttente();
  const preparer = async (demarrage, revenir) => {
    voile.attendre(demarrage);
    try {
      const lecon = await api(`eleves/${profil.slug}/lecons`, { method: 'POST', body: { ...(await demarrage.envoi()), cadrage: cadrages.get(demarrage.cle) } });
      // L'Élève a pu revenir à « Mes leçons » : la Leçon y est déjà et finit de se préparer, on ne l'y ramène pas de force.
      if (actif) location.hash = `#/lecon/${lecon.id}`;
    } catch (e) {
      if (!actif) return;
      // Une coupure du réseau ou une réponse illisible n'a pas de message en français : le module des textes en donne un.
      voile.echouer({
        message: e instanceof TypeError || e instanceof SyntaxError ? undefined : e.message,
        reessayer: () => preparer(demarrage, revenir),
        revenir,
      });
    }
  };

  // Pas de validation native (bulle du navigateur, pas forcément en français) : l'appli dit ses messages, à côté du formulaire.
  const sujet = h('input', { id: 'sujet', placeholder: 'Ex. : les volcans, la conjugaison du futur…' });
  const fichiers = h('input', { id: 'fichiers', type: 'file', multiple: true, accept: '.pdf,image/*' });
  const dateControle = h('input', { type: 'date' });
  const erreurRevision = h('p', { className: 'erreur', role: 'alert' });
  const erreurSujet = h('p', { className: 'erreur', role: 'alert' });
  // Après le choix des photos, l'écran confirme les pages prises.
  const pagesChoisies = h('p', { className: 'doux', role: 'status' });
  fichiers.onchange = () => {
    pagesChoisies.textContent = fichiers.files.length ? confirmationFichiers([...fichiers.files].map((f) => f.name)) : '';
    erreurRevision.textContent = '';
  };
  boutons.push(h('button', {}, "C'est parti"), h('button', {}, 'Réviser'));

  // Propositions préparées en arrière-plan : on les lit sans attendre l'agent, et on revient voir tant qu'elles se préparent.
  const idees = h('div', {});
  // Un seul texte d'état, gardé d'un affichage à l'autre : il n'est annoncé que quand il change, pas à chaque relecture.
  const etatIdees = h('p', { className: 'doux', role: 'status' });
  let minuteur, actif = true;
  // Les anciennes Propositions restent affichées et cliquables pendant qu'on en prépare de nouvelles.
  const afficherPropositions = async () => {
    clearTimeout(minuteur);
    let etat, propositions;
    try { ({ etat, propositions } = await api(`eleves/${profil.slug}/propositions`)); } catch { etat = ECHEC_LECTURE; propositions = []; }
    if (!actif) return;
    if (etat === 'en préparation') minuteur = setTimeout(afficherPropositions, 3000);
    // Chaque Proposition porte la puce de sa Catégorie et dit son type en mots, dans une cartouche de signalétique :
    // pleine à la couleur de la ligne pour une suite (elle prolonge une ligne déjà ouverte), en filet pour un sujet original.
    // Le nom accessible se limite au titre et au type ; l'accroche complète (coupée à 2 lignes à l'écran) en est la
    // description. La Catégorie et « Au programme » restent visibles sur la carte.
    const cartes = propositions.map((p, i) => {
      const id = (partie) => `proposition-${i}-${partie}`;
      const cle = `proposition:${p.titre}`;
      const carte = h('button', { className: `carte proposition ${p.type}`, style: styleLigne(p.categorie), disabled: boutons[0].disabled,
        onclick: () => demarrer({ cle, mode: 'libre', envoi: async () => ({ proposition: p.titre }), sujet: p.titre, categorie: p.categorie }) },
        h('span', { className: 'proposition-tete' },
          h('span', { className: 'cartouche-type', id: id('type') }, cartoucheProposition(p.type)),
          p.auProgramme && h('span', { className: 'au-programme' }, '🎒 Au programme')),
        h('strong', { className: 'proposition-titre', id: id('titre') }, p.titre),
        h('span', { className: 'proposition-categorie' }, p.categorie),
        p.accroche && h('span', { className: 'accroche', id: id('accroche') }, p.accroche));
      carte.setAttribute('aria-labelledby', `${id('titre')} ${id('type')}`);
      carte.dataset.cle = cle;
      if (p.accroche) carte.setAttribute('aria-describedby', id('accroche'));
      return carte;
    });
    const autresIdees = h('button', { className: 'secondaire', disabled: boutons[0].disabled, onclick: async () => {
      autresIdees.disabled = true;
      // Un refus (génération déjà en cours) revient au même : on attend les Propositions qui se préparent.
      await api(`eleves/${profil.slug}/propositions`, { method: 'POST' }).catch(() => {});
      afficherPropositions();
    } }, "🔄 D'autres idées");
    // Ce que la section dit vient du module des textes ; tous ses enfants passent par `garder`, jamais de « false ».
    const section = sectionIdees({ etat, nombreCartes: cartes.length });
    if (etatIdees.textContent !== (section.texte ?? '')) etatIdees.textContent = section.texte ?? '';
    etatIdees.hidden = !section.texte;
    boutonsIdees = section.autresIdees ? [...cartes, autresIdees] : cartes;
    idees.replaceChildren(...garder([
      h('h2', { tabIndex: -1 }, '🎲 Des idées pour toi'),
      cartes.length > 0 && h('div', { className: 'propositions', style: colonnesGrille(cartes.length) }, cartes),
      etatIdees,
      section.autresIdees && autresIdees]));
  };
  afficherPropositions();
  quitterEcran = () => {
    actif = false; clearTimeout(minuteur);
    voile.lever(); // la barre de navigation, hors de l'écran, ne reste pas inerte
    app.removeEventListener('pointerdown', memoriser, true);
    app.removeEventListener('focusin', memoriser, true);
  };

  // Les deux autres voies sont repliées sous les Propositions : un bouton secondaire déplie son formulaire,
  // un seul à la fois, et le même bouton le replie.
  const voies = [
    { id: 'voie-revision', libelle: '📄 Réviser une leçon de classe', champ: fichiers,
      formulaire: h('form', { className: 'colonne', noValidate: true, onsubmit: (ev) => {
        ev.preventDefault();
        if (!fichiers.files.length) return (erreurRevision.textContent = FICHIERS_MANQUANTS);
        erreurRevision.textContent = '';
        demarrer({ cle: 'revision', mode: 'revision', envoi: async () => ({
          dateControle: dateControle.value || undefined,
          fichiers: await Promise.all([...fichiers.files].map(async (f) => ({ nom: f.name, data: await enBase64(f) }))),
        }) });
      } },
      h('label', { htmlFor: 'fichiers' }, 'Photos ou PDF de ta leçon (plusieurs pages possibles)'), fichiers, pagesChoisies,
      h('label', {}, 'Date du contrôle (facultatif)', h('br'), dateControle),
      boutons[1], erreurRevision) },
    { id: 'voie-sujet', libelle: '💡 Un sujet à moi', champ: sujet,
      formulaire: h('form', { className: 'colonne', noValidate: true, onsubmit: (ev) => {
        ev.preventDefault();
        // Sujet vérifié avant le Cadrage, comme le fera le serveur : pas de questions pour un sujet refusé.
        const message = messageSujet(sujet.value, config.sujetMax);
        erreurSujet.textContent = message ?? '';
        if (message) return sujet.focus();
        const texte = sujet.value.trim();
        demarrer({ cle: `sujet:${texte}`, mode: 'libre', envoi: async () => ({ sujet: texte }), sujet: texte });
      } }, h('label', { htmlFor: 'sujet' }, 'Ce que tu veux apprendre'), sujet, boutons[0], erreurSujet) },
  ];
  for (const voie of voies) {
    voie.bouton = h('button', { className: 'secondaire', ariaExpanded: 'false', onclick: () => deplier(voie) }, voie.libelle);
    voie.bouton.setAttribute('aria-controls', voie.id);
    voie.panneau = h('section', { id: voie.id, className: 'carte voie', hidden: true, ariaLabel: voie.libelle }, voie.formulaire);
  }
  const deplier = (choisie) => {
    for (const voie of voies) {
      const ouverte = voie === choisie && voie.panneau.hidden;
      voie.panneau.hidden = !ouverte;
      voie.bouton.ariaExpanded = String(ouverte);
      if (ouverte) voie.champ.focus();
    }
  };

  document.title = 'Une nouvelle ligne · Cartable';
  montrer(
    h('div', { className: 'nouvelle-tete' },
      retourAccueil(),
      h('h2', {}, 'Une nouvelle ligne')),
    idees,
    h('div', { className: 'nouvelle-voies' },
      h('div', { className: 'voies-boutons' }, voies.map((v) => v.bouton)),
      voies.map((v) => v.panneau)),
    voile.element);
}

// Libellé du bouton de chaque Rebond ; le serveur ne reçoit que l'action.
// L'Étape suivante montre le titre de la page annoncée par le prof, s'il est connu.
const LIBELLES_REBOND = { revoir: '🔁 Revoir', defi: '🏆 Défi', suivante: '➡️ Étape suivante', reviser: '📚 Réviser', commencer: '🚀 Commencer' };
const libelleRebond = (action, ensuite) => (action === 'suivante' && ensuite ? `${LIBELLES_REBOND.suivante} : ${ensuite}` : LIBELLES_REBOND[action]);

// Séance sans saisie libre : la page de leçon en plein écran. Une question du prof s'affiche au centre avec ses
// Réponses proposées ; après un quiz, son retour s'affiche au-dessus du bouton de la suite recommandée.
// Tout se déduit du dernier message du prof.
// `pageDemandee` : Page de leçon à ouvrir d'abord (lien d'une Révision du jour), sinon la dernière. `apercu` : ouverte
// depuis la vue parent, elle n'est pas notée comme une ouverture par l'Élève (indicateurs, #78).
async function ecranSession(profil, id, pageDemandee = null, { apercu = false } = {}) {
  let lecon = await api(`eleves/${profil.slug}/lecons/${id}${apercu ? '' : '?ouverture=1'}`);
  let attente = null; // { texte, centre } pendant que le prof travaille
  let retourFerme = false;
  const erreur = h('span', { className: 'erreur', role: 'alert' });
  const entete = h('div', { className: 'seance-tete' });
  const panneau = h('div', { className: 'panneau' });
  const calque = h('div', { ariaLive: 'polite' }); // question, attente ou retour de quiz, par-dessus la leçon, annoncés
  const fiche = h('div', { className: 'fiche', style: 'display:none' }); // Ma fiche, par-dessus tout le reste
  // Révisions du jour faites pendant que le prof prépare la suite (#49, US4), dans leur propre calque, comme Ma fiche :
  // elles ne bougent pas quand la page arrive, une barre le signale et ramène à la Leçon.
  const revisions = h('div', { className: 'fiche revisions-en-attente', style: 'display:none' });
  const barreRevisions = h('div', { className: 'fiche-barre' });
  const fermerRevisions = () => {
    arreterLecture();
    revisions.style.display = 'none';
    revisions.replaceChildren();
  };
  const afficherBarreRevisions = () => barreRevisions.replaceChildren(attente
    ? h('strong', {}, '🧠 Mes révisions du jour · ⏳ ton prof prépare la suite…')
    : h('strong', {}, erreur.textContent ? `⚠️ ${erreur.textContent}` : '✅ Ta page est prête !'),
  h('button', { className: attente ? 'secondaire' : '', onclick: fermerRevisions }, attente ? '↩️ Retour à la leçon' : '▶️ Retourner à la leçon'));
  const ouvrirRevisions = () => {
    afficherBarreRevisions();
    revisions.replaceChildren(barreRevisions, h('div', { className: 'revisions-defilement' }, revisionsDuJour(profil)));
    revisions.style.display = '';
  };
  let pagesAffichees, iframe;

  // Ma fiche : les documents de référence de la Leçon, dans leur propre calque. La Page de leçon n'est jamais
  // rechargée : son iframe reste en place dessous, avec son quiz en cours.
  const ouvrirFiche = () => {
    const url = (r) => `/fichiers/${profil.slug}/${id}/reference/${r}`;
    const cadre = h('iframe', { src: url(lecon.references[0]), title: 'Ma fiche' });
    const choix = lecon.references.length > 1
      && h('select', { onchange: () => (cadre.src = url(choix.value)) }, lecon.references.map((r) => h('option', { value: r }, r.replace(/\.html$/, ''))));
    fiche.replaceChildren(
      h('div', { className: 'fiche-barre' }, h('strong', {}, '📋 Ma fiche'), choix,
        h('button', { className: 'secondaire', onclick: () => { fiche.style.display = 'none'; fiche.replaceChildren(); } }, '✕ Fermer')),
      cadre);
    fiche.style.display = '';
  };
  const LIBELLE_FICHE = 'Ma fiche'; // en icône à 390 px : le libellé reste dit au lecteur d'écran
  const boutonFiche = h('button', { className: 'secondaire fiche-ouvrir', ariaLabel: LIBELLE_FICHE, onclick: ouvrirFiche }, '📋', h('span', { className: 'fiche-libelle' }, ` ${LIBELLE_FICHE}`));

  // En-tête de Séance : l'Élève est sur la ligne de sa Leçon, à la couleur de sa Catégorie, comme sur sa carte
  // d'accueil : Niveau, nom, mot de Maîtrise (Acquis : dit par le terminus allumé), puis la ligne et sa prochaine station.
  const afficherEntete = () => {
    entete.style.cssText = styleLigne(lecon.categorie);
    entete.replaceChildren(...garder([
      retourAccueil(),
      h('div', { className: 'seance-titre' },
        lecon.niveauLecon && h('span', { className: 'niveau', title: 'Niveau de Leçon' }, `Niveau ${lecon.niveauLecon}`),
        h('h2', { title: lecon.titre }, lecon.titre),
        lecon.maitrise?.palier !== 'acquis' && badgeMaitrise(lecon.maitrise)),
      ligneLecon(lecon, { ici: true }),
      lecon.references.length > 0 && boutonFiche,
      erreur]));
  };
  // Le panneau n'est reconstruit que si les pages changent : l'iframe garde sinon sa position (et son quiz).
  const afficherPanneau = () => {
    panneau.style.display = lecon.pages.length ? '' : 'none';
    if (!lecon.pages.length || pagesAffichees === lecon.pages.join()) return;
    pagesAffichees = lecon.pages.join();
    // Le réglage de lecture à voix haute du Profil est transmis à la page dans son adresse (Kit, lecture.js).
    const reglages = new URLSearchParams();
    if (profil.lectureVoixHaute) reglages.set('lecture', '1');
    if (profil.espacementLettres) reglages.set('espacement', '1'); // espacement des lettres du Profil (#160)
    const url = (p) => `/fichiers/${profil.slug}/${id}/lessons/${p}${reglages.size ? `?${reglages}` : ''}`;
    const choix = h('select', { onchange: () => (iframe.src = url(choix.value)) }, lecon.pages.map((p, i) => h('option', { value: p }, `Page ${i + 1} sur ${lecon.pages.length}`)));
    choix.value = lecon.pages.includes(pageDemandee) ? pageDemandee : lecon.pages.at(-1);
    pageDemandee = null; // seulement à l'ouverture : une nouvelle page du prof s'affiche ensuite comme d'habitude
    iframe = h('iframe', { src: url(choix.value), title: 'Leçon' });
    panneau.replaceChildren(choix, iframe);
  };

  // Les cartes gagnées par ce quiz (#197) : lues une fois par Retour, la zone survit aux redessins de l'écran.
  const zonesCartes = new WeakMap();
  const cartesDuRetour = (retour) => {
    if (!retour.nouveauxBadges?.length && !retour.nouvellesCartesLigne?.length) return null;
    if (!zonesCartes.has(retour)) zonesCartes.set(retour, cartesDuGainEcran(profil, { paliers: retour.nouveauxBadges, lignes: retour.nouvellesCartesLigne }));
    return zonesCartes.get(retour);
  };
  const afficher = () => {
    afficherPanneau();
    const prof = lecon.messages.findLast((m) => m.role === 'agent');
    const voile = lecon.pages.length ? 'voile' : '';
    const bulle = (...enfants) => h('div', { className: 'bulle-prof' }, ...enfants);
    let contenu = null;
    if (attente?.centre) {
      contenu = h('div', { className: `seance-centre ${voile}` }, bulle(attente.texte),
        h('button', { className: 'secondaire', onclick: ouvrirRevisions }, '🧠 Faire mes révisions du jour en attendant'));
    }
    else if (attente) contenu = h('div', { className: 'apres-quiz' }, h('div', { className: 'retour' }, attente.texte));
    else if (prof?.retourQuiz) {
      const { action, score } = prof.retourQuiz;
      const { ensuite } = lecon; // titre prévu par le prof (lesson.json), ou annoncé par un ancien Retour de quiz
      contenu = h('div', { className: 'apres-quiz' },
        !retourFerme && h('div', { className: 'retour' },
          h('button', { className: 'secondaire fermer', title: 'Fermer', ariaLabel: 'Fermer', onclick: () => { retourFerme = true; afficher(); } }, '✕'),
          prof.texte),
        cartesDuRetour(prof.retourQuiz),
        action === 'terminee'
          ? [h('div', { className: 'lecon-terminee' }, h('strong', {}, '🏆 Leçon terminée'), h('small', {}, `Défi : ${score} %`), recompensesLecon(lecon)),
             ...lecon.rebondsProposes.map((r) => h('button', { className: 'secondaire', onclick: () => choisirRebond(r) }, libelleRebond(r, ensuite)))]
          : lecon.rebondsProposes.map((r) => h('button', { className: 'action-suivante', onclick: () => choisirRebond(r) }, libelleRebond(r, ensuite), h('small', {}, prof.retourQuiz.pretest ? 'Pré-test : hors score' : `Quiz : ${score} %`))));
    } else if (prof && (prof.choix || !lecon.pages.length)) {
      // Sans Réponses proposées ni page à montrer, l'élève doit quand même pouvoir continuer.
      const choix = [...(prof.choix ?? ["D'accord 👍"]), 'Je ne sais pas 🤷'];
      contenu = h('div', { className: `seance-centre ${voile}` },
        bulle(prof.texte),
        h('div', { className: 'choix' }, choix.map((c) => h('button', { onclick: () => repondre(c) }, c))));
    }
    calque.replaceChildren(...garder([contenu]));
  };

  // Un tour de parole : on montre que le prof travaille, puis l'écran suit son nouveau message.
  const tour = async (nouvelleAttente, requete) => {
    attente = nouvelleAttente;
    erreur.textContent = '';
    afficher();
    try {
      lecon = await requete();
      retourFerme = false;
    } catch (e) { erreur.textContent = e.message; }
    attente = null;
    afficherEntete();
    afficher();
    afficherBarreRevisions();
  };
  const repondre = (texte) => tour({ texte: '⏳ Ton prof prépare la suite…', centre: true },
    () => api(`eleves/${profil.slug}/lecons/${id}/messages`, { method: 'POST', body: { texte } }));
  const choisirRebond = (action) => tour({ texte: '⏳ Ton prof prépare la suite…', centre: true },
    () => api(`eleves/${profil.slug}/lecons/${id}/rebonds`, { method: 'POST', body: { action } }));

  // Les quiz des pages de leçon envoient leur score par postMessage (voir les consignes de l'agent) :
  // on l'enregistre, puis le prof le commente.
  const recevoirScore = async (ev) => {
    if (!iframe || ev.source !== iframe.contentWindow || ev.data?.type !== 'cartable-score' || attente) return;
    const { type, ...corps } = ev.data; // score, page, Objectifs couverts… : le serveur valide
    try {
      lecon = await api(`eleves/${profil.slug}/lecons/${id}/scores`, { method: 'POST', body: corps });
      afficherEntete();
    } catch (e) { return (erreur.textContent = e.message); }
    pagesScorees.add(corps.page);
    for (const s of signalementsEnAttente.filter((x) => x.page === corps.page)) {
      signalementsEnAttente.splice(signalementsEnAttente.indexOf(s), 1);
      envoyerSignalement(s);
    }
    tour({ texte: '⏳ Un instant…' }, () => api(`eleves/${profil.slug}/lecons/${id}/retours`, { method: 'POST', body: corps }));
  };
  // Signalements de Questions du quiz de la page (#146), envoyés par le Kit : la Question n'est dans la Banque qu'une fois
  // le score enregistré, donc ceux qui arrivent avant attendent. Le Kit confirme tout de suite à l'Élève.
  const pagesScorees = new Set();
  const signalementsEnAttente = [];
  const envoyerSignalement = ({ page, id: question, raison }) =>
    api(`eleves/${profil.slug}/signalements`, { method: 'POST', body: { lecon: id, page, id: question, raison } }).catch((e) => { erreur.textContent = e.message; });
  const recevoirSignalement = (ev) => {
    if (!iframe || ev.source !== iframe.contentWindow || ev.data?.type !== 'cartable-signalement') return;
    const { page, id: question, raison } = ev.data;
    if (pagesScorees.has(page)) envoyerSignalement({ page, id: question, raison });
    else signalementsEnAttente.push({ page, id: question, raison });
  };
  // Prédictions de la page (#157), envoyées par le Kit : seulement un événement daté pour les indicateurs, jamais un score ;
  // le parent qui ouvre la Leçon en aperçu n'en fait pas (il n'y a pas d'Élève qui répond).
  const recevoirPrediction = (ev) => {
    if (apercu || !iframe || ev.source !== iframe.contentWindow || ev.data?.type !== 'cartable-prediction') return;
    const { page, id: prediction, juste } = ev.data;
    api(`eleves/${profil.slug}/predictions`, { method: 'POST', body: { lecon: id, page, id: prediction, juste } }).catch(() => {});
  };
  window.addEventListener('message', recevoirSignalement);
  window.addEventListener('message', recevoirPrediction);
  window.addEventListener('message', recevoirScore);
  quitterEcran = () => { window.removeEventListener('message', recevoirScore); window.removeEventListener('message', recevoirSignalement); window.removeEventListener('message', recevoirPrediction); };

  afficherEntete();
  afficher();
  montrer(
    entete,
    h('div', { className: 'seance' }, panneau, calque, fiche, revisions));
}

let chargements = 0; // numéro de la navigation en cours : une plus ancienne ne dessine plus rien
async function route() {
  quitterEcran();
  arreterLecture(); // une lecture à voix haute des Révisions du jour s'arrête en changeant d'écran
  quitterEcran = () => {};
  document.title = 'Cartable'; // un écran qui a son propre titre le pose lui-même
  const moi = ++chargements;
  app.ariaBusy = 'true';
  try {
    await avecAttente(() => afficherEcran(), {
      afficher: () => { if (moi === chargements) indicateurAttente(); },
      masquer: () => { if (moi === chargements) retirerAttente(); },
    });
  } catch (e) {
    if (moi !== chargements) return; // une navigation plus récente a pris la main
    montrer(blocErreur('Impossible de charger cet écran pour le moment. Vérifie que l’appli tourne encore, puis réessaie.'));
  } finally {
    if (moi === chargements) app.ariaBusy = 'false';
  }
}

// Indicateur d'attente, posé seulement si le chargement traîne (DELAI_ATTENTE_MS) : une carte avec la ligne « en travaux »
// (ses pointillés s'arrêtent sous prefers-reduced-motion) et une phrase ; la zone d'état #etat l'annonce sans prendre le focus.
const zoneEtat = document.getElementById('etat');
function indicateurAttente() {
  montrer(h('section', { className: 'carte attente-chargement', style: '--ligne: var(--ligne-autre)' },
    h('div', { ariaHidden: 'true' }, ligneLecon({ objectifs: [] })),
    h('p', { className: 'doux' }, 'Chargement en cours…')));
  zoneEtat.textContent = 'Chargement en cours…';
}
function retirerAttente() {
  zoneEtat.textContent = '';
  app.querySelector('.attente-chargement')?.remove();
}

async function afficherEcran() {
  config ??= await api('config');
  const [, page, id, sousPage] = location.hash.split('/');
  if (page === 'nouvel-eleve') return await ecranNouvelEleve();
  // 404 : Profil introuvable, on choisit l'Élève. Toute autre erreur (500, réseau) remonte au message d'erreur du
  // routeur, qui garde le pseudo choisi pour que « Réessayer » reprenne au même endroit.
  const { profil } = await chargerProfil((slug) => api(`eleves/${slug}`), pseudoCourant());
  document.documentElement.classList.toggle('espacement-lettres', !!profil?.espacementLettres); // réglage du Profil (#160)
  if (!profil) return await ecranChoix();
  barreNav(profil);
  if (page === 'profil') return await ecranProfil(profil);
  if (page === 'parent') return await ecranParent(profil);
  if (page === 'nouvelle-lecon') return ecranNouvelleLecon(profil);
  if (page === 'lecon') return await ecranSession(profil, id, sousPage && decodeURIComponent(sousPage));
  if (page === 'apercu') return await ecranSession(profil, id, null, { apercu: true });
  if (page === 'revisions') return await ecranRevisions(profil);
  if (page === 'badges') return await ecranBadges(profil);
  return await ecranAccueil(profil);
}

window.addEventListener('hashchange', route);
route();
