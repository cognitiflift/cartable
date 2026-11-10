// Prototype jetable #198 : l'attente d'une carte de ligne que l'agent n'a pas fini de composer.
// Réutilise public/style.css (jetons, cérémonie) et la scène générique du serveur pour la « vraie » carte simulée.
import { sceneGenerique } from '../../lib/carte-generique.js';

const NS = 'http://www.w3.org/2000/svg';
const moinsDeMouvement = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const h = (tag, attrs = {}, ...enfants) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'onclick') el.onclick = v; else if (k === 'className') el.className = v; else if (v === true) el.setAttribute(k, ''); else if (v !== false) el.setAttribute(k, v); }
  el.append(...enfants);
  return el;
};

const TITRE = 'Les fractions';
const SALUE = 'Tu sais comparer et additionner des fractions.';
const OBJECTIFS = 5;

// --- Le dessin de l'esquisse : un SVG 200 × 280, mêmes zones que la carte composée (ciel en haut, décor, ligne vers 58 %,
// héros qui déborde à droite). Chaque tracé porte pathLength=1 : il se dessine au trait.
const trait = (d, classe = '', i = 0) => `<path class="trait ${classe}" pathLength="1" d="${d}" style="--i:${i}"/>`;
const motifs = {
  // Français : la plume écrit trois lignes d'écriture ondulée
  francais: () => trait('M16 214 q9 -13 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0', '', 0)
    + trait('M16 232 q9 -13 18 0 t18 0 t18 0 t18 0 t18 0', '', 1)
    + trait('M16 250 q9 -13 18 0 t18 0 t18 0', '', 2)
    + trait('M168 196 l-22 34 m22 -34 l6 10 l-8 2', 'couleur', 3)
    + '<circle class="point" cx="146" cy="232" r="2.6" style="--i:0"/>',
  // Mathématiques : un compas trace un cercle, une équerre, une grille
  mathematiques: () => trait('M30 40 H170 M30 70 H170 M30 100 H170 M50 24 V124 M100 24 V124 M150 24 V124', '', 0)
    + trait('M54 250 L100 204 L146 250 Z', 'couleur', 1)
    + trait('M70 232 a30 30 0 0 1 60 0', '', 2)
    + '<circle class="point" cx="100" cy="204" r="3" style="--i:0"/><circle class="point" cx="54" cy="250" r="3" style="--i:1"/><circle class="point" cx="146" cy="250" r="3" style="--i:2"/>',
  // Sciences : des orbites qui tournent autour d'un noyau
  sciences: () => '<g class="orbite">' + trait('M30 110 a70 26 0 1 0 140 0 a70 26 0 1 0 -140 0', '', 0)
    + trait('M42 74 a70 26 60 1 0 116 72 a70 26 60 1 0 -116 -72', '', 1)
    + '<circle class="point" cx="170" cy="110" r="4" style="--i:0"/><circle class="point" cx="42" cy="74" r="3.4" style="--i:1"/></g>',
  // Autres Catégories : une constellation reliée point à point
  autre: () => trait('M20 40 L56 66 L90 36 L130 70 L172 44', '', 0) + trait('M56 66 L70 112 L130 70', '', 1)
    + '<circle class="point" cx="56" cy="66" r="3" style="--i:0"/><circle class="point" cx="130" cy="70" r="3" style="--i:1"/><circle class="point" cx="70" cy="112" r="3" style="--i:2"/>',
};
const motifDe = (cat) => (motifs[cat] ?? motifs.autre)();

