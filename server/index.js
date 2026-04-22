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
  socket.on('room:create', ({ name, playerCount }, cb) => {
    let code
    do { code = generateCode() } while (rooms.has(code))

    const room = new GameRoom(code, playerCount, io)
    rooms.set(code, room)

    room.addPlayer(socket, name)
    socket.join(code)
    socket.data.roomCode = code

    cb({ roomCode: code, players: room.publicPlayers(), totalPlayers: room.playerCount })
  })

  // ─── Join room ───
  socket.on('room:join', ({ name, code }, cb) => {
    const room = rooms.get(code)
    if (!room) return cb({ error: 'Salle introuvable' })
    if (room.isFull()) return cb({ error: 'Salle pleine' })
    if (room.phase !== 'lobby' && room.phase !== 'waiting') return cb({ error: 'Partie déjà commencée' })

    room.addPlayer(socket, name)
    socket.join(code)
    socket.data.roomCode = code

    io.to(code).emit('game:state', room.stateForAll())
    cb({ roomCode: code, players: room.publicPlayers() })
  })

  // ─── Ready ───
  socket.on('player:ready', ({ ready }) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return
    room.setReady(socket.id, ready)
    io.to(room.code).emit('game:state', room.stateForAll())
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

  // ─── Update player count (host only) ───
  socket.on('room:update', ({ playerCount }, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    if (room.players[0]?.id !== socket.id) return cb({ error: 'Seul l\'hôte peut modifier' })
    if (playerCount < 2 || playerCount > 12) return cb({ error: 'Nombre invalide' })

    room.playerCount = playerCount
    io.to(room.code).emit('game:state', room.stateForAll())
    cb({ ok: true })
  })

  // ─── Start game ───
  socket.on('game:start', (cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room) return cb({ error: 'Salle introuvable' })
    if (room.players[0]?.id !== socket.id) return cb({ error: 'Seul l\'hôte peut lancer' })
    if (room.players.length < 1) return cb({ error: 'Pas assez de joueurs' })
    room.startGame()
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

  // ─── Disconnect ───
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`)
    const code = socket.data.roomCode
    const room = rooms.get(code)
    if (!room) return
    room.removePlayer(socket.id)
    if (room.isEmpty()) {
      rooms.delete(code)
    } else {
      io.to(code).emit('game:state', room.stateForAll())
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`))
