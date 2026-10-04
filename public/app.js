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
  const form = h('form', { className: 'colonne', onsubmit: async (ev) => {
    ev.preventDefault();
    try { await envoyer({ pseudo: pseudo.value, age: age.value, niveau: niveau.value }); } catch (e) { erreur.textContent = e.message; }
  } },
    !profil && h('label', {}, 'Pseudo', h('br'), pseudo),
    h('label', {}, 'Âge', h('br'), age),
    h('label', {}, 'Classe', h('br'), niveau),
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
          badgeMaitrise(l.maitrise),
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
  const demarrer = async (corps) => {
    boutons.forEach((b) => (b.disabled = true));
    erreur.textContent = '⏳ Ton prof prépare la leçon… (ça peut prendre quelques minutes)';
    try {
      const lecon = await api(`eleves/${profil.slug}/lecons`, { method: 'POST', body: await corps() });
      location.hash = `#/lecon/${lecon.id}`;
    } catch (e) {
      erreur.textContent = e.message;
      boutons.forEach((b) => (b.disabled = false));
    }
  };

  const sujet = h('input', { required: true, placeholder: 'Ex. : les volcans, la conjugaison du futur…' });
  const fichiers = h('input', { type: 'file', required: true, multiple: true, accept: '.pdf,image/*' });
  const dateControle = h('input', { type: 'date' });
  boutons.push(h('button', {}, 'Commencer'), h('button', {}, 'Réviser'));

  montrer(
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

async function ecranSession(profil, id) {
  let lecon = await api(`eleves/${profil.slug}/lecons/${id}`);
  const messages = h('div', { className: 'messages' });
  const panneau = h('div', { className: 'panneau' });
  const champ = h('textarea', { rows: 2, placeholder: 'Écris ici…', required: true });
  const bouton = h('button', {}, 'Envoyer');
  const erreur = h('p', { className: 'erreur' });
  const entete = h('span', {});
  let iframe;

  const afficherEntete = () => entete.replaceChildren(` · ${lecon.titre} `, badgeMaitrise(lecon.maitrise));
  // Les quiz des pages de leçon envoient leur score par postMessage (voir les consignes de l'agent).
  const recevoirScore = async (ev) => {
    if (!iframe || ev.source !== iframe.contentWindow || ev.data?.type !== 'cartable-score') return;
    try {
      lecon = await api(`eleves/${profil.slug}/lecons/${id}/scores`, { method: 'POST', body: { score: ev.data.score, page: ev.data.page } });
      afficherEntete();
      erreur.textContent = `✅ Score enregistré : ${Math.round(ev.data.score)} %`;
    } catch (e) { erreur.textContent = e.message; }
  };
  window.addEventListener('message', recevoirScore);
  quitterEcran = () => window.removeEventListener('message', recevoirScore);

  const afficherMessages = () => {
    messages.replaceChildren(...lecon.messages.map((m) => h('div', { className: `msg ${m.role}` }, m.texte)));
    messages.scrollTop = messages.scrollHeight;
  };
  const afficherPanneau = () => {
    if (!lecon.pages.length) return panneau.replaceChildren(h('div', { className: 'vide' }, 'Les leçons apparaîtront ici.'));
    const choix = h('select', { onchange: () => (iframe.src = url(choix.value)) }, lecon.pages.map((p) => h('option', { value: p }, p.replace(/\.html$/, ''))));
    choix.value = lecon.pages.at(-1);
    const url = (p) => `/fichiers/${profil.slug}/${id}/lessons/${p}`;
    iframe = h('iframe', { src: url(choix.value), title: 'Leçon' });
    panneau.replaceChildren(choix, iframe);
  };
  const envoyer = async () => {
    const texte = champ.value.trim();
    if (!texte) return;
    bouton.disabled = champ.disabled = true;
    erreur.textContent = '⏳ Ton prof réfléchit…';
    messages.append(h('div', { className: 'msg eleve' }, texte));
    champ.value = '';
    try {
      lecon = await api(`eleves/${profil.slug}/lecons/${id}/messages`, { method: 'POST', body: { texte } });
      erreur.textContent = '';
      afficherEntete();
      afficherMessages();
      afficherPanneau();
    } catch (e) { erreur.textContent = e.message; }
    bouton.disabled = champ.disabled = false;
    champ.focus();
  };

  afficherEntete();
  afficherMessages();
  afficherPanneau();
  montrer(
    h('p', {}, h('a', { href: '#/' }, '← Mes leçons'), entete),
    h('div', { className: 'session' },
      h('div', { className: 'chat' }, messages, erreur,
        h('form', { onsubmit: (ev) => { ev.preventDefault(); envoyer(); } }, champ, bouton)),
      panneau));
  champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); envoyer(); } });
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
