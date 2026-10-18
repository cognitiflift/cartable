import { rendreQuestion } from '/kit/v1/question.js';
import { construireFigure } from '/kit/v1/figure-logique.js';
import { arreterLecture } from '/kit/v1/lecture.js';
import { nomEtPalier, morceauxRecompensesLecon } from '/recompenses-texte.js';
import {
  sectionIdees, ECHEC_LECTURE, cartoucheProposition, colonnesPropositions, questionCadrage, carteAttente, carteErreur,
  confirmationFichiers, messageSujet, FICHIERS_MANQUANTS,
} from '/nouvelle-lecon-texte.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let config;
let quitterEcran = () => {}; // nettoyage de l'écran précédent (écouteurs)

const api = async (url, options = {}) => {
  const res = await fetch(`/api/${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
    body: options.body && JSON.stringify(options.body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erreur || 'Erreur');
  return data;
};

// Petit constructeur DOM : h('button', {onclick}, 'texte', enfant…)
const h = (tag, attrs = {}, ...enfants) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el[k] = v;
  }
  el.append(...garder(enfants));
  return el;
};
const garder = (enfants) => enfants.flat(Infinity).filter((e) => e != null && e !== false);
const montrer = (...enfants) => app.replaceChildren(...garder(enfants));
const pseudoCourant = () => localStorage.getItem('pseudo');

// En-tête : le total d'Étoiles de l'Élève, qui ouvre Mes badges, puis son Profil. Le total vient de GET …/badges, lu une
// fois par Élève puis mis à jour par l'accueil et Mes badges (retenirRecompenses), pour ne pas le relire à chaque écran.
let recompensesConnues = null; // { slug, etoiles, nouveau }
const retenirRecompenses = (profil, { totaux, nouveaux }) => {
  recompensesConnues = { slug: profil.slug, etoiles: totaux?.etoiles ?? 0, nouveau: nouveaux?.length > 0 };
};
function barreNav(profil) {
  if (!profil) return nav.replaceChildren();
  const connues = recompensesConnues?.slug === profil.slug ? recompensesConnues : null;
  const compteur = h('a', { className: 'compteur-etoiles', href: '#/badges', title: 'Mes badges' },
    h('span', { ariaHidden: 'true' }, '⭐'),
    h('span', { className: 'nombre' }, connues ? String(connues.etoiles) : '…'),
    h('span', { className: 'cache' }, ' Étoiles, voir mes badges'),
    connues?.nouveau && h('span', { className: 'nouveau' }, 'Nouveau'));
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
  const form = h('form', { className: 'colonne', onsubmit: async (ev) => {
    ev.preventDefault();
    try { await envoyer({ pseudo: pseudo.value, age: age.value, niveau: niveau.value, nombrePropositions: nombrePropositions.value, modele: modele.value, lectureVoixHaute: lectureVoixHaute.checked, preparerPages: preparerPages.checked }); } catch (e) { erreur.textContent = e.message; }
  } },
    !profil && h('label', {}, 'Pseudo', h('br'), pseudo),
    h('label', {}, 'Âge', h('br'), age),
    h('label', {}, 'Classe', h('br'), niveau),
    h('label', {}, "Nombre d'idées de leçons proposées (2 à 10)", h('br'), nombrePropositions),
    h('label', {}, 'Modèle', h('br'), modele),
    h('label', {}, lectureVoixHaute, ' 🔊 Lecture à voix haute des pages et des questions (avec la voix de cet appareil)'),
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

async function ecranProfil(profil) {
  // Pour le parent : Coût d'un tour cumulé (CONTEXT.md), un indicateur relatif du quota partagé de l'abonnement, pas de
  // l'argent dépensé : affiché en tokens, avec son équivalent indicatif au tarif de l'API. Jamais pendant la Séance.
  const cout = h('p', { className: 'cout' });
  montrer(...formulaireProfil({ profil, titre: 'Mon profil', envoyer: async (champs) => {
    await api(`eleves/${profil.slug}`, { method: 'PUT', body: champs });
    location.hash = '#/';
  } }), cout);
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
const equivalentUsd = (usd) => usd.toLocaleString('fr-BE', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const listeOuVide = (elements, vide) => (elements.length ? h('ul', {}, elements) : h('p', { className: 'doux' }, vide));
// Le parent ouvre la Leçon en aperçu (#/apercu/…) : ce n'est pas un retour de l'Élève pour les indicateurs (#78).
const avecLecon = (texte, item) => h('li', {}, texte, ' ', h('a', { href: `#/apercu/${item.lecon}`, className: 'doux' }, `(${item.titreLecon})`));
const SECTIONS_PARENT = [
  { titre: '📆 Ces derniers jours', rendu: ({ jours }) => h('table', { className: 'vue-parent-jours' },
    h('tr', {}, h('th', {}, 'Jour'), h('th', {}, 'Révisions du jour'), h('th', {}, 'Quiz de page')),
    jours.map((j) => h('tr', {},
      h('td', {}, new Date(`${j.jour}T12:00`).toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' })),
      h('td', {}, j.revisions ? `${j.revisions} (${j.justes} juste${j.justes > 1 ? 's' : ''})` : '–'),
      h('td', {}, j.quiz || '–')))) },
  { titre: '🧠 Objectifs Retenus', rendu: ({ objectifs }) => listeOuVide(objectifs.retenus.map((o) => avecLecon(o.texte, o)), 'Aucun Objectif Retenu pour l’instant.') },
  { titre: '🌱 Objectifs fragiles', rendu: ({ objectifs }) => [
    h('p', { className: 'doux' }, 'Atteints, mais pas encore Retenus : à retravailler un autre jour.'),
    listeOuVide(objectifs.fragiles.map((o) => avecLecon(o.texte, o)), 'Aucun.')] },
  { titre: '❓ Questions fragiles', rendu: ({ questionsFragiles }) => listeOuVide(
    questionsFragiles.map((q) => avecLecon(`${q.enonce} : ${q.pourcentage} % de chances de s’en souvenir`, q)), 'Aucune : tout tient bien.') },
  { titre: '📅 Contrôles à venir', rendu: ({ controles }) => listeOuVide(controles.map((c) =>
    avecLecon(`${new Date(`${c.dateControle}T12:00`).toLocaleDateString('fr-BE')} (${texteControle(c.joursAvant)}) : Maîtrise : ${c.maitrise ? `${PALIERS_DE_MAITRISE[c.maitrise.palier].mot} (${c.maitrise.pourcentage} %)` : 'pas encore évaluée'}, ${pluriel(c.questionsDues, 'question')} à revoir aujourd’hui`, c)), 'Aucun contrôle prévu.') },
  // Badges (#100) : ceux des 7 derniers jours et les totaux, en lecture seule (rien n'y change « Nouveau » dans Mes badges).
  { titre: '🏅 Badges', rendu: ({ badges: { recents, etoiles, fusees } }) => [
    h('p', {}, `⭐ ${pluriel(etoiles, 'Étoile')} · 🚀 ${pluriel(fusees, 'Fusée')} en tout.`),
    listeOuVide(recents.map((b) => h('li', {}, `${b.emoji} ${nomEtPalier(b)} · ${dateBadge(b.jour)}`)),
      'Aucun Badge ces 7 derniers jours.')] },
  { titre: '💶 Coût des Leçons', rendu: ({ cout }) => [
    h('p', {}, `Total (indicatif) : ${equivalentUsd(cout.total.coutUsd)} en ${pluriel(cout.total.tours, 'appel')} au prof, Propositions comprises. L'abonnement se mesure en quota partagé, pas en argent dépensé.`),
    listeOuVide(cout.lecons.map((l) => h('li', {}, `${l.titre} : ${equivalentUsd(l.coutUsd)} (${pluriel(l.tours, 'appel')})`)), 'Aucune Leçon.')] },
  // Indicateurs (#78) : sur les 4 dernières semaines, pour juger si l'appli aide à retenir et donne envie de revenir.
  { titre: '📈 Indicateurs', rendu: ({ indicateurs: { periode, souvenir, retour, attente } }) => [
    h('p', { className: 'doux' }, `Du ${new Date(`${periode.du}T12:00`).toLocaleDateString('fr-BE')} au ${new Date(`${periode.au}T12:00`).toLocaleDateString('fr-BE')}.`),
    h('ul', {},
      h('li', {}, 'Souvenir aux Révisions du jour : ', souvenir.reponses
        ? `${souvenir.pourcentage} % (${souvenir.justes} sur ${pluriel(souvenir.reponses, 'réponse')})` : 'pas encore de Révision du jour.'),
      h('li', {}, 'Retour la semaine d’après une nouvelle Leçon : ', retour.lecons
        ? `${retour.pourcentage} % (${retour.revenus} sur ${pluriel(retour.lecons, 'Leçon')})` : 'pas encore mesurable.',
        retour.enAttente ? ` ${pluriel(retour.enAttente, 'Leçon')} trop récente${retour.enAttente > 1 ? 's' : ''} pour le dire.` : ''),
      h('li', {}, 'Attente du prof : ', attente.tours
        ? `${attente.medianeSecondes} s d’habitude, ${attente.maxSecondes} s au plus (${pluriel(attente.tours, 'tour')})` : 'aucun tour.'))] },
];

async function ecranParent(profil) {
  const agregats = await api(`eleves/${profil.slug}/parent`);
  montrer(
    h('h2', {}, `👪 Vue parent : ${profil.pseudo}`),
    h('p', {}, h('button', { className: 'secondaire', onclick: () => (location.hash = '#/profil') }, '← Profil')),
    SECTIONS_PARENT.map(({ titre, rendu }) => h('section', { className: 'vue-parent' }, h('h3', {}, titre), rendu(agregats))));
}

// Étoiles et Fusées d'une Leçon : « ⭐ n · 🚀 n » en Leçon libre, « ☆☆☆ · 🚀 n » en Leçon de révision, sans Fusée à 0
// (voir morceauxRecompensesLecon).
const recompensesLecon = (l) => h('span', { className: 'etoiles' },
  morceauxRecompensesLecon(l).map(({ texte, titre, classe }) => h('span', { className: classe, title: titre }, texte)));

// Lien « ← Mes leçons » des en-têtes d'écran et de la carte d'attente.
const retourAccueil = () => h('a', { className: 'retour-accueil', href: '#/' }, '← Mes leçons');

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

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
const station = (objectif, attrs = {}) => h('span', { className: `station ${etatStation(objectif).classe}`, ...attrs });

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
  return texte && h('p', { className: 'prochaine' }, h('span', { className: 'libelle' }, 'Prochaine station : '), texte);
}

const texteControle = (jours) => (jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`);
const controleAVenir = (l) => Number.isInteger(l.joursAvantControle) && l.joursAvantControle >= 0;

function carteLecon(l) {
  const objectifs = l.objectifs ?? [];
  const adresse = `#/lecon/${l.id}`;
  return h('article', { className: 'lecon', style: styleLigne(l.categorie) },
    h('div', { className: 'lecon-tete' },
      l.niveauLecon && h('span', { className: 'niveau', title: 'Niveau de Leçon' }, `Niveau ${l.niveauLecon}`),
      h('h4', {}, h('a', { href: adresse }, l.titre)),
      l.maitrise?.palier !== 'acquis' && badgeMaitrise(l.maitrise)), // Acquis : dit par le terminus allumé, pas deux fois
    ligneLecon(l, { ici: !!prochaineStation(l) }),
    h('div', { className: 'lecon-bas' },
      prochaineStation(l) ?? h('span', { className: 'prochaine' }),
      controleAVenir(l) && h('span', { className: 'controle' }, `📅 Contrôle ${texteControle(l.joursAvantControle)}`),
      l.terminee && h('span', { className: 'terminee' }, '🏁 Terminée'),
      recompensesLecon(l),
      h('a', { className: 'bouton', href: adresse }, 'Continuer')),
    objectifs.length > 0 && h('details', { className: 'objectifs' },
      h('summary', {}, h('span', { className: 'voir' }, 'Voir les Objectifs'), h('span', { className: 'cacher' }, 'Cacher les Objectifs')),
      h('ul', {}, objectifs.map((o) => h('li', {}, station(o), h('span', {}, o.texte, h('small', {}, etatStation(o).libelle)))))));
}

async function ecranAccueil(profil) {
  const [lecons, revisions, rythme, badges] = await Promise.all([api(`eleves/${profil.slug}/lecons`), api(`eleves/${profil.slug}/revisions`), api(`eleves/${profil.slug}/rythme`), api(`eleves/${profil.slug}/badges`)]);
  retenirRecompenses(profil, badges);
  barreNav(profil);
  const parCategorie = Object.groupBy(lecons, (l) => l.categorie);
  montrer(
    recapitulatifSemaine(profil, rythme.recapitulatif),
    maSemaine(profil, badges.calendrier, rythme, revisions.dues, lecons),
    h('div', { className: 'lecons-tete' },
      h('h2', {}, 'Mes leçons'),
      h('button', { className: 'bouton-nouvelle', onclick: () => (location.hash = '#/nouvelle-lecon') }, '✨ Apprendre quelque chose de nouveau')),
    lecons.length === 0 && h('div', { className: 'reseau-vide' },
      h('div', { className: 'ligne en-travaux' }, h('span', { className: 'travaux' }, 'Ton réseau est encore vide'), h('span', { className: 'terminus' }, 'Acquis')),
      h('p', {}, "Tu n'as pas encore de leçon. Touche « Apprendre quelque chose de nouveau » pour ouvrir ta première ligne.")),
    config.categories.filter((c) => parCategorie[c]).map((c) => h('section', { className: 'categorie', style: styleLigne(c) },
      h('h3', {}, c),
      h('div', { className: 'lecons-grille' }, parCategorie[c].map(carteLecon)))));
}

// Ma semaine, comme la page de la semaine du journal de classe : du lundi au dimanche, un tampon par jour (vide,
// pâle quand l'Élève a travaillé, plein quand l'Objectif du jour est atteint, 🛡️ quand un Joker l'a couvert), avec ce
// qui a été gagné ce jour-là (Étoiles, Fusées, Paliers de Badge) et les contrôles prévus ; à côté, l'Objectif du jour,
// la Série de jours (#75) et les Révisions du jour (#66). Aucun score.
const JOURS_SEMAINE = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
const JOURS_ENTIERS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const enJour = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const jourPlus = (jour, n) => { const d = new Date(`${jour}T12:00:00`); d.setDate(d.getDate() + n); return enJour(d); };
function joursDeLaSemaine(aujourdhui) {
  const lundi = jourPlus(aujourdhui, -((new Date(`${aujourdhui}T12:00:00`).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => jourPlus(lundi, i));
}
const ETATS_JOUR = { vide: '', pale: 'travaillé', plein: 'Objectif du jour atteint' };

// Un jour en tampon, seule façon de dessiner un jour : le bandeau de la semaine et le calendrier de Mes badges.
// Une journée : { jour, etat, joker, gains… }, celle du calendrier du serveur ou jourSansRien. classeJour porte l'état
// (vide, pâle, plein), aujourd'hui et futur ; lectureJour le dit en mots, le tampon étant muet.
const classeJour = ({ jour, etat }, aujourdhui) => `jour ${etat}${jour === aujourdhui ? ' aujourdhui' : ''}${jour > aujourdhui ? ' futur' : ''}`;
const lectureJour = (nom, { jour, etat, joker }, aujourdhui) => [nom, jour === aujourdhui && "aujourd'hui", ETATS_JOUR[etat], joker && 'protégé par un joker'].filter(Boolean).join(', ');
const tamponJour = ({ jour, joker }) => h('span', { className: 'tampon', ariaHidden: 'true' }, String(Number(jour.slice(8))), joker && h('span', { className: 'joker' }, '🛡️'));

function maSemaine(profil, { aujourdhui, jours }, { objectifDuJour: o, serieDeJours }, dues, lecons) {
  const parJour = new Map(jours.map((journee) => [journee.jour, journee]));
  const controles = (jour) => lecons.filter((l) => controleAVenir(l) && jourPlus(aujourdhui, l.joursAvantControle) === jour);
  const caseJour = (jour, i) => {
    const journee = parJour.get(jour) ?? jourSansRien(jour);
    const { gains } = journee;
    return h('li', { className: classeJour(journee, aujourdhui) },
      h('span', { className: 'cache' }, lectureJour(JOURS_ENTIERS[i], journee, aujourdhui)),
      h('span', { className: 'nom', ariaHidden: 'true' }, JOURS_SEMAINE[i]),
      tamponJour(journee),
      (gains.etoiles > 0 || gains.fusees > 0) && h('span', { className: 'gains' },
        gains.etoiles > 0 && h('span', { title: pluriel(gains.etoiles, 'Étoile') }, `⭐${gains.etoiles > 1 ? gains.etoiles : ''}`),
        gains.fusees > 0 && h('span', { title: pluriel(gains.fusees, 'Fusée') }, `🚀${gains.fusees > 1 ? gains.fusees : ''}`)),
      gains.paliers.length > 0 && h('span', { className: 'gains-badges' },
        gains.paliers.map((p) => h('span', { className: 'gain-badge', title: `Badge : ${nomEtPalier(p)}` }, pastilleBadge(p)))),
      controles(jour).map((l) => h('a', { className: 'controle-jour', href: `#/lecon/${l.id}`, title: `Contrôle : ${l.titre}` }, '📅')));
  };
  const objectif = o.atteint
    ? h('strong', {}, 'Objectif du jour atteint')
    : h('strong', {}, `Objectif du jour : ${o.revisions}/${o.revisionsVisees} révisions ou ${pluriel(o.pagesVisees, 'page')}`);
  const serie = serieDeJours.jours
    ? `${pluriel(serieDeJours.jours, 'jour')} de suite${serieDeJours.aujourdhui ? '' : ' : encore un petit effort aujourd’hui'}`
    : 'Chaque jour un peu, c’est comme ça qu’on retient';
  return h('section', { className: 'ma-semaine' },
    h('div', { className: 'semaine-jours' },
      h('div', { className: 'semaine-titre' },
        h('h2', {}, `Salut ${profil.pseudo} !`),
        h('a', { href: '#/badges' }, 'Mon calendrier et mes badges')),
      h('ol', { className: 'jours' }, joursDeLaSemaine(aujourdhui).map(caseJour))),
    h('div', { className: 'semaine-cote' },
      h('div', { className: `objectif-du-jour${o.atteint ? ' atteint' : ''}` }, objectif,
        h('small', {}, serie,
          serieDeJours.jokers > 0 && h('span', { title: 'Chaque lundi, tu reçois 3 jokers pour la semaine. Un joker protège ta série de jours pour un jour manqué. Ceux qui restent ne passent pas à la semaine suivante.' }, ` · 🛡️ ${pluriel(serieDeJours.jokers, 'joker')}`)),
        serieDeJours.jokersUtilises > 0 && h('small', {}, `🛡️ ${serieDeJours.jokersUtilises > 1 ? 'Des jokers ont' : 'Un joker a'} protégé ta série de jours pendant ta pause.`)),
      h('button', { className: `bouton-revisions${dues ? '' : ' secondaire'}`, onclick: () => (location.hash = '#/revisions') },
        h('strong', {}, 'Mes révisions du jour'),
        h('small', {}, dues ? `${pluriel(dues, 'question')} à revoir` : 'Rien à revoir aujourd’hui'))));
}

// Badges (#95) : un emoji dans une pastille à la couleur de son Palier ; grisé tant qu'il n'est pas obtenu.
const pastilleBadge = ({ emoji, palier }) => h('span', { className: `pastille-badge ${palier ?? 'pas-encore'}`, title: palier ?? 'pas encore' }, emoji);
const dateBadge = (jour) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });

// Mes badges (#95) : en tête, le total d'Étoiles et de Fusées de l'Élève (#96) ; puis le calendrier des Jours
// travaillés (#99) dans une carte comme le bandeau de la semaine, et à côté la collection des Badges, obtenus avec leur
// Palier et leur date, à venir en grisé avec leur progression (« 7/15 »). L'ouvrir efface « Nouveau » ; le mot
// d'accueil s'affiche à la première ouverture.
async function ecranBadges(profil) {
  const { collection, nouveaux, accueil, totaux, calendrier } = await api(`eleves/${profil.slug}/badges?ouverture=1`);
  retenirRecompenses(profil, { totaux, nouveaux: [] }); // « Nouveau » s'efface en ouvrant Mes badges
  barreNav(profil);
  const estNouveau = (b, palier) => nouveaux.some((n) => n.id === b.id && n.palier === palier);
  montrer(
    h('p', {}, h('a', { href: '#/' }, '← Mes leçons')),
    h('div', { className: 'badges-tete' },
      h('h2', {}, 'Mes badges'),
      totaux && h('p', { className: 'totaux-recompenses', title: 'Toutes tes Leçons et Révisions du jour' },
        `⭐ ${pluriel(totaux.etoiles, 'Étoile')} · 🚀 ${pluriel(totaux.fusees, 'Fusée')}`)),
    accueil && h('p', { className: 'bulle-prof' }, 'Voici les badges que tu as déjà gagnés !'),
    h('div', { className: 'badges-corps' },
      calendrierJours(calendrier),
      h('section', { className: 'collection', ariaLabel: 'Ma collection' },
        h('h3', {}, 'Ma collection'),
        h('div', { className: 'grille badges' }, collection.map((b) => {
          const obtenus = b.surprise ? [{ palier: b.palier, jour: b.jour }] : b.paliers.filter((p) => p.jour);
          return h('div', { className: `carte badge${b.palier ? '' : ' a-venir'}` },
            pastilleBadge(b),
            h('div', {},
              h('strong', {}, b.nom),
              obtenus.map((p) => h('small', {}, `${b.surprise ? 'badge surprise' : p.palier} · ${dateBadge(p.jour)}`, estNouveau(b, p.palier) && h('span', { className: 'nouveau' }, 'Nouveau'))),
              b.prochain && h('small', { className: 'progression', title: `Prochain palier : ${b.prochain.palier}` }, `${Math.min(b.compte, b.prochain.seuil)}/${b.prochain.seuil}`)));
        })))));
}

// Calendrier des Jours travaillés (#99), mois par mois, en tampons de jour comme le bandeau de la semaine : pâle quand
// l'Élève a travaillé, plein quand l'Objectif du jour est atteint, 🛡️ quand un Joker a couvert le jour. Toucher un jour
// montre à côté ce qui a été fait et gagné, sans score ; aujourd'hui est montré à l'ouverture.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const moisSuivant = (mois, n) => { const [a, m] = mois.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const jourSansRien = (jour) => ({ jour, etat: 'vide', joker: false, lecons: [], quiz: 0, revisions: 0, gains: { etoiles: 0, fusees: 0, paliers: [] } });
function calendrierJours({ aujourdhui, jours }) {
  const parJour = new Map(jours.map((journee) => [journee.jour, journee]));
  const duJour = (jour) => parJour.get(jour) ?? jourSansRien(jour);
  const premier = (jours[0]?.jour ?? aujourdhui).slice(0, 7);
  const dernier = aujourdhui.slice(0, 7);
  let mois = dernier;
  const bloc = h('section', { className: 'mon-calendrier', ariaLabel: 'Mon calendrier' });
  const detail = (journee) => {
    const faits = [journee.quiz && `${journee.quiz} quiz`, journee.revisions && pluriel(journee.revisions, 'Révision') + ' du jour'].filter(Boolean).join(' · ');
    const gains = [journee.gains.etoiles && `⭐ ${journee.gains.etoiles}`, journee.gains.fusees && `🚀 ${journee.gains.fusees}`].filter(Boolean).join(' · ');
    return [
      h('strong', {}, dateBadge(journee.jour)),
      journee.lecons.length > 0 && h('p', {}, `📚 ${journee.lecons.map((l) => l.titre).join(', ')}`),
      faits && h('p', {}, faits),
      journee.joker && h('p', {}, '🛡️ Un joker a protégé ta série de jours ce jour-là.'),
      (gains || journee.gains.paliers.length > 0) && h('p', {}, gains && `Gagné : ${gains} `,
        journee.gains.paliers.map((p) => h('span', { className: 'gain-badge' }, pastilleBadge(p), ` ${nomEtPalier(p)} `))),
      !faits && !journee.lecons.length && !journee.joker && !gains && !journee.gains.paliers.length && h('p', { className: 'doux' }, 'Rien ce jour-là.')];
  };
  const afficher = (choisi, focaliser = true) => {
    const [a, m] = mois.split('-').map(Number);
    const decalage = (new Date(a, m - 1, 1).getDay() + 6) % 7; // lundi en premier
    const nombre = new Date(a, m, 0).getDate();
    const cases = [...Array(decalage).fill(null), ...Array.from({ length: nombre }, (_, i) => `${mois}-${String(i + 1).padStart(2, '0')}`)];
    let aFocaliser = null;
    bloc.replaceChildren(
      h('div', { className: 'calendrier-jours' },
        h('div', { className: 'calendrier-mois' },
          h('button', { className: 'secondaire', ariaLabel: 'Mois précédent', title: 'Mois précédent', disabled: mois <= premier, onclick: () => { mois = moisSuivant(mois, -1); afficher(); } }, '‹'),
          h('strong', {}, `${MOIS[m - 1]} ${a}`),
          h('button', { className: 'secondaire', ariaLabel: 'Mois suivant', title: 'Mois suivant', disabled: mois >= dernier, onclick: () => { mois = moisSuivant(mois, 1); afficher(); } }, '›')),
        h('div', { className: 'calendrier-grille' },
          JOURS_SEMAINE.map((d) => h('span', { className: 'nom', ariaHidden: 'true' }, d)),
          cases.map((jour) => {
            if (!jour) return h('span', {});
            const journee = duJour(jour);
            const nom = `${JOURS_ENTIERS[(new Date(`${jour}T12:00:00`).getDay() + 6) % 7]} ${Number(jour.slice(8))} ${MOIS[m - 1]}`;
            const bouton = h('button', {
              className: `${classeJour(journee, aujourdhui)} calendrier-jour${jour === choisi ? ' choisi' : ''}`,
              ariaLabel: lectureJour(nom, journee, aujourdhui),
              ariaPressed: String(jour === choisi),
              disabled: jour > aujourdhui,
              onclick: () => afficher(jour),
            }, tamponJour(journee));
            if (jour === choisi) aFocaliser = bouton;
            return bouton;
          }))),
      h('div', { className: 'calendrier-detail', ariaLive: 'polite' },
        choisi ? detail(duJour(choisi)) : h('p', { className: 'doux' }, 'Touche un jour pour voir ce que tu as fait et gagné.')));
    if (focaliser) aFocaliser?.focus();
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
  montrer(h('p', {}, h('a', { href: '#/' }, '← Mes leçons')), h('h2', {}, '🧠 Mes révisions du jour'),
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
  const annonces = (recompenses) => [
    recompenses?.etoile && '⭐ Nouvelle Étoile : Révision du jour terminée !',
    recompenses?.annonce,
  ].filter(Boolean).map((texte) => h('p', { className: 'bulle-prof' }, texte));
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
  const boutonFiche = h('button', { className: 'secondaire fiche-ouvrir', onclick: ouvrirFiche }, '📋 Ma fiche');

  // En-tête de Séance : l'Élève est sur la ligne de sa Leçon, à la couleur de sa Catégorie, comme sur sa carte
  // d'accueil : Niveau, nom, mot de Maîtrise (Acquis : dit par le terminus allumé), puis la ligne et sa prochaine station.
  const afficherEntete = () => {
    entete.style.cssText = styleLigne(lecon.categorie);
    entete.replaceChildren(...garder([
      retourAccueil(),
      h('div', { className: 'seance-titre' },
        lecon.niveauLecon && h('span', { className: 'niveau', title: 'Niveau de Leçon' }, `Niveau ${lecon.niveauLecon}`),
        h('h2', {}, lecon.titre),
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
    const url = (p) => `/fichiers/${profil.slug}/${id}/lessons/${p}${profil.lectureVoixHaute ? '?lecture=1' : ''}`;
    const choix = h('select', { onchange: () => (iframe.src = url(choix.value)) }, lecon.pages.map((p) => h('option', { value: p }, p.replace(/\.html$/, ''))));
    choix.value = lecon.pages.includes(pageDemandee) ? pageDemandee : lecon.pages.at(-1);
    pageDemandee = null; // seulement à l'ouverture : une nouvelle page du prof s'affiche ensuite comme d'habitude
    iframe = h('iframe', { src: url(choix.value), title: 'Leçon' });
    panneau.replaceChildren(choix, iframe);
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
          h('button', { className: 'secondaire fermer', title: 'Fermer', onclick: () => { retourFerme = true; afficher(); } }, '✕'),
          prof.texte),
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
    tour({ texte: '⏳ Un instant…' }, () => api(`eleves/${profil.slug}/lecons/${id}/retours`, { method: 'POST', body: corps }));
  };
  window.addEventListener('message', recevoirScore);
  quitterEcran = () => window.removeEventListener('message', recevoirScore);

  afficherEntete();
  afficher();
  montrer(
    entete,
    h('div', { className: 'seance' }, panneau, calque, fiche, revisions));
}

async function route() {
  quitterEcran();
  arreterLecture(); // une lecture à voix haute des Révisions du jour s'arrête en changeant d'écran
  quitterEcran = () => {};
  document.title = 'Cartable'; // un écran qui a son propre titre le pose lui-même
  try {
    config ??= await api('config');
    const [, page, id, sousPage] = location.hash.split('/');
    if (page === 'nouvel-eleve') return await ecranNouvelEleve();
    const slug = pseudoCourant();
    const profil = slug && (await api(`eleves/${slug}`).catch(() => null));
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
  } catch (e) {
    montrer(h('p', { className: 'erreur' }, e.message));
  }
}

window.addEventListener('hashchange', route);
route();
