import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from './Avatar'

// Visuel + animation du perso selon l'outcome
function outcomeVisual(delta, action) {
  if (delta === null || delta === undefined) return null // inactive
  if (delta > 0) {
    if (action === 'trahir')  return { emoji: '😈', caption: 'Trahison réussie !', sub: 'Tu repars avec le butin…',    chest: '🏆', anim: 'evil-lean' }
    if (action === 'profiter') return { emoji: '😏', caption: 'Tu as profité !',    sub: 'Les poches bien remplies…',   chest: '💰', anim: 'profit-wink' }
    return                           { emoji: '😄', caption: 'Coopération réussie !', sub: 'Tout le monde y gagne !', chest: '🤝', anim: 'happy-bounce' }
  }
  return { emoji: '🤕', caption: 'Aïe !', sub: 'Tu repars avec des bleus…', chest: '😤', anim: 'hurt-shake' }
}

// Chaque outcome a sa gestuelle propre — en boucle avec pause pour rester visible
const OUTCOME_ANIMS = {
  // Lean maléfique : se penche encore et encore
  'evil-lean': {
    animate: { rotate: [0, -18, -12, -18, -14], scale: [1, 1.06, 1.03, 1.06, 1.04] },
    transition: { duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 },
  },
  // Profit : rotation malicieuse + pulse, loop
  'profit-wink': {
    animate: { rotate: [0, 14, -10, 8, -6, 0], scale: [1, 1.14, 1.05, 1.12, 1.06, 1.04] },
    transition: { duration: 1.3, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5 },
  },
  // Coopération : bounce de joie répété
  'happy-bounce': {
    animate: { y: [0, -30, -5, -25, 0], scale: [1, 1.1, 1, 1.08, 1], rotate: [0, -4, 4, -3, 0] },
    transition: { duration: 1.2, times: [0, 0.3, 0.55, 0.8, 1], ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 },
  },
  // Ratée : tremble + s'effondre, puis se redresse, puis retombe
  'hurt-shake': {
    animate: {
      x: [0, -12, 12, -10, 10, -4, 4, 0],
      rotate: [0, -8, 8, -5, 5, 2, -2, 12],
      y: [0, 3, 5, 7, 10, 13, 14, 16],
      opacity: [1, 0.9, 1, 0.9, 1, 0.85, 0.9, 0.95],
    },
    transition: { duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 },
  },
}

export default function BattleAnimation({ onDone }) {
  const { players, playerId, roundResults } = useGame()
  const [stage, setStage] = useState('gather') // gather → clash → reveal
  const myAvatar = players.find((p) => p.id === playerId)?.avatar

  useEffect(() => {
    // Timings : gather (1.2s) → clash (1.4s) → reveal (3.5s) → on passe au classement
    const t1 = setTimeout(() => setStage('clash'),  1200)
    const t2 = setTimeout(() => setStage('reveal'), 2600)
    const t3 = setTimeout(() => onDone(),           6100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const me = roundResults?.reveals?.find((r) => r.playerId === playerId)
  const outcome = me ? outcomeVisual(me.delta, me.action) : null

  // Seuls les joueurs qui ont joué ce tour (non-inactifs) entrent dans la mêlée
  const activeIds = new Set(
    (roundResults?.reveals || []).filter((r) => !r.inactive).map((r) => r.playerId)
  )
  const activePlayers = players.filter((p) => activeIds.has(p.id))

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
            {activePlayers.map((p, i) => {
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
                  <Avatar src={p.avatar} animated={false} className="w-16 h-16 text-5xl" />
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
              {activePlayers.map((p, i) => {
                const angle = (i / Math.max(1, activePlayers.length)) * 2 * Math.PI
                const r = 44
                const cx = Math.cos(angle) * r
                const cy = Math.sin(angle) * r
                return (
                  <motion.div
                    key={p.id}
                    animate={{
                      x: [cx, cx * 0.3, cx * 0.7, cx * 0.2],
                      y: [cy, cy * 0.3, cy * 0.7, cy * 0.2],
                      rotate: [0, 25, -20, 15],
                    }}
                    transition={{ duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: i * 0.1 }}
                    className="absolute"
                    style={{ left: '50%', top: '50%', marginLeft: '-20px', marginTop: '-20px' }}
                  >
                    <Avatar src={p.avatar} animated={false} className="w-10 h-10 text-4xl" />
                  </motion.div>
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
              <motion.div
                initial={{ rotate: 0, scale: 1, y: 0, x: 0 }}
                animate={OUTCOME_ANIMS[outcome.anim]?.animate}
                transition={{ ...(OUTCOME_ANIMS[outcome.anim]?.transition || {}), delay: 0.2 }}
                className="block"
              >
                <Avatar src={myAvatar} animated={false} className="w-36 h-36 text-8xl" />
              </motion.div>
              {/* Badge émotion en haut à droite */}
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="absolute -top-3 -right-3 text-5xl leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
              >
                {outcome.emoji}
              </motion.span>
              {/* Récompense/loot en bas à droite */}
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute -bottom-2 -right-2 text-4xl leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
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
            <div className="relative opacity-70">
              <Avatar src={myAvatar} className="w-32 h-32 text-7xl" />
              <motion.span
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="absolute -top-3 -right-3 text-5xl leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
              >
                😴
              </motion.span>
            </div>
            <p className="text-white font-bold text-xl">Tu regardes de loin…</p>
            <p className="text-muted text-sm">Les résultats arrivent.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
