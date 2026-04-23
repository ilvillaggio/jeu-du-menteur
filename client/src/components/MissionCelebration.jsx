import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../context/GameContext'

export default function MissionCelebration() {
  const { myMissions } = useGame()
  const prevRef = useRef([])
  const [celebrating, setCelebrating] = useState(null)

  useEffect(() => {
    const prev = prevRef.current
    const justCompleted = myMissions.find((m) => {
      const previousMission = prev.find((p) => p.id === m.id)
      return m.completed && !previousMission?.completed
    })
    prevRef.current = myMissions
    if (justCompleted) setCelebrating({ ...justCompleted, key: Date.now() })
  }, [myMissions])

  useEffect(() => {
    if (!celebrating) return
    const timer = setTimeout(() => setCelebrating(null), 3500)
    return () => clearTimeout(timer)
  }, [celebrating])

  return (
    <AnimatePresence>
      {celebrating && (
        <motion.div
          key={celebrating.key}
          initial={{ opacity: 0, y: -40, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
        >
          <div className="bg-card border-2 border-gold rounded-2xl px-5 py-3 shadow-2xl shadow-gold/20 max-w-[90vw]">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                🎉
              </motion.span>
              <div>
                <p className="text-gold font-bold text-sm">Mission accomplie !</p>
                <p className="text-white text-xs mt-0.5 max-w-[240px] leading-snug">
                  {celebrating.description}
                </p>
                <p className={`text-[10px] mt-1 font-semibold ${
                  celebrating.difficulty === 'hard' ? 'text-crimson-light' : 'text-gold'
                }`}>
                  {celebrating.difficulty === 'hard' ? '⚡ +35 pts' : '✦ +15 pts'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
