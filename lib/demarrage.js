import os from 'node:os';

const TOUTES_INTERFACES = ['0.0.0.0', '::'];

const url = (hote, port) => `http://${hote.includes(':') ? `[${hote}]` : hote}:${port}`;

// Message affiché au démarrage : depuis un autre appareil, `localhost` désigne cet appareil lui-même,
// il faut donc aussi donner l'adresse de la machine sur le réseau local.
export function messageDemarrage({ host, port, interfaces = os.networkInterfaces() }) {
  if (!TOUTES_INTERFACES.includes(host)) return `Cartable : ${url(host, port)}`;
  const adressesReseau = Object.values(interfaces).flat()
    .filter((i) => i.family === 'IPv4' && !i.internal)
    .map((i) => `  ${url(i.address, port)}`);
  return [
    `Cartable : ${url('localhost', port)}`,
    ...(adressesReseau.length
      ? ['Depuis un autre appareil du réseau :', ...adressesReseau, '  (si rien ne répond, vérifie le pare-feu de cet ordinateur)']
      : []),
  ].join('\n');
}
