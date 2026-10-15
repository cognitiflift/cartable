import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// Visuels d'une Leçon : le prof déclare chaque image distante dans le manifeste images.json, à la racine de la Leçon
// ([{"url", "source", "licence", "alt", "page"}]). Après chaque tour, l'appli rapatrie chaque image déclarée encore
// citée par une page (dans images/) et réécrit son adresse ; une image injoignable ou invalide est retirée de la page
// (la légende reste) et signalée au prof au tour suivant.
export const MANIFESTE_IMAGES = 'images.json';
const DOSSIER_IMAGES = 'images';
export const IMAGE_MAX_OCTETS = 5_000_000;
export const IMAGE_DELAI_MS = 10_000;
const MANIFESTE_MAX = 50; // images traitées par tour, au plus

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
  const vues = new Set();
  return (Array.isArray(brut) ? brut : [])
    .filter((e) => typeof e?.url === 'string' && e.url.trim() && !vues.has(e.url.trim()) && vues.add(e.url.trim()))
    .slice(0, MANIFESTE_MAX)
    .map((e) => ({ url: e.url.trim(), ...(typeof e.page === 'string' && { page: path.basename(e.page) }) }));
}

// Télécharge une image : HTTP(S) seulement, type image vérifié sur les octets, taille et délai bornés.
// Renvoie { octets, extension } ou lève une erreur dont le message dit pourquoi, en français.
export async function telechargerImage(url, { maxOctets = IMAGE_MAX_OCTETS, delaiMs = IMAGE_DELAI_MS } = {}) {
  let adresse;
  try {
    adresse = new URL(url);
  } catch {
    throw new Error('adresse invalide');
  }
  if (!['http:', 'https:'].includes(adresse.protocol)) throw new Error('adresse qui n\'est pas en HTTP(S)');
  let reponse;
  try {
    reponse = await fetch(adresse, { signal: AbortSignal.timeout(delaiMs), headers: { 'User-Agent': 'Cartable/0.1 (usage familial privé)' } });
  } catch (e) {
    throw new Error(e.name === 'TimeoutError' ? 'adresse trop lente à répondre' : 'adresse injoignable');
  }
  if (!reponse.ok) throw new Error(`adresse morte (erreur ${reponse.status})`);
  if (!/^image\//i.test(reponse.headers.get('content-type') ?? '')) throw new Error('fichier qui n\'est pas une image');
  if (Number(reponse.headers.get('content-length')) > maxOctets) throw new Error('image trop lourde');
  const morceaux = [];
  let taille = 0;
  try {
    for await (const morceau of reponse.body) {
      taille += morceau.length;
      if (taille > maxOctets) throw new Error('image trop lourde');
      morceaux.push(morceau);
    }
  } catch (e) {
    throw new Error(e.message === 'image trop lourde' ? e.message : e.name === 'TimeoutError' ? 'adresse trop lente à répondre' : 'adresse injoignable');
  }
  const octets = Buffer.concat(morceaux);
  const extension = typeImage(octets);
  if (!extension) throw new Error('fichier qui n\'est pas une image');
  return { octets, extension };
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
