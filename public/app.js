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
  const modele = h('select', { name: 'modele' }, config.modeles.map((m) => h('option', { value: m.id, selected: m.id === (profil?.modele ?? config.modeleDefaut) }, `${m.libelle} — ${m.description}`)));
  const form = h('form', { className: 'colonne', onsubmit: async (ev) => {
    ev.preventDefault();
    try { await envoyer({ pseudo: pseudo.value, age: age.value, niveau: niveau.value, nombrePropositions: nombrePropositions.value, modele: modele.value }); } catch (e) { erreur.textContent = e.message; }
  } },
    !profil && h('label', {}, 'Pseudo', h('br'), pseudo),
    h('label', {}, 'Âge', h('br'), age),
    h('label', {}, 'Classe', h('br'), niveau),
    h('label', {}, "Nombre d'idées de leçons proposées (2 à 10)", h('br'), nombrePropositions),
    h('label', {}, 'Modèle', h('br'), modele),
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
}

const PALIERS = { 'non acquis': 'rouge', 'à consolider': 'orange', acquis: 'vert' };

// Trois Étoiles d'une Leçon de révision, pleines ou vides.
const TITRES_ETOILES = { quiz: 'Quiz réussi', bonus: 'Questions bonus réussies', defi: 'Défi réussi' };
const etoiles = (e) => h('span', { className: 'etoiles' },
  Object.entries(TITRES_ETOILES).map(([cle, titre]) => h('span', { className: e[cle] ? 'pleine' : 'vide', title: titre }, e[cle] ? '⭐' : '☆')));

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

function badgeMaitrise(maitrise) {
  if (!maitrise) return h('span', { className: 'maitrise' }, 'pas encore évalué');
  return h('span', { className: `maitrise ${PALIERS[maitrise.palier]}`, title: maitrise.palier },
    h('span', { className: 'jauge' }, h('span', { style: `width:${maitrise.pourcentage}%` })),
    `${maitrise.pourcentage} % · ${maitrise.palier}`);
}

async function ecranAccueil(profil) {
  const lecons = await api(`eleves/${profil.slug}/lecons`);
  const parCategorie = Object.groupBy(lecons, (l) => l.categorie);
  montrer(
    h('h2', {}, `Salut ${profil.pseudo} !`),
    h('button', { onclick: () => (location.hash = '#/nouvelle-lecon') }, '✨ Apprendre quelque chose de nouveau'),
    lecons.length === 0 && h('p', {}, "Tu n'as pas encore de leçon."),
    config.categories.filter((c) => parCategorie[c]).map((c) => [
      h('h2', {}, c),
      h('div', { className: 'grille' }, parCategorie[c].map((l) =>
        h('button', { className: 'carte', onclick: () => (location.hash = `#/lecon/${l.id}`) }, l.titre,
          h('span', { className: 'ligne-maitrise' }, l.niveauLecon && h('span', { className: 'niveau-lecon', title: 'Niveau de Leçon' }, `Niveau ${l.niveauLecon}`), badgeMaitrise(l.maitrise), l.etoiles && etoiles(l.etoiles),
            l.depassement && h('span', { title: 'Dépassement réussi' }, '🚀')),
          objectifsRetenus(l.objectifs),
          h('span', { className: 'continuer' }, `▶️ Continuer${l.mode === 'libre' && l.ensuite ? ` : ${l.ensuite}` : ''}`),
          h('small', {}, new Date(l.derniereActivite).toLocaleDateString('fr-BE'))))),
    ]));
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
async function ecranSession(profil, id) {
  let lecon = await api(`eleves/${profil.slug}/lecons/${id}`);
  let attente = null; // { texte, centre } pendant que le prof travaille
  let retourFerme = false;
  const erreur = h('span', { className: 'erreur' });
  const entete = h('span', {});
  const panneau = h('div', { className: 'panneau' });
  const calque = h('div', {}); // question, attente ou retour de quiz, par-dessus la leçon
  const fiche = h('div', { className: 'fiche', style: 'display:none' }); // Ma fiche, par-dessus tout le reste
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
    const url = (p) => `/fichiers/${profil.slug}/${id}/lessons/${p}`;
    const choix = h('select', { onchange: () => (iframe.src = url(choix.value)) }, lecon.pages.map((p) => h('option', { value: p }, p.replace(/\.html$/, ''))));
    choix.value = lecon.pages.at(-1);
    iframe = h('iframe', { src: url(choix.value), title: 'Leçon' });
    panneau.replaceChildren(choix, iframe);
  };

  const afficher = () => {
    afficherPanneau();
    const prof = lecon.messages.findLast((m) => m.role === 'agent');
    const voile = lecon.pages.length ? 'voile' : '';
    const bulle = (...enfants) => h('div', { className: 'bulle-prof' }, ...enfants);
    let contenu = null;
    if (attente?.centre) contenu = h('div', { className: `seance-centre ${voile}` }, bulle(attente.texte));
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
    h('div', { className: 'seance' }, panneau, calque, fiche));
}

async function route() {
  quitterEcran();
  quitterEcran = () => {};
  try {
    config ??= await api('config');
    const [, page, id] = location.hash.split('/');
    if (page === 'nouvel-eleve') return await ecranNouvelEleve();
    const slug = pseudoCourant();
    const profil = slug && (await api(`eleves/${slug}`).catch(() => null));
    if (!profil) return await ecranChoix();
    barreNav(profil);
    if (page === 'profil') return await ecranProfil(profil);
    if (page === 'nouvelle-lecon') return ecranNouvelleLecon(profil);
    if (page === 'lecon') return await ecranSession(profil, id);
    return await ecranAccueil(profil);
  } catch (e) {
    montrer(h('p', { className: 'erreur' }, e.message));
  }
}

window.addEventListener('hashchange', route);
route();
