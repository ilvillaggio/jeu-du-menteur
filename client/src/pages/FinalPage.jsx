import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

export default function FinalPage() {
  const { players } = useGame()
  const [revealIndex, setRevealIndex] = useState(-1)

  const sorted = [...players].sort((a, b) => a.score - b.score) // du pire au meilleur

  useEffect(() => {
    if (revealIndex >= sorted.length - 1) return
    const timeout = setTimeout(() => setRevealIndex((i) => i + 1), revealIndex === -1 ? 1000 : 2500)
    return () => clearTimeout(timeout)
  }, [revealIndex, sorted.length])

  const revealed = sorted.slice(0, revealIndex + 1)
  const winner = revealIndex >= sorted.length - 1 ? sorted[sorted.length - 1] : null

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
            {revealed.map((p, i) => {
              const rank = i + 1
              const isLast = rank === sorted.length
              const isEliminated = rank <= sorted.length - 1

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${
                    isLast
                      ? 'border-gold bg-gold/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="text-3xl relative">
                    {p.avatar || '🎭'}
                    {isEliminated && !isLast && (
                      <span className="absolute -top-1 -right-1 text-sm">💀</span>
                    )}
                    {isLast && <span className="absolute -top-1 -right-1 text-sm">👑</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${isLast ? 'text-gold-light' : 'text-white'}`}>
                      {p.name}
                    </p>
                    {p.role && <p className="text-muted text-xs">{p.role}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-white">{p.score} pts</p>
                    <p className="text-muted text-xs">
                      #{sorted.length - i}
                    </p>
                  </div>
                </motion.div>
              )
            })}
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
            <p className="text-muted text-sm mt-1">avec {winner.score} points</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
