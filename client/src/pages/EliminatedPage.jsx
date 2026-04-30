import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from '../components/Avatar'

// Affiché quand le joueur est mort. Vue plein écran qui change selon la phase :
//   - team_selection / intermission : classement simple (en attente des vivants)
//   - team_reveal / choice / voting : groupes par pacte, encarts colorés selon
//     l'action choisie par chaque vivant (coopère/profite/trahit/en attente)
//   - results : classement avec les gains/pertes de la manche
export default function EliminatedPage() {
  const { phase, players, playerId, spectator, roundResults, round, totalRounds } = useGame()
  const me = players.find((p) => p.id === playerId)

  // Pendant les phases où les pactes sont en jeu, on affiche les coulisses.
  const showPacts =
    phase === 'team_reveal' || phase === 'choice' || phase === 'voting'

  return (
    <div className="min-h-screen flex flex-col px-4 pt-5 pb-6 safe-bottom max-w-lg mx-auto w-full">
      {/* Header permanent : "ÉLIMINÉ" — animation au montage uniquement */}
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

      {/* Indicateur phase courante */}
      <p className="text-center text-muted text-[11px] uppercase tracking-widest mb-3">
        Manche {round} / {totalRounds || 5} · {phaseLabel(phase)}
      </p>

      {/* Vue dynamique selon phase */}
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
              <PactsView spectator={spectator} />
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

// ═══════════════════════════════════════════════════════════════════════════
// Vue "groupes par pacte" — affichée pendant team_reveal / choice / voting.
// Chaque membre a son encart coloré selon l'action qu'il a choisie.
// ═══════════════════════════════════════════════════════════════════════════
function PactsView({ spectator }) {
  const data = spectator || { pacts: [], solos: [], actions: {} }
  const hasPacts = data.pacts && data.pacts.length > 0

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-teal-light mb-1">
        Pactes en cours {hasPacts && `(${data.pacts.length})`}
      </h3>

      {hasPacts ? (
        data.pacts.map((pact, i) => (
          <div
            key={i}
            className={`rounded-2xl border-2 p-3 ${
              pact.length === 3 ? 'border-gold/40 bg-gold/5' : 'border-teal/40 bg-teal/5'
            }`}
          >
            <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
              {pact.length === 3 ? 'Pacte à 3' : 'Pacte à 2'}
            </p>
            <div className="space-y-2">
              {pact.map((m) => (
                <PlayerCard
                  key={m.id}
                  member={m}
                  action={data.actions?.[m.id]}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-muted text-sm py-4">
          Aucun pacte formé cette manche.
        </p>
      )}

      {data.solos && data.solos.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
            Hors pacte ({data.solos.length})
          </p>
          <div className="space-y-2">
            {data.solos.map((s) => (
              <PlayerCard key={s.id} member={s} action={null} solo />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Encart d'un joueur, coloré selon l'action qu'il a votée
function PlayerCard({ member, action, solo }) {
  const cfg = ACTION_CONFIG[action] || (solo ? SOLO_CONFIG : PENDING_CONFIG)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 ${cfg.cls}`}
    >
      <Avatar src={member.avatar} className="w-8 h-8 text-xl" animated={false} />
      <span className="font-semibold text-white text-sm flex-1 truncate">{member.name}</span>
      {action ? (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.icon} {cfg.txt}
        </span>
      ) : solo ? (
        <span className="text-[10px] text-muted italic">Hors pacte</span>
      ) : (
        <span className="text-[10px] text-muted italic">en attente…</span>
      )}
    </motion.div>
  )
}

const ACTION_CONFIG = {
  cooperer: {
    cls: 'border-teal/60 bg-teal/15',
    badge: 'bg-teal/30 text-teal-light',
    icon: '🤝', txt: 'Coopère',
  },
  profiter: {
    cls: 'border-gold/60 bg-gold/15',
    badge: 'bg-gold/30 text-gold-light',
    icon: '😏', txt: 'Profite',
  },
  trahir: {
    cls: 'border-crimson/60 bg-crimson/15',
    badge: 'bg-crimson/30 text-crimson-light',
    icon: '🗡️', txt: 'Trahit',
  },
}
const PENDING_CONFIG = { cls: 'border-border bg-surface' }
const SOLO_CONFIG    = { cls: 'border-border bg-surface/60' }

// ═══════════════════════════════════════════════════════════════════════════
// Vue "classement" — affichée pendant team_selection / intermission / results
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
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
