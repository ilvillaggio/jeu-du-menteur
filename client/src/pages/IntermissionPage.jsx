import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import MissionsDrawer from '../components/MissionsDrawer'
import WhispersDrawer from '../components/WhispersDrawer'
import Avatar from '../components/Avatar'

function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!endsAt) return
    const tick = () => setRemaining(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return remaining
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function IntermissionPage() {
  const { intermissionEndsAt, players, playerId, round, whispers } = useGame()
  const remaining = useCountdown(intermissionEndsAt)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [whispersOpen, setWhispersOpen] = useState(false)

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const unreadTotal = whispers.filter((w) => w.to === playerId && !w.read).length

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-lg mx-auto">
      {/* Timer */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted text-xs uppercase tracking-wide">Pause</p>
          <h2 className="text-white font-bold text-xl">Après la manche {round}</h2>
        </div>
        <div className="text-right">
          <p className="text-muted text-xs mb-1">Reprise dans</p>
          <p className="text-3xl font-mono font-bold text-gold">{fmt(remaining)}</p>
        </div>
      </div>

      {/* Score history chart (simple) */}
      <div className="card mb-4">
        <h3 className="text-xs text-muted uppercase tracking-wide mb-4">Classement actuel</h3>
        <div className="space-y-3">
          {sortedPlayers.map((p, i) => {
            const maxScore = sortedPlayers[0]?.score || 1
            return (
              <div key={p.id}>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted w-5">#{i + 1}</span>
                    <Avatar src={p.avatar} className="w-6 h-6 text-xl" />
                    <span className={p.id === playerId ? 'font-bold text-gold-light' : 'text-white'}>
                      {p.name}
                    </span>
                  </div>
                  <span className="font-bold text-white">{p.score}</span>
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${p.id === playerId ? 'bg-gold' : 'bg-border'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.score / maxScore) * 100}%` }}
                    transition={{ delay: i * 0.05, duration: 0.6 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bouton messagerie */}
      <button
        onClick={() => setWhispersOpen(true)}
        className="relative w-full card bg-surface/60 border-dashed active:bg-white/5 touch-manipulation mb-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl shrink-0">💬</span>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">Négocier en privé</p>
            <p className="text-muted text-xs mt-0.5">Envoie un message discret aux autres joueurs</p>
          </div>
          {unreadTotal > 0 && (
            <span className="shrink-0 bg-crimson text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center">
              {unreadTotal}
            </span>
          )}
        </div>
      </button>

      {/* Mission button */}
      <button
        onClick={() => setMissionsOpen(true)}
        className="mt-1 text-center text-muted text-xs hover:text-subtle transition-colors"
      >
        📜 Mes missions secrètes
      </button>

      <MissionsDrawer open={missionsOpen} onClose={() => setMissionsOpen(false)} />
      <WhispersDrawer open={whispersOpen} onClose={() => setWhispersOpen(false)} />
    </div>
  )
}