function esquisse(cat) {
  const etoiles = [[60, 30], [92, 52], [126, 24], [150, 60], [76, 84], [168, 96], [40, 70]]
    .map(([x, y], i) => `<circle class="point etoile" cx="${x}" cy="${y}" r="${1 + (i % 3) * .5}" style="--i:${i}"/>`).join('');
  const stations = Array.from({ length: OBJECTIFS }, (_, i) => `<circle class="station-s" cx="${26 + i * 30}" cy="162" r="9" style="--i:${i}"/>`).join('');
  const pointes = '88,222 112,100 140,128 172,176 150,224';
  return `<svg viewBox="0 0 200 280" aria-hidden="true"><defs><radialGradient id="att-halo"><stop offset="0" stop-color="var(--ligne)" stop-opacity=".9"/><stop offset="1" stop-color="var(--ligne)" stop-opacity="0"/></radialGradient></defs>
    <circle class="halo" cx="100" cy="120" r="96" fill="url(#att-halo)"/>
    ${trait('M20 8 H180 a12 12 0 0 1 12 12 V260 a12 12 0 0 1 -12 12 H20 a12 12 0 0 1 -12 -12 V20 a12 12 0 0 1 12 -12 Z', 'cadre couleur')}
    ${etoiles}
    ${trait('M8 150 Q48 112 96 138 T192 128', 'colline', 0)}${trait('M8 172 Q60 140 110 164 T192 158', 'colline', 1)}
    <path class="remplit colline-f" d="M8 150 Q48 112 96 138 T192 128 V272 H8 Z"/>
    ${trait('M8 162 H192', 'rail couleur')}${stations}
    <polygon class="remplit heros-f" points="${pointes}"/>
    ${trait(`M${pointes.split(' ').join(' L')} Z`, 'heros', 0)}${trait('M112 100 L128 170 L150 224 M140 128 L128 170 L88 222', 'heros', 1)}
    <g class="motif">${motifDe(cat)}</g></svg><div class="att-reflet" aria-hidden="true"></div>`;
}

