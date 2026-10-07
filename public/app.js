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
  const form = h('form', { className: 'colonne', onsubmit: async (ev) => {
    ev.preventDefault();
    try { await envoyer({ pseudo: pseudo.value, age: age.value, niveau: niveau.value, nombrePropositions: nombrePropositions.value }); } catch (e) { erreur.textContent = e.message; }
  } },
    !profil && h('label', {}, 'Pseudo', h('br'), pseudo),
    h('label', {}, 'Âge', h('br'), age),
    h('label', {}, 'Classe', h('br'), niveau),
    h('label', {}, "Nombre d'idées de leçons proposées (2 à 10)", h('br'), nombrePropositions),
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
  montrer(...formulaireProfil({ profil, titre: 'Mon profil', envoyer: async (champs) => {
    await api(`eleves/${profil.slug}`, { method: 'PUT', body: champs });
    location.hash = '#/';
  } }));
}

const PALIERS = { 'non acquis': 'rouge', 'à consolider': 'orange', acquis: 'vert' };

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
          h('span', { className: 'ligne-maitrise' }, badgeMaitrise(l.maitrise), l.terminee && h('span', { title: 'Leçon terminée' }, '🏆')),
          h('small', {}, new Date(l.derniereActivite).toLocaleDateString('fr-BE'))))),
    ]));
}

const enBase64 = (fichier) => new Promise((resolve, reject) => {
  const lecteur = new FileReader();
  lecteur.onload = () => resolve(lecteur.result.split(',')[1]);
  lecteur.onerror = () => reject(new Error(`Lecture impossible : ${fichier.name}`));
  lecteur.readAsDataURL(fichier);
});

function ecranNouvelleLecon(profil) {
  const erreur = h('p', { className: 'erreur' });
  const boutons = [];
  let boutonsIdees = []; // cartes de Propositions et « D'autres idées », remplacés à chaque affichage
  const activer = (actifs) => [...boutons, ...boutonsIdees].forEach((b) => (b.disabled = !actifs));
  const demarrer = async (corps) => {
    activer(false);
    erreur.textContent = '⏳ Ton prof prépare la leçon… (ça peut prendre quelques minutes)';
    try {
      const lecon = await api(`eleves/${profil.slug}/lecons`, { method: 'POST', body: await corps() });
      location.hash = `#/lecon/${lecon.id}`;
    } catch (e) {
      erreur.textContent = e.message;
      activer(true);
    }
  };

  const sujet = h('input', { required: true, maxLength: 80, placeholder: 'Ex. : les volcans, la conjugaison du futur…' });
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
    const cartes = propositions.map((p) => h('button', { className: `carte ${p.type}`, disabled: boutons[0].disabled, onclick: () => demarrer(async () => ({ proposition: p.titre })) },
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
      }));
    } },
      h('label', {}, 'Photos ou PDF de ta leçon (plusieurs pages possibles)', h('br'), fichiers),
      h('label', {}, 'Date du contrôle (facultatif)', h('br'), dateControle),
      boutons[1]),
    h('h2', {}, '💡 Apprendre ce que tu veux'),
    h('form', { className: 'colonne', onsubmit: (ev) => {
      ev.preventDefault();
      demarrer(async () => ({ sujet: sujet.value }));
    } }, sujet, boutons[0]),
    erreur);
}

// Libellé du bouton vert de chaque Rebond ; le serveur ne reçoit que l'action.
const LIBELLES_REBOND = { revoir: '🔁 Revoir', defi: '🏆 Défi', suivante: '➡️ Prêt pour la suite ?', reviser: '📚 Réviser' };

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
  let pagesAffichees, iframe;

  const afficherEntete = () => entete.replaceChildren(` · ${lecon.titre} `, badgeMaitrise(lecon.maitrise));
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
      contenu = h('div', { className: 'apres-quiz' },
        !retourFerme && h('div', { className: 'retour' },
          h('button', { className: 'secondaire fermer', title: 'Fermer', onclick: () => { retourFerme = true; afficher(); } }, '✕'),
          prof.texte),
        action === 'terminee'
          ? [h('div', { className: 'lecon-terminee' }, '🏆 Leçon terminée', h('small', {}, `Défi : ${score} %`)),
             ...lecon.rebondsProposes.map((r) => h('button', { className: 'secondaire', onclick: () => choisirRebond(r) }, LIBELLES_REBOND[r]))]
          : lecon.rebondsProposes.map((r) => h('button', { className: 'action-suivante', onclick: () => choisirRebond(r) }, LIBELLES_REBOND[r], h('small', {}, `Quiz : ${score} %`))));
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
    const corps = { score: ev.data.score, page: ev.data.page };
    try {
      lecon = await api(`eleves/${profil.slug}/lecons/${id}/scores`, { method: 'POST', body: corps });
      afficherEntete();
    } catch (e) { return (erreur.textContent = e.message); }
    tour({ texte: '⏳ Ton prof regarde ton quiz…' }, () => api(`eleves/${profil.slug}/lecons/${id}/retours`, { method: 'POST', body: corps }));
  };
  window.addEventListener('message', recevoirScore);
  quitterEcran = () => window.removeEventListener('message', recevoirScore);

  afficherEntete();
  afficher();
  montrer(
    h('p', {}, h('a', { href: '#/' }, '← Mes leçons'), entete, ' ', erreur),
    h('div', { className: 'seance' }, panneau, calque));
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
