# Installer et publier Cartable sur le NAS Synology

Procédure pas à pas pour héberger Cartable sur un Synology DS718+ (DSM 7.1.1), dans un conteneur Docker, sur le réseau de la maison seulement. Spec : #206. Fichiers concernés : `Dockerfile`, `docker-compose.yml`, `.env.example`, `docker/MAJ.md`, `scripts/publier.sh`.

> **Non vérifié sur un NAS ni avec Docker en local.** Cette procédure a été écrite d'après les fichiers du dépôt et la documentation de Claude Code ; aucun `docker build` ni aucun menu de DSM n'a été exécuté. Chaque point marqué « à confirmer » se vérifie sur place, et la liste de contrôle en fin de page sert à le faire.

## Principe

- Un seul conteneur : Node (version de la CI, voir `Dockerfile`), la CLI `claude` et le plugin `mattpocock-skills`. L'image ne contient ni le code ni les données.
- Un seul dossier du NAS est monté : le dépôt cloné (`/app`). `eleves/` (`/app/eleves`, les Espaces personnels) vit dans ce dépôt cloné. C'est un écart assumé par rapport aux « deux dossiers » de la spec #206, plus simple à installer et à sauvegarder.
- Node 26 est écrit à deux endroits, `Dockerfile` (`FROM node:26-slim`) et `.github/workflows/ci.yml` (`node-version: 26`) : à changer ensemble.
- L'appli reste locale (ADR 0001) : elle écoute sur toutes les interfaces et n'a pas de mot de passe. **Toute la protection repose sur le pare-feu de DSM et sur l'absence d'exposition à Internet.**
- Elle pilote `claude -p` avec l'abonnement du parent, par un jeton longue durée (`CLAUDE_CODE_OAUTH_TOKEN`).

## 1. Préparer le NAS

1. DSM > Centre de paquets : installer le paquet **Docker** (DSM 7.1). Note : à partir de DSM 7.2 le paquet s'appelle **Container Manager** ; la procédure reste la même, l'interface diffère (Container Manager offre en plus un menu « Projet » pour un fichier compose).
2. Installer aussi **Git Server** (ou vérifier que `git` est disponible en SSH) ; activer SSH (Panneau de configuration > Terminal et SNMP) le temps de l'installation. À confirmer : DSM 7.1 n'apporte pas toujours `docker compose` (v2) en ligne de commande ; si la commande est absente, utiliser `docker-compose` s'il existe, sinon `docker build` et `docker run` avec les mêmes options que `docker-compose.yml`. À confirmer sur place.
3. Dossiers partagés (Panneau de configuration > Dossier partagé), par exemple `docker/cartable` pour le code. `eleves/` vit **dans** le dépôt cloné (`./eleves`, monté sur `/app/eleves` par le compose) : un seul dossier à créer. Donner le droit lecture/écriture au compte qui lancera Docker et qui publiera.
4. Cloner le dépôt dans ce dossier (SSH) : `git clone https://github.com/cognitiflift/cartable.git /volume1/docker/cartable` (adapter le chemin et le volume).
5. Relever `PUID` et `PGID` du propriétaire du dossier : `id -u` et `id -g` en SSH avec ce compte. Le conteneur tourne avec cet identifiant, non-root (clé `user:` du compose), pour que `eleves/` reste lisible et modifiable depuis DSM.

## 2. Réserver l'adresse IP

L'adresse du NAS ne doit jamais changer : les raccourcis des appareils pointent dessus.

- Routeur ASUS BT8 : réserver l'IP du NAS dans le serveur DHCP (attribution manuelle, par adresse MAC). Menu exact à confirmer sur place (en général : LAN > DHCP Server > Manually Assigned IP around the DHCP list). Redémarrer le NAS ensuite et vérifier qu'il garde l'adresse.
- Pas de nom `.local` (résolution inégale sur Android) et pas de nom défini dans le routeur à ce stade : on ouvre l'appli par `http://<IP>:<PORT>`.

## 3. Le jeton de Claude

Source consultée : https://code.claude.com/docs/en/authentication (section « Generate a long-lived token » et « Authentication precedence »), le 2026-11-11.

Confirmé par la doc officielle :

- `claude setup-token` génère un **jeton OAuth valable un an**. La commande ouvre le même parcours d'autorisation dans le navigateur que `/login` et affiche le jeton dans le terminal ; elle **ne l'enregistre nulle part** : il faut le copier.
- Le jeton se donne à `claude` par la variable d'environnement `CLAUDE_CODE_OAUTH_TOKEN`.
- Il utilise l'abonnement Claude et exige un forfait Pro, Max, Ultra, Team ou Enterprise.
- Portée : il ne peut faire que des **requêtes de modèle** (pas de Remote Control, pas de connecteurs claude.ai).
- Le mode `--bare` ne lit pas `CLAUDE_CODE_OAUTH_TOKEN` : Cartable ne doit pas l'utiliser (le code n'y recourt pas).
- Priorité des identifiants : `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY` et `apiKeyHelper` passent **avant** `CLAUDE_CODE_OAUTH_TOKEN`. Ne définir aucune de ces variables dans le conteneur, sinon le jeton est ignoré (et en mode `-p`, une `ANTHROPIC_API_KEY` présente est toujours utilisée).

