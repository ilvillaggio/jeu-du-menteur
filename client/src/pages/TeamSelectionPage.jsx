import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import IdentityCard from '../components/IdentityCard'
import MissionsDrawer from '../components/MissionsDrawer'
import WhispersDrawer from '../components/WhispersDrawer'
import MessagesIconButton from '../components/MessagesIconButton'
import ScoreboardDrawer from '../components/ScoreboardDrawer'
import Avatar from '../components/Avatar'

export default function TeamSelectionPage() {
  const { players, playerId, round, teamVotesCount, totalPlayers, myMissions } = useGame()
  const { socket } = useSocket()

  const [selected, setSelected] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [whispersOpen, setWhispersOpen] = useState(false)
  const [scoreboardOpen, setScoreboardOpen] = useState(false)

  // On ne propose que les joueurs vivants (pas d'éliminés comme partenaires)
  const others = players.filter((p) => p.id !== playerId && !p.eliminated)
  const completedMissions = myMissions.filter((m) => m.completed).length

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    )
  }

  function submit() {
    if (selected.length < 1 || selected.length > 2 || submitted) return
    socket.emit('player:team_choice', selected, () => setSubmitted(true))
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      {/* Identity */}
      <IdentityCard />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-muted text-xs uppercase tracking-widest">Manche {round} · Étape 1/2</p>
          <h2 className="text-2xl font-bold text-white leading-tight">Choisis ton équipe</h2>
          <p className="text-muted text-xs mt-1">1 partenaire = pacte à 2 · 2 partenaires = pacte à 3</p>
        </div>
        <div className="flex items-center gap-1">
          <MessagesIconButton onClick={() => setWhispersOpen(true)} />
          <button
            onClick={() => setScoreboardOpen(true)}
            aria-label="Classement"
            className="w-12 h-12 flex items-center justify-center text-2xl opacity-40 active:opacity-100 touch-manipulation rounded-xl"
          >🏆</button>
          <button
            onClick={() => setMissionsOpen(true)}
            className={`relative w-12 h-12 flex items-center justify-center text-2xl touch-manipulation rounded-xl transition-opacity ${
              completedMissions > 0 ? 'opacity-100' : 'opacity-40 active:opacity-100'
            }`}
          >
            📜
            {completedMissions > 0 && (
              <span className="absolute -top-1 -right-1 bg-teal text-noir text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border border-card">
                {completedMissions}
              </span>
            )}
          </button>
        </div>
      </div>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center gap-5"
        >
          <span className="text-5xl">⏳</span>
          <p className="text-white font-bold text-xl">Équipe soumise</p>
          <div className="card w-full">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">Équipes reçues</span>
              <span className="font-bold text-white">{teamVotesCount} / {totalPlayers}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gold rounded-full"
                animate={{ width: `${totalPlayers > 0 ? (teamVotesCount / totalPlayers) * 100 : 0}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            {/* Avatars */}
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              {players.map((p) => (
                <div key={p.id} className={`flex flex-col items-center gap-1 transition-opacity ${p.teamSubmitted ? 'opacity-100' : 'opacity-25'}`}>
                  <Avatar src={p.avatar} className="w-9 h-9 text-2xl" />
                  <span className="text-xs text-muted">{p.name}</span>
                  {p.teamSubmitted && <span className="text-teal-light text-xs">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="flex flex-col gap-4 flex-1 pb-28">
            <p className="text-xs text-muted uppercase tracking-widest">
              Sélectionne 1 ou 2 partenaires{' '}
              <span className="text-white font-bold">
                ({selected.length === 1 ? 'pacte à 2' : selected.length === 2 ? 'pacte à 3' : 'aucun'})
              </span>
            </p>

            <div className="flex flex-col gap-2">
              {others.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 touch-manipulation transition-colors min-h-[68px] ${
                    selected.includes(p.id)
                      ? 'border-gold bg-gold/10 text-white'
                      : 'border-border bg-surface text-muted'
                  }`}
                >
                  <Avatar src={p.avatar} className="w-12 h-12 text-3xl" />
                  <span className="font-bold text-base flex-1 text-left">{p.name}</span>
                  {selected.includes(p.id) && (
                    <span className="text-gold text-xl">✓</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 inset-x-0 px-4 pt-6 pb-4 safe-bottom bg-gradient-to-t from-noir via-noir to-noir/0 pointer-events-none z-30">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <button
                onClick={submit}
                disabled={selected.length < 1}
                className="btn-gold w-full min-h-[56px] rounded-2xl text-base font-bold disabled:opacity-30"
              >
                {selected.length === 1
                  ? 'Valider — pacte à 2'
                  : selected.length === 2
                  ? 'Valider — pacte à 3'
                  : 'Valider mon équipe'}
              </button>
              {selected.length === 0 && (
                <p className="text-center text-muted text-xs mt-2">
                  Choisis 1 partenaire (pacte à 2) ou 2 partenaires (pacte à 3)
                </p>
              )}
              {selected.length === 2 && (
                <p className="text-center text-muted text-xs mt-2">
                  Pacte à 3 valide uniquement si vos 3 choix matchent.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <MissionsDrawer open={missionsOpen} onClose={() => setMissionsOpen(false)} />
      <WhispersDrawer open={whispersOpen} onClose={() => setWhispersOpen(false)} />
      <ScoreboardDrawer open={scoreboardOpen} onClose={() => setScoreboardOpen(false)} />
    </div>
  )
}
