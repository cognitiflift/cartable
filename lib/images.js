import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

// Visuels d'une Leçon : le prof déclare chaque image distante dans le manifeste images.json, à la racine de la Leçon
// ([{"url", "source", "licence", "alt", "page"}]). Après chaque tour, l'appli rapatrie chaque image déclarée encore
// citée par une page (dans images/) et réécrit son adresse ; une image injoignable ou invalide est retirée de la page
// (la légende reste) et signalée au prof au tour suivant.
export const MANIFESTE_IMAGES = 'images.json';
const DOSSIER_IMAGES = 'images';
export const IMAGE_MAX_OCTETS = 5_000_000;
export const IMAGE_DELAI_MS = 10_000;
export const IMAGE_TROP_LOURDE = 'image trop lourde'; // raison du retrait, à laquelle la consigne du prof répond (#139)
const MANIFESTE_MAX = 50; // images traitées par tour, au plus
const REDIRECTIONS_MAX = 5;

// Adresses de la machine ou du réseau local (boucle, réseaux privés, lien local, partage d'opérateur, « non spécifiée ») :
// le prof ne doit pas faire appeler par l'appli un service qui n'est pas public. Les IPv6 qui portent une IPv4 suivent
// les règles IPv4.
const LOCALES = new net.BlockList();
for (const [reseau, bits] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16]]) {
  LOCALES.addSubnet(reseau, bits, 'ipv4');
}
for (const [reseau, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10]]) LOCALES.addSubnet(reseau, bits, 'ipv6');
export const adresseLocale = (ip) => LOCALES.check(ip, net.isIPv6(ip) ? 'ipv6' : 'ipv4');

// Adresse HTTP(S) dont aucune IP n'est locale ; lève une erreur sinon. `adressesLocales` : les accepter (tests).
async function verifierAdresse(adresse, adressesLocales) {
  if (!['http:', 'https:'].includes(adresse.protocol)) throw new Error('adresse qui n\'est pas en HTTP(S)');
  if (adressesLocales) return;
  const hote = adresse.hostname.replace(/^\[|\]$/g, '');
  let ips;
  try {
    ips = await dns.lookup(hote, { all: true });
  } catch {
    throw new Error('adresse injoignable');
  }
  if (ips.some(({ address }) => adresseLocale(address))) throw new Error('adresse locale refusée');
}

