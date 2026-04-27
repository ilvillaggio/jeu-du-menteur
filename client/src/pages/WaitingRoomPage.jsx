import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import ShareRoomDrawer from '../components/ShareRoomDrawer'

export default function WaitingRoomPage() {
  const { players, roomCode, playerId, totalPlayers, totalRounds, reset, updateGame } = useGame()
  const { socket } = useSocket()

  const [editingCount, setEditingCount]   = useState(false)
  const [editingRounds, setEditingRounds] = useState(false)
  const [startError, setStartError] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const me = players.find((p) => p.id === playerId)
  const isHost = players[0]?.id === playerId
  const allReady = players.length > 0 && players.every((p) => p.ready)
  // Start as soon as host + everyone ready — no totalPlayers gate (host decides)
  const canStart = isHost && allReady && players.length >= 1

  function toggleReady() {
    socket.emit('player:ready', { ready: !me?.ready })
  }

  function startGame() {
    setStartError('')
    socket.emit('game:start', (res) => {
      if (res?.error) setStartError(res.error)
    })
  }

  function leaveRoom() {
    socket.emit('room:leave', () => {
      try {
        const cur = JSON.parse(localStorage.getItem('menteur:session') || '{}')
        localStorage.setItem('menteur:session', JSON.stringify({ token: cur.token }))
      } catch {}
      reset()
      updateGame({ phase: 'lobby' })
    })
  }

  function changeCount(n) {
    socket.emit('room:update', { playerCount: n })
    setEditingCount(false)
  }

  function changeRounds(n) {
    socket.emit('room:update', { totalRounds: n })
    setEditingRounds(false)
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">

      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-muted text-xs uppercase tracking-widest mb-1">Code de la salle</p>
        <button
          onClick={() => setShareOpen(true)}
          className="text-5xl font-mono font-bold text-gold tracking-widest hover:opacity-80 active:opacity-60 transition-opacity touch-manipulation"
          title="Partager le QR code"
        >
          {roomCode}
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="block mx-auto mt-1 text-xs text-gold-light/80 hover:text-gold underline touch-manipulation"
        >
          📱 Partager (QR code)
        </button>

        {/* Player count — tap to edit if host */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <p className="text-subtle text-sm">
            {players.length} / {totalPlayers || '?'} joueurs
          </p>
          {isHost && (
            <button
              onClick={() => setEditingCount((v) => !v)}
              className="text-xs text-gold underline touch-manipulation"
            >
              {editingCount ? 'Annuler' : 'Modifier'}
            </button>
          )}
        </div>

        {/* Count picker — stepper */}
        <AnimatePresence>
          {editingCount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3"
            >
              <p className="text-xs text-muted mb-2">Combien de joueurs ?</p>
              <div className="flex items-stretch gap-2 max-w-xs mx-auto">
                <button
                  onClick={() => changeCount(Math.max(2, (totalPlayers || 6) - 1))}
                  disabled={(totalPlayers || 6) <= 2}
                  className="w-14 rounded-xl border-2 border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >−</button>
                <div className="flex-1 flex items-center justify-center bg-gold/10 border-2 border-gold rounded-xl py-2 text-3xl font-bold text-gold-light tabular-nums">
                  {totalPlayers || 6}
                </div>
                <button
                  onClick={() => changeCount(Math.min(20, (totalPlayers || 6) + 1))}
                  disabled={(totalPlayers || 6) >= 20}
                  className="w-14 rounded-xl border-2 border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >+</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rounds info + edit */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="text-subtle text-sm">
            {totalRounds || 5} manches
          </p>
          {isHost && (
            <button
              onClick={() => setEditingRounds((v) => !v)}
              className="text-xs text-gold underline touch-manipulation"
            >
              {editingRounds ? 'Annuler' : 'Modifier'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {editingRounds && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3"
            >
              <p className="text-xs text-muted mb-2">Combien de manches ?</p>
              <div className="flex items-stretch gap-2 max-w-xs mx-auto">
                <button
                  onClick={() => changeRounds(Math.max(1, (totalRounds || 5) - 1))}
                  disabled={(totalRounds || 5) <= 1}
                  className="w-14 rounded-xl border-2 border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >−</button>
                <div className="flex-1 flex items-center justify-center bg-gold/10 border-2 border-gold rounded-xl py-2 text-3xl font-bold text-gold-light tabular-nums">
                  {totalRounds || 5}
                </div>
                <button
                  onClick={() => changeRounds(Math.min(20, (totalRounds || 5) + 1))}
                  disabled={(totalRounds || 5) >= 20}
                  className="w-14 rounded-xl border-2 border-border text-2xl font-bold text-white bg-surface active:bg-white/5 disabled:opacity-30 touch-manipulation"
                >+</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player list */}
      <div className="card flex-1 mb-4">
        <h3 className="text-xs text-muted uppercase tracking-widest mb-3">Joueurs connectés</h3>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between py-3 px-3 rounded-xl bg-surface min-h-[52px]"
            >
              <div className="flex items-center gap-3">
                <Avatar src={p.avatar} className="w-10 h-10 text-2xl" />
                <span className="font-semibold">{p.name}</span>
                {p.id === players[0]?.id && (
                  <span className="text-xs text-gold bg-gold/10 px-2 py-0.5 rounded-full">hôte</span>
                )}
              </div>
              <span className={`text-sm font-medium ${p.ready ? 'text-teal-light' : 'text-muted'}`}>
                {p.ready ? '✓ Prêt' : '…'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bouton de sélection d'avatar */}
      <button
        onClick={() => setAvatarOpen(true)}
        className="w-full card active:bg-white/5 touch-manipulation mb-4 flex items-center gap-3"
      >
        <Avatar src={me?.avatar} className="w-12 h-12 text-3xl" />
        <div className="flex-1 text-left">
          <p className="text-[10px] text-muted uppercase tracking-widest">Ton personnage</p>
          <p className="text-white font-semibold text-sm">
            {me?.avatar && me.avatar.startsWith('/') ? 'Change de perso' : 'Choisis ton perso'}
          </p>
        </div>
        <span className="text-muted">→</span>
      </button>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Start — host only when conditions met (placé AU-DESSUS du toggle prêt/annuler) */}
        <AnimatePresence>
          {canStart && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={startGame}
              className="w-full min-h-[52px] rounded-2xl bg-teal text-white font-bold text-base touch-manipulation"
            >
              Lancer la partie →
            </motion.button>
          )}
        </AnimatePresence>

        {/* Ready toggle */}
        <button
          onClick={toggleReady}
          className={`w-full min-h-[52px] rounded-2xl font-bold text-base touch-manipulation transition-colors ${
            me?.ready
              ? 'border-2 border-border text-subtle bg-surface'
              : 'bg-gold text-noir'
          }`}
        >
          {me?.ready ? 'Annuler' : 'Je suis prêt !'}
        </button>

        {/* Start hint when not all ready */}
        {isHost && !allReady && players.length >= 2 && (
          <p className="text-center text-muted text-xs">
            En attente que tout le monde soit prêt…
          </p>
        )}

        {startError && (
          <p className="text-crimson-light text-sm text-center">{startError}</p>
        )}

        {/* Leave */}
        <button
          onClick={leaveRoom}
          className="w-full min-h-[48px] rounded-2xl border border-border text-muted text-sm touch-manipulation active:bg-white/5"
        >
          Quitter la salle
        </button>
      </div>

      <AvatarPicker open={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <ShareRoomDrawer open={shareOpen} onClose={() => setShareOpen(false)} roomCode={roomCode} />
    </div>
  )
}
