import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from '../components/Avatar'
import PactsLiveView from '../components/PactsLiveView'

// Affiché quand le joueur est mort. Vue plein écran qui change selon la phase :
//   - team_selection / intermission : classement (en attente des vivants)
//   - team_reveal / choice / voting : groupes par pacte avec encarts colorés
//     selon l'action choisie par chaque vivant (vert/or/rouge ou en attente)
//   - results : classement avec les gains/pertes de la manche
export default function EliminatedPage() {
  const { phase, players, playerId, spectator, roundResults, round, totalRounds } = useGame()
  const me = players.find((p) => p.id === playerId)

  const showPacts =
    phase === 'team_reveal' || phase === 'choice' || phase === 'voting'

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="text-center mb-5 p-5 rounded-2xl border-2 border-crimson bg-crimson/15"
        style={{ boxShadow: '0 0 32px rgba(180,30,30,0.35)' }}
      >
        <p className="text-5xl mb-1">💀</p>
        <h1 className="text-2xl font-bold text-crimson-light tracking-widest uppercase">Éliminé</h1>
        <p className="text-white text-xs mt-1.5 opacity-80">
          Tu observes les vivants — tu ne peux plus jouer.
        </p>
        {me && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-noir/60 rounded-full border border-crimson/40">
            <Avatar src={me.avatar} className="w-6 h-6 text-xl" animated={false} />
            <span className="text-crimson-light font-semibold text-sm">{me.name}</span>
            <span className="text-crimson font-mono text-xs uppercase tracking-widest">· Mort</span>
          </div>
        )}
      </motion.div>

      <p className="text-center text-muted text-[11px] uppercase tracking-widest mb-3">
        Manche {round} / {totalRounds || '?'} · {phaseLabel(phase)}
      </p>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {showPacts ? (
            <motion.div
              key="pacts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <PactsLiveView spectator={spectator} />
            </motion.div>
          ) : (
            <motion.div
              key="scoreboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <ScoreboardView
                players={players}
                playerId={playerId}
                deltas={phase === 'results' ? extractDeltas(roundResults) : null}
                waitingMessage={waitingMessageFor(phase)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ScoreboardView({ players, playerId, deltas, waitingMessage }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <>
      {waitingMessage && (
        <p className="text-center text-muted text-xs mb-3 italic">{waitingMessage}</p>
      )}

      <div className="card">
        <h3 className="text-xs text-muted uppercase tracking-widest mb-3">Classement</h3>
        <div className="space-y-2">
          {sorted.map((p, i) => {
            const delta = deltas?.[p.id]
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                  p.eliminated
                    ? 'bg-crimson/5 border border-crimson/20 opacity-60'
                    : 'bg-surface'
                }`}
              >
                <span className="text-muted text-xs w-5">#{i + 1}</span>
                <Avatar src={p.avatar} className="w-8 h-8 text-2xl" animated={!p.eliminated} />
                <span
                  className={`flex-1 font-semibold text-sm ${
                    p.id === playerId ? 'text-crimson-light' : 'text-white'
                  }`}
                >
                  {p.name}
                  {p.eliminated && <span className="ml-2 text-crimson">💀</span>}
                </span>
                {delta != null && delta !== 0 && (
                  <span className={`text-xs font-bold ${delta > 0 ? 'text-teal-light' : 'text-crimson-light'}`}>
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
                {p.eliminated ? (
                  <span className="font-bold text-crimson uppercase tracking-widest text-[10px]">Mort</span>
                ) : (
                  <span className="font-bold text-white tabular-nums">{p.score}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function extractDeltas(roundResults) {
  if (!roundResults?.reveals) return null
  const map = {}
  roundResults.reveals.forEach((r) => { map[r.playerId] = r.delta })
  return map
}

function phaseLabel(phase) {
  switch (phase) {
    case 'team_selection': return 'Sélection des équipes'
    case 'team_reveal':    return 'Révélation des pactes'
    case 'choice':         return "Choix d'action"
    case 'voting':         return 'Vote en cours'
    case 'results':        return 'Résultats'
    case 'intermission':   return 'Pause'
    default: return ''
  }
}

function waitingMessageFor(phase) {
  if (phase === 'team_selection') return 'Les vivants forment leurs pactes…'
  if (phase === 'intermission')   return 'En attente de la manche suivante…'
  return null
}
