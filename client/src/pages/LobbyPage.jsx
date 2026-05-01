import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'
import { getOrCreateToken, saveSession } from '../lib/session'
import TutorialPage from './TutorialPage'

// Lit le code de salle depuis l'URL si présent (?room=ABCD).
function getRoomFromUrl() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  const code = (params.get('room') || '').trim().toUpperCase().slice(0, 4)
  return /^[A-Z0-9]{4}$/.test(code) ? code : ''
}

export default function LobbyPage() {
  const { socket } = useSocket()
  const { setPlayer, updateGame } = useGame()
  const token = getOrCreateToken()
  const presetRoom = getRoomFromUrl()

  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState(presetRoom)
  const [playerCount, setPlayerCount] = useState(6)
  const [roundsCount, setRoundsCount] = useState(5)
  const [mode, setMode] = useState(presetRoom ? 'join' : 'create')
  const [error, setError] = useState('')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const isDev = import.meta.env.DEV

  // Si l'URL contient un code, on bascule en mode "rejoindre" et on nettoie l'URL
  useEffect(() => {
    if (presetRoom && typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [presetRoom])

  function handleCreate() {
    if (!name.trim()) return setError('Entre ton prénom')
    setPlayer(socket.id, name.trim())
    socket.emit('room:create', { name: name.trim(), playerCount, totalRounds: roundsCount, token }, (res) => {
      if (res.error) return setError(res.error)
      saveSession({ roomCode: res.roomCode, playerName: name.trim() })
      updateGame({ phase: 'waiting', players: res.players, roomCode: res.roomCode, totalPlayers: res.totalPlayers, totalRounds: res.totalRounds })
    })
  }

  function handleJoin() {
    if (!name.trim()) return setError('Entre ton prénom')
    if (!roomCode.trim()) return setError('Entre le code de la salle')
    setPlayer(socket.id, name.trim())
    socket.emit('room:join', { name: name.trim(), code: roomCode.trim().toUpperCase(), token }, (res) => {
      if (res.error) return setError(res.error)
      saveSession({ roomCode: res.roomCode, playerName: name.trim() })
      updateGame({ phase: 'waiting', players: res.players, roomCode: res.roomCode })
    })
  }

  function handleCreateTest() {
    if (!name.trim()) return setError('Entre ton prénom')
    setPlayer(socket.id, name.trim())
    socket.emit('room:create_test', { name: name.trim(), playerCount, totalRounds: roundsCount, token }, (res) => {
      if (res.error) return setError(res.error)
      saveSession({ roomCode: res.roomCode, playerName: name.trim() })
      updateGame({ phase: 'waiting', players: res.players, roomCode: res.roomCode, totalPlayers: res.totalPlayers, totalRounds: res.totalRounds })
    })
  }

  function handlePreviewFinale() {
    // Raccourci pour voir directement le mini-film final (dev/test)
    // 11 joueurs = 10 actes = 10 scènes différentes (tirées au sort dans les 16 dispo)
    const fake = [
      { id: 'f01', name: 'Alice',    avatar: '/avatars/selected/CS_02_Red_Raddy.svg',       score: 1,  finalScore: 1  },
      { id: 'f02', name: 'Bruno',    avatar: '/avatars/selected/CS_17_White_Wenda.svg',     score: 3,  finalScore: 3  },
      { id: 'f03', name: 'Camille',  avatar: '/avatars/selected/CS_18_Pink_Pinki.svg',      score: 5,  finalScore: 5  },
      { id: 'f04', name: 'Dimitri',  avatar: '/avatars/selected/CS_20_Black_Black.svg',     score: 7,  finalScore: 7  },
      { id: 'f05', name: 'Elsa',     avatar: '/avatars/selected/CS_14_Yellow_Simon.svg',    score: 9,  finalScore: 9  },
      { id: 'f06', name: 'François', avatar: '/avatars/selected/P3_09_Lime_OWAKCX.svg',     score: 11, finalScore: 11 },
      { id: 'f07', name: 'Gabrielle',avatar: '/avatars/selected/P3_10_Sky_blue_Sky.svg',    score: 13, finalScore: 13 },
      { id: 'f08', name: 'Henri',    avatar: '/avatars/selected/P3_06_Gray_Gray.svg',       score: 15, finalScore: 15 },
      { id: 'f09', name: 'Iris',     avatar: '/avatars/selected/P3_17_White_Wenda.svg',     score: 17, finalScore: 17 },
      { id: 'f10', name: 'Julien',   avatar: '/avatars/selected/CS_15_Tan_Tunner.svg',      score: 19, finalScore: 19 },
      { id: 'f11', name: 'Karine',   avatar: '/avatars/selected/P3_18_Pink_Pinki.svg',      score: 22, finalScore: 22 },
    ]
    setPlayer('f01', 'Alice')
    updateGame({ phase: 'final', players: fake, roomCode: 'TEST', totalPlayers: fake.length })
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
              <div className="flex items-stretch gap-2">
                <button
                  onClick={() => setPlayerCount((n) => Math.max(2, n - 1))}
                  disabled={playerCount <= 2}
                  className="w-14 rounded-lg border border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >−</button>
                <div className="flex-1 flex items-center justify-center bg-gold/10 border-2 border-gold rounded-lg py-2 text-3xl font-bold text-gold-light tabular-nums">
                  {playerCount}
                </div>
                <button
                  onClick={() => setPlayerCount((n) => Math.min(20, n + 1))}
                  disabled={playerCount >= 20}
                  className="w-14 rounded-lg border border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >+</button>
              </div>
              <p className="text-[10px] text-muted text-center mt-1">2 à 20 joueurs (les places vides sont remplies par des bots)</p>
            </div>
          )}

          {mode === 'create' && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wide mb-1 block">
                Nombre de manches
              </label>
              <div className="flex items-stretch gap-2">
                <button
                  onClick={() => setRoundsCount((n) => Math.max(1, n - 1))}
                  disabled={roundsCount <= 1}
                  className="w-14 rounded-lg border border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >−</button>
                <div className="flex-1 flex items-center justify-center bg-gold/10 border-2 border-gold rounded-lg py-2 text-3xl font-bold text-gold-light tabular-nums">
                  {roundsCount}
                </div>
                <button
                  onClick={() => setRoundsCount((n) => Math.min(20, n + 1))}
                  disabled={roundsCount >= 20}
                  className="w-14 rounded-lg border border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >+</button>
              </div>
              <p className="text-[10px] text-muted text-center mt-1">1 à 20 manches (la dernière manche compte double)</p>
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

          {mode === 'create' && isDev && (
            <button
              onClick={handleCreateTest}
              className="w-full py-2 text-sm text-muted hover:text-subtle border border-border rounded-lg transition-all"
            >
              🧪 Mode test solo (avec bots)
            </button>
          )}

          {mode === 'create' && (
            <button
              onClick={() => setTutorialOpen(true)}
              className="w-full py-2 text-sm text-teal-light/80 hover:text-teal-light border border-teal/30 rounded-lg transition-all"
            >
              📖 Comment jouer ?
            </button>
          )}

          {mode === 'create' && isDev && (
            <button
              onClick={handlePreviewFinale}
              className="w-full py-2 text-sm text-gold-light/80 hover:text-gold border border-gold/30 rounded-lg transition-all"
            >
              🎬 Prévisualiser le film final
            </button>
          )}
        </div>
      </motion.div>

      {tutorialOpen && <TutorialPage onClose={() => setTutorialOpen(false)} />}
    </div>
  )
}
