import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageDemarrage } from '../lib/demarrage.js';

const interfaces = {
  lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  wlan0: [
    { address: '192.168.50.215', family: 'IPv4', internal: false },
    { address: 'fe80::1', family: 'IPv6', internal: false },
  ],
  eth0: [{ address: '10.0.0.4', family: 'IPv4', internal: false }],
};

test('écoute sur toutes les interfaces : adresse locale et une adresse par IPv4 du réseau', () => {
  const message = messageDemarrage({ host: '0.0.0.0', port: 3000, interfaces });
  assert.match(message, /http:\/\/localhost:3000/);
  assert.match(message, /http:\/\/192\.168\.50\.215:3000/);
  assert.match(message, /http:\/\/10\.0\.0\.4:3000/);
  assert.doesNotMatch(message, /127\.0\.0\.1|fe80/);
  assert.match(message, /réseau/);
  assert.match(message, /pare-feu/);
});

test('écoute IPv6 sur toutes les interfaces : même affichage', () => {
  assert.match(messageDemarrage({ host: '::', port: 3000, interfaces }), /http:\/\/192\.168\.50\.215:3000/);
});

test('sans interface réseau externe : seulement l\'adresse locale', () => {
  const message = messageDemarrage({ host: '0.0.0.0', port: 3000, interfaces: { lo: interfaces.lo } });
  assert.match(message, /http:\/\/localhost:3000/);
  assert.doesNotMatch(message, /réseau|pare-feu/);
});

test('HOST précis : seulement l\'adresse d\'écoute', () => {
  assert.equal(messageDemarrage({ host: '127.0.0.1', port: 3000, interfaces }), 'Cartable : http://127.0.0.1:3000');
  assert.equal(messageDemarrage({ host: '192.168.50.215', port: 3001, interfaces }), 'Cartable : http://192.168.50.215:3001');
});
