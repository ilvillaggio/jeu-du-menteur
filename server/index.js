const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const GameRoom = require('./GameRoom')

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

const rooms = new Map() // roomCode -> GameRoom

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`)

  // ─── Create room ───
  socket.on('room:create', ({ name, playerCount, totalRounds, token }, cb) => {
    let code
    do { code = generateCode() } while (rooms.has(code))

    const room = new GameRoom(code, playerCount, io, false, totalRounds)
    rooms.set(code, room)

    room.addPlayer(socket, name, token)
    socket.join(code)
    socket.data.roomCode = code

    cb({ roomCode: code, players: room.publicPlayers(), totalPlayers: room.playerCount, totalRounds: room.totalRounds })
  })

  // ─── Create test room (solo avec bots) ───
  socket.on('room:create_test', ({ name, playerCount, totalRounds, token }, cb) => {
    let code
    do { code = generateCode() } while (rooms.has(code))

    const room = new GameRoom(code, playerCount, io, true /* testMode */, totalRounds)
    rooms.set(code, room)

    room.addPlayer(socket, name, token)
    socket.join(code)
    socket.data.roomCode = code

    // Remplit la salle avec des bots pour atteindre playerCount
    while (room.players.length < playerCount) {
      room.addBot()
    }

    cb({ roomCode: code, players: room.publicPlayers(), totalPlayers: room.playerCount, totalRounds: room.totalRounds })
  })

  // ─── Join room ───
  socket.on('room:join', ({ name, code, token }, cb) => {
    const room = rooms.get(code)
    if (!room) return cb({ error: 'Salle introuvable' })
    if (room.isFull()) return cb({ error: 'Salle pleine' })
    if (room.phase !== 'lobby' && room.phase !== 'waiting') return cb({ error: 'Partie déjà commencée' })

    room.addPlayer(socket, name, token)
    socket.join(code)
    socket.data.roomCode = code

    io.to(code).emit('game:state', room.stateForAll())
    cb({ roomCode: code, players: room.publicPlayers() })
  })

  // ─── Reconnect (après refresh page) ───
  socket.on('room:reconnect', ({ code, token }, cb = () => {}) => {
    const room = rooms.get(code)
    if (!room) return cb({ error: 'Salle introuvable' })
    const res = room.reconnectPlayer(socket, token)
    if (res.error) return cb({ error: res.error })

    socket.join(code)
    socket.data.roomCode = code
    socket.data.playerId = socket.id

    // Renvoie l'état complet personnalisé au joueur reconnecté
    const fullState = {
      ...room.stateForAll(),
      myMissions: res.player.missions,
      myMissionScore: res.player.missionScore,
      myHistory: room._historyForPlayer(res.player),
      playerId: socket.id,
    }
    cb({ ok: true, roomCode: code, state: fullState })
  })

  // ─── Ready ───
  socket.on('player:ready', ({ ready }) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return
    room.setReady(socket.id, ready)
    io.to(room.code).emit('game:state', room.stateForAll())
  })

  // ─── Set avatar ───
  socket.on('player:set_avatar', ({ avatar }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    const res = room.setAvatar(socket.id, avatar)
    if (res?.error) return cb(res)
    io.to(room.code).emit('game:state', room.stateForAll())
    cb({ ok: true })
  })

  // ─── Leave room ───
  socket.on('room:leave', (cb = () => {}) => {
    const code = socket.data.roomCode
    const room = rooms.get(code)
    if (!room) return cb({ ok: true })

    room.removePlayer(socket.id)
    socket.leave(code)
    socket.data.roomCode = null

    if (room.isEmpty()) {
      rooms.delete(code)
    } else {
      // Broadcast updated state to remaining players
      io.to(code).emit('game:state', room.stateForAll())
    }
    cb({ ok: true })
  })

  // ─── Update player count / rounds (host only) ───
  socket.on('room:update', ({ playerCount, totalRounds }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    if (room.players[0]?.id !== socket.id) return cb({ error: 'Seul l\'hôte peut modifier' })

    if (playerCount !== undefined) {
      if (playerCount < 2 || playerCount > 20) return cb({ error: 'Nombre de joueurs invalide' })
      room.playerCount = playerCount
    }
    if (totalRounds !== undefined) {
      if (totalRounds < 1 || totalRounds > 20) return cb({ error: 'Nombre de manches invalide' })
      room.totalRounds = totalRounds
    }

    io.to(room.code).emit('game:state', room.stateForAll())
    cb({ ok: true })
  })

  // ─── Start game ───
  socket.on('game:start', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    if (room.players[0]?.id !== socket.id) return cb({ error: 'Seul l\'hôte peut lancer' })
    if (room.players.length < 1) return cb({ error: 'Pas assez de joueurs' })

    // Auto-fill avec des bots pour atteindre playerCount
    while (room.players.length < room.playerCount) {
      room.addBot()
    }
    // Notifier les joueurs de la mise à jour avant le start
    io.to(room.code).emit('game:state', room.stateForAll())

    room.startGame()
    cb({ ok: true })
  })

  // ─── Mission acknowledged (début de partie) ───
  socket.on('player:mission_acknowledged', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    room.acknowledgeMission(socket.id)
    cb({ ok: true })
  })

  // ─── Results acknowledged (fin de manche, passage à la suite) ───
  socket.on('player:results_acknowledged', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    room.acknowledgeResults(socket.id)
    cb({ ok: true })
  })

  // ─── Intermission acknowledged (clic "Continuer la partie") ───
  socket.on('player:intermission_acknowledged', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    room.acknowledgeIntermission(socket.id)
    cb({ ok: true })
  })

  // ─── Team choice ───
  socket.on('player:team_choice', (partners, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    room.registerTeamChoice(socket.id, partners)
    cb({ ok: true })
  })

  // ─── Player choice ───
  socket.on('player:choice', (choice) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return
    room.registerChoice(socket.id, choice)
  })

  // ─── Preview de l'action (sélection avant validation) ───
  socket.on('player:choice_preview', ({ action }) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return
    room.registerChoicePreview(socket.id, action)
  })

  // ─── Pact chat : message à tous les membres du pacte mutuel ───
  socket.on('pact:send', ({ text }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })

    const sender = room.players.find((p) => p.id === socket.id)
    if (!sender) return cb({ error: 'Non autorisé' })

    const partners = room.validTeams.get(socket.id) || []
    if (partners.length === 0) return cb({ error: 'Pas de pacte actif' })

    const trimmed = (text || '').toString().trim().slice(0, 300)
    if (!trimmed) return cb({ error: 'Message vide' })

    const msg = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      from: sender.id,
      fromName: sender.name,
      fromAvatar: sender.avatar,
      text: trimmed,
      at: Date.now(),
    }

    // Diffuse aux membres humains du pacte (l'envoyeur inclus, pour synchro)
    const recipients = [socket.id, ...partners]
    recipients.forEach((rid) => {
      const r = room.players.find((p) => p.id === rid)
      if (r && !r.isBot) io.to(rid).emit('pact:received', msg)
    })

    cb({ ok: true, message: msg })
  })

  // ─── Whisper (message privé entre joueurs) ───
  socket.on('whisper:send', ({ to, text }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })

    const sender = room.players.find((p) => p.id === socket.id)
    const recipient = room.players.find((p) => p.id === to)
    if (!sender) return cb({ error: 'Non autorisé' })
    if (!recipient) return cb({ error: 'Destinataire introuvable' })

    const trimmed = (text || '').toString().trim().slice(0, 300)
    if (!trimmed) return cb({ error: 'Message vide' })

    const whisper = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      from: sender.id,
      fromName: sender.name,
      to: recipient.id,
      toName: recipient.name,
      text: trimmed,
      at: Date.now(),
    }

    // Transmission au destinataire (les bots n'ont pas de socket, ignoré)
    if (!recipient.isBot) {
      io.to(recipient.id).emit('whisper:received', whisper)
    }

    cb({ ok: true, whisper })
  })

  // ─── Disconnect ───
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`)
    const code = socket.data.roomCode
    const room = rooms.get(code)
    if (!room) return

    const inLobby = room.phase === 'waiting' || room.phase === 'lobby'

    if (inLobby) {
      // Avant que la partie ne commence : on retire vraiment le joueur
      room.removePlayer(socket.id)
      if (room.isEmpty()) {
        rooms.delete(code)
      } else {
        io.to(code).emit('game:state', room.stateForAll())
      }
    } else {
      // Pendant la partie : on garde le joueur (il pourra se reconnecter
      // via son token). On le marque juste comme déconnecté.
      const p = room.players.find((x) => x.id === socket.id)
      if (p) {
        p.online = false
        io.to(code).emit('game:state', room.stateForAll())

        // Au cas où plus personne d'humain ne soit en ligne, on supprime la salle
        // après 10 minutes d'inactivité totale.
        const anyHumanOnline = room.players.some((x) => !x.isBot && x.online !== false)
        if (!anyHumanOnline) {
          if (room._cleanupTimer) clearTimeout(room._cleanupTimer)
          room._cleanupTimer = setTimeout(() => {
            const stillEmpty = !room.players.some((x) => !x.isBot && x.online !== false)
            if (stillEmpty) rooms.delete(code)
          }, 10 * 60 * 1000)
        }
      }
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
