import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraireFigure, construireFigure, legendeDeFigure, avecAdressesDImages } from '../public/kit/v1/figure-logique.js';

const PAGE = `<!doctype html><html><body>
<p>Avant</p>
<figure class="kit-figure" id="volcan">
  <svg viewBox="0 0 100 50" role="img" aria-label="Coupe d'un volcan"><path d="M0 50 L50 0 L100 50" fill="none" stroke="currentColor"/><text x="50" y="45">cratère</text></svg>
  <figcaption>Schéma du volcan <span class="kit-credit">Source : Arno</span></figcaption>
</figure>
<figure class="kit-figure" id="autre"><img src="../images/a.png" alt="A"><figcaption>Photo</figcaption></figure>
</body></html>`;

test('Copie de figure : la figure du Kit désignée, avec son visuel SVG, sa légende et son crédit', () => {
  assert.deepEqual(extraireFigure(PAGE, 'volcan'), {
    balise: 'figure', attributs: { class: 'kit-figure' }, enfants: [
      { balise: 'svg', attributs: { viewBox: '0 0 100 50', role: 'img', 'aria-label': 'Coupe d\'un volcan' }, enfants: [
        { balise: 'path', attributs: { d: 'M0 50 L50 0 L100 50', fill: 'none', stroke: 'currentColor' }, enfants: [] },
        { balise: 'text', attributs: { x: '50', y: '45' }, enfants: ['cratère'] },
      ] },
      { balise: 'figcaption', attributs: {}, enfants: ['Schéma du volcan ', { balise: 'span', attributs: { class: 'kit-credit' }, enfants: ['Source : Arno'] }] },
    ],
  });
});

test('Copie de figure : une photo rapatriée garde son adresse ; un id introuvable ou une figure hors Kit donne null', () => {
  assert.deepEqual(extraireFigure(PAGE, 'autre').enfants[0], { balise: 'img', attributs: { src: '../images/a.png', alt: 'A' }, enfants: [] });
  assert.equal(extraireFigure(PAGE, 'absente'), null);
  assert.equal(extraireFigure('<figure id="x"><figcaption>sans kit</figcaption></figure>', 'x'), null);
  assert.equal(extraireFigure(null, 'x'), null);
});

// Un document factice qui note tout ce que la reconstruction crée : on vérifie que rien ne peut exécuter du code ni
// charger quoi que ce soit (pas de jsdom dans le dépôt). Il n'a pas d'innerHTML : la reconstruction n'en a pas besoin.
function documentFactice() {
  const crees = [];
  const element = (ns, balise) => {
    const e = { ns, balise, attributs: {}, enfants: [], setAttribute(n, v) { this.attributs[n] = String(v); }, append(...c) { this.enfants.push(...c); } };
    crees.push(e);
    return e;
  };
  return { crees, createElementNS: element, createTextNode: (t) => ({ texte: t }) };
}

const PIEGEE = `<figure class="kit-figure" id="piege" onclick="alert(1)">
  <svg viewBox="0 0 10 10" onload="alert(2)">
    <script>alert(3)</script><SCRIPT type="text/javascript">alert('</figure>')</SCRIPT>
    <a href="javascript:alert(4)"><circle cx="5" cy="5" r="4" onmouseover="alert(5)" fill="url(https://pirate.example/x.svg#a)"/></a>
    <a xlink:href="jav&#x61;script:alert(6)"><text x="1" y="9">clic</text></a>
    <use href="https://pirate.example/sprite.svg#x"/><image href="https://pirate.example/p.png"/>
    <foreignObject><iframe src="https://pirate.example"></iframe></foreignObject>
    <animate attributeName="href" to="javascript:alert(7)"/><style>@import url(https://pirate.example/x.css)</style>
    <path d="M0 0" style="background:url(https://pirate.example/s.png)" stroke="currentColor"/>
  </svg>
  <img src="https://pirate.example/photo.jpg" alt="distante" onerror="alert(8)">
  <img src="javascript:alert(9)" alt="piège">
  <figcaption onmouseover="alert(10)">Légende <a href="javascript:alert(11)">lien</a> <span class="kit-credit bulle-prof">Crédit</span></figcaption>
</figure>`;

