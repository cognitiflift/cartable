import os from 'node:os';

const TOUTES_INTERFACES = ['0.0.0.0', '::'];

const url = (hote, port) => `http://${hote.includes(':') ? `[${hote}]` : hote}:${port}`;

// Message affiché au démarrage : depuis un autre appareil, `localhost` désigne cet appareil lui-même,
// il faut donc aussi donner l'adresse de la machine sur le réseau local.
// Dans un conteneur, les interfaces sont celles du conteneur, pas du réseau local : `adressePublique`
// (variable ADRESSE_PUBLIQUE, ex. `192.168.1.50:3000`) donne alors l'adresse à ouvrir depuis un autre appareil.
export function messageDemarrage({ host, port, interfaces = os.networkInterfaces(), adressePublique }) {
  if (!TOUTES_INTERFACES.includes(host)) return `Cartable : ${url(host, port)}`;
  if (adressePublique) {
    const adresse = /^https?:\/\//.test(adressePublique) ? adressePublique : `http://${adressePublique}`;
    return [`Cartable : ${url('localhost', port)}`, 'Depuis un autre appareil du réseau :', `  ${adresse}`].join('\n');
  }
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
