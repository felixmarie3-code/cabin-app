# Projet PWA — App de gestion de vol pour PNC

## Contexte

Application iPad interne pour Personnel Navigant Commercial (PNC). Développée pour une compagnie aérienne avec accès à l'API interne documentée.

---

## Décisions techniques validées

### Stack : PWA (Progressive Web App)

Choix justifié par les contraintes suivantes :
- **Offline obligatoire** → Service Worker + IndexedDB
- **Zéro coût** → pas d'App Store, pas de compte Apple Developer (99€/an)
- **Déploiement rapide** → URL interne, mise à jour instantanée pour tous
- **Données sensibles** → stockage local sur l'appareil, pas de cloud tiers
- **Non-développeur côté métier** → pas de build natif Swift requis

### Pourquoi pas une app native Swift ?
- Développeur obligatoire + compte Apple Developer
- Soumission App Store à chaque update
- Maintenance OS à chaque version iOS

### Pourquoi pas Glide / AppSheet / Notion ?
- Données PNR (données passagers) sensibles → interdit chez un tiers
- Pas d'offline réel
- Coût à l'usage

---

## Architecture

```
iPad (PWA)
  └── Service Worker (cache offline)
        └── IndexedDB (données vol en local)
              └── API compagnie (sync au démarrage + atterrissage)
```

### Flux de données
1. **Ouverture de l'app** → sync depuis API (passagers, repas, plan cabine)
2. **Pendant le vol** (offline) → tout tourne en local sur l'iPad
3. **Atterrissage** → rapport de vol / incidents pushés vers l'API

---

## Fonctionnalités à développer

| Module | Description |
|--------|-------------|
| Liste passagers / seating | Plan cabine avec statut par siège |
| Service repas / boissons | Suivi des commandes et régimes spéciaux |
| Checklist sécurité | Checklists pré-vol / post-vol |
| Rapport de vol / incidents | Formulaire de rapport avec sync API |

---

## Contraintes techniques importantes

### Stockage iOS / Safari
- localStorage : ~5 MB max
- IndexedDB : 50 MB fiable (plusieurs GB théoriques)
- **Purge Safari : les données locales sont effacées après 7 jours sans ouverture**
- ✅ Non bloquant : les missions durent < 16h → l'app est ouverte à chaque vol → le compteur repart à zéro

### Stratégie de persistance
- L'iPad est un **cache**, jamais la source de vérité
- Re-sync systématique depuis l'API à chaque ouverture
- Les données PNR ne doivent jamais être la seule copie côté client

### Points à implémenter côté sécurité
- Authentification vers l'API compagnie (OAuth2 ou certificats — à confirmer)
- Chiffrement des données PNR dans IndexedDB
- Gestion des conflits de sync offline/online

---

## Performances sur iPad

| Aspect | Verdict |
|--------|---------|
| Fluidité navigation | Identique au natif pour une app métier |
| Premier démarrage | +100-300ms (init Service Worker) puis caché |
| Listes courtes (< 300 items) | Aucune différence perceptible |
| Animations complexes | Légèrement inférieur au natif — non applicable ici |

---

## Ce qui n'est PAS supporté par une PWA sur iPad

À garder en tête si le périmètre évolue :

- ❌ NFC (Web NFC bloqué sur Safari) → si scanning badges requis = app native obligatoire
- ❌ Bluetooth (Web Bluetooth bloqué sur Safari)
- ❌ Background sync (sync uniquement à l'ouverture de l'app)
- ⚠️ File System Access API (accès fichiers via input[type=file] uniquement)
- ⚠️ Notifications push : supportées depuis iOS 16.4 uniquement (app doit être installée)

---

## Prochaines étapes pour Claude Code

### Ce qu'il faut générer
1. Structure PWA complète (manifest.json, service worker, index.html)
2. Module passagers / seating
3. Module service repas
4. Module checklist sécurité
5. Module rapport de vol
6. Couche sync API (mockée, prête à brancher sur la vraie API)

### Prompt de démarrage suggéré pour Claude Code

```
Crée une PWA complète pour iPad destinée à un PNC (Personnel Navigant Commercial).
Stack : HTML/CSS/JS vanilla, Service Worker, IndexedDB.
Pas de framework — la PWA doit fonctionner offline sans dépendances externes.

Modules à implémenter :
- Liste passagers avec plan de cabine et statut par siège
- Service repas/boissons avec suivi et régimes spéciaux
- Checklist sécurité pré-vol et post-vol
- Rapport de vol et incidents avec export

Architecture de sync :
- Au démarrage : fetch API → stockage IndexedDB
- Pendant le vol : lecture/écriture IndexedDB uniquement (offline)
- À la fermeture : push rapport vers API

L'API est mockée pour l'instant. Prévoir une couche d'abstraction
(api.js) avec des fonctions fetchPassengers(), pushReport(), etc.
que l'on branchera sur la vraie API plus tard.

Interface : sobre, lisible sur iPad en forte luminosité (cockpit),
grands boutons tactiles, pas de petits éléments.
```

---

## Notes

- Tester sur **iOS 16.4 minimum** pour les notifications push
- L'installation se fait via Safari → Partager → "Sur l'écran d'accueil"
- Une mise à jour côté serveur = tous les iPads sont à jour automatiquement
- Budget maintenance estimé : 1-2 jours/an si l'API compagnie évolue
