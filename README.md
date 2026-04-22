# Le Jeu du Menteur

## Lancer le projet

### 1. Installer les dépendances

```bash
# Serveur
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Démarrer

**Terminal 1 — Serveur (port 3001)**
```bash
cd server && npm run dev
```

**Terminal 2 — Client (port 5173)**
```bash
cd client && npm run dev
```

Puis ouvre `http://localhost:5173` sur chaque appareil du même réseau local.

---

## Structure

```
jeu-du-menteur/
├── client/               # React + Vite + Tailwind + Framer Motion
│   └── src/
│       ├── App.jsx
│       ├── context/      # SocketContext, GameContext
│       ├── pages/        # LobbyPage, WaitingRoomPage, ChoicePage, VotingPage, ResultsPage, IntermissionPage, FinalPage
│       └── components/   # GameSocketBridge, MissionsDrawer
└── server/               # Express + Socket.io
    ├── index.js           # Gestion des rooms et événements Socket
    ├── GameRoom.js        # Logique du jeu (choix, résolutions, score)
    └── missions.js        # Pool de missions secrètes
```

## Phases du jeu

`lobby` → `waiting` → `choice` → `voting` → `results` → `intermission` (30min) → `choice` → ... → `final`
