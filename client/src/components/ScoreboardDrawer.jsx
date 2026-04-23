import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import Avatar from './Avatar'

function summarize(entry) {
  const partnerNames = entry.validPartners.map((p) => p.name).join(' et ')
  const chosenNames = entry.chosen.map((p) => p.name).join(' et ')

  // Inactif ce tour (aucun pacte mutuel)
  if (entry.action === null) {
    if (entry.chosen.length > 0) {
      return {
        icon: '🤡',
        title: `Pacte loupé avec ${chosenNames}`,
        sub: 'Personne ne t\'a choisi en retour',
        tone: 'crimson',
      }
    }
    return {
      icon: '😴',
      title: 'Tu as passé ce tour',
      sub: 'Pas de pacte',
      tone: 'muted',
    }
  }

  if (entry.action === 'cooperer') {
    const success = entry.delta > 0
    return {
      icon: success ? '🤝' : '🥀',
      title: success
        ? `Coopération réussie avec ${partnerNames}`
        : `Coopération loupée avec ${partnerNames}`,
      sub: success ? 'Tout le monde a joué le jeu' : 'Quelqu\'un t\'a trompé',
      tone: success ? 'teal' : 'crimson',
    }
  }
  if (entry.action === 'profiter') {
    return {
      icon: '😏',
      title: `Tu as profité avec ${partnerNames}`,
      sub: 'Toujours rentable',
      tone: 'gold',
    }
  }
  if (entry.action === 'trahir') {
    const success = entry.delta > 0
    return {
      icon: success ? '🗡️' : '⚔️',
      title: success
        ? `Trahison réussie contre ${partnerNames}`
        : `Trahison loupée contre ${partnerNames}`,
      sub: success ? 'Tu as pris leurs parts' : 'Quelqu\'un d\'autre a aussi trahi',
      tone: success ? 'teal' : 'crimson',
    }
  }
  return { icon: '🎲', title: 'Manche', sub: '', tone: 'muted' }
}

const TONE_CLASSES = {
  teal:    'border-teal/30 bg-teal/10',
  gold:    'border-gold/30 bg-gold/10',
  crimson: 'border-crimson/30 bg-crimson/10',
  muted:   'border-border bg-surface',
}
const TONE_DELTA = {
  teal:    'text-teal-light',
  gold:    'text-gold',
  crimson: 'text-crimson-light',
  muted:   'text-muted',
}

export default function ScoreboardDrawer({ open, onClose }) {
  const { players, playerId, round, myHistory } = useGame()
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const maxScore = Math.max(1, Math.abs(sorted[0]?.score || 0), Math.abs(sorted[sorted.length - 1]?.score || 0))
  const history = [...(myHistory || [])].reverse() // plus récent en haut

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-noir/80 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 flex flex-col bg-card border-t border-border rounded-t-3xl"
            style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-6 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-white">Classement</h3>
              <p className="text-muted text-xs mt-0.5">
                {round > 0 ? `Manche ${round} · scores publics` : 'Scores publics'}
              </p>
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 px-6 pb-2">
              {/* Classement public */}
              <div className="space-y-3">
                {sorted.map((p, i) => (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted w-5 shrink-0 text-center">#{i + 1}</span>
                        <Avatar src={p.avatar} className="w-6 h-6 text-xl" />
                        <span className={`truncate ${p.id === playerId ? 'font-bold text-gold-light' : 'text-white'}`}>
                          {p.name}
                          {i === 0 && <span className="ml-1">👑</span>}
                        </span>
                      </div>
                      <span className="font-bold text-white shrink-0">{p.score}</span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${p.id === playerId ? 'bg-gold' : 'bg-border'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(Math.max(0, p.score) / maxScore) * 100}%` }}
                        transition={{ delay: i * 0.04, duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Historique personnel */}
              {history.length > 0 && (
                <div className="mt-7 pt-5 border-t border-border">
                  <h4 className="text-sm font-bold text-white mb-1">Ton parcours</h4>
                  <p className="text-muted text-xs mb-3">Rappel privé de tes manches (plus récent en haut)</p>
                  <div className="flex flex-col gap-2">
                    {history.map((entry) => {
                      const s = summarize(entry)
                      return (
                        <div
                          key={entry.round}
                          className={`px-3 py-3 rounded-2xl border ${TONE_CLASSES[s.tone]}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl leading-none shrink-0">{s.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[10px] text-muted uppercase tracking-widest">Manche {entry.round}</p>
                                {entry.delta !== 0 && (
                                  <span className={`text-sm font-bold shrink-0 ${TONE_DELTA[s.tone]}`}>
                                    {entry.delta > 0 ? '+' : ''}{entry.delta}
                                  </span>
                                )}
                              </div>
                              <p className="text-white font-semibold text-sm leading-snug mt-0.5">{s.title}</p>
                              <p className="text-muted text-xs mt-0.5">{s.sub}</p>
                              {entry.mise > 0 && (
                                <p className="text-muted text-[10px] mt-1">Mise : {entry.mise}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pt-3 pb-1 shrink-0">
              <button onClick={onClose} className="btn-ghost w-full rounded-2xl min-h-[52px]">
                Fermer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
