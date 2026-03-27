# Projet PWA — App de gestion de vol pour PNC

## Contexte

Application iPad interne pour Personnel Navigant Commercial (PNC) de CORSAIR.
Developpee pour les vols long-courriers (B787-9) avec acces futur a l'API interne.
Hebergee sur GitHub Pages : https://felixmarie3-code.github.io/cabin-app/
Depot public : https://github.com/felixmarie3-code/cabin-app

---

## Stack technique

- **PWA** : HTML/CSS/JS vanilla (aucune dependance externe)
- **Service Worker** : network-first + cache fallback (cache v10)
- **Persistance locale** : localStorage (bookmarks, notes, checklists, incidents, theme, services, zones cabine, notifications, portes, briefing OTP)
- **Branding** : Charte CORSAIR — police Gilroy (Regular + SemiBold), palette Bleu Business #282B62 / Bleu Premium #355EAB / Bleu Economie #52A7BE / Rouge Vermillon #DA3D32
- **Orientation** : Landscape (declaree dans le manifest)
- **Mode d'affichage** : Standalone (PWA installee)
- **Offline** : Service Worker cache statique complet au premier chargement

---

## Architecture fichiers

```
cabin-app/
  index.html              — Shell principal, tous les modules (6 onglets) + 5 modales
  manifest.json           — Manifest PWA (standalone, landscape, 4 shortcuts)
  sw.js                   — Service Worker (network-first, cache cabin-app-v10)
  css/app.css             — Styles CORSAIR complets (dark + light theme, CSS custom properties)
  js/app.js               — Logique metier complete (tous modules en un seul fichier)
  fonts/
    Gilroy-Regular.ttf
    Gilroy-SemiBold.ttf
  icons/
    corsair_blanc.svg          — Logo CORSAIR blanc (header)
    icon-192.svg               — Icone PWA (C italique CORSAIR)
    icon-512.png               — Icone PWA grande taille
    shortcut-briefing.svg      — Icone raccourci Briefing
    shortcut-pax.svg           — Icone raccourci Passagers
    shortcut-otp.svg           — Icone raccourci OTP
    shortcut-check.svg         — Icone raccourci Checklist
```

---

## Fonctionnalites transversales

### Theme clair / sombre
- **Mode sombre** (defaut) : fond #0d0f2b, surfaces #141638, cards #1a1d4a — optimise pour faible luminosite et cockpit
- **Mode clair** : fond #f0f1f7, cards blanches, header Bleu Business conserve
- Toggle icone lune/soleil dans le header
- Choix persiste en localStorage (`cabin_theme`)
- Icone bascule entre lune (dark) et soleil avec rayons (light) via SVG inline

