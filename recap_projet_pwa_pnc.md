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
- **Persistance locale** : localStorage (bookmarks, notes, checklists, incidents, theme, services, zones cabine)

---

## Architecture fichiers

```
cabin-app/
  index.html          — Shell principal, tous les modules (6 onglets)
  manifest.json       — Manifest PWA (standalone, landscape, shortcuts)
  sw.js               — Service Worker (network-first, cache v8)
  css/app.css         — Styles CORSAIR complets (dark + light theme)
  js/app.js           — Logique metier (tous modules)
  fonts/
    Gilroy-Regular.ttf
    Gilroy-SemiBold.ttf
  icons/
    corsair_blanc.svg      — Logo CORSAIR blanc
    icon-192.svg           — Icone PWA (C italique CORSAIR + neoline)
    icon-512.png
    shortcut-briefing.svg  — Icone raccourci Briefing
    shortcut-pax.svg       — Icone raccourci Passagers
    shortcut-otp.svg       — Icone raccourci OTP
    shortcut-check.svg     — Icone raccourci Checklist
```

---

## Fonctionnalites transversales

### Themes
- **Mode sombre** (defaut) : fond #0d0f2b, surfaces #141638 — optimise pour cockpit/forte luminosite
- **Mode jour** : fond clair, cards blanches, header Bleu Business conserve
- Toggle lune/soleil dans le header, choix persiste en localStorage

### Notifications
- **iOS natives** (bandeau, popup, ecran verrouillage, son) via `registration.showNotification()` dans le Service Worker
- Requiert PWA installee sur ecran d'accueil + iOS 16.4+
- **Fallback in-app** : bandeau rouge en haut de l'ecran si notifications refusees/non supportees
- Bouton de test dans le Briefing avec compte a rebours 5s

### Badge icone
- Pastille chiffree sur l'icone de l'ecran d'accueil via `navigator.setAppBadge()`
- Affiche le nombre d'alertes (passagers non embarques + incidents)
- Mise a jour automatique

