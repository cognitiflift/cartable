// PROTOTYPE JETABLE — disposition de l'écran de Séance (Q1 : la place du chat).
// Trois variantes sur la vraie route #/lecon/<id>, choisies par ?variant=a|b|c :
//   a = colonne étroite fixe à gauche, b = tiroir repliable, c = bandeau en bas.
// Hypothèses : plus de saisie libre ; le prof propose 3-4 Réponses proposées (factices ici),
// plus « Je ne sais pas 🤷 » et des boutons fixes de l'appli (Q3/Q4).
// Rien n'est envoyé au serveur : cliquer une réponse l'ajoute localement, avec une fausse réponse du prof.
// À ne jamais fusionner dans main.

const VARIANTES = {
  a: 'Colonne étroite fixe',
  b: 'Tiroir repliable',
  c: 'Bandeau en bas',
};
const FIXES = ["J'ai fini 👍", "Je n'ai pas compris 🤔", 'Leçon suivante ➡️'];
const LOTS = [
  ['Je fais le quiz maintenant', 'Explique-moi encore le schéma actantiel', 'Donne-moi un exemple', 'Je veux un défi plus dur'],
  ['Le héros', "L'opposant", 'Le destinateur'],
  ['Oui, j\'ai compris', 'Pas tout à fait', 'Tu peux répéter plus simplement ?'],
];
const FAUSSE_REPONSE = "(Prototype) Ici, le prof répondrait à ton choix, sur plusieurs lignes comme d'habitude.\n\nPuis il te proposerait de nouvelles réponses ci-dessous. 👇";

const lien = document.createElement('link');
lien.rel = 'stylesheet';
lien.href = 'prototype-seance.css';
const cssPret = new Promise((r) => (lien.onload = r));
document.head.append(lien);

