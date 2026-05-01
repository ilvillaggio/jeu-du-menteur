import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import BattleAnimation from '../components/BattleAnimation'
import Avatar from '../components/Avatar'

export default function ResultsPage() {
  const { roundResults, players, playerId, round, resultsAckCount = 0 } = useGame()
  const { socket } = useSocket()
  const [battleDone, setBattleDone] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  // Reset à chaque nouvelle manche
  useEffect(() => {
    setBattleDone(false)
    setAcknowledged(false)
  }, [roundResults?.round])

  if (!roundResults) {
    // Fallback (reconnect en plein milieu de la phase results) — pas d'écran noir
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className="text-5xl animate-pulse">⏳</div>
        <p className="text-white font-bold">Chargement des résultats…</p>
        <p className="text-muted text-sm">La manche suivante arrive.</p>
      </div>
    )
  }

  // Si le joueur était hors-jeu cette manche (aucun pacte mutuel) ou déjà mort,
  // pas d'animation de bagarre — il n'a "rien fait", donc on saute direct au
  // classement.
  const myReveal = roundResults.reveals?.find((r) => r.playerId === playerId)
  const skipBattle = !!(myReveal?.inactive || myReveal?.eliminated)

  if (!skipBattle && !battleDone) return <BattleAnimation onDone={() => setBattleDone(true)} />

  const deltaMap = {}
  if (roundResults.reveals) {
    roundResults.reveals.forEach((r) => { deltaMap[r.playerId] = r.delta })
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const totalPlayers = players.length

  function acknowledge() {
    socket.emit('player:results_acknowledged', () => setAcknowledged(true))
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">

      <div className="text-center mb-5">
        <p className="text-muted text-xs uppercase tracking-widest mb-1">Fin de la manche {round}</p>
        <h2 className="text-3xl font-bold text-white">Résultats</h2>
        <p className="text-muted text-sm mt-1">À vous de deviner ce que chacun a fait…</p>
      </div>

      {/* Scoreboard avec delta — pas d'action révélée */}
      <div className="card flex-1 pb-28">
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
                  p.eliminated
                    ? 'bg-crimson/5 border border-crimson/20 opacity-70'
                    : p.id === playerId ? 'bg-gold/10 border border-gold/30' : 'bg-surface'
                }`}
              >
                <span className="text-muted text-sm font-mono w-6 text-center shrink-0">#{i + 1}</span>
                <Avatar src={p.avatar} className="w-8 h-8 text-2xl" animated={!p.eliminated} />
                <span className="font-semibold flex-1 truncate">
                  {p.name}
                  {p.eliminated && <span className="ml-1.5 text-crimson">💀</span>}
                </span>
                {!p.eliminated && delta !== 0 && (
                  <span className={`text-sm font-semibold shrink-0 ${delta > 0 ? 'text-teal-light' : 'text-crimson-light'}`}>
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
                {p.eliminated ? (
                  <span className="font-bold text-crimson uppercase tracking-widest text-xs shrink-0 w-16 text-right">Mort</span>
                ) : (
                  <span className="font-bold text-gold-light text-base shrink-0 w-16 text-right">{p.score} pts</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Bouton Continuer — sticky en bas */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-6 pb-4 safe-bottom bg-gradient-to-t from-noir via-noir to-noir/0 pointer-events-none z-30">
        <div className="max-w-lg mx-auto pointer-events-auto">
          {acknowledged ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center card"
            >
              <p className="text-teal-light font-bold">✓ Prêt</p>
              <p className="text-muted text-sm mt-1">
                En attente des autres…{' '}
                <span className="text-white font-bold">{resultsAckCount}</span>
                {' / '}
                <span>{totalPlayers}</span>
              </p>
            </motion.div>
          ) : (
            <button
              onClick={acknowledge}
              className="btn-gold w-full min-h-[56px] rounded-2xl text-base font-bold"
            >
              Continuer ({resultsAckCount}/{totalPlayers}) →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
