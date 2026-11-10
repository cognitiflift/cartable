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

// L'esquisse : 4 étoiles, trois jalons pleins sur la ligne (pas de décompte inventé), halo réduit, orbites des sciences
// remontées au-dessus de la ligne, un reflet. Tout fond à chaque tour puis est redessiné.
function esquisse(cat) {
  const etoiles = [[60, 30], [126, 24], [150, 60], [40, 70]]
    .map(([x, y], i) => `<circle class="point etoile" cx="${x}" cy="${y}" r="${1 + (i % 3) * .5}" style="--i:${i}"/>`).join('');
  const jalons = [34, 100, 168].map((x, i) => `<circle class="jalon" cx="${x}" cy="162" r="5" style="--i:${i}"/>`).join('');
  const motif = cat === 'sciences' ? `<g transform="translate(100 58) scale(.6) translate(-100 -110)">${motifDe(cat)}</g>` : motifDe(cat);
  return `<svg viewBox="0 0 200 280" aria-hidden="true"><defs><radialGradient id="att-halo"><stop offset="0" stop-color="var(--ligne)" stop-opacity=".6"/><stop offset="1" stop-color="var(--ligne)" stop-opacity="0"/></radialGradient></defs>
    <circle class="halo" cx="100" cy="105" r="64" fill="url(#att-halo)"/>
    ${trait('M20 8 H180 a12 12 0 0 1 12 12 V260 a12 12 0 0 1 -12 12 H20 a12 12 0 0 1 -12 -12 V20 a12 12 0 0 1 12 -12 Z', 'cadre couleur')}
    ${etoiles}
    ${trait('M8 150 Q48 112 96 138 T192 128', 'colline', 0)}${trait('M8 172 Q60 140 110 164 T192 158', 'colline', 1)}
    <path class="remplit colline-f" d="M8 150 Q48 112 96 138 T192 128 V272 H8 Z"/>
    ${trait('M8 162 H192', 'rail couleur')}${jalons}
    <g class="motif">${motif}</g></svg><div class="att-reflet" aria-hidden="true"></div>`;
}

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
  const { cat, attente, max } = reglage();
  const reduit = moinsDeMouvement();
  const prete = attente === '0';
  const dlg = h('dialog', { className: 'cartes-ceremonie', 'aria-label': `Nouvelle carte : ${TITRE}` });
  const texte = h('div', { className: 'cer-texte', 'aria-live': 'polite' });
  const scene = h('div', { className: 'cer-carte' });
  const ok = h('button', { type: 'button', className: 'cer-ok', hidden: true, onclick: () => dlg.close() }, 'Fermer');
  const pause = h('button', { type: 'button', className: 'secondaire att-pause', hidden: true }, 'Mettre en pause');
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
    const carte = h('div', { className: `att-carte ${cat}` }, h('div', { className: 'att-in' }));
    carte.firstChild.innerHTML = esquisse(cat);
    texte.append(h('p', {}, 'Ta carte se prépare'));
    scene.append(carte);
    // La boucle : l'esquisse jouée en entier (un peu accélérée), un fondu de sortie, puis elle repart de zéro. Un tour
    // dure TOUR + FONDU ms. Le premier passage est accéléré comme les suivants : la carte n'est dans le document qu'après
    // ce code, d'où apres(0) (sans cela, le fondu coupait un premier passage resté à vitesse normale).
    const VITESSE = 1.15, TOUR = 6800, FONDU = 800;
    let repli = false;
    const accelerer = () => carte.getAnimations({ subtree: true }).forEach((a) => { a.playbackRate = VITESSE; });
    apres(0, accelerer);
    const tour = () => apres(TOUR, () => {
      if (revelee) return;
      if (repli) return; // le repli a figé la carte : on ne rejoue plus
      if (carte.classList.contains('pause')) return tour(); // en pause : on ne rejoue pas
      carte.classList.add('rejoue-sortie');
      apres(FONDU, () => {
        if (repli) return;
        carte.firstChild.innerHTML = esquisse(cat);
        carte.classList.remove('rejoue-sortie'); accelerer(); tour();
      });
    });
    tour(); // constat 1 gardé tel quel : la boucle tourne aussi sous mouvement réduit (décision de l'humain, voir la note)
    pause.onclick = () => { const p = carte.classList.toggle('pause'); pause.textContent = p ? 'Reprendre' : 'Mettre en pause'; };
    const finir = (cleScene) => { // le dernier temps de l'attente : l'esquisse se met de profil, la vraie carte entre
      carte.classList.remove('pause'); carte.classList.add('fin');
      apres(reduit ? 0 : 250, () => reveler(cleScene));
    };
    if (attente === 'echec') apres(8000, () => finir('autre')); // repli : scène générique, même cérémonie
    else apres(Number(attente) * 1000, () => finir(cat));
    pause.hidden = false; // WCAG 2.2.2 : un mouvement de plus de 5 s s'arrête à la demande, visible dès le départ
    apres(Number(max) * 1000, () => { // délai max : texte calme ; la carte reste sur l'accueil
      if (revelee) return;
      repli = true; pause.hidden = true;
      carte.classList.remove('rejoue-sortie', 'pause');
      carte.firstChild.innerHTML = esquisse(cat); // le dessin complet, jamais une carte vide figée en plein fondu
      carte.getAnimations({ subtree: true }).forEach((a) => { try { a.finish(); } catch { /* rotation sans fin : ignorée */ } });
      carte.classList.add('pose');
      texte.replaceChildren(h('p', {}, 'Ta carte arrive, elle t’attend sur l’accueil.'));
      plusTard.textContent = 'Fermer'; // le dialogue reste ouvert, sans limite de temps imposée
    });
  }
  dlg.append(h('div', { className: 'cer-scene' }, scene, texte, ok, pause, plusTard));
  dlg.addEventListener('close', () => { timers.forEach(clearTimeout); dlg.remove(); emplacement.focus(); });
  document.body.append(dlg);
  dlg.showModal();
  (scene.querySelector('button') ?? plusTard).focus();
}

emplacement.onclick = ouvrir;
const params = new URLSearchParams(location.search);
for (const [k, v] of params) { const champ = document.getElementById('reglages').elements[k]; if (champ) champ.value = v; }
if (params.has('auto')) ouvrir();
