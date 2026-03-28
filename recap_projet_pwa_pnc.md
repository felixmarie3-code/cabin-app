# Cabin App — Recap projet PWA PNC
_Mis a jour le 2026-03-28_

---

## Contexte

Application web progressive (PWA) destinee au Personnel Navigant Commercial (PNC) de la compagnie CORSAIR. Elle est concue pour etre installee sur un iPad en mode standalone (sans barre de navigateur) et couvre l'ensemble du workflow d'un vol long-courrier : de la preparation du briefing jusqu'a la redaction du rapport de fin de vol.

Vol de reference utilise dans les donnees mock : **SS 901 ORY -> RUN** (Paris-Orly -> La Reunion), appareil B787-9, immatriculation F-OLRA, duree 11h15, STD 14:00.

---

## Architecture generale

### Fichiers principaux

| Fichier | Role |
|---|---|
| `index.html` | Structure HTML complete, tous les modules et overlays |
| `css/app.css` | Feuille de style unique, variables CORSAIR, theming dark/light |
| `js/app.js` | Logique applicative complete (aucune dependance externe) |
| `sw.js` | Service Worker — cache v18, strategie network-first avec fallback cache |
| `manifest.json` | Manifest PWA avec raccourcis et icones |

### Technologies

- HTML5 / CSS3 / JavaScript ES6+ vanilla (zero framework, zero dependance npm)
- PWA : Service Worker + Web App Manifest
- Polices : Gilroy Regular (400) et Gilroy SemiBold (600) chargees en local via `@font-face`
- Persistence : `localStorage` exclusivement (cle prefixee `cabin_`)
- Icones : SVG inline Lucide (aucune image raster pour les icones UI)

---

## Service Worker (sw.js)

- **Nom du cache** : `cabin-app-v18`
- **Strategie fetch** : Network First — tente le reseau, repli sur cache si hors ligne. Toute reponse reseau est systematiquement mise en cache (mise a jour automatique).
- **Installation** : pre-cache de tous les assets statiques (HTML, CSS, JS, manifest, polices, icones SVG/PNG).
- **Activation** : suppression de toutes les versions de cache anterieures (`k !== CACHE_NAME`), puis `clients.claim()`.
- **notificationclick** : redirige vers l'app (focus si fenetres ouvertes, sinon `openWindow`).
- Assets mis en cache : `./`, `index.html`, `css/app.css`, `js/app.js`, `manifest.json`, `icons/icon-192.svg`, `icons/icon-512.png`, `icons/corsair_blanc.svg`, `fonts/Gilroy-Regular.ttf`, `fonts/Gilroy-SemiBold.ttf`.

---

## Manifest PWA (manifest.json)

