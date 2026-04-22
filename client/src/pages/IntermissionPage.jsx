import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import MissionsDrawer from '../components/MissionsDrawer'

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
  const { intermissionEndsAt, scores, players, playerId, round } = useGame()
  const remaining = useCountdown(intermissionEndsAt)
  const [missionsOpen, setMissionsOpen] = useState(false)

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

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
                    <span className="text-xl">{p.avatar || '🎭'}</span>
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

      {/* Discrete message prompt */}
      <div className="card bg-surface/50 border-dashed">
        <p className="text-muted text-sm text-center">
          💬 Profite de cette pause pour négocier discrètement…
        </p>
      </div>

      {/* Mission button */}
      <button
        onClick={() => setMissionsOpen(true)}
        className="mt-4 text-center text-muted text-xs hover:text-subtle transition-colors"
      >
        📜 Mes missions secrètes
      </button>

      <MissionsDrawer open={missionsOpen} onClose={() => setMissionsOpen(false)} />
    </div>
  )
}
