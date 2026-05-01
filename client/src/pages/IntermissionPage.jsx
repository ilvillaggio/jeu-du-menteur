import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import MissionsDrawer from '../components/MissionsDrawer'
import WhispersDrawer from '../components/WhispersDrawer'
import Avatar from '../components/Avatar'

export default function IntermissionPage() {
  const { players, playerId, round, totalRounds, whispers, intermissionAckCount, totalPlayers } = useGame()
  const { socket } = useSocket()
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [whispersOpen, setWhispersOpen] = useState(false)
  const [acked, setAcked] = useState(false)

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const unreadTotal = whispers.filter((w) => w.to === playerId && !w.read).length
  const ackCount = intermissionAckCount ?? 0
  const total = totalPlayers ?? players.length
  // La prochaine manche est-elle la dernière ?
  const isBeforeFinalRound = round + 1 === (totalRounds || 5)

  function continuer() {
    if (acked) return
    setAcked(true)
    socket.emit('player:intermission_acknowledged', () => {})
  }

  return (
    <div className="min-h-screen flex flex-col p-6 pb-32 max-w-lg mx-auto relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted text-xs uppercase tracking-wide">Pause</p>
          <h2 className="text-white font-bold text-xl">Après la manche {round}</h2>
        </div>
        <div className="text-right">
          <p className="text-muted text-xs mb-1">Joueurs prêts</p>
          <p className="text-2xl font-mono font-bold text-gold">{ackCount} / {total}</p>
        </div>
      </div>

      {/* Bandeau "DERNIÈRE MANCHE" — uniquement avant la manche finale */}
      {isBeforeFinalRound && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="mb-4 p-4 rounded-2xl border-2 border-crimson bg-crimson/15 text-center"
          style={{ boxShadow: '0 0 24px rgba(180,30,30,0.3)' }}
        >
          <p className="text-3xl mb-1">⚠️</p>
          <h3 className="text-2xl font-bold text-crimson-light tracking-wider uppercase">
            Dernière manche
          </h3>
          <p className="text-white font-semibold text-sm mt-1">
            Tous les gains et pertes sont <span className="text-crimson-light font-bold">DOUBLÉS</span>
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted">
            <span className="px-2 py-1 bg-gold/10 border border-gold/30 rounded text-gold-light">Profiter +50</span>
            <span className="px-2 py-1 bg-teal/10 border border-teal/30 rounded text-teal-light">Coopérer +100</span>
            <span className="px-2 py-1 bg-crimson/10 border border-crimson/30 rounded text-crimson-light">Trahir ±150</span>
          </div>
        </motion.div>
      )}

      {/* Score history chart (simple) */}
      <div className="card mb-4">
        <h3 className="text-xs text-muted uppercase tracking-wide mb-4">Classement actuel</h3>
        <div className="space-y-3">
          {sortedPlayers.map((p, i) => {
            const maxScore = sortedPlayers[0]?.score || 1
            return (
              <div key={p.id} className={p.eliminated ? 'opacity-60' : ''}>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted w-5">#{i + 1}</span>
                    <Avatar src={p.avatar} className="w-6 h-6 text-xl" animated={!p.eliminated} />
                    <span className={p.id === playerId ? 'font-bold text-gold-light' : 'text-white'}>
                      {p.name}
                      {p.eliminated && <span className="ml-1.5 text-crimson">💀</span>}
                      {!p.eliminated && p.online === false && <span className="ml-1.5 text-crimson-light/70 text-xs">📡</span>}
                    </span>
                  </div>
                  {p.eliminated ? (
                    <span className="font-bold text-crimson uppercase tracking-widest text-xs">Mort</span>
                  ) : (
                    <span className="font-bold text-white">{p.score}</span>
                  )}
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      p.eliminated ? 'bg-crimson/40' : p.id === playerId ? 'bg-gold' : 'bg-border'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.eliminated ? 0 : (p.score / maxScore) * 100}%` }}
                    transition={{ delay: i * 0.05, duration: 0.6 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bouton messagerie */}
      <button
        onClick={() => setWhispersOpen(true)}
        className="relative w-full card bg-surface/60 border-dashed active:bg-white/5 touch-manipulation mb-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl shrink-0">💬</span>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">Négocier en privé</p>
            <p className="text-muted text-xs mt-0.5">Envoie un message discret aux autres joueurs</p>
          </div>
          {unreadTotal > 0 && (
            <span className="shrink-0 bg-crimson text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-1.5 flex items-center justify-center">
              {unreadTotal}
            </span>
          )}
        </div>
      </button>

      {/* Mission button */}
      <button
        onClick={() => setMissionsOpen(true)}
        className="mt-1 text-center text-muted text-xs hover:text-subtle transition-colors"
      >
        📜 Mes missions secrètes
      </button>

      {/* Bouton continuer fixé en bas */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-6 pb-4 safe-bottom bg-gradient-to-t from-noir via-noir to-noir/0 pointer-events-none z-30">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button
            onClick={continuer}
            disabled={acked}
            className={`w-full min-h-[56px] rounded-2xl text-base font-bold transition-all ${
              acked
                ? 'bg-surface text-muted border-2 border-border cursor-default'
                : 'bg-gold text-noir active:scale-95'
            }`}
          >
            {acked
              ? `En attente des autres… (${ackCount} / ${total})`
              : 'Continuer la partie →'}
          </button>
          <p className="text-center text-muted text-xs mt-2">
            La manche suivante démarre quand tout le monde a cliqué
          </p>
        </div>
      </div>

      <MissionsDrawer open={missionsOpen} onClose={() => setMissionsOpen(false)} />
      <WhispersDrawer open={whispersOpen} onClose={() => setWhispersOpen(false)} />
    </div>
  )
}