### Raccourcis (long-press sur icone)
- 4 raccourcis declares dans le manifest : Briefing, Passagers, OTP, Checklist
- Navigation par hash (#briefing, #passengers, #punctuality, #checklist)

### Icone PWA
- "C" italique du logo CORSAIR (meme tracee vectoriel que le logo officiel)
- Fond bleu tres sombre (#181A3B), neoline rouge en bas
- Affichee sur l'ecran d'accueil iPad

---

## Modules implementes (6 onglets)

### 1. Briefing (page d'accueil)
- Informations vol (SS 901, ORY-RUN, B787-9, F-OLRA, 11h15, STD 14:00)
- Comptage passagers par classe avec barre de remplissage coloree
- Composition equipage cabine (8 PNC : CCP + 7 CC avec initiales, nom, poste)
- Alertes passagers particuliers triees par gravite (critical > warn > info)
  - Non embarques, UM, WCHR, VIP, DEAF, BLND, nourrissons
- Meteo destination (temperature, vent, plafond)
- Notes de briefing (persistees en localStorage)
- Bouton test notification avec compte a rebours 5s

### 2. Passagers — Plan de cabine interactif
- Plan cabine B787-9 CORSAIR fidele :
  - Business 1-2-1 (rangees 1-8, sieges K/F/E/A)
  - Premium 2-3-2 (rangees 9-14, sieges K/J/F/E/D/B/A)
  - Economy 3-3-3 (rangees 15-47, sieges K/J/H/F/E/D/C/B/A)
- Numeros de rangee en bas (1-47)
- Galleys marques entre Business/Premium et Economy avant/arriere
- Indicateurs visuels de sortie de secours
- Indicateurs par siege : couleur classe, point jaune repas special, point bleu WCHR, point rouge bookmark
- Barre de recherche par nom/PNR/siege
- 8 filtres : Tous, Occupes, Libres, Repas spe., UM, WCHR, Non embarques, Marques
- Sieges non-match grisés (dimmed), sieges match surlignés
- Clic siege = panel detaille overlay avec :
  - Badge siege colore, nom, classe, FFN
  - Grille 2 colonnes : PNR, nationalite, embarquement, check-in, repas, remarque, bagages, nourrisson
  - Couleurs contextuelles (vert = OK, jaune = attention)
  - Bouton marque-page (persiste localStorage, point rouge sur siege)
  - Zone de notes PNC avec sauvegarde (persiste localStorage)
- Barre de statistiques : remplissage %, Business, Premium, Economy, repas speciaux, marques

### 3. Repas & Boissons
- Comptage repas par type (STD, VGML, VLML, HNML, DBML, CHML, AVML, KSML, MOML)
- Badge total repas speciaux
- Liste scrollable des repas speciaux avec siege, nom passager, type de repas
- Tracker Service 1 (repas principal) par classe avec barres de progression cliquables
- Tracker Service 2 (collation) par classe avec barres de progression cliquables
- Progression persistee en localStorage

### 4. Ponctualite (OTP) — Depart ORY
- Heure de depart STD modifiable (input time)
- 27 jalons du processus depart ORY groupes par offset horaire :
  - H-02:00 : Check-in, Security check, Tow in
  - H-01:50 : Crew pick up, Security search
  - H-01:40 : Crew at counter, Cargo at aircraft
  - H-01:30 : Crew bus
  - H-01:20 : Agent at gate, Crew at gate
  - H-01:10 : Cleaning, Catering, Loading, Fueling
  - H-01:00 : LDS sent
  - H-00:50 : Boarding, OK Cabin
  - H-00:40 : PMR/Remote, Pax bus
  - H-00:30 : Servicing
  - H-00:20 : Dep GPU, Bulk closed, Bag search
  - H-00:10 : Dep jetbridge, Marshaller, Pushback ready
  - H-00:00 : DEPART
- Heures absolues calculees automatiquement selon STD
- Statut dynamique en temps reel : Fait (vert) / En cours (bleu) / A venir (gris) / Retard (rouge)
- Checkbox par jalon pour validation manuelle (persiste localStorage)
- Horloge temps reel, rafraichissement auto 30s

### 5. Checklists securite
- 4 checklists (31 items total) :
  - Pre-vol — Securite cabine (9 items)
  - Pre-depart — Avant fermeture portes (9 items)
  - En vol — Turbulences (5 items)
  - Post-vol — Arrivee (8 items)
- Chaque item cochable avec animation check vert
- Compteur global et par section (ex: 0/31)
- Etat persiste en localStorage
- Items coches barres et grises

### 6. Rapport de vol
- Etat cabine par zone (11 zones) avec boutons OK/ATT/KO :
  - Business, Premium, Economy avant/centre/arriere
  - Galley avant/milieu/arriere
  - Toilettes avant/milieu/arriere
- Journal d'incidents avec formulaire modal :
  - Type (Medical, Securite, Comportement, Equipement, Service, Autre)
  - Siege concerne (optionnel)
  - Description libre
  - Gravite : Faible / Moyen / Grave
  - Horodatage automatique
- Notes generales du vol (persistees)
- Resume chiffre : passagers, embarques, incidents, zones OK, checks faits, repas speciaux

---

## Donnees mock

Toutes les donnees passagers sont generees aleatoirement au chargement :
- ~82% de taux de remplissage (~304/371 sieges)
- Noms francophones + internationaux (reunionnais, malgaches, indiens, etc.)
- PNR 6 caracteres aleatoires
- Nationalites : FR, RE, MU, MG, IN, CN, JP, GB, DE, US
- Repas speciaux : VGML, VLML, HNML, DBML, CHML, AVML, KSML
- Remarques : UM, WCHR, DEAF, BLND, PETC, VIP, MAAS
- Statut check-in (~92%) et embarquement (~85%)
- Bagages (0-2 pcs), nourrissons (~5%)
- FFN (Frequent Flyer Number) pour ~30% des passagers

---

## Flux de donnees (cible)

1. **Ouverture app** -> sync depuis API (passagers, repas, plan cabine)
2. **Pendant le vol** (offline) -> tout en local (localStorage/IndexedDB)
3. **Atterrissage** -> push rapport/incidents vers API

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
- iOS 16.4 minimum pour notifications push et badge
- Installation : Safari -> Partager -> Sur l'ecran d'accueil
- Notifications necessitent PWA installee (pas en onglet Safari)

---

## Prochaines etapes

- [ ] Creer la couche API mockee (api.js)
- [ ] Brancher IndexedDB pour persistance structuree
- [ ] Implementer la sync offline/online
- [ ] Tests sur iPad reel + optimisation tactile
- [ ] Authentification equipage (OAuth2 ou certificats)
- [ ] Chiffrement donnees PNR dans IndexedDB
- [ ] Push notifications serveur (pas seulement locales)
- [ ] Export rapport de vol en PDF
