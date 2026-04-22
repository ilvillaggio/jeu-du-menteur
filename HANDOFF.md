# IL VILLAGGIO — Handoff complet du projet

## Vue d'ensemble
Application de commande en ligne pour une pizzeria. Deux interfaces séparées :
- **Client** : `appli-pizzeria.web.app` → `client.html`
- **Caisse** : `ilvillaggio-caisse.web.app` → `caisse.html`

Hébergement : **Firebase Hosting** (multi-site). Base de données : **Firebase Realtime Database**. Impression : **Raspberry Pi** sur le réseau local de la pizzeria.

---

## Structure des fichiers
```
Claude New code/
├── client.html              # App client (commandes)
├── caisse.html              # App caisse (gestion)
├── firebase-messaging-sw.js # Service worker push notifications (caisse)
├── sw-caisse.js             # Service worker PWA caisse
├── sw.js                    # Service worker PWA client
├── manifest-caisse.json     # Manifest PWA caisse
├── manifest-client.json     # Manifest PWA client
├── index.html               # Redirect hostname-aware (caisse vs client)
├── firebase.json            # Config hosting multi-site
├── .firebaserc              # Targets Firebase
├── database.rules.json      # Règles Realtime Database
├── functions/
│   └── index.js             # Cloud Function: notifyNewOrder (push notifications)
└── print-server/
    └── server.js            # Serveur Node.js sur le Raspberry Pi
```

---

## Firebase
- **Projet** : `appli-pizzeria`
- **Database** : `appli-pizzeria-default-rtdb.europe-west1.firebasedatabase.app`
- **Hosting targets** :
  - `client` → `appli-pizzeria.web.app`
  - `caisse` → `ilvillaggio-caisse.web.app`

### Structure de la base de données
```
/orders/{orderId}         # Commandes clients
/slots/{date}/{slotKey}   # Créneaux horaires (compteur pizzas)
/config/
  reservationsOpen        # boolean — ouverture/fermeture réservations
  availability/{itemId}   # boolean — disponibilité article au menu
  stock/{itemId}          # number — stock restant
  patons                  # données pâtons
/push_subscriptions/      # Abonnements push notifications (caisse)
/print_jobs/              # File d'impression (relay Firebase → Pi)
```

### Règles database
Tout est public en lecture. Écriture permise sur tous les nœuds (app interne, pas de users anonymes).

---

## Système d'impression (architecture relay Firebase)
**Flux** : Caisse écrit dans `/print_jobs` → Pi écoute via SSE Firebase → Pi imprime via TCP

