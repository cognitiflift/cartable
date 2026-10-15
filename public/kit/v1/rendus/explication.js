// Kit v1 — rendu de « choisis la meilleure explication » (spec #48, ticket #72) : un QCM précédé de sa consigne.
import { el } from '../dom.js';
import { rendreQcm } from './qcm.js';

export function rendreExplication(q, options) {
  const rendu = rendreQcm(q, options);
  rendu.zone.prepend(el('p', { className: 'kit-explication-consigne' }, '💡 Choisis la meilleure explication.'));
  return rendu;
}
