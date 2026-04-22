import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useSocket } from '../context/SocketContext'
import IdentityCard from '../components/IdentityCard'
import MissionsDrawer from '../components/MissionsDrawer'

const ACTIONS = [
  {
    id: 'cooperer',
    label: 'Coopérer',
    icon: '🤝',
    desc: 'Tu joues honnêtement avec tes partenaires.',
    idle: 'border-teal/40 bg-surface',
    active: 'border-teal-light bg-teal/20',
  },
  {
    id: 'profiter',
    label: 'Profiter',
    icon: '😏',
    desc: 'Tu prends plus que ta part sans tout trahir.',
    idle: 'border-gold/40 bg-surface',
    active: 'border-gold-light bg-gold/20',
  },
  {
    id: 'trahir',
    label: 'Trahir',
    icon: '🗡️',
    desc: 'Tu retournes contre tes partenaires. Risqué.',
    idle: 'border-crimson/40 bg-surface',
    active: 'border-crimson-light bg-crimson/20',
  },
]

const MISES = [10, 20, 30, 50]

export default function ChoicePage() {
  const { players, playerId, round, isActive, myValidPartners } = useGame()
  const { socket } = useSocket()

  const [action, setAction] = useState(null)
  const [mise, setMise] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [missionsOpen, setMissionsOpen] = useState(false)

  const validPartnerPlayers = players.filter((p) => myValidPartners?.includes(p.id))

  function submit() {
    if (!action || !mise || !isActive) return
    socket.emit('player:choice', { action, mise })
    setSubmitted(true)
  }

  const canSubmit = action && mise && !submitted && isActive

  // Hors-jeu ce tour
  if (!isActive) {
    return (
      <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
        <IdentityCard />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <span className="text-5xl">😶</span>
          <p className="text-white font-bold text-xl">Tu passes cette manche</p>
          <p className="text-muted">Aucun pacte mutuel — en attente des résultats.</p>
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
        <button
          onClick={() => setMissionsOpen(true)}
          className="w-12 h-12 flex items-center justify-center text-2xl opacity-40 active:opacity-100 touch-manipulation rounded-xl"
        >📜</button>
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
        <div className="flex flex-col gap-5 flex-1">

          {/* Équipe validée */}
          {validPartnerPlayers.length > 0 && (
            <section>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Ton équipe</p>
              <div className="flex gap-2">
                {validPartnerPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-teal/10 border border-teal/30 rounded-xl">
                    <span className="text-2xl leading-none">{p.avatar || '🎭'}</span>
                    <span className="text-sm font-semibold text-teal-light">{p.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Action */}
          <section>
            <p className="text-xs text-muted uppercase tracking-widest mb-3">Ton action</p>
            <div className="flex flex-col gap-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAction(a.id)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border-2 touch-manipulation transition-colors duration-150 min-h-[68px] ${
                    action === a.id ? a.active : a.idle
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{a.icon}</span>
                    <div>
                      <p className="font-bold text-white text-base leading-tight">{a.label}</p>
                      <p className="text-xs text-muted mt-0.5">{a.desc}</p>
                    </div>
                    {action === a.id && <span className="ml-auto text-lg">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Mise */}
          <section>
            <p className="text-xs text-muted uppercase tracking-widest mb-3">Mise (points)</p>
            <div className="grid grid-cols-4 gap-2">
              {MISES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMise(m)}
                  className={`py-4 rounded-2xl border-2 font-bold text-lg touch-manipulation transition-colors min-h-[56px] ${
                    mise === m
                      ? 'border-gold bg-gold/10 text-gold-light'
                      : 'border-border bg-surface text-muted'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="btn-gold w-full min-h-[56px] rounded-2xl text-base font-bold mt-auto disabled:opacity-30"
          >
            Valider mon action
          </button>
        </div>
      )}

      <MissionsDrawer open={missionsOpen} onClose={() => setMissionsOpen(false)} />
    </div>
  )
}