// Type d'une image d'après ses premiers octets (pas d'après l'en-tête, qui peut mentir) : extension, ou null.
export function typeImage(octets) {
  const debut = (signature) => signature.every((o, i) => octets[i] === o);
  if (debut([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return '.png';
  if (debut([0xff, 0xd8, 0xff])) return '.jpg';
  if (debut([0x47, 0x49, 0x46, 0x38])) return '.gif';
  if (debut([0x52, 0x49, 0x46, 0x46]) && octets.subarray(8, 12).toString('latin1') === 'WEBP') return '.webp';
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(octets.subarray(0, 2000).toString('utf8'))) return '.svg';
  return null;
}

// Formes d'une adresse telle qu'elle peut figurer dans le HTML (brute, ou avec les & échappés).
const formes = (url) => [...new Set([url.replaceAll('&', '&amp;'), url])];
const echapperRegex = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Remplace l'adresse distante par l'adresse locale partout où la page la cite.
export const reecrireAdresse = (html, url, locale) => formes(url).reduce((h, f) => h.replaceAll(f, locale), html);

// Retire de la page les balises <img> qui citent cette adresse ; le reste de la figure (légende, crédit) reste.
export const retirerImage = (html, url) => formes(url).reduce(
  (h, f) => h.replace(new RegExp(`<img\\b[^>]*?\\ssrc\\s*=\\s*(["'])${echapperRegex(f)}\\1[^>]*>`, 'gi'), ''),
  html,
);

// Manifeste écrit par le prof, validé à la lecture : entrées avec une adresse, sans doublon. Absent ou illisible = vide.
export async function lireManifeste(dossierLecon) {
  let brut;
  try {
    brut = JSON.parse(await fs.readFile(path.join(dossierLecon, MANIFESTE_IMAGES), 'utf8'));
  } catch {
    return [];
  }
  const entrees = (Array.isArray(brut) ? brut : [])
    .filter((e) => typeof e?.url === 'string' && e.url.trim())
    .map((e) => ({ url: e.url.trim(), ...(typeof e.page === 'string' && { page: path.basename(e.page) }) }));
  // Une adresse déclarée plusieurs fois : sa première entrée seulement.
  return entrees.filter((e, i) => entrees.findIndex((f) => f.url === e.url) === i).slice(0, MANIFESTE_MAX);
}

// Télécharge une image : HTTP(S) seulement, jamais vers une adresse locale (redirections comprises), type image vérifié
// sur les octets (SVG refusé : servi depuis la Leçon, il pourrait porter du script), taille et délai bornés.
// `adressesLocales` : accepter les adresses locales, pour les tests seulement (variable CARTABLE_IMAGES_LOCALES=1).
// Renvoie { octets, extension } ou lève une erreur dont le message dit pourquoi, en français.
export async function telechargerImage(url, {
  maxOctets = IMAGE_MAX_OCTETS, delaiMs = IMAGE_DELAI_MS, adressesLocales = process.env.CARTABLE_IMAGES_LOCALES === '1',
} = {}) {
  let adresse;
  try {
    adresse = new URL(url);
  } catch {
    throw new Error('adresse invalide');
  }
  const signal = AbortSignal.timeout(delaiMs);
  let reponse;
  for (let redirections = 0; ; redirections++) {
    await verifierAdresse(adresse, adressesLocales);
    try {
      reponse = await fetch(adresse, { signal, redirect: 'manual', headers: { 'User-Agent': 'Cartable/0.1 (usage familial privé)' } });
    } catch (e) {
      throw new Error(e.name === 'TimeoutError' ? 'adresse trop lente à répondre' : 'adresse injoignable');
    }
    const suivante = reponse.status >= 300 && reponse.status < 400 && reponse.headers.get('location');
    if (!suivante) break;
    if (redirections >= REDIRECTIONS_MAX) throw new Error('adresse injoignable');
    try {
      adresse = new URL(suivante, adresse);
    } catch {
      throw new Error('adresse invalide');
    }
  }
  if (!reponse.ok) throw new Error(`adresse morte (erreur ${reponse.status})`);
  if (!/^image\//i.test(reponse.headers.get('content-type') ?? '')) throw new Error('fichier qui n\'est pas une image');
  if (Number(reponse.headers.get('content-length')) > maxOctets) throw new Error(IMAGE_TROP_LOURDE);
  const morceaux = [];
  let taille = 0;
  try {
    for await (const morceau of reponse.body) {
      taille += morceau.length;
      if (taille > maxOctets) throw new Error(IMAGE_TROP_LOURDE);
      morceaux.push(morceau);
    }
  } catch (e) {
    throw new Error(e.message === IMAGE_TROP_LOURDE ? e.message : e.name === 'TimeoutError' ? 'adresse trop lente à répondre' : 'adresse injoignable');
  }
  const octets = Buffer.concat(morceaux);
  const extension = typeImage(octets);
  if (!extension) throw new Error('fichier qui n\'est pas une image');
  if (extension === '.svg') throw new Error('image SVG refusée');
  return { octets, extension };
}

// Images retirées à signaler au prof après un tour : celles qu'il n'a pas encore vues (`restantes`), puis les nouvelles,
// une fois par adresse.
export function imagesASignaler(restantes = [], nouvelles = []) {
  const toutes = [...restantes, ...nouvelles];
  return toutes.filter((r, i) => toutes.findIndex((s) => s.url === r.url) === i);
}

// Rapatrie les images déclarées encore citées par les pages de la Leçon (lessons/) : déjà rapatriée, une adresse ne
// figure plus dans aucune page. Renvoie les images retirées, à signaler au prof : [{ url, page, raison }].
export async function rapatrierImages(dossierLecon, options) {
  const manifeste = await lireManifeste(dossierLecon);
  if (!manifeste.length) return [];
  const dossierPages = path.join(dossierLecon, 'lessons');
  const noms = (await fs.readdir(dossierPages).catch(() => [])).filter((f) => f.endsWith('.html'));
  const pages = new Map(await Promise.all(noms.map(async (n) => [n, await fs.readFile(path.join(dossierPages, n), 'utf8')])));
  const modifiees = new Set();
  const retirees = [];
  for (const { url, page } of manifeste) {
    const citee = [...pages].filter(([, html]) => formes(url).some((f) => html.includes(f))).map(([n]) => n);
    if (!citee.length) continue;
    let locale = null;
    let raison;
    try {
      const { octets, extension } = await telechargerImage(url, options);
      const fichier = `${crypto.createHash('sha256').update(url).digest('hex').slice(0, 16)}${extension}`;
      await fs.mkdir(path.join(dossierLecon, DOSSIER_IMAGES), { recursive: true });
      await fs.writeFile(path.join(dossierLecon, DOSSIER_IMAGES, fichier), octets);
      locale = `../${DOSSIER_IMAGES}/${fichier}`;
    } catch (e) {
      raison = e.message;
    }
    for (const n of citee) {
      pages.set(n, locale ? reecrireAdresse(pages.get(n), url, locale) : retirerImage(pages.get(n), url));
      modifiees.add(n);
    }
    if (!locale) retirees.push({ url, page: page ?? citee[0], raison });
  }
  await Promise.all([...modifiees].map((n) => fs.writeFile(path.join(dossierPages, n), pages.get(n))));
  return retirees;
}
