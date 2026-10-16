import { rendreQuestion } from '/kit/v1/question.js';
import { arreterLecture } from '/kit/v1/lecture.js';

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

function barreNav(profil) {
  nav.replaceChildren(
    ...(profil
      ? [h('span', {}, `${profil.pseudo} · ${profil.niveau} · ${profil.age} ans `),
         h('button', { className: 'secondaire', onclick: () => (location.hash = '#/profil') }, 'Mon profil'),
         ' ',
         h('button', { className: 'secondaire', onclick: () => { localStorage.removeItem('pseudo'); location.hash = '#/'; route(); } }, 'Changer')]
      : []),
  );
}

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

// Étoiles d'une Leçon : en Leçon de révision, ses trois Étoiles pleines ou vides ; en Leçon libre, leur nombre
// (« ⭐ n », rien à 0).
const TITRES_ETOILES = { quiz: 'Quiz réussi', bonus: 'Questions bonus réussies', defi: 'Défi réussi' };
const etoiles = (e) => (typeof e === 'number'
  ? e > 0 && h('span', { className: 'etoiles', title: 'Pages réussies' }, `⭐ ${e}`)
  : h('span', { className: 'etoiles' },
    Object.entries(TITRES_ETOILES).map(([cle, titre]) => h('span', { className: e[cle] ? 'pleine' : 'vide', title: titre }, e[cle] ? '⭐' : '☆'))));
// Fusées d'une Leçon (« 🚀 n ») : une par page avec un Dépassement réussi ; rien à 0.
const fusees = (n) => n > 0 && h('span', { className: 'fusees', title: 'Dépassements réussis' }, `🚀 ${n}`);

// Objectifs de la Leçon : combien sont atteints et Retenus, par exemple « 3 Objectifs · 2 atteints · 1 Retenu », puis
// chaque Objectif avec son état. Rien sans Objectifs.
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const ETATS_OBJECTIF = [
  { cle: 'retenu', icone: '🧠', libelle: 'Retenu : réussi de nouveau un autre jour' },
  { cle: 'atteint', icone: '✅', libelle: 'atteint' },
  { cle: 'aConfirmer', icone: '🔮', libelle: 'à confirmer : réussi au Pré-test' },
];
const PAS_ENCORE = { icone: '⚪', libelle: 'pas encore atteint' };
function objectifsRetenus(objectifs = []) {
  if (!objectifs.length) return null;
  const compte = (cle) => objectifs.filter((o) => o[cle]).length;
  const aConfirmer = compte('aConfirmer');
  return h('span', { className: 'objectifs-retenus' },
    [pluriel(objectifs.length, 'Objectif'), pluriel(compte('atteint'), 'atteint'), pluriel(compte('retenu'), 'Retenu'), aConfirmer && `${aConfirmer} à confirmer`].filter(Boolean).join(' · '),
    h('span', { className: 'objectifs' }, objectifs.map((o) => {
      const etat = ETATS_OBJECTIF.find((e) => o[e.cle]) ?? PAS_ENCORE;
      return h('span', { title: etat.libelle }, `${etat.icone} ${o.texte}`);
    })));
}

// Une pastille par Objectif d'une Leçon libre, pleine si l'Objectif est atteint : « ●●●●○ ». Rien sans Objectifs.
function pastillesObjectifs(objectifs = []) {
  if (!objectifs.length) return null;
  const atteints = objectifs.filter((o) => o.atteint).length;
  return h('span', { className: 'pastilles', title: `${atteints} ${atteints > 1 ? 'Objectifs atteints' : 'Objectif atteint'} sur ${objectifs.length}` },
    objectifs.map((o) => (o.atteint ? '●' : '○')).join(''));
}

function badgeMaitrise(maitrise) {
  if (!maitrise) return h('span', { className: 'maitrise' }, 'pas encore évalué');
  const { classe, mot } = PALIERS_DE_MAITRISE[maitrise.palier];
  return h('span', { className: `maitrise ${classe}`, title: `Maîtrise : ${maitrise.pourcentage} %` }, mot);
}

