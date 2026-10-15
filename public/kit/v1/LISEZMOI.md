# Kit de l'appli, version 1

Le Kit fournit à toute nouvelle Page de leçon le **quiz** et le **style de base**. Tu n'écris jamais ton propre quiz ni ta propre feuille de style de base : tu déclares seulement les questions, en JSON. Tu peux ajouter dans la Leçon des composants propres au sujet (atelier, schéma à compléter…) et un peu de style pour eux.

## Utilisation

Dans la page (`lessons/NNNN-titre.html`), avec des chemins absolus :

```html
<!doctype html>
<html lang="fr" data-categorie="sciences">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Le magma</title>
  <link rel="stylesheet" href="/kit/v1/base.css">
</head>
<body>
  <h1>Le magma</h1>
  <p>…contenu de la page…</p>
  <aside class="encart">🚀 Pour aller plus loin : …</aside>

  <h2>Quiz</h2>
  <script type="application/json" id="cartable-quiz">
  {
    "objectifs": [1],
    "questions": [
      {
        "id": "q1",
        "type": "qcm",
        "enonce": "Par où sort la lave ?",
        "reponses": ["Par le cratère", "Par les racines du volcan", "Par les nuages"],
        "bonne": 0,
        "explication": "La lave monte par la cheminée et sort par le cratère."
      },
      {
        "id": "q2",
        "type": "qcm",
        "enonce": "Le magma, c'est…",
        "reponses": ["de la roche fondue", "de l'eau très chaude"],
        "bonne": 0,
        "explication": "Le magma est de la roche fondue sous la terre.",
        "objectifs": [2]
      },
      {
        "id": "b1",
        "type": "qcm",
        "enonce": "Quel est le plus grand volcan connu ?",
        "reponses": ["Olympus Mons, sur Mars", "L'Etna, en Sicile"],
        "bonne": 0,
        "explication": "Olympus Mons est presque trois fois plus haut que l'Everest.",
        "bonus": true
      }
    ]
  }
  </script>
  <script type="module" src="/kit/v1/quiz.js"></script>
</body>
</html>
```

## Format du quiz

Un seul quiz par page, dans `<script type="application/json" id="cartable-quiz">`. Le Kit l'affiche à cet endroit.