// Rien de ce qui a été créé ne peut exécuter du code (script, on…, javascript:) ni charger du dehors (adresse externe,
// url(…) qui n'est pas une référence interne au dessin, contenu étranger).
function verifierInoffensif(doc) {
  for (const e of doc.crees) {
    assert.doesNotMatch(e.balise, /^(script|a|iframe|foreignObject|image|animate|set|style|object|embed)$/i, `balise ${e.balise}`);
    for (const [nom, valeur] of Object.entries(e.attributs)) {
      assert.doesNotMatch(nom, /^on|^style$/i, `attribut ${nom}`);
      assert.doesNotMatch(valeur, /javascript:|https?:|\/\/|url\((?!\s*#)/i, `valeur ${nom}="${valeur}"`);
      if (nom === 'href') assert.match(valeur, /^#/);
    }
  }
}

test('Sécurité : une figure piégée ne garde ni script, ni on…, ni javascript:, ni contenu externe ; la légende reste', () => {
  const copie = extraireFigure(PIEGEE, 'piege');
  const json = JSON.stringify(copie);
  for (const danger of [/alert/, /script/i, /"on/i, /pirate/, /iframe|foreignObject|animate|"image"|"style"/i]) assert.doesNotMatch(json, danger);
  const doc = documentFactice();
  const figure = construireFigure(doc, copie);
  verifierInoffensif(doc);
  assert.ok(!doc.crees.some((e) => e.balise === 'img'), 'aucune image distante ni piégée');
  assert.ok(doc.crees.some((e) => e.balise === 'svg' && e.ns === 'http://www.w3.org/2000/svg'));
  assert.ok(doc.crees.some((e) => e.balise === 'path' && e.attributs.stroke === 'currentColor' && !e.attributs.style));
  assert.ok(doc.crees.some((e) => e.balise === 'text' && e.enfants.some((t) => t.texte === 'clic')), 'le texte d’un lien retiré reste');
  assert.equal(legendeDeFigure(copie), 'Légende lien');
  const legende = figure.enfants.find((e) => e.balise === 'figcaption');
  assert.ok(legende.enfants.some((e) => e.balise === 'span' && e.attributs.class === 'kit-credit'));
});

test('Sécurité : le rendu repasse par la liste blanche, même pour une copie trafiquée dans la Banque', () => {
  const trafiquee = { balise: 'figure', attributs: { onclick: 'alert(1)', class: 'kit-figure' }, enfants: [
    { balise: 'script', attributs: {}, enfants: ['alert(2)'] },
    { balise: 'svg', attributs: { onload: 'alert(3)' }, enfants: [{ balise: 'a', attributs: { href: 'javascript:alert(4)' }, enfants: ['x'] }] },
    { balise: 'img', attributs: { src: 'https://pirate.example/x.png', alt: '' }, enfants: [] },
    { balise: 'img', attributs: { src: '/fichiers/eleve/lecon-1/images/ok.png', alt: 'ok', onerror: 'alert(5)' }, enfants: [] },
    { balise: 'iframe', attributs: { src: 'https://pirate.example' }, enfants: [] },
  ] };
  const doc = documentFactice();
  construireFigure(doc, trafiquee);
  verifierInoffensif(doc);
  assert.deepEqual(doc.crees.filter((e) => e.balise === 'img').map((e) => e.attributs), [{ src: '/fichiers/eleve/lecon-1/images/ok.png', alt: 'ok' }]);
  assert.equal(construireFigure(doc, { balise: 'script', attributs: {}, enfants: [] }), null);
  assert.equal(construireFigure(doc, 'volcan'), null); // un id seul n'est pas une copie
});

test('Copie de figure : extrait de texte, entités et adresses des images servies hors de la page', () => {
  const html = '<figure class="kit-figure" id="poeme"><blockquote><p>Demain, d&egrave;s l&#8217;aube,<br>à l&#x27;heure</p></blockquote><img src="../images/v.jpg" alt="V"><figcaption>Poème</figcaption></figure>';
  const copie = extraireFigure(html, 'poeme');
  assert.deepEqual(copie.enfants[0], { balise: 'blockquote', attributs: {}, enfants: [{ balise: 'p', attributs: {}, enfants: ['Demain, dès l’aube,', { balise: 'br', attributs: {}, enfants: [] }, 'à l\'heure'] }] });
  const servie = avecAdressesDImages(copie, (src) => `/fichiers/s/l/images/${src.split('/').pop()}`);
  assert.equal(servie.enfants[1].attributs.src, '/fichiers/s/l/images/v.jpg');
  assert.equal(copie.enfants[1].attributs.src, '../images/v.jpg'); // la copie gardée n'est pas modifiée
});