async function ecranAccueil(profil) {
  const [lecons, revisions, rythme, badges] = await Promise.all([api(`eleves/${profil.slug}/lecons`), api(`eleves/${profil.slug}/revisions`), api(`eleves/${profil.slug}/rythme`), api(`eleves/${profil.slug}/badges`)]);
  const parCategorie = Object.groupBy(lecons, (l) => l.categorie);
  montrer(
    h('h2', {}, `Salut ${profil.pseudo} !`),
    recapitulatifSemaine(profil, rythme.recapitulatif),
    carteRythme(rythme, badges),
    carteRevisions(revisions.dues),
    comptesARebours(lecons),
    h('button', { onclick: () => (location.hash = '#/nouvelle-lecon') }, '✨ Apprendre quelque chose de nouveau'),
    lecons.length === 0 && h('p', {}, "Tu n'as pas encore de leçon."),
    config.categories.filter((c) => parCategorie[c]).map((c) => [
      h('h2', {}, c),
      h('div', { className: 'grille' }, parCategorie[c].map((l) =>
        h('button', { className: 'carte', onclick: () => (location.hash = `#/lecon/${l.id}`) }, l.titre,
          h('span', { className: 'ligne-maitrise' }, l.niveauLecon && h('span', { className: 'niveau-lecon', title: 'Niveau de Leçon' }, `Niveau ${l.niveauLecon}`),
            l.mode === 'libre' && pastillesObjectifs(l.objectifs), badgeMaitrise(l.maitrise), l.etoiles != null && etoiles(l.etoiles),
            fusees(l.depassement)),
          objectifsRetenus(l.objectifs),
          h('span', { className: 'continuer' }, `▶️ Continuer${l.mode === 'libre' && l.ensuite && !l.quizEnAttente ? ` : ${l.ensuite}` : ''}`),
          h('small', {}, new Date(l.derniereActivite).toLocaleDateString('fr-BE'))))),
    ]));
}

// Rythme (#75) : l'Objectif du jour et la Série de jours, calculés par le serveur (lib/rythme.js). Les messages parlent
// de l'effort et de ce qui a été fait, jamais de l'Élève lui-même ni des autres Élèves ; aucun reproche.
// La carte montre aussi le dernier Badge gagné et « Nouveau » (#95) ; la toucher ouvre Mes badges.
function carteRythme({ objectifDuJour: o, serieDeJours }, { dernier, nouveaux } = {}) {
  const objectif = o.atteint
    ? '🎯 Objectif du jour atteint : ton travail d’aujourd’hui compte !'
    : `🎯 Objectif du jour : ${o.revisionsVisees} révisions (${o.revisions}/${o.revisionsVisees}) ou ${pluriel(o.pagesVisees, 'page')} de leçon`;
  const jours = serieDeJours.jours
    ? `🔥 ${pluriel(serieDeJours.jours, 'jour')} de suite à travailler${serieDeJours.aujourdhui ? '' : ' : encore un petit effort aujourd’hui'}`
    : '🌱 Chaque jour un peu, c’est comme ça qu’on retient';
  return h('button', { className: `carte carte-rythme${o.atteint ? ' atteint' : ''}`, onclick: () => (location.hash = '#/badges') },
    h('strong', {}, objectif),
    h('small', {}, jours,
      serieDeJours.jokers > 0 && h('span', { className: 'jokers', title: 'Chaque lundi, tu reçois 3 jokers pour la semaine. Un joker protège ta série de jours pour un jour manqué. Ceux qui restent ne passent pas à la semaine suivante.' }, ` · 🛡️ ${pluriel(serieDeJours.jokers, 'joker')}`)),
    serieDeJours.jokersUtilises > 0 && h('small', {}, `🛡️ ${serieDeJours.jokersUtilises > 1 ? 'Des jokers ont' : 'Un joker a'} protégé ta série de jours pendant ta pause.`),
    h('small', { className: 'carte-badges' }, dernier ? [pastilleBadge(dernier), ` Dernier badge : ${dernier.nom}, ${dernier.palier}`] : '🏅 Mes badges',
      nouveaux?.length > 0 && h('span', { className: 'nouveau' }, 'Nouveau')));
}

// Badges (#95) : un emoji dans une pastille à la couleur de son Palier ; grisé tant qu'il n'est pas obtenu.
const pastilleBadge = ({ emoji, palier }) => h('span', { className: `pastille-badge ${palier ?? 'pas-encore'}`, title: palier ?? 'pas encore' }, emoji);
const dateBadge = (jour) => new Date(`${jour}T12:00:00`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });

