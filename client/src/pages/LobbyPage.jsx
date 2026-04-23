import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'

export default function LobbyPage() {
  const { socket } = useSocket()
  const { setPlayer, updateGame } = useGame()

  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [playerCount, setPlayerCount] = useState(6)
  const [mode, setMode] = useState('create') // create | join
  const [error, setError] = useState('')

  function handleCreate() {
    if (!name.trim()) return setError('Entre ton prénom')
    setPlayer(socket.id, name.trim())
    socket.emit('room:create', { name: name.trim(), playerCount }, (res) => {
      if (res.error) return setError(res.error)
      updateGame({ phase: 'waiting', players: res.players, roomCode: res.roomCode, totalPlayers: res.totalPlayers })
    })
  }

  function handleJoin() {
    if (!name.trim()) return setError('Entre ton prénom')
    if (!roomCode.trim()) return setError('Entre le code de la salle')
    setPlayer(socket.id, name.trim())
    socket.emit('room:join', { name: name.trim(), code: roomCode.trim().toUpperCase() }, (res) => {
      if (res.error) return setError(res.error)
      updateGame({ phase: 'waiting', players: res.players, roomCode: res.roomCode })
    })
  }

  function handleCreateTest() {
    if (!name.trim()) return setError('Entre ton prénom')
    setPlayer(socket.id, name.trim())
    socket.emit('room:create_test', { name: name.trim(), playerCount }, (res) => {
      if (res.error) return setError(res.error)
      updateGame({ phase: 'waiting', players: res.players, roomCode: res.roomCode, totalPlayers: res.totalPlayers })
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gold mb-2 tracking-tight">🐺</h1>
          <h1 className="text-4xl font-bold text-white mb-1">Le Jeu du Menteur</h1>
          <p className="text-muted text-sm">Trahis. Coopère. Survive.</p>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-6 bg-surface rounded-xl p-1 border border-border">
          {['create', 'join'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m ? 'bg-card text-white' : 'text-muted hover:text-subtle'
              }`}
            >
              {m === 'create' ? 'Créer une partie' : 'Rejoindre'}
            </button>
          ))}
        </div>

        <div className="card space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wide mb-1 block">Ton prénom</label>
            <input
              className="input"
              placeholder="Ex: Alice"
              value={name}
              maxLength={20}
              onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wide mb-1 block">
                Nombre de joueurs
              </label>
              <div className="flex gap-2">
                {[4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      playerCount === n
                        ? 'bg-gold text-noir border-gold'
                        : 'border-border text-muted hover:border-subtle'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wide mb-1 block">Code de la salle</label>
              <input
                className="input font-mono text-xl tracking-widest text-center uppercase"
                placeholder="XXXX"
                value={roomCode}
                maxLength={4}
                onChange={(e) => { setRoomCode(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
          )}

          {error && <p className="text-crimson-light text-sm text-center">{error}</p>}

          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            className="btn-gold w-full py-3 text-base mt-2"
          >
            {mode === 'create' ? 'Créer la partie' : 'Rejoindre'}
          </button>

          {mode === 'create' && (
            <button
              onClick={handleCreateTest}
              className="w-full py-2 text-sm text-muted hover:text-subtle border border-border rounded-lg transition-all"
            >
              🧪 Mode test solo (avec bots)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
