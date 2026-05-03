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
import PactsLiveView from '../components/PactsLiveView'

// Construit la liste des actions avec payoffs adaptés (×2 à la dernière manche)
function buildActions(isFinalRound) {
  const x = (n) => (isFinalRound ? n * 2 : n)
  return [
    {
      id: 'profiter',
      label: 'Profiter',
      icon: '😏',
      desc: 'Tu joues seul. Gain garanti, sans surprise.',
      payoff: `+${x(25)}`,
      sub: 'garanti',
      idle: 'border-gold/40 bg-surface',
      active: 'border-gold-light bg-gold/20',
    },
    {
      id: 'cooperer',
      label: 'Coopérer',
      icon: '🤝',
      desc: 'Tu joues honnêtement avec tes partenaires.',
      payoff: `+${x(50)}`,
      sub: `si TOUT le pacte coopère. Si ≥ 2 trahissent, tu rafles leur butin (${x(75)} par traître).`,
      idle: 'border-teal/40 bg-surface',
      active: 'border-teal-light bg-teal/20',
    },
    {
      id: 'trahir',
      label: 'Trahir',
      icon: '🗡️',
      desc: 'Tu retournes contre tes partenaires. Risqué.',
      payoff: `+${x(75)} / −${x(75)}`,
      sub: `seul à trahir dans ton pacte, sinon −${x(75)} pour tous les traîtres`,
      idle: 'border-crimson/40 bg-surface',
      active: 'border-crimson-light bg-crimson/20',
    },
  ]
}

export default function ChoicePage() {
  const { players, playerId, round, totalRounds, isActive, myValidPartners, myMissions, spectator } = useGame()
  const { socket } = useSocket()

  const isFinalRound = totalRounds > 0 && round === totalRounds
  const ACTIONS = buildActions(isFinalRound)

  const [action, setAction] = useState(null)
  const [localSubmitted, setLocalSubmitted] = useState(false)
  // Reconnect : si le serveur sait que j'ai déjà voté, on respecte cet état
  const me = players.find((p) => p.id === playerId)
  const submitted = localSubmitted || !!me?.voted
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [whispersOpen, setWhispersOpen] = useState(false)
  const [scoreboardOpen, setScoreboardOpen] = useState(false)

  const validPartnerPlayers = players.filter((p) => myValidPartners?.includes(p.id))
  const completedMissions = myMissions.filter((m) => m.completed).length
  const hasPact = validPartnerPlayers.length > 0

  function pickAction(actionId) {
    setAction(actionId)
    // Broadcast la sélection en cours aux observateurs (morts + hors-pacte)
    socket.emit('player:choice_preview', { action: actionId })
  }

  function submit() {
    if (!action || !isActive) return
    socket.emit('player:choice', { action, mise: 0 })
    setLocalSubmitted(true)
  }

  const canSubmit = action && !submitted && isActive

  // Hors-jeu ce tour : aucun pacte mutuel formé. On en profite pour observer
  // les autres pactes en direct (mode spectateur vivant).
  if (!isActive) {
    return (
      <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
        <IdentityCard />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          className="text-center mb-5 p-4 rounded-2xl border-2 border-crimson/40 bg-crimson/10"
        >
          <p className="text-4xl mb-1">🤡</p>
          <h2 className="text-lg font-bold text-crimson-light tracking-wide">Pacte loupé</h2>
          <p className="text-white text-xs mt-1.5 opacity-80">
            Personne ne t'a choisi en retour. Choisis mieux la prochaine fois…
          </p>
        </motion.div>

        <p className="text-center text-muted text-[11px] uppercase tracking-widest mb-3">
          Manche {round} · Tu observes les pactes des autres
        </p>

        <div className="flex-1">
          <PactsLiveView spectator={spectator} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      {/* Identité */}
      <IdentityCard />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-muted text-xs uppercase tracking-widest">Manche {round} · Étape 2/2</p>
          <h2 className="text-2xl font-bold text-white leading-tight">Choisis ton action</h2>
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
          className="flex-1 flex flex-col items-center justify-center text-center gap-4"
        >
          <span className="text-6xl">⏳</span>
          <p className="text-white font-bold text-xl">Vote enregistré</p>
          <p className="text-muted">En attente des autres joueurs…</p>
        </motion.div>
      ) : (
        <>
          <div className="flex flex-col gap-5 flex-1 pb-28">

            {/* Équipe validée */}
            {validPartnerPlayers.length > 0 && (
              <section>
                <p className="text-xs text-muted uppercase tracking-widest mb-2">Ton équipe</p>
                <div className="flex gap-2 items-center flex-wrap">
                  {validPartnerPlayers.map((p) => {
                    const isOffline = p.online === false
                    return (
                      <div key={p.id} className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${
                        isOffline ? 'bg-crimson/10 border-crimson/30 opacity-60' : 'bg-teal/10 border-teal/30'
                      }`}>
                        <Avatar src={p.avatar} className="w-8 h-8 text-2xl" animated={!isOffline} />
                        <span className={`text-sm font-semibold ${isOffline ? 'text-crimson-light' : 'text-teal-light'}`}>
                          {p.name}
                          {isOffline && <span className="ml-1 text-xs">📡</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Action */}
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs text-muted uppercase tracking-widest">Ton action</p>
                {isFinalRound && (
                  <p className="text-[10px] font-bold text-crimson-light uppercase tracking-widest">
                    Dernière manche — gains ×2
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => pickAction(a.id)}
                    className={`w-full text-left px-4 py-4 rounded-2xl border-2 touch-manipulation transition-colors duration-150 min-h-[80px] ${
                      action === a.id ? a.active : a.idle
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl leading-none shrink-0">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-base leading-tight">{a.label}</p>
                          <span className={`text-base font-bold ${
                            a.id === 'trahir' ? 'text-crimson-light'
                            : a.id === 'cooperer' ? 'text-teal-light'
                            : 'text-gold-light'
                          }`}>{a.payoff}</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{a.sub}</p>
                        <p className="text-[11px] text-muted/80 mt-0.5 italic">{a.desc}</p>
                      </div>
                      {action === a.id && <span className="ml-auto text-lg shrink-0">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="fixed bottom-0 inset-x-0 px-4 pt-6 pb-4 safe-bottom bg-gradient-to-t from-noir via-noir to-noir/0 pointer-events-none z-30">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="btn-gold w-full min-h-[56px] rounded-2xl text-base font-bold disabled:opacity-30"
              >
                Valider mon action
              </button>
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