// Mes badges (#95) : la collection des Badges, obtenus avec leur Palier et leur date, à venir en grisé avec leur
// progression (« 7/15 »), et le total d'Étoiles et de Fusées de l'Élève (#96). L'ouvrir efface « Nouveau » ; le mot
// d'accueil s'affiche à la première ouverture.
async function ecranBadges(profil) {
  const { collection, nouveaux, accueil, totaux } = await api(`eleves/${profil.slug}/badges?ouverture=1`);
  const estNouveau = (b, palier) => nouveaux.some((n) => n.id === b.id && n.palier === palier);
  montrer(
    h('p', {}, h('a', { href: '#/' }, '← Mes leçons')),
    h('h2', {}, '🏅 Mes badges'),
    accueil && h('p', { className: 'bulle-prof' }, 'Voici les badges que tu as déjà gagnés !'),
    totaux && h('p', { className: 'totaux-recompenses', title: 'Toutes tes Leçons et Révisions du jour' },
      `⭐ ${pluriel(totaux.etoiles, 'Étoile')} · 🚀 ${pluriel(totaux.fusees, 'Fusée')}`),
    h('div', { className: 'grille badges' }, collection.map((b) => {
      const obtenus = b.surprise ? [{ palier: b.palier, jour: b.jour }] : b.paliers.filter((p) => p.jour);
      return h('div', { className: `carte badge${b.palier ? '' : ' a-venir'}` },
        pastilleBadge(b),
        h('strong', {}, b.nom),
        obtenus.map((p) => h('small', {}, `${b.surprise ? 'badge surprise' : p.palier} · ${dateBadge(p.jour)}`, estNouveau(b, p.palier) && h('span', { className: 'nouveau' }, 'Nouveau'))),
        b.prochain && h('small', { className: 'progression', title: `Prochain palier : ${b.prochain.palier}` }, `${Math.min(b.compte, b.prochain.seuil)}/${b.prochain.seuil}`));
    })));
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
    h('button', { className: 'secondaire fermer', title: 'Fermer', onclick: () => {
      try { localStorage.setItem(cleRecapitulatif(profil, recap), '1'); } catch { /* stockage indisponible */ }
      carte.remove();
    } }, '✕'),
    h('strong', {}, `📅 ${titre}`),
    faits && h('small', {}, `Tes efforts : ${faits}. C’est la régularité qui fait retenir.`));
  return carte;
}

// Carte « Mes révisions du jour » (#66) : le nombre de Questions dues, d'un geste vers l'écran de révision.
const carteRevisions = (dues) => h('button', { className: `carte carte-revisions${dues ? '' : ' secondaire'}`, onclick: () => (location.hash = '#/revisions') },
  h('strong', {}, '🧠 Mes révisions du jour'),
  h('small', {}, dues ? `${pluriel(dues, 'question')} à revoir` : 'Rien à revoir aujourd’hui 🎉'));

