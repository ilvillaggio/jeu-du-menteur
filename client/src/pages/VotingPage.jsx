import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from '../components/Avatar'

export default function VotingPage() {
  const { votesCount, totalPlayers, players, round } = useGame()
  const pct = totalPlayers > 0 ? (votesCount / totalPlayers) * 100 : 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-bottom">
      <div className="w-full max-w-sm flex flex-col gap-8 text-center">

        {/* Title */}
        <div>
          <p className="text-muted text-xs uppercase tracking-widest mb-1">Manche {round}</p>
          <h2 className="text-3xl font-bold text-white">Votes en cours</h2>
        </div>

        {/* Big counter */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-7xl font-bold text-gold leading-none tabular-nums">
            {votesCount}
          </p>
          <p className="text-muted text-lg">
            sur <span className="text-white font-semibold">{totalPlayers}</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Player avatars */}
        <div className="card">
          <div className="flex flex-wrap gap-3 justify-center">
            {players.map((p) => {
              const isOffline = p.online === false
              return (
                <motion.div
                  key={p.id}
                  animate={
                    p.voted
                      ? { opacity: isOffline ? 0.6 : 1, scale: 1, x: 0, rotate: 0 }
                      : { opacity: isOffline ? 0.3 : 0.5, scale: 0.9, x: [0, -1.5, 1.5, -1, 1, 0], rotate: [0, -1, 1, -0.5, 0.5, 0] }
                  }
                  transition={
                    p.voted
                      ? { duration: 0.2 }
                      : { duration: 0.4, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }
                  }
                  className="flex flex-col items-center gap-1 w-14 relative"
                >
                  <Avatar src={p.avatar} animated={p.voted && !isOffline} className="w-12 h-12 text-3xl" />
                  {isOffline && (
                    <span className="absolute -top-1 -right-1 text-sm bg-crimson rounded-full w-5 h-5 flex items-center justify-center" title="Hors ligne">📡</span>
                  )}
                  <span className="text-xs text-muted truncate w-full text-center">{p.name}</span>
                  <span className={`text-xs font-bold ${p.voted ? 'text-teal-light' : 'text-transparent'}`}>✓</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        <p className="text-muted text-sm">En attente des autres joueurs…</p>
      </div>
    </div>
  )
}
