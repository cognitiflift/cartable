# L'appli pilote Claude Code en local (`claude -p`) avec l'abonnement Pro

Cartable lance le skill `teach` en appelant `claude -p` sur la machine du parent, avec sa connexion à l'abonnement Claude Pro, plutôt que d'utiliser l'API Anthropic payante depuis un serveur hébergé. C'est gratuit en plus de l'abonnement et cela réutilise `teach` tel quel, mais l'appli reste locale (famille et réseau local), partage le quota Pro avec les sessions du parent, et ne peut pas être ouverte à des élèves à distance.
