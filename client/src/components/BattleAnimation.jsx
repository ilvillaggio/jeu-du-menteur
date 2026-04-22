import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

// What the player's own avatar shows based on outcome
function outcomeVisual(delta, action) {
  if (delta === null || delta === undefined) return null // inactive
  if (delta > 0) {
    if (action === 'trahir')  return { emoji: '😈', caption: 'Trahison réussie !', sub: 'Tu repars avec le butin…',    chest: '🏆' }
    if (action === 'profiter') return { emoji: '😏', caption: 'Tu as profité !',    sub: 'Les poches bien remplies…',   chest: '💰' }
    return                           { emoji: '😄', caption: 'Coopération réussie !', sub: 'Tout le monde y gagne !', chest: '🤝' }
  }
  return { emoji: '🤕', caption: 'Aïe !', sub: 'Tu repars avec des bleus…', chest: '😤' }
}

export default function BattleAnimation({ onDone }) {
  const { players, playerId, roundResults } = useGame()
  const [stage, setStage] = useState('gather') // gather → clash → reveal

  useEffect(() => {
    const t1 = setTimeout(() => setStage('clash'),  1200)
    const t2 = setTimeout(() => setStage('reveal'), 2600)
    const t3 = setTimeout(() => onDone(),           4400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const me = roundResults?.reveals?.find((r) => r.playerId === playerId)
  const outcome = me ? outcomeVisual(me.delta, me.action) : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-noir overflow-hidden">

      {/* Stage: gather — avatars fly in from edges */}
      <AnimatePresence>
        {stage === 'gather' && (
          <motion.div
            key="gather"
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap justify-center gap-4 max-w-xs"
          >
            {players.map((p, i) => {
              const fromX = (i % 2 === 0 ? -1 : 1) * (80 + i * 15)
              const fromY = (i < 2 ? -1 : 1) * 80
              return (
                <motion.div
                  key={p.id}
                  initial={{ x: fromX, y: fromY, opacity: 0, scale: 0.6 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 220, damping: 18 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-5xl leading-none">{p.avatar || '🎭'}</span>
                  <span className="text-xs text-muted">{p.name}</span>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: clash — chaos / fight */}
      <AnimatePresence>
        {stage === 'clash' && (
          <motion.div
            key="clash"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.15, 0.9, 1.1, 1], opacity: 1 }}
            exit={{ scale: 2, opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.9, times: [0, 0.25, 0.5, 0.75, 1] }}
            className="text-center"
          >
            <div className="relative flex items-center justify-center w-40 h-40">
              {players.map((p, i) => {
                const angle = (i / players.length) * 2 * Math.PI
                const r = 44
                const cx = Math.cos(angle) * r
                const cy = Math.sin(angle) * r
                return (
                  <motion.span
                    key={p.id}
                    animate={{
                      x: [cx, cx * 0.3, cx * 0.7, cx * 0.2],
                      y: [cy, cy * 0.3, cy * 0.7, cy * 0.2],
                      rotate: [0, 25, -20, 15],
                    }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: i * 0.1 }}
                    className="absolute text-4xl leading-none"
                    style={{ left: '50%', top: '50%', marginLeft: '-0.6em', marginTop: '-0.6em' }}
                  >
                    {p.avatar || '🎭'}
                  </motion.span>
                )
              })}
            </div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-3xl mt-2"
            >⚔️💥⚔️</motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: reveal — player's avatar emerges with result */}
      <AnimatePresence>
        {stage === 'reveal' && outcome && (
          <motion.div
            key="reveal"
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex flex-col items-center gap-4 text-center px-6"
          >
            <div className="relative">
              <motion.span
                animate={{ rotate: [0, -8, 8, -4, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-8xl leading-none block"
              >
                {outcome.emoji}
              </motion.span>
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="absolute -bottom-2 -right-2 text-4xl leading-none"
              >
                {outcome.chest}
              </motion.span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-2xl font-bold text-white">{outcome.caption}</p>
              <p className="text-muted text-sm mt-1">{outcome.sub}</p>
              {me?.delta !== 0 && (
                <p className={`text-3xl font-bold mt-2 ${me.delta > 0 ? 'text-teal-light' : 'text-crimson-light'}`}>
                  {me.delta > 0 ? '+' : ''}{me.delta} pts
                </p>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Inactive player reveal */}
        {stage === 'reveal' && !outcome && (
          <motion.div
            key="reveal-inactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <span className="text-7xl">😴</span>
            <p className="text-white font-bold text-xl">Tu regardes de loin…</p>
            <p className="text-muted text-sm">Les résultats arrivent.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