### Navigation par onglets
- 6 onglets : Briefing, Checklist, Passagers, Repas, OTP, Rapport
- Navigation par clic sur la tab bar (delegation d'evenements)
- Navigation par URL hash (#briefing, #checklist, #passengers, #meals, #punctuality, #report)
- Gestion de l'evenement `hashchange` pour les raccourcis manifest

### Notifications
- **Push via Service Worker** : `registration.showNotification()` avec icone, badge, tag, vibrate
- **Fallback direct** : `new Notification()` si le SW n'est pas controleur
- **Notification in-app** : centre de notifications avec historique (max 50 entrees)
- Badge chiffre sur l'icone du bouton notifications dans le header
- Icone clochette avec badge rouge numerique
- Bouton "Tout effacer" dans le centre de notifications
- Swipe gauche pour rejeter une notification individuelle (threshold -80px)
- Bouton "Rejeter" (x) par notification
- Persistance en localStorage (`cabin_notifications`)
- Fermeture du centre en cliquant en dehors
- Bouton de test dans le Briefing avec compte a rebours 5s (simule une alerte medicale siege 22K)
- Requiert iOS 16.4+ et PWA installee pour push natif

### Badge icone (App Badge API)
- `navigator.setAppBadge()` / `navigator.clearAppBadge()`
- Compte : passagers non embarques + incidents enregistres
- Mise a jour a chaque ajout d'incident et au chargement

### Partage (Web Share API)
- Bouton partage dans le header (icone fleche vers le haut)
- Modale avec cases a cocher selectionnant les donnees a inclure :
  - Briefing vol (infos textuelles)
  - Liste passagers (siege + nom + repas + remarque)
  - Repas speciaux
  - Checklists (comptage valide)
  - Incidents
  - Rapport cabine (comptage zones OK)
- Sur iOS : `navigator.share()` declenche la feuille de partage native (AirDrop inclus)
- Fallback : `navigator.clipboard.writeText()` avec confirmation alert

### Raccourcis manifest (long-press icone iPad)
- 4 raccourcis declares : Briefing, Plan de cabine (Passagers), Ponctualite OTP, Checklists securite
- Navigation directe par hash d'URL

### Persistance localStorage (cles utilisees)
| Cle | Contenu |
|---|---|
| `cabin_theme` | 'dark' ou 'light' |
| `cabin_bookmarks` | objet {siege: true} |
| `cabin_notes` | objet {siege: texte} |
| `cabin_otp_checks` | objet {idx: timestamp} |
| `cabin_checklist` | objet {cat_sub_idx: true} |
| `cabin_incidents` | tableau d'incidents |
| `cabin_zones` | objet {zone: statut} |
| `cabin_services` | objet {s1: {}, s2: {}} |
| `cabin_doors` | objet {nom_pnc: porte} |
| `cabin_notifications` | tableau de notifications |
| `cabin_briefing_notes` | texte libre |
| `cabin_report_notes` | texte libre |

---

## Modules implementes (detail par onglet)

### 1. Briefing (onglet par defaut)

**Informations vol** (carte large)
- Numero de vol : SS 901
- Route : ORY -> RUN
- Appareil : B787-9, immatriculation F-OLRA
- Duree : 11h15, STD : 14:00
- **Profil de vol SVG** : courbe de montee/croisiere/descente avec 5 points animes (depart ORY 14:00, TOC FL390 14:32, croisiere, TOD 00:38, arrivee RUN 01:15)

**Passagers** (carte)
- KPI : Total, Business, Premium, Economy (calcules dynamiquement depuis les mock)
- Barre de remplissage coloree : vert > 90%, bleu 70-90%, jaune < 70%
- **Particularites cliquables** : boutons-tags (UM, WCHR, VIP, Repas spe., Nourrissons, Non embarques) avec comptage ; clic bascule sur l'onglet Passagers avec le filtre correspondant pre-active

**Equipage cabine** (carte)
- 8 membres : CCP + 7 CC avec initiales en avatar, nom, role, porte assignee
- Porte affichee = doorAssignments[nom] ou porte par defaut
- Bouton "Assigner aux portes" ouvrant la modale d'assignation

**Modale assignation aux portes**
- Grille : pour chaque PNC, un select avec les 8 portes (1L, 1R, 2L, 2R, 3L, 3R, 4L, 4R)
- Valeur pre-remplie avec l'assignation courante ou la porte par defaut
- Enregistrement en localStorage (`cabin_doors`), mise a jour immediate du Briefing

**Meteo destination** (carte)
- RUN : 28 degres C, vent 12 kt, plafond FEW025

**Notes de briefing** (carte)
- Textarea libre persistee en localStorage (`cabin_briefing_notes`)
- Bouton "Tester une notification" avec compte a rebours 5s

**Horloge temps reel**
- Affichage HH:MM dans le header de la section, mis a jour toutes les 30s

---

### 2. Checklist — Procedures & Securite

**Structure en tuiles categories/sous-categories**
- Vue principale : tuiles par categorie, chaque tuile contient des sous-tuiles avec compteur done/total
- Vue detail : liste d'items cochables avec retour (bouton <- Retour)
- Badge global "X / Y" dans le header du module

**4 categories, 16 sous-checklists, 46 items au total**

| Categorie | Sous-checklist | Items |
|---|---|---|
| Pre-vol | Check pre-vol | 9 |
| Pre-vol | Avant fermeture portes | 7 |
| En vol | Montee | 4 |
| En vol | Descente | 5 |
| En vol | Turbulences | 5 |
| Annonces | Annonces commerciales | 8 |
| Memo | Descente d'urgence | 4 |
| Memo | Feu cabine | 5 |
| Memo | PAXI (passager indiscipline) | 5 |
| Memo | FORDEC | 6 |

**Comportement**
- Clic item : toggle coche/decoche avec animation checkmark SVG vert
- Items coches : style barre + grise
- Etat persiste en localStorage (`cabin_checklist`, cle = "categorie_sous-cat_index")
- Compteur par sous-tuile mis a jour en temps reel

---

### 3. Passagers — Plan de cabine interactif

**Geometrie cabine B787-9 CORSAIR**
- **Business** (1-2-1) : rangees 1-8, sieges K / F E / A (4 sieges par rangee)
- **Premium** (2-3-2) : rangees 9-14, sieges K J / F E D / B A (7 sieges)
- **Economy avant** (3-3-3) : rangees 15-29, sieges K J H / F E D / C B A (9 sieges)
- **Economy arriere** (3-3-3) : rangees 30-47, sieges K J H / F E D / C B A (9 sieges)
- Rangees de sortie de secours : 1, 9, 15, 30, 46 (bordure bleue distincte)
- Galley/LAV signale entre Business et Premium, et entre Economy avant et arriere
- Labels colonnes en haut, numeros de rangee en bas de chaque colonne

**Interactions sur les sieges**
- Clic siege occupe : ouvre le panel passager detaille
- Clic siege libre : ouvre le panel avec "Siege libre"
- Indicateurs visuels par siege : couleur de classe, point jaune = repas special, icone WCHR, icone UM, point rouge = bookmark

**Filtres (8 boutons)**
- Tous, Occupes, Libres, Repas spe., UM, WCHR, Non embarques, Marques
- Sieges hors filtre : classe `dimmed` (opacite reduite)
- Sieges correspondants : classe `highlighted`

**Recherche texte**
- Input de recherche en temps reel (nom, PNR, numero de siege, remarque, repas)
- Compatible avec les filtres (les deux s'appliquent simultanement)

**Panel passager (modale overlay)**
- Badge siege colore par classe
- Nom en majuscules, classe + FFN si present
- Grille 2 colonnes : PNR, Nationalite, Embarquement (a bord / en attente), Check-in (oui/non), Repas, Remarque, Bagages, Nourrisson
- Codes couleur : vert = OK, jaune = attention
- Bouton marque-page : toggle bookmark, point rouge sur le siege, persiste localStorage
- Zone notes PNC : textarea + bouton "Enregistrer la note" avec confirmation "Enregistre !"
- Fermeture par bouton X ou clic sur l'overlay
- Siege selectionne surligne (classe `selected`) pendant que le panel est ouvert

**Barre de statistiques laterale**
- Remplissage %, Business, Premium, Economy, Repas speciaux, Marques (mis a jour a chaque rendu)

---

### 4. Repas & Boissons

**Comptage repas** (carte large)
- KPIs dynamiques par type de repas : STD, VGML, VLML, HNML, DBML, CHML, AVML, KSML
- Tri par frequence decroissante
- Badge total repas speciaux dans le header

**Liste repas speciaux** (carte large)
- Tableau : siege | nom passager | code repas
- Trie par numero de siege (ordre alphabetique)

**Tracker Service 1 — Repas principal** (carte)
- Barres de progression cliquables par classe (Business, Premium, Economy)
- Clic sur la barre : +10% de la classe correspondante
- Pourcentage affiche en temps reel
- Persiste en localStorage (`cabin_services`)

**Tracker Service 2 — Collation** (carte)
- Meme structure que Service 1

---

### 5. OTP — Ponctualite depart ORY

**Configuration STD**
- Input `<time>` pour modifier l'heure de depart prevue (defaut 14:00)
- Recalcul immediat de toute la timeline au changement

**Timeline de 27 jalons groupes par offset**
- Groupes avec libelle "H - HH:MM" a gauche
- Chaque jalon affiche : offset relatif | heure absolue calculee | libelle | statut | checkbox

**Statuts dynamiques (calcules en temps reel)**
- **Fait** (vert) : checkbox cochee manuellement
- **En cours** (bleu) : entre -5 min et +5 min de l'heure absolue
- **A venir** (gris) : plus de 5 min avant
- **Retard** (rouge) : plus de 5 min de depassement sans etre coche

**Liste complete des 27 jalons**
H-02:00 : Check-in ouvert, Security check, Tow in
H-01:50 : Crew pick up, Security search
H-01:40 : Crew at counter, Cargo at aircraft
H-01:30 : Crew bus
H-01:20 : Agent at gate, Crew at gate
H-01:10 : Cleaning, Catering, Loading, Fueling
H-01:00 : LDS sent
H-00:50 : Boarding, OK Cabin
H-00:40 : PMR / Remote, Pax bus
H-00:30 : Servicing
H-00:20 : Dep GPU, Bulk closed, Bag search
H-00:10 : Dep jetbridge, Marshaller, Pushback ready
H-00:00 : DEPART

**Comportement**
- Checkbox par jalon : validation manuelle, persiste localStorage (`cabin_otp_checks`)
- Rafraichissement automatique toutes les 30s
- Horloge temps reel HH:MM dans le header

---

### 6. Rapport de vol

**Etat cabine par zone** (carte large)
- 11 zones : Business, Premium, Economy avant, Economy centre, Economy arriere, Galley avant, Galley milieu, Galley arriere, Toilettes avant, Toilettes milieu, Toilettes arriere
- 3 boutons par zone : OK (vert), ATT (orange), KO (rouge)
- Statut persiste en localStorage (`cabin_zones`)

**Journal d'incidents** (carte large)
- Bouton "+ Ajouter un incident" ouvrant la modale
- Liste des incidents enregistres : horodatage | type (tag colore) | [siege] description

**Modale creation d'incident**
- Type : Medical, Securite, Comportement passager, Equipement cabine, Service, Autre
- Siege concerne (optionnel, texte libre)
- Description libre (textarea)
- Gravite : Faible (vert) / Moyen (orange) / Grave (rouge) — boutons selecteurs
- Horodatage automatique a l'enregistrement (HH:MM)
- Enregistrement en localStorage (`cabin_incidents`)
- Mise a jour du badge icone (App Badge API) apres chaque ajout

**Notes generales** (carte large)
- Textarea libre persistee en localStorage (`cabin_report_notes`)

**Resume chiffre** (carte large)
- 6 KPIs : Passagers (total), Embarques, Incidents, Zones OK (X/11), Checks faits, Repas speciaux

---

## Donnees mock

Toutes les donnees passagers sont generees aleatoirement a chaque chargement de page (`genPax()`) :

- **Taux de remplissage** : ~82% des sieges occupes (selection aleatoire)
- **Noms** : combinaison de 28 noms de famille (francophones + reunionnais : PAYET, HOARAU, RIVIERE, GRONDIN, DIJOUX, CADET, MAILLOT...) x 31 prenoms
- **PNR** : 6 caracteres alphanumeriques aleatoires (sans I, O)
- **Nationalites** : FR (x4 poids), RE (x2), MU, MG, IN, CN, JP, GB, DE, US
- **Repas speciaux** : VGML, VLML, HNML, DBML, CHML, AVML, KSML (les vides representent ~60% = Standard)
- **Remarques passager** : UM, WCHR, DEAF, BLND, PETC, VIP, MAAS (les vides representent ~60%)
- **Check-in** : ~92% oui (probabilite > 0.08)
- **Embarquement** : ~85% a bord (probabilite > 0.15)
- **Bagages** : 0, 1 ou 2 pieces (aleatoire)
- **Nourrisson** : ~5% (probabilite > 0.95)
- **FFN** : ~30% des passagers ont un numero "SS" + 7 chiffres

**Equipage (fixe)**
- LEFEBVRE Sophie — CCP — Porte 1L
- DUPONT Marc — CC1 Business — Porte 1R
- PAYET Nathalie — CC2 Premium — Porte 2L
- HOARAU Kevin — CC3 Eco avant — Porte 2R
- MARTIN Julie — CC4 Eco centre — Porte 3L
- RIVIERE Paul — CC5 Eco arriere — Porte 3R
- GRONDIN Lea — CC6 Eco arriere — Porte 4L
- DIJOUX Sarah — CC7 Galley — Porte 4R

---

## Flux de donnees

**Architecture actuelle (tout local)**
1. Chargement page -> `genPax()` genere les passagers en memoire
2. Toutes les interactions -> lecture/ecriture localStorage
3. Aucune persistance entre deux chargements de page (passagers re-generes)
4. SW met en cache les assets statiques au premier chargement

**Architecture cible**
1. Ouverture app -> sync depuis API (passagers, repas, equipage, infos vol)
2. Pendant le vol (offline) -> tout en local (localStorage / IndexedDB)
3. Retour connectivite -> push rapport et incidents vers API

---

## Couche API (a brancher)

Fichier `api.js` a creer. Fonctions prevues :
- `fetchFlightInfo(flightNumber)` — informations vol (route, avion, STD)
- `fetchPassengers(flightNumber)` — liste passagers avec repas et remarques
- `fetchCrewList(flightNumber)` — composition equipage et portes par defaut
- `pushReport(flightNumber, report)` — envoi rapport de vol
- `pushIncidents(flightNumber, incidents)` — envoi journal d'incidents
- `syncChecklistState(flightNumber, state)` — synchronisation checklists

---

## Contraintes iPad / Safari

- **Stockage** : localStorage (pas IndexedDB actuellement) — limite ~5 MB sur Safari
- **Purge Safari** : donnees effacees apres 7 jours sans ouverture (acceptable : vols < 16h)
- **Notifications push** : requiert iOS 16.4 minimum + PWA installee depuis Safari (Partager -> Sur l'ecran d'accueil)
- **Notifications refusees** : fallback vers notification in-app (centre de notifications integre)
- **App Badge API** : `navigator.setAppBadge()` supporte sur iOS 16.4+ en PWA installee
- **Web Share API** : `navigator.share()` disponible sur iOS Safari, declenche la feuille native (AirDrop)
- **Orientation** : paysage forcee dans le manifest, `user-scalable=no` dans le viewport
- **Touch** : `-webkit-tap-highlight-color: transparent`, `user-select: none`, cibles minimum 44px
- **Police** : Gilroy chargee via `@font-face` local (pas de Google Fonts, fonctionnel offline)
- **iPad source de verite** : non — re-sync systematique depuis API a chaque ouverture est le comportement cible

---

## Prochaines etapes

- [ ] Creer la couche API mockee (`api.js`) avec fetch real ou json local
- [ ] Migrer la persistance vers IndexedDB pour les donnees structurees (passagers, incidents)
- [ ] Implementer la sync offline/online (background sync via SW)
- [ ] Persister les donnees passagers entre rechargements (IndexedDB ou API)
- [ ] Tests sur iPad reel (Safari 16.4+) — validation tactile et notifications
- [ ] Authentification equipage (OAuth2 ou certificats clients)
- [ ] Chiffrement des donnees PNR dans IndexedDB
- [ ] Push notifications serveur (alertes meteo, retards, demandes sol)
- [ ] Export rapport de vol en PDF (Print API ou canvas)
- [ ] Ajouter MOML et SPML dans les codes repas
- [ ] Internationalisation EN pour les annonces (module Annonces)
