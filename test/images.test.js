import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { reecrireAdresse, retirerImage, typeImage, telechargerImage, adresseLocale, imagesASignaler } from '../lib/images.js';

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

// Petit serveur local servant `corps` sous le type `type`, le temps de `fn`.
const avecServeur = async (type, corps, fn) => {
  const serveur = http.createServer((req, res) => res.writeHead(200, { 'Content-Type': type }).end(corps));
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  try {
    return await fn(`http://127.0.0.1:${serveur.address().port}`);
  } finally {
    serveur.close();
  }
};

test('Images : une image SVG distante est refusée (elle pourrait porter du script)', () => avecServeur('image/svg+xml',
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  (serveur) => assert.rejects(telechargerImage(`${serveur}/dessin.svg`, { adressesLocales: true }), { message: 'image SVG refusée' })));

test('Images : une adresse locale (boucle, réseau privé, lien local) est refusée sans être appelée', async () => {
  await avecServeur('image/png', 'x', async (serveur) => {
    await assert.rejects(telechargerImage(`${serveur}/a.png`), { message: 'adresse locale refusée' });
  });
  await assert.rejects(telechargerImage('http://localhost:9/a.png'), { message: 'adresse locale refusée' });
  await assert.rejects(telechargerImage('http://[::1]:9/a.png'), { message: 'adresse locale refusée' });
});

test('Images : adresses locales reconnues', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.10', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1']) {
    assert.equal(adresseLocale(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '198.51.100.7', '2606:4700::1111', '::ffff:8.8.8.8']) {
    assert.equal(adresseLocale(ip), false, ip);
  }
});

test('Images : les images retirées pas encore signalées au prof restent à signaler, avec les nouvelles, sans doublon', () => {
  const a = { url: 'https://a.org/a.png', page: 'p.html', raison: 'adresse morte (erreur 404)' };
  const b = { url: 'https://b.org/b.png', page: 'p.html', raison: 'image trop lourde' };
  assert.deepEqual(imagesASignaler([a], [b, { ...a, raison: 'autre' }]), [a, b]);
  assert.deepEqual(imagesASignaler([], []), []);
});
