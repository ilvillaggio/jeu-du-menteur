import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import BattleAnimation from '../components/BattleAnimation'

export default function ResultsPage() {
  const { roundResults, players, playerId, round } = useGame()
  const [battleDone, setBattleDone] = useState(false)

  if (!roundResults) return null

  // Show battle animation first
  if (!battleDone) return <BattleAnimation onDone={() => setBattleDone(true)} />

  // Map reveals by playerId for quick delta lookup
  const deltaMap = {}
  if (roundResults.reveals) {
    roundResults.reveals.forEach((r) => { deltaMap[r.playerId] = r.delta })
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">

      <div className="text-center mb-5">
        <p className="text-muted text-xs uppercase tracking-widest mb-1">Fin de la manche {round}</p>
        <h2 className="text-3xl font-bold text-white">Résultats</h2>
        <p className="text-muted text-sm mt-1">À vous de deviner ce que chacun a fait…</p>
      </div>

      {/* Scoreboard with delta — no action revealed */}
      <div className="card">
        <h3 className="text-xs text-muted uppercase tracking-widest mb-3">Classement</h3>
        <div className="flex flex-col gap-2">
          {sortedPlayers.map((p, i) => {
            const delta = deltaMap[p.id] ?? 0
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.2 }}
                className={`flex items-center gap-3 py-3 px-3 rounded-xl min-h-[52px] ${
                  p.id === playerId ? 'bg-gold/10 border border-gold/30' : 'bg-surface'
                }`}
              >
                <span className="text-muted text-sm font-mono w-6 text-center shrink-0">#{i + 1}</span>
                <span className="text-2xl leading-none shrink-0">{p.avatar || '🎭'}</span>
                <span className="font-semibold flex-1 truncate">{p.name}</span>
                {delta !== 0 && (
                  <span className={`text-sm font-semibold shrink-0 ${delta > 0 ? 'text-teal-light' : 'text-crimson-light'}`}>
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
                <span className="font-bold text-gold-light text-base shrink-0 w-16 text-right">{p.score} pts</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      <p className="text-center text-muted text-sm mt-6">
        Prochaine manche dans un instant…
      </p>
    </div>
  )
}