À confirmer (non trouvé dans la page consultée) :

- Si générer un nouveau jeton révoque l'ancien, et comment révoquer un jeton perdu (piste : les réglages du compte sur claude.ai ; non vérifié).
- Le comportement exact à l'expiration : la doc décrit un message pour un login `/login` expiré (« Login expired · Please run /login »), pas pour le jeton de `setup-token`. Cartable reconnaît un refus d'authentification (`lib/agent.js`, `JETON_REFUSE`) et affiche « Le jeton de Claude est expiré ou révoqué : le parent doit en générer un nouveau et redémarrer l'appli ».
- Que l'appel de Cartable (`claude -p`) consomme le même quota que les sessions du parent : annoncé par la spec, non lu dans la page consultée. À surveiller si les trois Élèves travaillent en même temps que lui.

Procédure :

1. Sur le PC du parent (connecté à son abonnement) : `claude setup-token`, autoriser dans le navigateur, copier le jeton.
2. Sur le NAS, dans le dossier du dépôt : `cp .env.example .env`, puis éditer `.env` (le fichier est ignoré par git ; **ne jamais committer le jeton**, ni le coller dans un ticket ou un message).
3. Renseigner dans `.env` :

| Variable | Valeur |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | le jeton copié (obligatoire : le compose refuse de démarrer sans) |
| `PUID`, `PGID` | résultats de `id -u` et `id -g` |
| `PORT` | le port de l'appli (3000 par défaut) |
| `ADRESSE_PUBLIQUE` | `<IP du NAS>:<PORT>`, affichée au démarrage pour vérifier la bonne adresse |
| `TEACH_SKILL_DIR`, `ELEVES_DIR` | laisser vides (valeurs par défaut `/opt/teach` et `/app/eleves`) |

4. `chmod 600 .env`.

**Renouvellement annuel.** Le jeton dure un an : noter la date dans un agenda, un mois avant. Pour renouveler : refaire `claude setup-token` sur le PC, remplacer la valeur dans `.env`, puis recréer le conteneur (`docker compose up -d`, un simple `restart` ne relit pas `.env`). Vérifier avec une Leçon.

## 4. Construire et lancer

Dans le dossier du dépôt, en SSH :

1. `docker compose build` (le build échoue exprès si la version du plugin du marketplace ne correspond pas à `PLUGIN_VERSION` ; voir `docker/MAJ.md`).
2. `docker compose up -d`.
3. Le conteneur redémarre seul (`restart: unless-stopped`), y compris après une coupure de courant ou un redémarrage du NAS, à condition que le paquet Docker démarre avec DSM.
4. Nom du conteneur : le compose fixe `container_name: cartable`, ce qui correspond au défaut de `scripts/publier.sh` (`docker restart cartable`). `RESTART_CMD` reste un réglage possible (voir section 7), par exemple `docker compose restart`.

## 5. Pare-feu et réseau

- Panneau de configuration > Sécurité > Pare-feu : créer une règle qui **autorise** le port de l'appli (`PORT`) pour le sous-réseau de la maison seulement (par exemple `192.168.1.0/24`, à adapter à celui du routeur), puis une règle qui **refuse** ce port pour tout le reste. Activer le pare-feu. À confirmer : l'ordre des règles et la prise en compte du trafic Docker (le port publié par Docker passe par une chaîne de pare-feu qui peut contourner celui de DSM) ; tester depuis un appareil hors du sous-réseau, par exemple un téléphone en 4G.
- **Aucune redirection de port** dans le routeur pour ce port. **Pas de QuickConnect** pour l'appli.
- Quiconque atteint le port a accès à toutes les Espaces personnels et dépense l'abonnement du parent : c'est la raison de ces règles.

## 6. Santé et logs

- Le compose définit un contrôle de santé qui interroge l'accueil de l'appli toutes les 30 s. Dans DSM (paquet Docker) : Conteneur > cartable, l'état « sain » ou « défaillant » apparaît dans la liste ; en SSH, `docker ps` affiche `(healthy)`.
- Logs : DSM > Docker > Conteneur > cartable > Détails > Journal ; en SSH, `docker compose logs -f cartable`. Au démarrage, la première ligne donne l'adresse à utiliser depuis un autre appareil (`ADRESSE_PUBLIQUE`).
- Les menus exacts de DSM 7.1 sont à confirmer sur place.

## 7. Publier une nouvelle version