- Le Pi n'a plus besoin d'être accessible depuis le navigateur (plus de SSL, plus de problème réseau)
- La caisse et le client peuvent être n'importe où (4G, 5G, domicile)
- Seul le Pi doit être connecté au WiFi de la pizzeria (pour atteindre l'imprimante à `192.168.1.220:9100`)

### Raspberry Pi
- **Hostname** : `pizzeria.local`
- **Service** : `print-server` (systemd, démarrage automatique)
- **Fichier** : `/home/pi/print-server/server.js`
- **Commandes SSH** :
  ```bash
  sudo systemctl restart print-server
  sudo journalctl -u print-server -f
  ```
- **Imprimante** : POS-80C thermique, IP `192.168.1.220`, port `9100`, protocole TCP, codepage CP437

### server.js — points clés
- `watchPrintJobs()` : écoute `/print_jobs.json` via SSE HTTPS Firebase
- Gère les deux types d'événements SSE : path `/` (données initiales) et path `/-Nkey` (nouveau job)
- `handlePrintJob(key, job)` : supprime le job Firebase puis imprime caisse + cuisine (délai 1,5s entre les deux)
- `buildTicket(order)` : ticket caisse ESC/POS
- `buildKitchenTicket(order)` : ticket cuisine ESC/POS (gros texte, pas de prix)
- Auto-print à 17h00 : imprime les commandes futures du jour (passées avant aujourd'hui)

---

## Push Notifications
- **Système** : Web Push API standard (VAPID), pas FCM
- **Cloud Function** `notifyNewOrder` : se déclenche sur création dans `/orders/{orderId}`, envoie push à toutes les subscriptions enregistrées
- **Service worker** : `firebase-messaging-sw.js` (déployé sur le site caisse)
- **VAPID public** : `BIdPHUlKf0lK8SE_3rxdLRqXlj6G_Lnwiqd3a5-YZtC5BNw_Mr0epYF2izphe_JILBq4nvr6ArthVWD84qAoPQE`

---

## caisse.html — fonctionnalités
- Affichage des commandes en temps réel (Firebase listener)
- Statuts : `pending` → `confirmed` → `ready` → `done` (+ `rejected`, `cancelled`)
- **Confirmer** une commande : écrit dans `/print_jobs` pour impression automatique
- **Refuser** une commande : modal avec motifs :
  - `"Créneau complet"` (`rejectType: slot_full`) → client redirigé vers créneau en 3s
  - `"Article en rupture de stock"` (`rejectType: stock`) → picker d'article dans le modal, caisse sélectionne l'article concerné → client redirigé vers panier sans cet article en 3s + `config/availability/{itemId}` mis à `false` automatiquement
  - `"Trop de commandes"` / `"Commande invalide"` (`rejectType: other`) → affichage standard
- Gestion des créneaux : libération automatique des places lors du refus
- Stats temps réel (CA, nb commandes, pizzas)
- Commandes futures (jours suivants)
- Nouvelle commande sur place (interface NC)
- PIN de sécurité : `5689`
- Lock auto après 5 minutes d'inactivité

---

## client.html — fonctionnalités
- PWA installable, fonctionne hors-ligne (cache service worker)
- Session client : nom + téléphone, stockés en `durableSave` (localStorage + IndexedDB)
- **Stockage durable** : `villaggio_session`, `villaggio_lastorder`, `villaggio_lastgoodorder`, `villaggio_cart`, `villaggio_cartMeta`
- Panier avec modifications (sans ingrédient, ajout supplément, changement de base)
- Choix de créneaux horaires (limités par pizzas max par créneau)
- Suivi de commande en temps réel via `watchOrder()`
- **Comportements sur refus** :
  - `slot_full` : countdown 3s → page créneau (panier intact)
  - `stock` : countdown 3s → page panier (article retiré via `redirectAfterStockRejection()`)
  - `other` : page de refus avec détail commande + boutons
- **Annulation** : le client peut annuler une commande `pending` → status `cancelled` dans Firebase → disparaît de la caisse
- **Déconnexion** : bouton discret dans l'en-tête
- **Mémoire commandes** :
  - `villaggio_lastorder` : dernière commande (tous statuts)
  - `villaggio_lastgoodorder` : dernière commande `done` — persiste même après un refus
- `reorderLastOrder()` : recharge les items (fonctionne pour `done` et `rejected`)
- `reorderLastGoodOrder()` : recharge la dernière commande réussie

---

## Déploiement
```bash
# Tout déployer
firebase deploy

# Seulement le client
firebase deploy --only hosting:client

# Seulement la caisse
firebase deploy --only hosting:caisse

# Seulement les fonctions
firebase deploy --only functions

# Copier server.js sur le Pi
scp "C:\Users\fredl\Desktop\Claude New code\print-server\server.js" pi@pizzeria.local:/home/pi/print-server/server.js
```

---

## Problèmes résolus récemment
1. **Bandeau URL sur PWA client** : séparation sur deux domaines distincts → résolu le problème de permission réseau local Chrome
2. **Impression Firebase relay** : remplacement appel HTTP direct navigateur→Pi par relay Firebase → plus de problème SSL/réseau
3. **Bug SSE Firebase** : `watchPrintJobs()` ne détectait pas les nouveaux jobs (path `/-Nkey` non géré) → corrigé
4. **Script Windows au démarrage supprimé** (`PrintServer-IlVillaggio.vbs`) — devenu inutile
5. **`firebase-messaging-sw.js`** retiré de la liste ignore du site caisse → push notifications fonctionnelles

---

## À déployer / tester
- Déployer les dernières modifications (comportements refus créneau/stock + mémoire lastGoodOrder) :
  ```bash
  firebase deploy --only hosting
  ```
- Tester le flow rupture de stock (caisse sélectionne article → client redirigé)
- Tester le flow créneau complet (redirect automatique 3s)