- `objectifs` : numéros des Objectifs (de lesson.json) que couvre le quiz par défaut.
- `pretest` (facultatif) : `true` pour le quiz du Pré-test (la page « Devine ! » de trois questions, au début d'une Leçon). Le Kit le signale à l'appli, qui le garde hors score. Indique pour chaque question les Objectifs qu'elle couvre : ceux réussis au Pré-test seront « à confirmer ».
- `questions` : la liste, dans l'ordre d'affichage (questions bonus à la fin). Pour chaque question :
  - `id` : identifiant court, unique dans la page et stable (`q1`, `q2`, `b1`…).
  - `type` : le format de la question, `"qcm"` par défaut ; les autres formats sont décrits plus bas (« Formats de rappel actif »).
  - `enonce` : la question (ou la consigne : « Complète la phrase. », « Remets les étapes dans l'ordre. »).
  - Pour un `qcm` :
    - `reponses` : 2 à 5 réponses en texte. Le Kit les mélange : n'écris pas « toutes les réponses ci-dessus ».
    - `bonne` : index (à partir de 0) de la bonne réponse dans `reponses`.
  - Pour les autres formats : leurs champs propres, décrits plus bas.
  - `explication` : une ou deux phrases, montrées après la réponse, juste ou fausse.
  - `bonus` (facultatif) : `true` pour une question bonus 🚀 du Dépassement, hors score. Un énoncé qui commence par 🚀 compte aussi comme question bonus ; n'écris pas le 🚀 dans l'énoncé, le Kit l'affiche.
  - `objectifs` (facultatif) : numéros des Objectifs propres à cette question, à la place de ceux du quiz.
  - `image` (facultatif) : `{ "src": "…", "alt": "…" }`, une image propre à la question, affichée sous l'énoncé, et aussi quand l'élève la retrouve en révision. Même règle que pour une figure : photo distante déclarée dans `images.json` (l'appli la rapatrie et réécrit `src` en `../images/…`), `alt` qui dit ce qu'on voit. Une image mal formée est ignorée, la question reste. Pour un schéma en SVG, utilise plutôt la figure de la page.

Une question mal formée, ou d'un `type` inconnu, est ignorée : le reste du quiz s'affiche, et l'appli te la signale au tour suivant avec la raison. Il faut au moins une question hors bonus. Au plus 50 questions par quiz (les suivantes sont ignorées) ; un `id` de plus de 100 caractères ou un texte de plus de 500 caractères est coupé.

Ajouts compatibles de la version 1 : « Je ne sais pas » (résultat `jeNeSaisPas`), l'`image` d'une question et les formats de rappel actif (résultats `type`, `points` et `detail`). Une page écrite avant eux s'affiche et s'enregistre comme avant ; un lecteur de résultats d'avant les ignore sans erreur (`choisie` et `bonne` restent du texte). Une évolution incompatible passerait par une version 2 (ADR 0004).

## Formats de rappel actif

Dans un QCM, l'élève **reconnaît** la bonne réponse ; dans ces formats, il la **retrouve** lui-même, ce qui fixe mieux la mémoire. Mets **au moins une question de rappel actif (pas un QCM) par quiz**, au format qui convient au contenu. Tous se font en touchant (ou en glissant), jamais au clavier. Chaque format a son explication, la Confiance (« sûr / pas sûr ») et « Je ne sais pas », comme un QCM.

Crédit partiel : une question à plusieurs éléments rapporte la part juste (3 trous sur 4 = 0,75 question dans le score), mais elle ne compte comme « juste » (Objectifs, Banque de Questions, Révisions) que si elle est entièrement juste.

### Texte à trous : `"type": "trous"`

Pour le vocabulaire et les définitions. L'élève complète la phrase en touchant des mots d'une banque, qui contient toujours plus de mots que de trous.

```json
{
  "id": "q3",
  "type": "trous",
  "enonce": "Complète la phrase.",
  "texte": "La lave sort par le [cratère] et coule sur les [flancs] du volcan.",
  "intrus": ["racines", "nuages"],
  "explication": "Le cratère est l'ouverture au sommet ; les flancs sont ses pentes."
}
```

- `texte` : la phrase, chaque mot attendu entre crochets (1 à 10 trous, un mot ou un groupe de mots court par trou, sans crochet dedans).
- `intrus` : au moins un mot de plus (au plus 10), plausible, différent des mots attendus. La banque mélange mots attendus et intrus.

### Remettre dans l'ordre : `"type": "ordre"`

Pour les étapes d'un processus, les événements d'une histoire ou les mots d'une phrase. Le Kit mélange les éléments ; l'élève les remet dans l'ordre en les déplaçant.

```json
{
  "id": "q4",
  "type": "ordre",
  "enonce": "Remets les étapes de l'éruption dans l'ordre.",
  "elements": ["Le magma monte", "La pression augmente", "La lave sort par le cratère", "La lave refroidit"],
  "explication": "Le magma monte, la pression augmente jusqu'à l'éruption, puis la lave refroidit."
}
```

- `elements` : 3 à 10 éléments, tous différents, **dans le bon ordre**.
- Crédit partiel : les éléments déjà dans le bon ordre entre eux (il suffirait de déplacer les autres).

### Exemple à étapes (mathématiques) : `"type": "etapes"`

Pour une méthode de mathématiques. Le Kit montre la résolution étape par étape ; à chaque étape à compléter, l'élève touche la bonne parmi des propositions mélangées.

```json
{
  "id": "q5",
  "type": "etapes",
  "enonce": "Complète le calcul de 3/4 + 1/6.",
  "etapes": [
    { "texte": "Dénominateur commun : 12" },
    { "texte": "3/4 = 9/12", "intrus": ["3/4 = 3/12", "3/4 = 7/12"] },
    { "texte": "1/6 = 2/12" },
    { "texte": "9/12 + 2/12 = 11/12", "intrus": ["9/12 + 2/12 = 11/24"] }
  ],
  "explication": "On met les fractions au même dénominateur, puis on additionne les numérateurs seulement."
}
```

- `etapes` : 2 à 10 étapes, **dans l'ordre de la résolution**. Une étape sans `intrus` est montrée telle quelle ; une étape avec `intrus` est à compléter (au moins une par question).
- `intrus` : 1 à 4 propositions fausses pour cette étape, différentes de la bonne, tirées des **erreurs fréquentes** (dénominateurs additionnés, retenue oubliée, signe perdu…) : un distracteur absurde n'apprend rien.
- Crédit partiel : la part des étapes à compléter bien choisies.
- Enchaînement : l'exemple **entièrement résolu** va dans le contenu de la page (pas dans le quiz) ; ensuite des questions `etapes` où l'on retire les étapes une à une (une étape à compléter, puis deux…) ; puis des exercices de types mélangés.

## Ce que fait le Kit

Il affiche les questions dans leur format, mélange les réponses (ou les mots, ou les éléments), propose aussi « Je ne sais pas » (compté comme faux), demande à l'élève après chaque choix s'il est « sûr » ou « pas sûr » (sa Confiance, hors score), corrige chaque réponse avec son explication, calcule le score sans les questions bonus et, une fois toutes les questions répondues, envoie le score, les Objectifs couverts, le bonus et les résultats par question (avec la Confiance) à l'appli. Tu n'as rien à écrire pour cela.

## Figure

Chaque page contient au moins un visuel qui explique (photo d'œuvre, d'objet ou de lieu, schéma, frise, carte, arbre), jamais une image seulement décorative, et au moins une question du quiz s'y rapporte. Mets-le dans la figure du Kit : le visuel, puis une légende qui dit ce qu'on regarde, puis le crédit (source et licence).

```html
<figure class="kit-figure">
  <img src="https://upload.wikimedia.org/wikipedia/commons/…/Volcan.jpg" alt="Le Stromboli en éruption, de nuit">
  <figcaption>
    Le Stromboli projette de la lave par son cratère.
    <small class="kit-credit">Wikimedia Commons, Jean Dupont, CC BY-SA 4.0</small>
  </figcaption>
</figure>
```

- Schéma, frise ou carte : dessine un `<svg>` dans la figure, à la place de `<img>`. Rien à déclarer. Trace ses textes et ses traits en `currentColor` (`fill="currentColor"`, `stroke="currentColor"`) : ils prennent la couleur du texte et restent lisibles en mode sombre.
- Photo trouvée en ligne (de préférence Wikimedia Commons ou le site d'un musée, jamais une adresse devinée) : cite dans `src` l'adresse directe du fichier image, et déclare-la dans le manifeste `images.json`, à la racine de la Leçon (ajoute tes entrées à celles déjà présentes) :

```json
[
  {
    "url": "https://upload.wikimedia.org/wikipedia/commons/…/Volcan.jpg",
    "source": "Wikimedia Commons, Jean Dupont",
    "licence": "CC BY-SA 4.0",
    "alt": "Le Stromboli en éruption, de nuit",
    "page": "0002-le-magma.html"
  }
]
```

Après ton tour, l'appli télécharge chaque image déclarée (PNG, JPEG, GIF ou WebP, 5 Mo au plus ; un fichier SVG distant est refusé : dessine plutôt le schéma toi-même en SVG dans la page) dans le dossier `images/` de la Leçon et réécrit son adresse dans la page, pour qu'elle reste affichée hors ligne. Une image injoignable, ou un fichier qui n'est pas une image, est retirée de la page (la légende reste) et te sera signalée au tour suivant : remplace-la.

## Style de base

`/kit/v1/base.css` règle la typographie, le mode sombre et la couleur de la Catégorie, choisie par `data-categorie` sur `<html>` : `francais`, `mathematiques`, `sciences`, `histoire`, `geographie`, `langues`, `arts` ou `autre`. La classe `encart` (ou `<aside>`) met un bloc en valeur, par exemple l'encart « 🚀 Pour aller plus loin ».
