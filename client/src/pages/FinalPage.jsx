import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import Avatar from '../components/Avatar'
import FinaleSequence from '../components/FinaleSequence'

export default function FinalPage() {
  const { players, playerId, reset, updateGame, finalScenes } = useGame()
  const { socket } = useSocket()
  const [revealIndex, setRevealIndex] = useState(-1)
  const [cinemaDone, setCinemaDone] = useState(false)
  const [replayPending, setReplayPending] = useState(false)

  // Hôte = premier joueur non-bot dans la liste (les bots ont été ajoutés en
  // remplissage, l'hôte est le premier humain)
  const isHost = players.find((p) => !p.isBot)?.id === playerId

  function backToMenu() {
    // Nettoie côté serveur si on est encore dans une vraie salle, puis revient au lobby.
    socket?.emit('room:leave', () => {})
    try {
      const cur = JSON.parse(localStorage.getItem('menteur:session') || '{}')
      localStorage.setItem('menteur:session', JSON.stringify({ token: cur.token }))
    } catch {}
    reset()
    updateGame({ phase: 'lobby' })
  }

  function replay() {
    if (replayPending) return
    setReplayPending(true)
    socket?.emit('room:replay', (res) => {
      if (res?.error) {
        setReplayPending(false)
      }
      // Au succès, le serveur broadcast game:state → tous les joueurs basculent
      // automatiquement sur WaitingRoomPage (phase === 'waiting')
    })
  }

  // Classement final : score public + missionScore (bonus des missions secrètes révélées ici)
  const withFinal = players.map((p) => ({
    ...p,
    finalScore: p.finalScore ?? (p.score + (p.missionScore ?? 0)),
  }))
  const sorted = [...withFinal].sort((a, b) => a.finalScore - b.finalScore) // du pire au meilleur

  useEffect(() => {
    if (!cinemaDone) return
    if (revealIndex >= sorted.length - 1) return
    const timeout = setTimeout(() => setRevealIndex((i) => i + 1), revealIndex === -1 ? 400 : 900)
    return () => clearTimeout(timeout)
  }, [revealIndex, sorted.length, cinemaDone])

  // Chaque joueur révélé porte son rang final (1 = gagnant, N = dernier).
  // On affiche du dernier (en bas) au gagnant (en haut), le nouveau arrive toujours en haut.
  const revealed = sorted
    .slice(0, revealIndex + 1)
    .map((p, i) => ({
      ...p,
      finalRank: sorted.length - i,             // 1 pour sorted[last], N pour sorted[0]
      isWinner: i === sorted.length - 1,
    }))
  const displayed = revealed.slice().reverse() // gagnant apparaît toujours au sommet
  const winner = revealIndex >= sorted.length - 1 ? sorted[sorted.length - 1] : null

  // Tant que le mini-film n'est pas terminé, on ne montre que la séquence.
  if (!cinemaDone) {
    return (
      <FinaleSequence
        sorted={sorted}
        sceneKinds={finalScenes}
        onComplete={() => setCinemaDone(true)}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-gold/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Révélation finale</h1>
          <p className="text-muted text-sm mt-1">Du dernier au premier…</p>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {displayed.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${
                  p.isWinner
                    ? 'border-gold bg-gold/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar src={p.avatar} className="w-12 h-12 text-3xl" />
                  {!p.isWinner && (
                    <span className="absolute -top-1 -right-1 text-sm">💀</span>
                  )}
                  {p.isWinner && (
                    <span className="absolute -top-1 -right-1 text-sm">👑</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${p.isWinner ? 'text-gold-light' : 'text-white'}`}>
                    {p.name}
                  </p>
                  {p.role && <p className="text-muted text-xs">{p.role}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-white">{p.finalScore} pts</p>
                  {(p.missionScore ?? 0) > 0 && (
                    <p className="text-crimson-light/70 text-[10px] leading-tight">
                      dont +{p.missionScore} missions
                    </p>
                  )}
                  <p className="text-muted text-xs">#{p.finalRank}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-6"
          >
            <p className="text-5xl mb-2">🏆</p>
            <p className="text-2xl font-bold text-gold-light">{winner.name} gagne !</p>
            <p className="text-muted text-sm mt-1">avec {winner.finalScore} points</p>
          </motion.div>
        )}

        {winner && isHost && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            onClick={replay}
            disabled={replayPending}
            className="w-full min-h-[52px] rounded-2xl bg-teal text-white font-bold text-base touch-manipulation mt-4 disabled:opacity-50"
          >
            {replayPending ? '⏳ Réinitialisation…' : '🔁 Rejouer (même salle)'}
          </motion.button>
        )}

        {winner && !isHost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="text-center text-muted text-xs italic mt-4"
          >
            L'hôte peut relancer une nouvelle partie dans cette salle…
          </motion.div>
        )}

        {winner && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            onClick={backToMenu}
            className="w-full min-h-[52px] rounded-2xl bg-gold text-noir font-bold text-base touch-manipulation mt-4"
          >
            Retour au menu principal
          </motion.button>
        )}
      </div>
    </div>
  )
}