export async function ecranSessionPrototype({ profil, id, lecon, h, montrer, badgeMaitrise, variante }) {
  if (!VARIANTES[variante]) variante = 'c';
  const messages = [...lecon.messages];
  let lot = 0;
  let rendu = () => {};

  // Ce qu'on clique : ajoute localement le choix et une fausse réponse du prof.
  const choisir = (texte) => {
    messages.push({ role: 'eleve', texte }, { role: 'agent', texte: FAUSSE_REPONSE });
    lot = (lot + 1) % LOTS.length;
    rendu();
  };
  const bulle = (m) => h('div', { className: `msg ${m.role}` }, m.texte);
  const dernierProf = () => messages.findLast((m) => m.role === 'agent');
  const reponses = (classe = '') =>
    h('div', { className: `proto-reponses ${classe}` },
      h('div', { className: 'proto-proposees' },
        [...LOTS[lot], 'Je ne sais pas 🤷'].map((t) => h('button', { onclick: () => choisir(t) }, t))),
      h('div', { className: 'proto-fixes' },
        FIXES.map((t) => h('button', { className: 'secondaire', onclick: () => choisir(t) }, t))));

  const panneau = () => {
    if (!lecon.pages.length) return h('div', { className: 'panneau' }, h('div', { className: 'vide' }, 'Les leçons apparaîtront ici.'));
    const url = (p) => `/fichiers/${profil.slug}/${id}/lessons/${p}`;
    const iframe = h('iframe', { src: url(lecon.pages.at(-1)), title: 'Leçon' });
    const choix = h('select', { onchange: () => (iframe.src = url(choix.value)) }, lecon.pages.map((p) => h('option', { value: p }, p.replace(/\.html$/, ''))));
    choix.value = lecon.pages.at(-1);
    return h('div', { className: 'panneau' }, choix, iframe);
  };
  // L'iframe est créée une fois pour ne pas recharger la leçon à chaque clic.
  const lePanneau = panneau();

  const entete = h('p', { className: 'proto-entete' }, h('a', { href: '#/' }, '← Mes leçons'), ` · ${lecon.titre} `, badgeMaitrise(lecon.maitrise));

  // (a) Colonne étroite fixe (~300 px) à gauche, la leçon prend le reste.
  const varianteA = () => {
    const fil = h('div', { className: 'messages' }, messages.map(bulle));
    const zone = h('div', { className: 'proto-a' },
      h('div', { className: 'proto-a-chat' }, fil, reponses('vertical')),
      lePanneau);
    queueMicrotask(() => (fil.scrollTop = fil.scrollHeight));
    return zone;
  };

  // (b) Tiroir : la leçon en plein écran, le chat s'ouvre par-dessus.
  let tiroirOuvert = false;
  let nonLu = true;
  const varianteB = () => {
    const fil = h('div', { className: 'messages' }, messages.map(bulle));
    const tiroir = h('aside', { className: `proto-b-tiroir ${tiroirOuvert ? 'ouvert' : ''}` },
      h('div', { className: 'proto-b-titre' }, h('strong', {}, '💬 Ton prof'),
        h('button', { className: 'secondaire', onclick: () => { tiroirOuvert = false; rendu(); } }, '✕')),
      fil, reponses());
    const ouvrir = h('button', { className: 'proto-b-ouvrir', onclick: () => { tiroirOuvert = true; nonLu = false; rendu(); } },
      '💬 Ton prof', nonLu && h('span', { className: 'proto-pastille' }, '1'));
    queueMicrotask(() => (fil.scrollTop = fil.scrollHeight));
    return h('div', { className: 'proto-b' }, lePanneau, tiroirOuvert ? null : ouvrir, tiroir);
  };

  // (c) Bandeau en bas : dernier message du prof + boutons, historique dépliable.
  let historiqueOuvert = false;
  const varianteC = () => {
    const precedents = messages.slice(0, messages.lastIndexOf(dernierProf()));
    const historique = historiqueOuvert &&
      h('div', { className: 'proto-c-historique' }, h('div', { className: 'messages' }, precedents.map(bulle)));
    const bandeau = h('div', { className: 'proto-c-bandeau' },
      h('button', { className: 'secondaire proto-c-bascule', onclick: () => { historiqueOuvert = !historiqueOuvert; rendu(); } },
        historiqueOuvert ? '▾ Masquer l\'historique' : `▴ Historique (${precedents.length})`),
      h('div', { className: 'proto-c-dernier' }, dernierProf()?.texte ?? ''),
      reponses('ligne'));
    queueMicrotask(() => historique && (historique.firstChild.scrollTop = historique.firstChild.scrollHeight));
    return h('div', { className: 'proto-c' }, h('div', { className: 'proto-c-lecon' }, lePanneau, historique), bandeau);
  };

  const vues = { a: varianteA, b: varianteB, c: varianteC };
  rendu = () => {
    montrer(h('div', { className: `proto-cadre variante-${variante}` }, entete, vues[variante]()), barre());
  };

  // Barre flottante du prototype : ← variante →, et bascule largeur mobile.
  const cles = Object.keys(VARIANTES);
  const aller = (pas) => {
    variante = cles[(cles.indexOf(variante) + pas + cles.length) % cles.length];
    const url = new URL(location.href);
    url.searchParams.set('variant', variante);
    history.replaceState(null, '', url);
    rendu();
  };
  const barre = () =>
    h('div', { className: 'proto-barre' },
      h('button', { onclick: () => aller(-1), title: 'Variante précédente (←)' }, '←'),
      h('span', {}, `${variante.toUpperCase()} · ${VARIANTES[variante]}`),
      h('button', { onclick: () => aller(1), title: 'Variante suivante (→)' }, '→'),
      h('button', {
        className: document.body.classList.contains('proto-mobile') ? 'actif' : '',
        title: 'Simuler un téléphone (390 px)',
        onclick: () => { document.body.classList.toggle('proto-mobile'); rendu(); },
      }, '📱'));

  const clavier = (ev) => {
    if (ev.target.closest('input, textarea, select, [contenteditable]')) return;
    if (ev.key === 'ArrowLeft') aller(-1);
    if (ev.key === 'ArrowRight') aller(1);
  };
  await cssPret;
  window.addEventListener('keydown', clavier);
  rendu();
  return () => window.removeEventListener('keydown', clavier);
}
