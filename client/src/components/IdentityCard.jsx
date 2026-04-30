import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from './Avatar'

export default function IdentityCard() {
  const { players, playerId, playerName, myMissionScore, myMissions } = useGame()
  const me = players.find((p) => p.id === playerId)
  const name = me?.name || playerName || '?'
  const role = me?.role
  const score = me?.score ?? 0
  const missionBonus = myMissionScore ?? 0

  // Détection d'une mission fraîchement complétée → pulse joyeux de l'avatar
  const prevRef = useRef([])
  const [celebrating, setCelebrating] = useState(false)
  useEffect(() => {
    const prev = prevRef.current
    const justCompleted = (myMissions || []).some((m) => {
      const previous = prev.find((p) => p.id === m.id)
      return m.completed && !previous?.completed
    })
    prevRef.current = myMissions || []
    if (justCompleted) {
      setCelebrating(true)
      const t = setTimeout(() => setCelebrating(false), 1600)
      return () => clearTimeout(t)
    }
  }, [myMissions])

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-2xl mb-5 w-full">
      <motion.div
        animate={
          celebrating
            ? { scale: [1, 1.25, 1.1, 1.2, 1], rotate: [0, -12, 12, -6, 0] }
            : {}
        }
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <Avatar src={me?.avatar} animated={!celebrating} className="w-11 h-11 text-3xl" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted uppercase tracking-widest">Identité</p>
        <p className="text-white font-bold text-base leading-tight truncate">{name}</p>
        {role && <p className="text-gold text-xs mt-0.5">{role}</p>}
      </div>
      <div className="text-right shrink-0 pl-2 border-l border-border">
        <p className="text-[10px] text-muted uppercase tracking-widest">Score</p>
        {me?.eliminated ? (
          <p className="text-crimson font-bold text-base leading-tight uppercase tracking-widest">Mort 💀</p>
        ) : (
          <div className="flex items-baseline gap-1.5 justify-end">
            {missionBonus > 0 && (
              <span
                className="text-[11px] font-semibold text-crimson-light/60"
                title="Points secrets des missions (visibles que par toi, comptés à la fin)"
              >
                +{missionBonus}
              </span>
            )}
            <p className="text-gold font-bold text-xl leading-tight">{score}</p>
          </div>
        )}
      </div>
    </div>
  )
}