Depuis le dossier du dépôt sur le NAS (SSH) : `npm run publier` (qui lance `scripts/publier.sh`). Il enchaîne :

1. `git pull --ff-only` (avance rapide seulement) ;
2. les vérifications (`VERIFS_CMD`, par défaut `npm run check && npm test`) ;
3. le redémarrage du conteneur (`RESTART_CMD`, par défaut `docker restart cartable`).

Il s'arrête au premier échec avec un message, sans redémarrer. Il ne touche jamais à `eleves/`. Les deux variables se remplacent à l'appel :

```
RESTART_CMD="docker compose restart" npm run publier
```

Si Node n'est pas installé sur le NAS lui-même (DSM 7.1 propose un paquet Node.js, à confirmer), faire tourner les vérifications dans le conteneur : `VERIFS_CMD="docker compose exec -T cartable sh -c 'npm run check && npm test'"`. À confirmer sur place.

Une publication ne change pas le jeton ni l'image. Une nouvelle version de la CLI ou du plugin demande de reconstruire l'image : voir `docker/MAJ.md`.

## 8. Migrer les Espaces personnels

1. **Essai sur une copie.** Copier `eleves/` du PC vers un dossier d'essai du NAS (par exemple `rsync -a ~/Work/cartable/eleves/ nas:/volume1/docker/cartable-essai/eleves/`), lancer une seconde instance sur un autre `PORT` pointant sur cette copie, et dérouler la liste de contrôle ci-dessous. Supprimer l'essai ensuite.
2. **Bascule.** Arrêter le serveur du PC. Recopier `eleves/` (`arnaud`, `milo`, `robin`) une dernière fois vers `eleves/` du dépôt du NAS. Vérifier les droits (propriétaire = `PUID`/`PGID`). Lancer le conteneur.
3. **Après la bascule, le NAS est la seule référence.** Le PC ne doit plus lancer l'appli sur son `eleves/` ; renommer ou supprimer le dossier du PC une fois les enfants servis, pour qu'il ne puisse pas diverger.

## 9. Mettre à jour la CLI et le plugin

Voir `docker/MAJ.md` : `ARG PLUGIN_VERSION` du `Dockerfile`, `docker compose build --no-cache`, `docker compose up -d`, puis `docker compose exec cartable claude --version`. Le code et `eleves/` sont montés : cette mise à jour ne touche à aucune donnée.

## 10. Sauvegarde : le RAID 5 n'est pas une sauvegarde

Le NAS est en RAID 5 : il survit à la panne d'**un** disque. Il ne protège ni d'une suppression ou d'une corruption (elles se répliquent sur tous les disques), ni d'un vol, d'un incendie ou d'un dégât des eaux, ni d'une erreur du parent. Les Espaces personnels (Leçons, Étoiles, Fusées, Badges, Cartes) n'existent après la bascule que sur ce NAS.

**Décision du parent : aucune sauvegarde particulière. Risque accepté, à rouvrir quand il le souhaite.** (Pistes si cela change : Hyper Backup vers un disque USB ou un nuage, ou un simple `rsync` de `eleves/` vers un autre appareil.)

## Liste de contrôle à la main

Ce qui n'est pas testable en CI (Docker, DSM, pare-feu, routeur, jeton réel). À cocher avant de déclarer l'installation finie, puis après chaque changement de NAS ou de jeton.

- [ ] **Docker jamais vérifié localement** : `docker compose build` puis `up -d` réussissent sur le NAS ; les points « à confirmer » ci-dessus sont tranchés ou notés.
- [ ] `docker compose exec cartable claude --version` répond ; `docker compose exec cartable ls /opt/teach` liste le skill `teach`.
- [ ] L'accueil s'ouvre par `http://<IP>:<PORT>` depuis chaque type d'appareil : Linux, Windows, Chromebook, Android.
- [ ] Le raccourci sur l'écran d'accueil de chaque appareil ouvre l'appli en un geste.
- [ ] Une Leçon complète : créer une Leçon avec le prof (un appel à Claude passe, donc le jeton marche), faire une Séance, vérifier les gains.
- [ ] Les fichiers de `eleves/` sont lisibles et modifiables depuis DSM (File Station) avec le bon propriétaire.
- [ ] L'heure est belge : « aujourd'hui » et la Série de jours basculent à minuit à Bruxelles.
- [ ] Redémarrer le NAS : le conteneur revient seul, l'accueil répond, l'état est « sain ».
- [ ] Depuis un appareil hors du sous-réseau (téléphone en 4G) : le port de l'appli ne répond pas.
- [ ] Publier une version d'essai (un changement trivial poussé sur `main`) : `npm run publier` passe, le conteneur redémarre, `eleves/` est intact ; un `git pull` impossible ou un test cassé arrête le script sans redémarrer.
- [ ] Jeton : date d'expiration notée (un an) ; avec un faux jeton, l'appli affiche le message « jeton expiré ou révoqué ».