- **name** : `Cabin App - Gestion de vol PNC`
- **short_name** : `Cabin App`
- **display** : `standalone`
- **orientation** : `landscape`
- **background_color / theme_color** : `#0d0f2b` (bleu nuit CORSAIR)
- **Icones** : icon-192.png (192x192), icon-512.png (512x512), apple-touch-icon.png (180x180)
- **Apple touch icon** (balise `<link>`) : `icons/apple-touch-icon.png` — logo CORSAIR voiles (logoapp.png reference)
- **Raccourcis PWA** (apparaissent au long-press sur l'icone) :
  - Briefing vol -> `#briefing`
  - Plan de cabine -> `#passengers`
  - Ponctualite OTP -> `#punctuality`
  - Checklists securite -> `#checklist`

---

## En-tete (Header)

Barre fixe en haut, hauteur 48px (`--header-height`), fond `--bg-header`, bordure inferieure 2px couleur `--corsair-rouge-vermillon`, `backdrop-filter: saturate(180%) blur(20px)`.

### Cote gauche
- Logo SVG blanc `icons/corsair_blanc.svg` (hauteur 20px)
- Titre `CABIN` en Gilroy, 14px, letter-spacing 3px, uppercase, couleur blanche

### Cote droit (de gauche a droite)
- **Indicateur de vol** : `SS 901 · ORY → RUN · B787-9` (id `flightInfo`), couleur `--corsair-beige-sable`
- **Bouton Partager** (`shareToggle`) : icone upload SVG Lucide, ouvre l'overlay de partage
- **Bouton Notifications** (`notifToggle`) : icone cloche SVG Lucide, ouvre le centre de notifications ; badge rouge en position absolue top-right affichant le nombre de notifications
- **Bouton Theme** (`themeToggle`) : icone lune/soleil SVG Lucide, bascule dark/light
- **Point de synchronisation** (`syncStatus`) : cercle vert 7px, indicateur visuel en ligne

### Style des boutons d'en-tete
Tous les boutons sont **circulaires** : `border-radius: 50%`, 34x34px, fond `rgba(255,255,255,0.1)`, icone SVG stroke blanc 18px.

---

## Barre de navigation (Tab Bar)

Barre de navigation **en bas de l'ecran**, style iOS, position fixed `bottom: 0`.

- **Hauteur** : 72px (`--tab-height`)
- **Fond** : `rgba(13,15,43,0.85)` avec `backdrop-filter: saturate(180%) blur(20px)` (effet verre depoli iOS)
- **Bordure superieure** : 0.5px `rgba(255,255,255,0.08)`
- **Padding safe area** : `padding-bottom: env(safe-area-inset-bottom, 0px)` pour encoche iPhone/iPad
- **Padding interne des tabs** : `padding: 10px 2px 4px` (padding-top 10px)
- En theme clair : fond `rgba(255,255,255,0.88)`, bordure `rgba(0,0,0,0.08)`
- Aucun indicateur de trait au-dessus des tabs actifs (`tab.active::after { display: none }`)
- Tab actif : couleur `--corsair-bleu-economie` (theme sombre) ou `--corsair-bleu-premium` (theme clair)

### 6 onglets (dans l'ordre)

| Onglet | data-module | Icone SVG Lucide |
|---|---|---|
| Briefing | `briefing` | Livre ouvert (book-open) |
| Checklist | `checklist` | Case a cocher (check-square) |
| Passagers | `passengers` | Groupe utilisateurs (users) |
| Repas | `meals` | Tasse chauffante (coffee) |
| OTP | `punctuality` | Horloge (clock) |
| Rapport | `report` | Document (file-text) |

Navigation : clic sur un tab -> `switchToTab(name)` -> active le module correspondant (`mod-{name}`) avec animation `fadeIn`. Navigation par hash URL supportee (`#briefing`, `#passengers`, etc.).

---

## Systeme de themes

- Theme par defaut : **dark**
- Bascule via bouton `themeToggle`, persistance `localStorage` (cle `cabin_theme`)
- Attribut `data-theme` sur `<html>`

### Palette dark (defaut)
- `--bg` : `#0d0f2b`
- `--bg-surface` : `#141638`
- `--bg-card` : `#1a1d4a`
- `--bg-header` : `#0d0f2b`
- `--text` : `#FFFFFF`
- `--text-muted` : `#9a9bb8`
- `--accent` : `var(--corsair-bleu-economie)`
- `--seat-eco` : `#2d3068`

### Palette light
- `--bg` : `#f0f1f7`
- `--bg-surface` : `#ffffff`
- `--bg-card` : `#f7f7fb`
- `--bg-header` : `var(--corsair-bleu-business)` (identique en clair)
- `--text` : `#1a1d3a`
- `--text-muted` : `#6b6e8a`
- `--accent` : `var(--corsair-bleu-premium)`
- `--seat-eco` : `#b8bae0`

### Variables de marque CORSAIR
- `--corsair-bleu-business` : `#282B62`
- `--corsair-bleu-premium` : `#355EAB`
- `--corsair-bleu-economie` : `#52A7BE`
- `--corsair-rouge-vermillon` : `#DA3D32`
- `--corsair-beige-sable` : `#DEDBCE`
- `--corsair-noir-nuit` : `#252525`

---

## Regles de style globales

### Cartes (cards)
Tous les elements de type carte utilisent **`border-radius: 14px`** et **`box-shadow: 0 1px 3px rgba(0,0,0,0.12)`**. Aucune bordure coloree n'est presente (remplacee par des fonds arrondis colores).

### Boutons filtres
Forme **pill** : `border-radius: 20px`, fond `--bg-surface`, sans bordure apparente, shadow legere. Actif : fond `--corsair-bleu-economie`, texte blanc.

### Scrollbars
Style iOS — **cachees** : `::-webkit-scrollbar { width: 0; height: 0; }` et `scrollbar-width: none` sur `.content`. Exception : `.cabin-container` affiche une scrollbar horizontale fine (3px) avec thumb `rgba(82,167,190,0.3)`.

### Conteneur principal `.content`
- Hauteur : `calc(100% - var(--header-height))`
- Padding-bottom : `calc(var(--tab-height) + env(safe-area-inset-bottom, 0px) + 8px)` pour eviter le chevauchement avec la tab bar
- `overflow-y: auto`, `-webkit-overflow-scrolling: touch`

### Animation d'entree des modules
`fadeIn` : `opacity 0 -> 1`, `translateY(4px -> 0)`, 200ms ease.

---

## Module 1 — Briefing (`mod-briefing`)

Module affiche par defaut a l'ouverture de l'app.

### En-tete du module
- Titre `Briefing vol`
- Horloge temps reel (`briefingClock`) mise a jour toutes les 30s, affichage HH:MM

### Grille de briefing (`briefing-grid`)
2 colonnes, gap 10px. Les cartes `.brief-card.wide` occupent les 2 colonnes.

#### Carte 1 — Informations vol (wide)
KPIs en ligne : Vol (SS 901), Route (ORY -> RUN), Appareil (B787-9), Immat. (F-OLRA), Duree (11h15), STD (14:00 — editable indirectement via OTP).

**Profil de vol** (`flightProfile`) : ligne horizontale avec dots — **non SVG curve**. Implementation via elements DOM :
- `.fp-line` : ligne absolue horizontale, 2px, couleur `rgba(82,167,190,0.2)`, centree verticalement
- 5 points `.fp-point` positiones en flexbox : Depart ORY (14:00, dot `.dep` bleu premium), TOC FL390 (14:32), Croisiere, TOD (00:38), Arrivee RUN (01:15, dot `.arr` vert)
- Chaque point : temps au dessus, dot colore, label en dessous

#### Carte 2 — Passagers
- KPIs : Total, Business, Premium, Economy (calcules depuis les donnees mock)
- Barre de chargement (`briefLoadBar`) : couleur adaptive (vert >90%, bleu 70-90%, jaune <70%)
- Section **Particularites** : boutons tags cliquables (`pax-tags`) — UM, WCHR, VIP, Repas sp., Nourrissons, Non embarques. Chaque tag affiche un compteur sur fond arrondi et redirige vers le module Passagers avec le filtre pre-selectionne.

#### Carte 3 — Equipage cabine
Bouton `Assigner aux portes` (inline-btn) ouvre la modale d'assignation.
Liste de 8 PNC avec avatar circulaire (initiales), nom, role et porte assignee :
- LEFEBVRE Sophie — CCP — Porte 1L
- DUPONT Marc — CC1 Business — Porte 1R
- PAYET Nathalie — CC2 Premium — Porte 2L
- HOARAU Kevin — CC3 Eco avant — Porte 2R
- MARTIN Julie — CC4 Eco centre — Porte 3L
- RIVIERE Paul — CC5 Eco arriere — Porte 3R
- GRONDIN Lea — CC6 Eco arriere — Porte 4L
- DIJOUX Sarah — CC7 Galley — Porte 4R

Avatar CCP : fond `--corsair-bleu-premium`. Avatar CC : fond `#3d4280`.

#### Carte 4 — Cabin Status
Bouton `+ Defaut` ouvre la modale defaut cabine.
Liste des defauts enregistres (`cabinDefects`) : zone, description, impact (Mineur/Majeur/GO-IF). Si aucun defaut : message `Aucun defaut signale`.

#### Carte 5 — Themes de briefing (wide)
4 items statiques affichant les themes du briefing :
- Securite : verification portes armees avant push-back
- Service : nouveau menu long-courrier, presentation plateau Business
- Communication : annonces bilingues FR/EN systematiques
- Ponctualite : objectif D-0, respecter les jalons OTP

Chaque item : fond `rgba(255,255,255,0.03)`, `border-radius: 10px`, pas de bordure coloree.

#### Carte 6 — Informations manageriales (wide)
3 items statiques avec contexte visuel par fond arrondi (pas de bordure gauche) :
- Info (fond bleu tenu) : rappel badge obligatoire (note DS 2025-14)
- Info : formation CRM disponible sur portail, deadline 15 avril
- Warn (fond rouge tenu) : controles DGAC renforces sur annonces securite

#### Carte 7 — Notes de briefing (wide)
Textarea libre persistee en `localStorage` (cle `cabin_briefing_notes`).
Bouton `Tester une notification` : compte rebours 5s puis declenche une notification OS simulant une alerte medicale au siege 22K.

---

## Module 2 — Checklist (`mod-checklist`)

### En-tete
Titre `Procedures & Checklists`, badge `X / Y` (items valides / total).

### Vue tuiles (`checklistTiles`)
Grille 2 colonnes de tuiles `.cl-tile` avec `border-radius: 14px`, shadow, pas de bordure.
4 categories, chacune avec icone SVG Lucide colore et sous-tuiles :

#### Prevol (icone : check-square, bleu premium)
- Check pre-vol (9 items) : equipements de secours, extincteurs, issues, toboggans, materiel medical, ceintures, eclairage de secours, compartiments bagages, proprete
- Avant fermeture portes (7 items) : comptage, bagages, tablettes, ceintures, hublots, appareils electroniques, portes armees et cross-check

#### En vol (icone : avion, bleu economie)
- Montee (4 items) : consigne ceintures, serviettes chaudes, service boissons, verification cabine
- Descente (5 items) : annonce, cabine securisee, tablettes, ceintures, portes desarmee
- Turbulences (5 items) : annonce, service interrompu, verification ceintures, galley arrime, chariots freines

#### Annonces (icone : micro, jaune)
- Bienvenue a bord (3 items) : annonce FR complete, annonce EN complete, demo securite
- Service en vol (4 items) : 2 annonces boissons/repas FR/EN, 2 annonces duty-free FR/EN
- Preparation arrivee (4 items) : 2 annonces descente FR/EN, 2 annonces temperature/heure FR/EN

**Catalogue d'annonces bilingues FR/EN complet** : les textes des annonces sont integres directement dans les items de checklist (pas de fichier separe).

#### Memo (icone : document, rouge)
- Descente d'urgence (4 items) : masques O2, pression cabine, position brace, evacuation
- Feu cabine (5 items) : localiser, alerter CDB, extincteur, evacuer, surveiller
- PAXI passager indiscipline (5 items) : evaluer menace, de-escalade, isoler, informer CDB, rediger PV
- FORDEC (6 items) : Faits, Options, Risques, Decision, Execution, Controle

### Vue detail (`checklistDetail`)
Affichee en remplacement des tuiles. Bouton Retour -> re-affiche les tuiles.
Liste d'items cliquables : case a cocher SVG Lucide (polyline), texte. Item valide : opacite 0.5, texte barre, case fond `#257A6C`. Etat persiste en `localStorage` (cle `cabin_checklist`).

---

## Module 3 — Passagers (`mod-passengers`)

### Barre d'outils
- **Barre de recherche** : fond `--bg-surface`, `border-radius: 12px`, icone loupe SVG, input placeholder `Rechercher un passager...`. Recherche en temps reel sur : nom, PNR, siege, remarque, repas.
- **Filtres** : 8 boutons pill (`border-radius: 20px`) :
  - Tous (actif par defaut)
  - Occupes
  - Libres
  - Repas spe.
  - UM
  - WCHR
  - Non embarques
  - Marques

### Plan de cabine (`cabinPlan`)
Contenu dans `.cabin-container` (fond `--bg-surface`, `border-radius: 14px`, shadow, scroll horizontal).

#### Configuration du B787-9 (CABIN_CONFIG)
- **Business** : rangs 1-8, layout `K . . | . F E | . . A` (sieges largeurs 1-2-3)
- **Premium** : rangs 9-14, layout `K J . | F E D | . B A`
- **Economy avant** : rangs 15-29, layout `K J H | F E D | C B A`
- **Economy arriere** : rangs 30-47, layout `K J H | F E D | C B A`
- Separateurs galley entre sections : Business->Premium (`GAL`), Economy avant->arriere (`GAL/LAV`)
- Rangees de sortie (`EXIT_ROWS`) : 1, 9, 15, 30, 46 — trait vert `#257A6C` au dessus

#### Style des sieges
- Taille : 22x22px, `border-radius: 3px`, margin 1px
- Vide : fond `--seat-empty`, bordure `--seat-empty-border`
- Occupe Business : fond `--corsair-bleu-premium`
- Occupe Premium : fond `--corsair-bleu-economie`
- Occupe Economy : fond `--seat-eco`
- Selectionne : bordure blanche + glow blanc
- Attenue (filtre actif, non correspondant) : opacite 0.15, pas d'interaction

#### Indicateur bookmark sur siege
Triangle rouge en coin superieur droit (classe `bookmarked`) :
```
border-style: solid; border-width: 0 7px 7px 0;
border-color: transparent var(--corsair-rouge-vermillon) transparent transparent;
```
Aucun point indicateur pour repas speciaux ni fauteuil roulant (`.seat.special-meal::after, .seat.wheelchair::after { display: none }`).

#### Animation "breathing" (filtre actif)
Classe `breathing` (et non `highlighted`) : animation `breathe` 3s ease-in-out infinite, glow pulsant `rgba(82,167,190,0.3)`.

### Statistiques cabine (`cabinStats`)
Barre horizontale sous le plan : % Remplissage, Business, Premium, Economy, Repas spe., Marques. Fond `--bg-surface`, `border-radius: 12px`, shadow.

### Panneau inferieur passagers (`paxBottomPanel`)
Panel fixe sous le plan, `border-radius: 14px`, `max-height: 260px`, shadow. Deux vues exclusives :

#### Vue liste (`paxListView`)
- En-tete : titre `Liste passagers` (ou `Resultat filtre` si filtre actif) + badge compteur
- Scroll : liste des passagers filtres, triee par numero de siege. Chaque ligne : siege (bleu accent), nom, tags repas (jaune) et remarque (bleu).
- Clic sur une ligne -> bascule vers vue detail

#### Vue detail inline (`paxDetailView`)
- Bouton Retour -> vue liste
- En-tete : badge siege colore par classe, nom, classe + FFN
- Bouton bookmark (SVG bookmark Lucide) — rempli rouge si active
- Grille info 2 colonnes : PNR, Nationalite, Embarquement (vert/jaune), Check-in, Repas, Remarque, Bagages, Nourrisson
- Section notes PNC : textarea + bouton `Enregistrer la note` (feedback `Enregistre !` 1.5s)

### Panel overlay passager (paxOverlay)
Modal centree pour clic direct sur siege dans le plan. Memes informations que la vue detail inline. Bouton fermer X circulaire.

---

## Module 4 — Repas (`mod-meals`)

En-tete : titre `Service repas & boissons`, badge `X speciaux`.

### Carte 1 — Comptage repas (wide)
KPIs dynamiques : nombre de repas par type (STD, VGML, VLML, HNML, DBML, CHML, AVML, KSML), tries par frequence decroissante.

### Carte 2 — Repas speciaux attribution par siege (wide)
Liste scrollable (`max-height: 260px`) des passagers avec repas speciaux, triee par siege. Chaque ligne : siege (bleu), nom (beige), type de repas (jaune).

### Carte 3 — Service 1 Repas
Tracker de progression par classe (Business/Premium/Economy) avec barres de progression cliquables. Clic -> ajoute 10% de progression. Etat persiste (`cabin_services`).
- Business : barre bleu premium
- Premium : barre bleu economie
- Economy : barre `#3d4280`

### Carte 4 — Service 2 Collation
Meme structure que Service 1.

---

## Module 5 — Ponctualite OTP (`mod-punctuality`)

En-tete : titre `Ponctualite — Depart ORY`, horloge temps reel (`otpClock`).

### Saisie STD
Input `time` editable (valeur initiale 14:00). Changement -> recalcul immediat de la timeline.

### Timeline OTP (`timelineContainer`)
27 jalons regroupes par offset de temps par rapport au STD, de H-120min a H-DEPART.

**Groupes de jalons** (offset en minutes relatif au STD) :
- H-02:00 : Check-in ouvert, Security check, Tow in
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
- H — DEPART

Chaque jalon affiche : offset relatif, heure absolue calculee, label, statut (Fait/En cours/A venir/Retard), case a cocher SVG. Statuts avec codes couleur :
- Fait : fond vert translucide, texte vert
- En cours (diff <= 5 min) : fond bleu translucide
- Retard : fond rouge translucide, texte rouge
- A venir : texte beige attenue

Cases cochees persistees en `localStorage` (cle `cabin_otp_checks`). Mise a jour automatique toutes les 30s.

---

## Module 6 — Rapport (`mod-report`)

### Carte 1 — Etat cabine (wide)
Grille 2 colonnes de 11 zones cabine, chacune avec 3 boutons d'etat :
- **OK** : fond `#257A6C` si actif
- **ATT** : fond `#b64b32` si actif
- **KO** : fond `--corsair-rouge-vermillon` si actif

Zones : Business, Premium, Economy avant, Economy centre, Economy arriere, Galley avant, Galley milieu, Galley arriere, Toilettes avant, Toilettes milieu, Toilettes arriere.
Etat persiste (`cabin_zones`).

### Carte 2 — Incidents & evenements (wide)
Liste des incidents enregistres. Chaque incident : heure, tag type colore (low bleu / med jaune / high rouge), description avec siege optionnel.
Bouton `+ Ajouter un incident` (bordure pointillee) -> ouvre la modale incident.

### Carte 3 — Remarques generales (wide)
Textarea libre persistee (`cabin_report_notes`).

### Carte 4 — Resume du vol (wide)
Grille 3 colonnes de 6 KPIs calcules : Passagers, Embarques, Incidents, Zones OK (X/11), Checks faits, Repas spe.

---

## Modales (overlays)

Toutes les modales utilisent la classe `.pax-panel-overlay` (fond semi-transparent) avec `.pax-panel` (fond `--bg-surface`, `border-radius: 16px`, `max-height: 85vh`, shadow profonde). Fermeture : bouton X (SVG Lucide, round), clic sur fond.

### Modal Passager (paxOverlay)
Detail complet d'un passager : badge siege colore, nom, classe/FFN, bookmark SVG, grille info 8 champs, notes PNC avec sauvegarde.

### Modal Incident (incidentOverlay)
- Select type : Medical, Securite, Comportement passager, Equipement cabine, Service, Autre
- Input siege (optionnel)
- Textarea description
- Boutons gravite : Faible / Moyen / Grave (codes couleur bleu/jaune/rouge)
- Bouton Enregistrer -> ajoute a `incidents[]`, persiste, rafraichit rapport, met a jour badge applicatif

### Modal Partager (shareOverlay)
Selecteurs cases a cocher par categorie : Briefing vol, Liste passagers, Repas speciaux, Checklists, Incidents, Rapport cabine.
Bouton `Partager` -> utilise **Web Share API** (`navigator.share`) si disponible (iOS -> AirDrop). Fallback : copie dans le presse-papier (`navigator.clipboard`). Le texte partage est construit dynamiquement depuis les donnees en memoire.

### Modal Assignation portes (doorOverlay)
Grille 2 colonnes : 8 PNC avec select dropdown pour chaque porte (1L/1R/2L/2R/3L/3R/4L/4R). Sauvegarde -> met a jour `doorAssignments`, persiste, rafraichit le briefing.

### Modal Defaut cabine (defectOverlay)
- Select zone : Business, Premium, Economy avant, Economy arriere, Galley, Toilettes, Autre
- Textarea description
- Boutons impact : Mineur / Majeur / GO-IF (codes couleur bleu/jaune/rouge)
- Sauvegarde -> ajoute a `cabin_defects`, persiste, rafraichit le briefing

---

## Centre de notifications (notifCenter)

Panel fixe en dessous du header, cote droit, `width: 380px`, `border-radius: 14px`, shadow, affiche/masque via classe `visible`.

- En-tete : titre `NOTIFICATIONS`, bouton `Tout effacer` (rouge)
- Liste scrollable d'items, max 50 notifications
- Chaque notification : icone ronde (lettre `i` ou `!`) sur fond colore (rouge = alert, bleu = info, orange-rouge = warn), titre bold, corps, heure
- **Swipe gauche** pour supprimer (seuil -80px) : animation `dismissed` translateX(-100%) + opacity 0
- Bouton dismiss `×` visible au hover/touch
- Message vide si aucune notification

### Types de notifications
- `alert` : icone `!`, fond rouge vermillon
- `info` : icone `i`, fond bleu premium
- `warn` : icone `i`, fond `#b64b32`

### Notifications OS (Push)
- Via `navigator.serviceWorker.ready.then(r => r.showNotification(...))` si SW actif
- Fallback via `new Notification(...)` si permission accordee
- Options : icone `icons/icon-192.svg`, badge meme icone, vibration `[200,100,200]`, `renotify: true`
- Badge applicatif (`navigator.setAppBadge`) : nombre de passagers non embarques + incidents

---

## Donnees mock (passengers)

Generateur `genPax()` appele une fois a l'init, resultat stocke dans la constante `passengers` (objet siege -> donnees passager). Taux d'occupation : ~82% des sieges.

Champs par passager :
- `name` : NOM Prenom (pool de 28 noms de famille et 31 prenoms)
- `pnr` : 6 caracteres alphanumeriques
- `class` : `business` | `premium` | `economy`
- `meal` : code IATA repas special ou vide (VGML/VLML/HNML/DBML/CHML/AVML/KSML)
- `remark` : UM / WCHR / DEAF / BLND / PETC / VIP / MAAS ou vide
- `nationality` : code pays (FR/RE/MU/MG/IN/CN/JP/GB/DE/US)
- `checkedIn` : boolean (false ~8%)
- `boarded` : boolean (false ~15%)
- `bags` : 0-2 bagages cabine
- `infant` : boolean (true ~5%)
- `ffn` : numero fidelite `SS` + 7 chiffres (present ~30% des cas)

---

## Persistence localStorage

| Cle | Type | Contenu |
|---|---|---|
| `cabin_theme` | string | `dark` ou `light` |
| `cabin_bookmarks` | object | `{ "14A": true, ... }` |
| `cabin_notes` | object | `{ "14A": "note texte" }` |
| `cabin_otp_checks` | object | `{ "12": timestamp, ... }` |
| `cabin_checklist` | object | `{ "Prevol_Check pre-vol_0": true }` |
| `cabin_incidents` | array | `[{ time, type, seat, desc, severity }]` |
| `cabin_zones` | object | `{ "Business": "OK", ... }` |
| `cabin_services` | object | `{ s1: { biz: N }, s2: { ... } }` |
| `cabin_doors` | object | `{ "LEFEBVRE Sophie": "1L" }` |
| `cabin_notifications` | array | `[{ id, title, body, type, time }]` |
| `cabin_defects` | array | `[{ zone, desc, impact }]` |
| `cabin_briefing_notes` | string | Texte libre |
| `cabin_report_notes` | string | Texte libre |

---

## Comportements globaux

- `user-select: none` sur `body` (sauf textareas avec `-webkit-user-select: text`)
- `-webkit-tap-highlight-color: transparent`
- `overflow: hidden` sur `html, body` (scroll uniquement dans `.content`)
- Taille minimale touchable : `min-height: 36px; min-width: 36px` sur tous les boutons
- Clocks : `updateClocks()` toutes les 30s, `buildTimeline()` toutes les 30s
- Init complete a la fin de `app.js` : `buildBriefing()`, `buildCabinPlan()`, `buildPaxList()`, `buildMeals()`, `buildTimeline()`, `buildChecklists()`, `buildReport()`, `updateClocks()`, `updateAppBadge()`, `renderNotifCenter()`, `updateNotifBadge()`