// Compte à rebours des contrôles (#68) : pour chaque Leçon de révision dont le contrôle est aujourd'hui ou à venir,
// le nombre de jours restants (calculé par le serveur, voir lib/jour.js), le plus proche d'abord.
const texteControle = (jours) => (jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : `dans ${jours} jours`);
function comptesARebours(lecons) {
  const aVenir = lecons.filter((l) => Number.isInteger(l.joursAvantControle) && l.joursAvantControle >= 0).map((l) => ({ l, jours: l.joursAvantControle }))
    .sort((a, b) => a.jours - b.jours);
  return aVenir.length > 0 && h('ul', { className: 'comptes-a-rebours' }, aVenir.map(({ l, jours }) =>
    h('li', {}, h('a', { href: `#/lecon/${l.id}` }, `📅 ${l.titre} : contrôle ${texteControle(jours)}`))));
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

  // Récompenses de la série menée jusqu'au bout (#94), annoncées en tête de l'écran qui suit.
  const annonces = (recompenses) => (recompenses?.etoile ? [h('p', { className: 'bulle-prof' }, '⭐ Nouvelle Étoile : Révision du jour terminée !')] : []);
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

// Cadrage posé par l'appli (ADR 0002), avant tout tour du prof : questions fixes, une à la fois, par-dessus l'écran.
// L'Élève touche une réponse (« Je ne sais pas » compris) ; on renvoie les valeurs, jamais les libellés. Les questions
// posées selon le mode viennent de la configuration. « ✕ » ou Échap annule : on renvoie null, sans rien démarrer.
async function cadrer(mode) {
  const cadrage = {};
  for (const cle of config.questionsCadrage[mode]) {
    const { question, reponses } = config.cadrage[cle];
    cadrage[cle] = await new Promise((choisir) => {
      const fermer = (valeur) => { calque.remove(); document.removeEventListener('keydown', echap); choisir(valeur); };
      const echap = (e) => e.key === 'Escape' && fermer(null);
      const calque = h('div', { className: 'cadrage' },
        h('button', { className: 'secondaire annuler', title: 'Annuler', onclick: () => fermer(null) }, '✕'),
        h('div', { className: 'bulle-prof' }, question),
        h('div', { className: 'choix' }, Object.entries(reponses).map(([valeur, libelle]) =>
          h('button', { onclick: () => fermer(valeur) }, libelle))));
      document.addEventListener('keydown', echap);
      app.append(calque);
    });
    if (cadrage[cle] === null) return null;
  }
  return cadrage;
}

function ecranNouvelleLecon(profil) {
  const erreur = h('p', { className: 'erreur' });
  const boutons = [];
  let boutonsIdees = []; // cartes de Propositions et « D'autres idées », remplacés à chaque affichage
  const activer = (actifs) => [...boutons, ...boutonsIdees].forEach((b) => (b.disabled = !actifs));
  // `mode` : 'libre' (sujet tapé ou Proposition) ou 'revision', pour les questions du Cadrage posées d'abord.
  // `cle` : ce que l'Élève démarre ; après une erreur du serveur, le réessayer garde les réponses du Cadrage.
  const cadrages = new Map();
  const demarrer = async (corps, mode, cle) => {
    activer(false);
    erreur.textContent = '';
    if (!cadrages.has(cle)) {
      const reponses = await cadrer(mode);
      if (!reponses) return activer(true); // Cadrage annulé : l'Élève revient à l'écran, rien n'est envoyé
      cadrages.set(cle, reponses);
    }
    const cadrage = cadrages.get(cle);
    erreur.textContent = '⏳ Ton prof prépare la leçon… (ça peut prendre quelques minutes)';
    try {
      const lecon = await api(`eleves/${profil.slug}/lecons`, { method: 'POST', body: { ...(await corps()), cadrage } });
      location.hash = `#/lecon/${lecon.id}`;
    } catch (e) {
      erreur.textContent = e.message;
      activer(true);
    }
  };

  const sujet = h('input', { required: true, maxLength: config.sujetMax, placeholder: 'Ex. : les volcans, la conjugaison du futur…' });
  const fichiers = h('input', { type: 'file', required: true, multiple: true, accept: '.pdf,image/*' });
  const dateControle = h('input', { type: 'date' });
  boutons.push(h('button', {}, 'Commencer'), h('button', {}, 'Réviser'));

  // Propositions préparées en arrière-plan : on les lit sans attendre l'agent, et on revient voir tant qu'elles se préparent.
  const idees = h('div', {});
  let minuteur, actif = true;
  // Les anciennes Propositions restent affichées et cliquables pendant qu'on en prépare de nouvelles.
  const afficherPropositions = async () => {
    clearTimeout(minuteur);
    let etat, propositions;
    try { ({ etat, propositions } = await api(`eleves/${profil.slug}/propositions`)); } catch { return idees.replaceChildren(); }
    if (!actif) return;
    const enPreparation = etat === 'en préparation';
    if (enPreparation) minuteur = setTimeout(afficherPropositions, 3000);
    const cartes = propositions.map((p) => h('button', { className: `carte ${p.type}`, disabled: boutons[0].disabled, onclick: () => demarrer(async () => ({ proposition: p.titre }), 'libre', `proposition:${p.titre}`) },
      h('span', { className: 'type' }, p.type === 'suite' ? '➡️ Pour aller plus loin' : '✨ Nouveau sujet'),
      p.auProgramme && h('span', { className: 'au-programme' }, '🎒 Au programme'),
      p.titre, h('small', {}, p.categorie), h('span', { className: 'accroche' }, p.accroche)));
    const autresIdees = h('button', { className: 'secondaire', disabled: boutons[0].disabled, onclick: async () => {
      autresIdees.disabled = true;
      // Un refus (génération déjà en cours) revient au même : on attend les Propositions qui se préparent.
      await api(`eleves/${profil.slug}/propositions`, { method: 'POST' }).catch(() => {});
      afficherPropositions();
    } }, "🔄 D'autres idées");
    boutonsIdees = [...cartes, autresIdees];
    idees.replaceChildren(
      h('h2', {}, '🎲 Des idées pour toi'),
      cartes.length > 0 && h('div', { className: 'grille' }, cartes),
      enPreparation
        ? h('p', { className: 'doux' }, cartes.length ? '⏳ Nouvelles idées en préparation…' : 'On prépare tes idées…')
        : autresIdees);
  };
  afficherPropositions();
  quitterEcran = () => { actif = false; clearTimeout(minuteur); };

  montrer(
    idees,
    h('h2', {}, '📄 Réviser une leçon de classe'),
    h('form', { className: 'colonne', onsubmit: (ev) => {
      ev.preventDefault();
      demarrer(async () => ({
        dateControle: dateControle.value || undefined,
        fichiers: await Promise.all([...fichiers.files].map(async (f) => ({ nom: f.name, data: await enBase64(f) }))),
      }), 'revision', 'revision');
    } },
      h('label', {}, 'Photos ou PDF de ta leçon (plusieurs pages possibles)', h('br'), fichiers),
      h('label', {}, 'Date du contrôle (facultatif)', h('br'), dateControle),
      boutons[1]),
    h('h2', {}, '💡 Apprendre ce que tu veux'),
    h('form', { className: 'colonne', onsubmit: (ev) => {
      ev.preventDefault();
      // Sujet vérifié avant le Cadrage, comme le fera le serveur : pas de questions pour un sujet refusé.
      const texte = sujet.value.trim();
      if (!texte) return (erreur.textContent = 'Dis-moi ce que tu veux apprendre');
      if (texte.length > config.sujetMax) return (erreur.textContent = `Ton sujet est trop long (${config.sujetMax} caractères au plus)`);
      demarrer(async () => ({ sujet: texte }), 'libre', `sujet:${texte}`);
    } }, sujet, boutons[0]),
    erreur);
}

// Libellé du bouton vert de chaque Rebond ; le serveur ne reçoit que l'action.
// L'Étape suivante montre le titre de la page annoncée par le prof, s'il est connu.
const LIBELLES_REBOND = { revoir: '🔁 Revoir', defi: '🏆 Défi', suivante: '➡️ Étape suivante', reviser: '📚 Réviser', commencer: '🚀 Commencer' };
const libelleRebond = (action, ensuite) => (action === 'suivante' && ensuite ? `${LIBELLES_REBOND.suivante} : ${ensuite}` : LIBELLES_REBOND[action]);

// Séance sans saisie libre : la page de leçon en plein écran. Une question du prof s'affiche au centre avec ses
// Réponses proposées ; après un quiz, son retour s'affiche au-dessus du bouton vert de la suite recommandée.
// Tout se déduit du dernier message du prof.
// `pageDemandee` : Page de leçon à ouvrir d'abord (lien d'une Révision du jour), sinon la dernière. `apercu` : ouverte
// depuis la vue parent, elle n'est pas notée comme une ouverture par l'Élève (indicateurs, #78).
async function ecranSession(profil, id, pageDemandee = null, { apercu = false } = {}) {
  let lecon = await api(`eleves/${profil.slug}/lecons/${id}${apercu ? '' : '?ouverture=1'}`);
  let attente = null; // { texte, centre } pendant que le prof travaille
  let retourFerme = false;
  const erreur = h('span', { className: 'erreur' });
  const entete = h('span', {});
  const panneau = h('div', { className: 'panneau' });
  const calque = h('div', {}); // question, attente ou retour de quiz, par-dessus la leçon
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
  const boutonFiche = h('button', { className: 'secondaire', onclick: ouvrirFiche }, '📋 Ma fiche');

  const afficherEntete = () => entete.replaceChildren(...garder([` · ${lecon.titre} `, badgeMaitrise(lecon.maitrise),
    lecon.references.length > 0 && [' ', boutonFiche]]));
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
          ? [h('div', { className: 'lecon-terminee' }, '🏆 Leçon terminée', h('small', {}, `Défi : ${score} %`), lecon.etoiles && etoiles(lecon.etoiles)),
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
    h('p', {}, h('a', { href: '#/' }, '← Mes leçons'), entete, ' ', erreur),
    h('div', { className: 'seance' }, panneau, calque, fiche, revisions));
}

async function route() {
  quitterEcran();
  arreterLecture(); // une lecture à voix haute des Révisions du jour s'arrête en changeant d'écran
  quitterEcran = () => {};
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
