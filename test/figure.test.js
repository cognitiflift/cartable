import { test } from 'node:test';
import assert from 'node:assert/strict';

// Un DOM minimal (pas de jsdom dans le dépôt) : de quoi construire le bloc « Revoir » et cliquer sur son bouton.
class Noeud {
  constructor(tagName) {
    Object.assign(this, { tagName: tagName.toUpperCase(), childNodes: [], attributs: {}, ecouteurs: {}, hidden: false, id: '', className: '' });
  }
  append(...enfants) { this.childNodes.push(...enfants); }
  setAttribute(nom, valeur) { this.attributs[nom] = String(valeur); }
  getAttribute(nom) { return this.attributs[nom] ?? null; }
  addEventListener(type, f) { (this.ecouteurs[type] ??= []).push(f); }
  click() { for (const f of this.ecouteurs.click ?? []) f({ type: 'click' }); }
  get textContent() { return this.childNodes.map((e) => (typeof e === 'string' ? e : e.textContent)).join(''); }
}
globalThis.document = { createElement: (tag) => new Noeud(tag) };
const { revoirFigure } = await import('../public/kit/v1/figure.js');

const copie = () => new Noeud('figure');

test('Revoir : un bouton déplie puis replie la copie de la figure, et annonce son état', () => {
  const figure = copie();
  const bloc = revoirFigure(figure, { libelle: '👁 Revoir le schéma' });
  const [bouton, montree] = bloc.childNodes;
  assert.equal(bouton.tagName, 'BUTTON');
  assert.equal(bouton.type, 'button'); // un vrai bouton : Entrée et Espace l'activent au clavier
  assert.equal(bouton.textContent, '👁 Revoir le schéma');
  assert.equal(montree, figure);
  assert.equal(bouton.getAttribute('aria-controls'), figure.id);
  assert.ok(figure.id);
  assert.equal(bouton.getAttribute('aria-expanded'), 'false');
  assert.equal(figure.hidden, true);
  bouton.click();
  assert.equal(bouton.getAttribute('aria-expanded'), 'true');
  assert.equal(figure.hidden, false);
  bouton.click();
  assert.equal(bouton.getAttribute('aria-expanded'), 'false');
  assert.equal(figure.hidden, true);
});

test('Revoir : deux questions qui désignent la même figure ont chacune leur copie et leur bouton', () => {
  const [a, b] = [revoirFigure(copie(), { libelle: '👁 Revoir' }), revoirFigure(copie(), { libelle: '👁 Revoir' })];
  assert.notEqual(a.childNodes[1].id, b.childNodes[1].id);
  a.childNodes[0].click();
  assert.equal(a.childNodes[1].hidden, false);
  assert.equal(b.childNodes[1].hidden, true);
});

test('Revoir : dépliée d’office (Révision du jour), la figure se montre sans bouton', () => {
  const figure = copie();
  const bloc = revoirFigure(figure, { libelle: '👁 Revoir', deplie: true });
  assert.deepEqual(bloc.childNodes, [figure]);
  assert.equal(figure.hidden, false);
});
