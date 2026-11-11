import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { lancerServeur, portLibre } from './aide-serveur.js';

const env = { HOST: '127.0.0.1', CARTABLE_PREPARATION: '0' };

test('un port déjà pris fait échouer le démarrage vite, avec un message lisible', async () => {
  const occupant = net.createServer();
  await new Promise((r) => occupant.listen(0, '127.0.0.1', r));
  const { port } = occupant.address();
  const debut = Date.now();
  try {
    await assert.rejects(lancerServeur({ port, env }), (e) => {
      assert.match(e.message, /s'est arrêté au démarrage/);
      assert.match(e.message, /EADDRINUSE/);
      assert.ok(e.message.includes(String(port)));
      return true;
    });
    assert.ok(Date.now() - debut < 8000, 'échec rapide');
  } finally {
    occupant.close();
  }
});

test('un serveur muet est abandonné au délai, sans geler', async () => {
  await assert.rejects(lancerServeur({ delai: 1, env }), /n'a rien écrit en 1 ms|s'est arrêté/);
});

test('le port libre demandé au système est utilisable et le serveur répond', async () => {
  assert.ok(await portLibre() > 0);
  const { port, arreter } = await lancerServeur({ env });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/eleves`)).status, 200);
  } finally { arreter(); }
});
