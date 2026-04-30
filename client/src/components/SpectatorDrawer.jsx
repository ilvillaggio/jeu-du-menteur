import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from './Avatar'

const ACTION_LABEL = {
  cooperer: { txt: 'Coopère', cls: 'bg-teal/20 border-teal/40 text-teal-light', icon: '🤝' },
  profiter: { txt: 'Profite', cls: 'bg-gold/20 border-gold/40 text-gold-light',  icon: '😏' },
  trahir:   { txt: 'Trahit',  cls: 'bg-crimson/20 border-crimson/40 text-crimson-light', icon: '🗡️' },
}

// Drawer accessible uniquement aux joueurs éliminés.
// Affiche les pactes en cours + les actions votées en direct (les "coulisses").
export default function SpectatorDrawer({ open, onClose }) {
  const { spectator, players } = useGame()
  const data = spectator || { pacts: [], solos: [], teamPicks: {}, actions: {}, phase: null, round: 0 }

  const findName = (id) => players.find((p) => p.id === id)?.name || '?'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-noir/85 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 flex flex-col bg-card border-t border-crimson/40 rounded-t-3xl"
            style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-crimson/50 rounded-full" />
            </div>

            <div className="px-6 pb-3 shrink-0 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👁️</span>
                <h3 className="text-lg font-bold text-white">Coulisses</h3>
                <span className="ml-auto text-xs text-muted">
                  Manche {data.round} · {phaseLabel(data.phase)}
                </span>
              </div>
              <p className="text-muted text-xs mt-0.5">
                Tu vois ce que les autres joueurs trament. Eux ne le savent pas.
              </p>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-3 space-y-4">
              {/* Pactes formés */}
              {data.pacts && data.pacts.length > 0 ? (
                <section>
                  <h4 className="text-xs uppercase tracking-widest text-teal-light mb-2">
                    Pactes en cours ({data.pacts.length})
                  </h4>
                  <div className="space-y-2">
                    {data.pacts.map((pact, i) => (
                      <div key={i} className={`rounded-xl border-2 p-3 ${
                        pact.length === 3 ? 'border-gold/40 bg-gold/5' : 'border-teal/40 bg-teal/5'
                      }`}>
                        <p className="text-[10px] text-muted uppercase tracking-widest mb-1.5">
                          {pact.length === 3 ? 'Pacte à 3' : 'Pacte à 2'}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {pact.map((m) => {
                            const action = data.actions?.[m.id]
                            const label = action ? ACTION_LABEL[action] : null
                            return (
                              <div key={m.id} className="flex items-center gap-2">
                                <Avatar src={m.avatar} className="w-6 h-6 text-base" animated={false} />
                                <span className="text-sm font-semibold text-white flex-1">{m.name}</span>
                                {label ? (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${label.cls}`}>
                                    {label.icon} {label.txt}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted italic">en attente…</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <p className="text-center text-muted text-sm pt-4">
                  Aucun pacte formé pour l'instant.
                </p>
              )}

              {/* Solos (joueurs vivants sans pacte) */}
              {data.solos && data.solos.length > 0 && (
                <section>
                  <h4 className="text-xs uppercase tracking-widest text-muted mb-2">
                    Hors pacte ({data.solos.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.solos.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded-full">
                        <Avatar src={s.avatar} className="w-5 h-5 text-base" animated={false} />
                        <span className="text-xs text-muted">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Choix d'équipe en cours (phase team_selection) */}
              {data.phase === 'team_selection' && data.teamPicks && Object.keys(data.teamPicks).length > 0 && (
                <section>
                  <h4 className="text-xs uppercase tracking-widest text-gold-light mb-2">
                    Choix soumis (équipe)
                  </h4>
                  <div className="space-y-1 text-xs">
                    {Object.entries(data.teamPicks).map(([pid, picks]) => (
                      <div key={pid} className="flex items-center gap-1 text-muted">
                        <span className="text-white font-semibold">{findName(pid)}</span>
                        <span>→</span>
                        {picks.length === 0 ? (
                          <span className="italic">aucun</span>
                        ) : (
                          <span>{picks.map(findName).join(' + ')}</span>
                        )}
                        <span className="ml-auto text-[10px]">
                          {picks.length === 1 ? '(pacte 2)' : picks.length === 2 ? '(pacte 3)' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="px-6 pt-2 pb-1 shrink-0">
              <button onClick={onClose} className="btn-ghost w-full rounded-2xl min-h-[48px]">
                Fermer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function phaseLabel(phase) {
  switch (phase) {
    case 'team_selection': return "Sélection d'équipe"
    case 'team_reveal':    return 'Révélation des pactes'
    case 'choice':         return "Choix d'action"
    case 'voting':         return 'Vote en cours'
    case 'results':        return 'Résultats'
    case 'intermission':   return 'Pause'
    default: return ''
  }
}
