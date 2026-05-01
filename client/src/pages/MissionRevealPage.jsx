import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import IdentityCard from '../components/IdentityCard'

export default function MissionRevealPage() {
  const { myMissions, players, missionAckCount = 0 } = useGame()
  const { socket } = useSocket()
  const [acknowledged, setAcknowledged] = useState(false)

  const totalPlayers = players.length

  function acknowledge() {
    socket.emit('player:mission_acknowledged', () => setAcknowledged(true))
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      <IdentityCard />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <p className="text-muted text-xs uppercase tracking-widest mb-1">Début de partie</p>
        <h2 className="text-3xl font-bold text-white">Tes missions secrètes</h2>
        <p className="text-muted text-sm mt-2 leading-relaxed">
          Mémorise-les — personne d'autre ne peut les voir.<br />
          Accomplis-les discrètement pour gagner des points cachés
          qui s'ajouteront à ton score final.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 flex-1">
        {myMissions.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 30, rotateX: -20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.3 + i * 0.4, type: 'spring', stiffness: 180, damping: 20 }}
            className={`p-5 rounded-2xl border-2 ${
              m.difficulty === 'hard'
                ? 'border-crimson/50 bg-crimson/10'
                : 'border-gold/50 bg-gold/10'
            }`}
          >
            <p className={`text-xs uppercase tracking-widest mb-2 font-bold ${
              m.difficulty === 'hard' ? 'text-crimson-light' : 'text-gold'
            }`}>
              {m.difficulty === 'hard' ? '⚡ Difficile · +75 pts cachés' : '✦ Facile · +25 pts cachés'}
            </p>
            <p className="text-white font-semibold text-base leading-snug">{m.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6">
        {acknowledged ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 card"
          >
            <p className="text-teal-light font-bold text-lg">✓ Prêt</p>
            <p className="text-muted text-sm mt-1">
              En attente des autres joueurs… {missionAckCount}/{totalPlayers}
            </p>
          </motion.div>
        ) : (
          <button
            onClick={acknowledge}
            className="btn-gold w-full min-h-[56px] rounded-2xl text-base font-bold"
          >
            C'est parti ! →
          </button>
        )}
      </div>
    </div>
  )
}
