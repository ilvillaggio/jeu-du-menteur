import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from '../components/Avatar'

// Affiché quand le joueur est mort (score < 0).
// Il observe la suite de la partie sans plus pouvoir agir.
export default function EliminatedPage() {
  const { players, playerId, round, totalRounds } = useGame()

  const me = players.find((p) => p.id === playerId)
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      {/* Bandeau "ÉLIMINÉ" — gros, dramatique */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        className="text-center mb-6 p-6 rounded-2xl border-2 border-crimson bg-crimson/15"
        style={{ boxShadow: '0 0 40px rgba(180,30,30,0.4)' }}
      >
        <p className="text-6xl mb-2">💀</p>
        <h1 className="text-3xl font-bold text-crimson-light tracking-widest uppercase">Éliminé</h1>
        <p className="text-white text-sm mt-2">
          Tu es passé sous les 0 points. Tu observes la suite de la partie.
        </p>
        {me && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-noir/60 rounded-full border border-crimson/40">
            <Avatar src={me.avatar} className="w-6 h-6 text-xl" animated={false} />
            <span className="text-crimson-light font-semibold text-sm">{me.name}</span>
            <span className="text-crimson font-mono text-sm">· {me.score} pts</span>
          </div>
        )}
      </motion.div>

      {/* Info round courant */}
      <p className="text-center text-muted text-xs uppercase tracking-widest mb-3">
        Manche {round} / {totalRounds || 5} en cours
      </p>

      {/* Classement */}
      <div className="card flex-1">
        <h3 className="text-xs text-muted uppercase tracking-widest mb-3">Classement actuel</h3>
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
              p.eliminated ? 'bg-crimson/5 border border-crimson/20 opacity-60' : 'bg-surface'
            }`}>
              <span className="text-muted text-xs w-5">#{i + 1}</span>
              <Avatar src={p.avatar} className="w-8 h-8 text-2xl" animated={false} />
              <span className={`flex-1 font-semibold text-sm ${
                p.id === playerId ? 'text-crimson-light' : 'text-white'
              }`}>
                {p.name}
                {p.eliminated && <span className="ml-2 text-crimson">💀</span>}
              </span>
              <span className="font-bold text-white tabular-nums">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
