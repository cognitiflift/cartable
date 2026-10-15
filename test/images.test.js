import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reecrireAdresse, retirerImage, typeImage } from '../lib/images.js';

const url = 'https://exemple.org/img.php?f=Volcan.jpg&w=800';

test('Images : l\'adresse est réécrite partout où la page la cite, & échappés compris', () => {
  const html = `<img src="https://exemple.org/img.php?f=Volcan.jpg&amp;w=800"><a href='${url}'>voir</a>`;
  assert.equal(reecrireAdresse(html, url, '../images/a.jpg'), `<img src="../images/a.jpg"><a href='../images/a.jpg'>voir</a>`);
});

test('Images : retirer une image enlève ses balises <img> et garde la légende et les autres images', () => {
  const html = `<figure><img alt="v" src='${url}' width="3"><figcaption>Le volcan</figcaption></figure><img src="autre.png">`;
  assert.equal(retirerImage(html, url), '<figure><figcaption>Le volcan</figcaption></figure><img src="autre.png">');
});

test('Images : le type se lit sur les octets, pas sur l\'en-tête', () => {
  assert.equal(typeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), '.jpg');
  assert.equal(typeImage(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>')), '.svg');
  assert.equal(typeImage(Buffer.from('<html><body>404</body></html>')), null);
});