// --- Variantes en boucle de 6 s (B, C, D). Même enveloppe `.att-in` que A (le retournement de fin est commun).
// B « Le convoi » : un petit train traverse la carte de gare en gare, chaque gare s'allume à son passage.
function convoi() {
  const gares = Array.from({ length: OBJECTIFS }, (_, i) => `<circle class="b-gare" cx="${26 + i * 37}" cy="140" r="10" style="--i:${i}"/>`).join('');
  return `<svg viewBox="0 0 200 280" aria-hidden="true">
    <path class="b-rail" d="M0 140 H200"/><path class="b-rail b-rail2" d="M0 206 H200"/>${gares}
    <g class="b-train"><rect x="-34" y="124" width="30" height="22" rx="7"/><rect class="fen" x="-29" y="129" width="7" height="7" rx="2"/><rect class="fen" x="-18" y="129" width="7" height="7" rx="2"/><circle cx="-26" cy="148" r="3.4"/><circle cx="-12" cy="148" r="3.4"/></g></svg>`;
}
// C « Les couches » : les quatre couches de la carte (ciel, décor, ligne, héros) se détachent en profondeur et se replient.
function couches() {
  const plan = (classe, contenu) => `<div class="c-plan ${classe}"><svg viewBox="0 0 200 280" aria-hidden="true">${contenu}</svg></div>`;
  return `<div class="c-scene">${plan('c1', '<circle cx="146" cy="62" r="22"/><circle cx="60" cy="40" r="2.5"/><circle cx="92" cy="74" r="2"/><circle cx="30" cy="84" r="2"/>')}
    ${plan('c2', '<path d="M0 150 Q48 112 96 138 T200 128 V280 H0 Z"/>')}
    ${plan('c3', `<path d="M0 170 H200"/>${Array.from({ length: OBJECTIFS }, (_, i) => `<circle cx="${26 + i * 37}" cy="170" r="10"/>`).join('')}`)}
    ${plan('c4', '<path d="M82 226 L112 90 L146 124 L184 180 L158 228 Z"/><path d="M112 90 L130 174 L158 228 M146 124 L130 174 L82 226"/>')}</div>`;
}
// D « Crayonné » : des hachures se posent sur le ciel, le décor et le héros, puis s'effacent doucement.
function crayon() {
  const hachures = (x0, y0, w, h, n, classe, pas = 8) => Array.from({ length: n }, (_, i) => `<path class="d-trait ${classe}" pathLength="1" d="M${x0 + (i * w) / n} ${y0 + h} L${x0 + (i * w) / n + 22} ${y0}" style="--i:${i}"/>`).join('');
  return `<svg viewBox="0 0 200 280" aria-hidden="true">
    <g class="d-ciel" style="--d:0s">${hachures(14, 20, 172, 100, 15, 'ciel')}</g>
    <g class="d-decor" style="--d:1.2s">${hachures(14, 130, 172, 60, 15, 'decor')}</g>
    <g style="--d:2.4s"><path class="d-trait ligne" pathLength="1" d="M10 174 H190" style="--i:0"/>${Array.from({ length: OBJECTIFS }, (_, i) => `<circle class="d-gare" cx="${26 + i * 37}" cy="174" r="9" style="--i:${i}"/>`).join('')}</g>
    <g class="d-heros" style="--d:3s"><path class="d-trait ligne" pathLength="1" d="M88 232 L112 100 L142 130 L176 184 L152 234 Z" style="--i:0"/>${hachures(106, 120, 52, 100, 6, 'heros')}</g></svg>`;
}
// E « Esquisse en boucle » : le dessin de A (cadre, ciel, décor, ligne, héros), mais chaque élément se trace, tient, puis
// s'efface doucement ; les éléments sont décalés, la carte se redessine en continu sur 6 s.
function esquisseBoucle(cat) {
  const t = (d, classe, delai) => `<path class="e-trait ${classe}" pathLength="1" d="${d}" style="--d:${delai}s"/>`;
  const etoiles = [[60, 30], [92, 52], [126, 24], [150, 60], [76, 84], [168, 96], [40, 70]]
    .map(([x, y], i) => `<circle class="e-point" cx="${x}" cy="${y}" r="${1 + (i % 3) * .5}" style="--d:${(.5 + i * .18).toFixed(2)}s"/>`).join('');
  const stations = Array.from({ length: OBJECTIFS }, (_, i) => `<circle class="e-station" cx="${26 + i * 30}" cy="162" r="9" style="--d:${(2 + i * .22).toFixed(2)}s"/>`).join('');
  const pointes = '88,222 112,100 140,128 172,176 150,224';
  return `<svg viewBox="0 0 200 280" aria-hidden="true">
    ${t('M20 8 H180 a12 12 0 0 1 12 12 V260 a12 12 0 0 1 -12 12 H20 a12 12 0 0 1 -12 -12 V20 a12 12 0 0 1 12 -12 Z', 'cadre', 0)}
    ${etoiles}
    ${t('M8 150 Q48 112 96 138 T192 128', '', 1)}${t('M8 172 Q60 140 110 164 T192 158', '', 1.3)}
    <path class="e-fond" d="M8 150 Q48 112 96 138 T192 128 V272 H8 Z" style="--d:1.4s"/>
    ${t('M8 162 H192', 'rail', 1.8)}${stations}
    <polygon class="e-fond" points="${pointes}" style="--d:3s"/>
    ${t(`M${pointes.split(' ').join(' L')} Z`, '', 2.6)}${t('M112 100 L128 170 L150 224 M140 128 L128 170 L88 222', '', 3.1)}
    <g class="motif">${motifDe(cat).replace(/class="trait /g, 'class="e-trait ').replace(/class="trait"/g, 'class="e-trait"').replace(/class="point"/g, 'class="e-point"').replace(/style="--i:(\d+)"/g, (_, i) => `style="--d:${(1.2 + i * .6).toFixed(1)}s"`)}</g></svg>`;
}
const VARIANTES = {
  A: { nom: 'Esquisse (crescendo)', dessin: esquisse },
  F: { nom: 'A rejoué en boucle (~6,5 s)', dessin: esquisse, rejoue: true },
  E: { nom: 'Esquisse en boucle (6 s)', dessin: esquisseBoucle, boucle: true },
  B: { nom: 'Le convoi (boucle 6 s)', dessin: convoi, boucle: true },
  C: { nom: 'Les couches (boucle 6 s)', dessin: couches, boucle: true },
  D: { nom: 'Crayonné (boucle 6 s)', dessin: crayon, boucle: true },
};
let variante = new URLSearchParams(location.search).get('variant')?.toUpperCase();
if (!VARIANTES[variante]) variante = 'A';

