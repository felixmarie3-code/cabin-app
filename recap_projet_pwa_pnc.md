# Projet PWA — App de gestion de vol pour PNC

## Contexte

Application iPad interne pour Personnel Navigant Commercial (PNC) de CORSAIR.
Developpe pour les vols long-courriers (B787-9) avec acces a l'API interne documentee.

---

## Stack technique

- **PWA** : HTML/CSS/JS vanilla, Service Worker, IndexedDB
- **Hebergement** : GitHub Pages (https://felixmarie3-code.github.io/cabin-app/)
- **Repo** : https://github.com/felixmarie3-code/cabin-app (public)
- **Branding** : Charte CORSAIR (Gilroy, palette Bleu Business/Premium/Economie)
- **Offline** : Service Worker network-first + cache fallback
- **Persistance locale** : localStorage (bookmarks, notes, checklists, incidents)

---

## Architecture fichiers

```
cabin-app/
  index.html          — Shell principal, tous les modules
  manifest.json       — Manifest PWA (standalone, landscape)
  sw.js               — Service Worker (network-first, cache v4)
  css/app.css         — Styles CORSAIR complets
  js/app.js           — Logique metier (tous modules)
  fonts/
    Gilroy-Regular.ttf
    Gilroy-SemiBold.ttf
  icons/
    corsair_blanc.svg  — Logo CORSAIR blanc
    icon-192.svg       — Icone PWA
    icon-512.png
```

---

## Modules implementes

### 1. Briefing (page d'accueil)
- Informations vol (numero, route, appareil, immatriculation, duree, STD)
- Comptage passagers par classe avec barre de remplissage
- Composition equipage cabine (8 PNC : CCP + 7 CC)
- Alertes passagers particuliers (UM, WCHR, VIP, non embarques, nourrissons)
- Meteo destination
- Notes de briefing (persistees en localStorage)

### 2. Passagers — Plan de cabine interactif
- Plan cabine B787-9 CORSAIR fidele (Business 1-2-1, Premium 2-3-2, Economy 3-3-3)
- Rangees 1-47 avec numeros en bas
- Galleys entre sections (Business/Premium, Economy avant/arriere)
- Indicateurs visuels : sieges colores par classe, points repas speciaux, WCHR, bookmarks
- Barre de recherche par nom/PNR/siege
- 8 filtres : Tous, Occupes, Libres, Repas spe., UM, WCHR, Non embarques, Marques
- Clic siege = panel detaille (PNR, nationalite, embarquement, check-in, repas, remarque, bagages, nourrisson)
- Systeme de marque-pages par passager (persiste localStorage)
- Notes PNC par passager (persiste localStorage)
- Barre de statistiques (remplissage, compteurs par classe, repas speciaux, marques)

### 3. Repas & Boissons
- Comptage repas par type (STD, VGML, VLML, HNML, DBML, CHML, AVML, KSML, MOML)
- Liste des repas speciaux avec siege et nom passager
- Tracker de service 1 (repas) et service 2 (collation) par classe
- Barres de progression cliquables pour suivre l'avancement du service

### 4. Ponctualite (OTP) — Depart ORY
- Heure de depart STD modifiable
- 27 jalons du processus depart ORY (H-02:00 a H-00:00)
- Heures absolues calculees automatiquement
- Statut dynamique : Fait / En cours / A venir / Retard
- Checkbox par jalon pour validation manuelle (persiste localStorage)
- Horloge temps reel, rafraichissement auto 30s

### 5. Checklists securite
- 4 checklists : Pre-vol securite cabine (9 items), Pre-depart (9 items), En vol turbulences (5 items), Post-vol arrivee (8 items)
- Chaque item cochable (persiste localStorage)
- Compteur global et par section

### 6. Rapport de vol
- Etat cabine par zone (11 zones : classes, galleys, toilettes) avec statut OK/ATT/KO
- Journal d'incidents avec formulaire (type, siege, description, gravite)
- Notes generales du vol
- Resume chiffre (passagers, embarques, incidents, zones OK, checks faits, repas speciaux)

---

## Donnees mock

Toutes les donnees passagers sont generees aleatoirement au chargement :
- ~82% de taux de remplissage
- Noms francophones + internationaux
- PNR 6 caracteres, nationalites variees
- Repas speciaux, remarques (UM, WCHR, VIP, DEAF, BLND, PETC, MAAS)
- Statut embarquement et check-in

---

## Flux de donnees (cible)

1. **Ouverture app** → sync depuis API (passagers, repas, plan cabine)
2. **Pendant le vol** (offline) → tout en local (localStorage/IndexedDB)
3. **Atterrissage** → push rapport/incidents vers API

---

## Couche API (a brancher)

Fichier `api.js` a creer avec fonctions :
- `fetchFlightInfo(flightNumber)` — infos vol
- `fetchPassengers(flightNumber)` — liste passagers
- `fetchCrewList(flightNumber)` — equipage
- `pushReport(flightNumber, report)` — envoi rapport
- `pushIncidents(flightNumber, incidents)` — envoi incidents

---

## Contraintes iPad / Safari

- IndexedDB : 50 MB fiable
- Purge Safari apres 7j sans ouverture (non bloquant : vols < 16h)
- iPad = cache, jamais source de verite
- Re-sync systematique depuis API a chaque ouverture
- iOS 16.4 minimum pour notifications push
- Installation : Safari → Partager → Sur l'ecran d'accueil

---

## Prochaines etapes

- [ ] Creer la couche API mockee (api.js)
- [ ] Brancher IndexedDB pour persistance structuree
- [ ] Implementer la sync offline/online
- [ ] Ajouter les notifications push (iOS 16.4+)
- [ ] Tests sur iPad reel + optimisation tactile
- [ ] Authentification equipage (OAuth2 ou certificats)
- [ ] Chiffrement donnees PNR dans IndexedDB
