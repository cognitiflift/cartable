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
  - `type` : `"qcm"` (seul format de cette version).
  - `enonce` : la question.
  - `reponses` : 2 à 5 réponses en texte. Le Kit les mélange : n'écris pas « toutes les réponses ci-dessus ».
  - `bonne` : index (à partir de 0) de la bonne réponse dans `reponses`.
  - `explication` : une ou deux phrases, montrées après la réponse, juste ou fausse.
  - `bonus` (facultatif) : `true` pour une question bonus 🚀 du Dépassement, hors score. Un énoncé qui commence par 🚀 compte aussi comme question bonus ; n'écris pas le 🚀 dans l'énoncé, le Kit l'affiche.
  - `objectifs` (facultatif) : numéros des Objectifs propres à cette question, à la place de ceux du quiz.

Une question mal formée est ignorée. Il faut au moins une question hors bonus. Au plus 50 questions par quiz (les suivantes sont ignorées) ; un `id` de plus de 100 caractères ou un texte de plus de 500 caractères est coupé.

## Ce que fait le Kit

Il affiche les questions, mélange les réponses, demande à l'élève après chaque choix s'il est « sûr » ou « pas sûr » (sa Confiance, hors score), corrige chaque réponse avec son explication, calcule le score sans les questions bonus et, une fois toutes les questions répondues, envoie le score, les Objectifs couverts, le bonus et les résultats par question (avec la Confiance) à l'appli. Tu n'as rien à écrire pour cela.

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

- Schéma, frise ou carte : dessine un `<svg>` dans la figure, à la place de `<img>`. Rien à déclarer.
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

Après ton tour, l'appli télécharge chaque image déclarée (PNG, JPEG, GIF, WebP ou SVG, 5 Mo au plus) dans le dossier `images/` de la Leçon et réécrit son adresse dans la page, pour qu'elle reste affichée hors ligne. Une image injoignable, ou un fichier qui n'est pas une image, est retirée de la page (la légende reste) et te sera signalée au tour suivant : remplace-la.

## Style de base

`/kit/v1/base.css` règle la typographie, le mode sombre et la couleur de la Catégorie, choisie par `data-categorie` sur `<html>` : `francais`, `mathematiques`, `sciences`, `histoire`, `geographie`, `langues`, `arts` ou `autre`. La classe `encart` (ou `<aside>`) met un bloc en valeur, par exemple l'encart « 🚀 Pour aller plus loin ».