// --- La « vraie » carte (simulée) : même DOM que carteLigne (public/app.js), scène générique du serveur.
function carteReelle(cat) {
  const calques = sceneGenerique({ lecon: 'fractions', categorie: cat });
  const calque = (classe, svg) => h('div', { className: `cl-calque ${classe}`, 'aria-hidden': 'true' });
  const c = (classe, svg) => { const d = calque(classe); d.innerHTML = svg; return d; };
  const ligne = h('div', { className: 'ligne' });
  for (let i = 0; i < OBJECTIFS; i++) {
    ligne.append(h('span', { className: 'station atteinte', style: `--i:${i}` }));
    if (i < OBJECTIFS - 1) ligne.append(h('span', { className: 'troncon fait' }));
  }
  const terminus = h('span', { className: 'terminus allume' }, 'Acquis');
  const el = h('div', { className: 'carte-ligne-carte entree', style: `--ligne: var(--ligne-${cat}, var(--ligne-autre)); --n: ${OBJECTIFS}; --pas:.18s`, tabindex: '0', role: 'img', 'aria-label': `Carte de la leçon ${TITRE}` },
    h('div', { className: 'cl-incl' },
      h('div', { className: 'cl-face cl-avant' },
        h('div', { className: 'cl-cadre' }, c('cl-l1', calques.l1), c('cl-l2', calques.l2), h('div', { className: 'cl-ligne' }, ligne)),
        h('div', { className: 'cl-bord' }),
        c('cl-heros', calques.heros),
        h('div', { className: 'cl-texte' }, h('span', { className: 'cl-titre' }, TITRE), h('span', { className: 'cl-etiquette' }, cat)),
        h('div', { className: 'cl-terminus' }, terminus))));
  return el;
}

const gerbe = () => h('div', { className: 'cer-eclats', 'aria-hidden': 'true' }, ...Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2, d = 90 + (i % 3) * 30;
  return h('i', { style: `--dx:${(Math.cos(a) * d).toFixed(0)}px; --dy:${(Math.sin(a) * d).toFixed(0)}px; animation-delay:${(1.5 + (i % 4) * 0.03).toFixed(2)}s` });
}));

// --- La cérémonie avec attente.
const reglage = () => Object.fromEntries(new FormData(document.getElementById('reglages')));
const emplacement = document.getElementById('emplacement');
let enPreparation = null; // la carte du prototype « se compose » en tâche de fond tant qu'on n'a pas fini

function ouvrir() {
  const { cat, attente, max, palier } = reglage();
  const reduit = moinsDeMouvement();
  const prete = attente === '0';
  const dlg = h('dialog', { className: 'cartes-ceremonie', 'aria-label': `Nouvelle carte : ${TITRE}` });
  const texte = h('div', { className: 'cer-texte', 'aria-live': 'polite' });
  const scene = h('div', { className: 'cer-carte' });
  const ok = h('button', { type: 'button', className: 'cer-ok', hidden: true, onclick: () => dlg.close() }, 'Fermer');
  const pause = h('button', { type: 'button', className: 'secondaire att-pause', hidden: true, 'aria-pressed': 'false' }, 'Mettre en pause');
  const plusTard = h('button', { type: 'button', className: 'secondaire cer-plus-tard', onclick: () => dlg.close() }, 'Plus tard');
  const timers = [];
  const apres = (ms, f) => timers.push(setTimeout(() => { if (dlg.isConnected) f(); }, ms));
  let revelee = false;

  const reveler = (cle) => { // la première image de la cérémonie normale : retournement, calques, héros, gerbe
    if (revelee) return;
    revelee = true;
    const vraie = carteReelle(cle);
    vraie.querySelectorAll('.cl-ligne .station').forEach((st, i) => st.style.setProperty('--i', String(i)));
    scene.replaceChildren(vraie, gerbe());
    pause.hidden = true; plusTard.hidden = true;
    texte.replaceChildren(h('p', {}, ''));
    apres(reduit ? 0 : 2400, () => { texte.replaceChildren(h('h3', {}, TITRE), h('p', {}, SALUE)); ok.hidden = false; ok.focus(); });
  };

  if (prete) { // aucune attente : la cérémonie d'aujourd'hui (carte face cachée, un geste, la révélation)
    texte.append(h('p', {}, 'Touche la carte pour la retourner.'));
    const dos = h('button', { type: 'button', className: 'carte-cachee ligne', style: 'position:relative; display:block; width:100%; aspect-ratio:5/7; border:0; background:none; cursor:pointer; --ligne:var(--ligne-autre)', 'aria-label': 'Une nouvelle carte, face cachée. Touche pour la retourner.', onclick: () => reveler(cat) },
      h('span', { className: 'cl-cachee-face' }, h('span', { className: 'cl-medaillon', 'aria-hidden': 'true' }, '🚉')));
    scene.append(dos);
  } else {
    const v = VARIANTES[variante];
    const carte = h('div', { className: `att-carte ${cat} ${v.boucle ? `boucle v${variante}` : ''}` }, h('div', { className: 'att-in' }));
    carte.firstChild.innerHTML = v.dessin(cat);
    texte.append(h('p', {}, 'Ta carte se prépare'));
    scene.append(carte);
    if (v.rejoue) { // A tel quel, un peu accéléré, puis fondu de sortie et redémarrage : ~5,7 s + 0,8 s de fondu
      const VITESSE = 1.4, TOUR = 5700, FONDU = 800;
      const accelerer = () => carte.getAnimations({ subtree: true }).forEach((a) => { a.playbackRate = VITESSE; });
      accelerer();
      const tour = () => apres(TOUR, () => {
        if (revelee) return;
        if (carte.classList.contains('pose') || carte.classList.contains('pause')) return tour(); // figé : on ne rejoue pas
        carte.classList.add('rejoue-sortie');
        apres(FONDU, () => { carte.firstChild.innerHTML = v.dessin(cat); carte.classList.remove('rejoue-sortie'); accelerer(); tour(); });
      });
      tour();
    }
    pause.onclick = () => { const p = carte.classList.toggle('pause'); pause.setAttribute('aria-pressed', String(p)); pause.textContent = p ? 'Reprendre' : 'Mettre en pause'; };
    const finir = (cleScene) => { // le dernier temps de l'attente : l'esquisse se met de profil, la vraie carte entre
      carte.classList.remove('pause'); carte.classList.add('fin');
      apres(reduit ? 0 : 250, () => reveler(cleScene));
    };
    if (attente === 'echec') apres(8000, () => finir('autre')); // repli : scène générique, même cérémonie
    else apres(Number(attente) * 1000, () => finir(cat));
    if (!reduit) {
      apres(5000, () => { if (!revelee && !carte.classList.contains('pose')) pause.hidden = false; }); // WCAG 2.2.2 : un mouvement de plus de 5 s s'arrête à la demande
      if (Number(palier) > 0) apres(8000 + Number(palier) * 1000, () => { carte.classList.add('pose'); }); // ou de lui-même
    }
    apres(Number(max) * 1000, () => { // délai max : texte calme et fermeture, la carte reste sur l'accueil
      if (revelee) return;
      carte.classList.add('pose'); pause.hidden = true;
      texte.replaceChildren(h('p', {}, 'Ta carte arrive, elle t’attend sur l’accueil.'));
      apres(4500, () => dlg.close());
    });
  }
  dlg.append(h('div', { className: 'cer-scene' }, scene, texte, ok, pause, plusTard), bandeau());
  dlg.addEventListener('close', () => { timers.forEach(clearTimeout); dlg.remove(); emplacement.focus(); });
  document.body.append(dlg);
  dlg.showModal();
  (scene.querySelector('button') ?? plusTard).focus();
}

// Le sélecteur flottant (← →) : dans la page et dans la cérémonie (un dialogue modal rend le reste inerte).
function changer(sens) {
  const cles = Object.keys(VARIANTES);
  variante = cles[(cles.indexOf(variante) + sens + cles.length) % cles.length];
  const url = new URL(location.href); url.searchParams.set('variant', variante); history.replaceState(null, '', url);
  document.querySelectorAll('.proto-bandeau output').forEach((o) => { o.textContent = `${variante} · ${VARIANTES[variante].nom}`; });
  const ouvert = document.querySelector('dialog.cartes-ceremonie[open]');
  if (ouvert) { ouvert.close(); ouvrir(); }
}
function bandeau() {
  return h('div', { className: 'proto-bandeau' }, h('button', { type: 'button', 'aria-label': 'Variante précédente', onclick: () => changer(-1) }, '←'),
    h('output', {}, `${variante} · ${VARIANTES[variante].nom}`), h('button', { type: 'button', 'aria-label': 'Variante suivante', onclick: () => changer(1) }, '→'));
}
document.body.append(bandeau());
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') changer(-1); else if (e.key === 'ArrowRight') changer(1);
});
emplacement.onclick = ouvrir;
const params = new URLSearchParams(location.search);
for (const [k, v] of params) { const champ = document.getElementById('reglages').elements[k]; if (champ) champ.value = v; }
if (params.has('auto')) ouvrir();
